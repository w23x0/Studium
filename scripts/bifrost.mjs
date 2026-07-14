import { createHash } from "node:crypto";
import {
  createReadStream,
  createWriteStream,
  existsSync,
} from "node:fs";
import {
  mkdir,
  readFile,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";

const ROOT = process.cwd();
const LOCK_PATH = path.join(ROOT, "infra", "bifrost", "runtime-lock.json");
const RUNTIME_ROOT = path.join(ROOT, "runtime", "bifrost");
const APP_DIR = path.join(RUNTIME_ROOT, "app");
const BIN_DIR = path.join(RUNTIME_ROOT, "bin");
const CATALOG_HOST = "127.0.0.1";
const CATALOG_PORT = 4001;
const PLACEHOLDER_FRAGMENTS = ["replace-with", "change-me", "provider-name"];
const VERIFIED_BASE_PROVIDERS = new Set(["openai"]);

function fail(message) {
  throw new Error(message);
}

function requiredEnvironment(name, { secret = false } = {}) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required.`);
  if (
    PLACEHOLDER_FRAGMENTS.some((fragment) =>
      value.toLowerCase().includes(fragment),
    )
  ) {
    fail(`${name} still contains an example placeholder.`);
  }
  if (secret && value.length < 24) {
    fail(`${name} must contain at least 24 characters.`);
  }
  return value;
}

async function assertSecretFileSeparation() {
  const webEnvironmentPath = path.join(ROOT, ".env");
  if (!existsSync(webEnvironmentPath)) return;
  const webEnvironment = await readFile(webEnvironmentPath, "utf8");
  const forbiddenNames = [
    "BIFROST_ADMIN_PASSWORD",
    "BIFROST_ENCRYPTION_KEY",
    "STUDIUM_UPSTREAM_API_KEY",
  ];
  const misplaced = forbiddenNames.filter((name) =>
    new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`, "m").test(webEnvironment),
  );
  if (misplaced.length > 0) {
    fail(`Move Bifrost-only secrets out of .env: ${misplaced.join(", ")}.`);
  }
}

async function readLock() {
  const lock = JSON.parse(await readFile(LOCK_PATH, "utf8"));
  const platformKey = `${process.platform}-${process.arch}`;
  const artifact = lock.artifacts[platformKey];
  if (!artifact) {
    fail(
      `Bifrost ${lock.transportVersion} is not integrity-locked for ${platformKey}.`,
    );
  }
  return { artifact, transportVersion: lock.transportVersion };
}

async function sha256(filePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function verifyBinary(binaryPath, artifact) {
  if (!existsSync(binaryPath)) return false;
  const metadata = await stat(binaryPath);
  if (metadata.size !== artifact.size) return false;
  return (await sha256(binaryPath)) === artifact.sha256;
}

async function installBinary() {
  const { artifact, transportVersion } = await readLock();
  const binaryPath = path.join(BIN_DIR, artifact.fileName);
  await mkdir(BIN_DIR, { recursive: true });

  if (await verifyBinary(binaryPath, artifact)) {
    console.log(`Bifrost ${transportVersion} integrity check passed.`);
    return binaryPath;
  }

  if (existsSync(binaryPath)) await unlink(binaryPath);
  const temporaryPath = `${binaryPath}.download`;
  if (existsSync(temporaryPath)) await unlink(temporaryPath);

  console.log(`Downloading Bifrost ${transportVersion} from the locked URL...`);
  const response = await fetch(artifact.url, { redirect: "error" });
  if (!response.ok || !response.body) {
    fail(`Bifrost download failed with HTTP ${response.status}.`);
  }

  const hash = createHash("sha256");
  let downloadedBytes = 0;
  const verifier = new Transform({
    transform(chunk, _encoding, callback) {
      downloadedBytes += chunk.length;
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(response.body),
      verifier,
      createWriteStream(temporaryPath, { flags: "wx" }),
    );
    const digest = hash.digest("hex");
    if (downloadedBytes !== artifact.size || digest !== artifact.sha256) {
      fail("Downloaded Bifrost artifact failed the locked size or hash check.");
    }
    await rename(temporaryPath, binaryPath);
  } catch (error) {
    if (existsSync(temporaryPath)) await unlink(temporaryPath);
    throw error;
  }

  console.log(`Installed and verified Bifrost ${transportVersion}.`);
  return binaryPath;
}

function buildRuntimeConfiguration() {
  const provider = requiredEnvironment("STUDIUM_UPSTREAM_PROVIDER");
  if (!VERIFIED_BASE_PROVIDERS.has(provider)) {
    fail(
      `STUDIUM_UPSTREAM_PROVIDER=${provider} is not supported by the verified M1 custom-provider adapter.`,
    );
  }

  const upstreamModel = requiredEnvironment("STUDIUM_UPSTREAM_MODEL");
  requiredEnvironment("STUDIUM_UPSTREAM_API_KEY", { secret: true });
  const gatewayKey = requiredEnvironment("STUDIUM_LLM_GATEWAY_API_KEY", {
    secret: true,
  });
  if (!gatewayKey.startsWith("sk-bf-")) {
    fail("STUDIUM_LLM_GATEWAY_API_KEY must start with sk-bf-.");
  }
  requiredEnvironment("BIFROST_ADMIN_USERNAME");
  requiredEnvironment("BIFROST_ADMIN_PASSWORD", { secret: true });
  requiredEnvironment("BIFROST_ENCRYPTION_KEY", { secret: true });

  const gatewayProvider = `studium-${provider}`;
  const routeModel = `${gatewayProvider}/studium-m1`;
  if (requiredEnvironment("STUDIUM_LLM_MODEL") !== routeModel) {
    fail(`STUDIUM_LLM_MODEL must be ${routeModel}.`);
  }

  const timeoutMs = Number(process.env.STUDIUM_LLM_TIMEOUT_MS ?? "60000");
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0 || timeoutMs > 300000) {
    fail("STUDIUM_LLM_TIMEOUT_MS must be an integer from 1 to 300000.");
  }

  return {
    $schema: "https://www.getbifrost.ai/schema",
    version: 2,
    source_of_truth: "config.json",
    encryption_key: "env.BIFROST_ENCRYPTION_KEY",
    client: {
      enable_logging: false,
      disable_content_logging: true,
      allow_per_request_content_storage_override: false,
      allow_per_request_raw_override: false,
      dump_errors_in_console_logs: false,
      logging_headers: [],
      allowed_origins: [],
      enforce_auth_on_inference: true,
      max_request_body_size_mb: 1,
      whitelisted_routes: [],
      allowed_headers: [],
      allow_direct_keys: false,
      disable_db_pings_in_health: false,
      header_filter_config: {
        allowlist: ["x-bf-eh-studium-none"],
        denylist: [],
      },
      compat: {
        convert_text_to_chat: false,
        should_drop_params: false,
        should_convert_params: false,
        convert_chat_to_responses: false,
      },
    },
    providers: {
      [gatewayProvider]: {
        keys: [
          {
            id: "studium-primary",
            name: "studium-primary",
            value: "env.STUDIUM_UPSTREAM_API_KEY",
            enabled: true,
            models: ["studium-m1"],
            blacklisted_models: [],
            aliases: {
              "studium-m1": {
                model_id: upstreamModel,
                model_name: upstreamModel,
                model_family: "openai",
              },
            },
            weight: 1,
            use_for_batch_api: false,
          },
        ],
        network_config: {
          default_request_timeout_in_seconds: Math.ceil(timeoutMs / 1000),
          max_retries: 0,
          insecure_skip_verify: false,
        },
        send_back_raw_request: false,
        send_back_raw_response: false,
        store_raw_request_response: false,
        custom_provider_config: {
          is_key_less: false,
          base_provider_type: provider,
          allowed_requests: {
            list_models: false,
            chat_completion: true,
            chat_completion_stream: false,
          },
        },
      },
    },
    governance: {
      auth_config: {
        is_enabled: true,
        admin_username: "env.BIFROST_ADMIN_USERNAME",
        admin_password: "env.BIFROST_ADMIN_PASSWORD",
      },
      virtual_keys: [
        {
          id: "studium-local",
          name: "studium-local",
          value: "env.STUDIUM_LLM_GATEWAY_API_KEY",
          is_active: true,
          provider_configs: [
            {
              provider: gatewayProvider,
              allowed_models: ["studium-m1"],
              blacklisted_models: [],
              key_ids: ["studium-primary"],
              weight: 1,
            },
          ],
          mcp_configs: [],
        },
      ],
      budgets: [],
      rate_limits: [],
      routing_rules: [],
      model_configs: [],
    },
    config_store: {
      enabled: true,
      type: "sqlite",
      config: { path: path.join(APP_DIR, "config.db") },
    },
    logs_store: { enabled: false },
    mcp: {
      client_configs: [],
      tool_manager_config: { disable_auto_tool_inject: true },
    },
    plugins: [{ name: "telemetry", enabled: false }],
    framework: {
      pricing: {
        pricing_url: "file://./infra/bifrost/catalog/pricing.json",
        model_parameters_url:
          "file://./infra/bifrost/catalog/model-parameters.json",
        mcp_library_url: `http://${CATALOG_HOST}:${CATALOG_PORT}/mcp-library.json`,
        pricing_sync_interval: 86400,
        mcp_library_sync_interval: 86400,
      },
    },
  };
}

async function startCatalogServer() {
  const payload = await readFile(
    path.join(ROOT, "infra", "bifrost", "catalog", "mcp-library.json"),
  );
  const server = createServer((request, response) => {
    if (request.method !== "GET" || request.url !== "/mcp-library.json") {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Length": payload.byteLength,
      "Content-Type": "application/json; charset=utf-8",
    });
    response.end(payload);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(CATALOG_PORT, CATALOG_HOST, () => resolve());
  });
  return server;
}

function buildBifrostEnvironment() {
  const inheritedNames = [
    "APPDATA",
    "COMSPEC",
    "LOCALAPPDATA",
    "NO_PROXY",
    "PATH",
    "ProgramData",
    "SystemRoot",
    "TEMP",
    "TMP",
    "USERPROFILE",
    "WINDIR",
  ];
  const environment = Object.fromEntries(
    inheritedNames
      .filter((name) => process.env[name] !== undefined)
      .map((name) => [name, process.env[name]]),
  );

  for (const name of [
    "BIFROST_ADMIN_PASSWORD",
    "BIFROST_ADMIN_USERNAME",
    "BIFROST_ENCRYPTION_KEY",
    "STUDIUM_LLM_GATEWAY_API_KEY",
    "STUDIUM_UPSTREAM_API_KEY",
  ]) {
    environment[name] = requiredEnvironment(name);
  }
  return environment;
}

async function configureRuntime() {
  await assertSecretFileSeparation();
  await mkdir(APP_DIR, { recursive: true });
  const configPath = path.join(APP_DIR, "config.json");
  await writeFile(
    configPath,
    `${JSON.stringify(buildRuntimeConfiguration(), null, 2)}\n`,
    "utf8",
  );
  console.log(`Generated secret-free Bifrost config at ${configPath}.`);
  return configPath;
}

async function startGateway() {
  const binaryPath = await installBinary();
  await configureRuntime();
  const catalogServer = await startCatalogServer();

  try {
    const child = spawn(
      binaryPath,
      [
        "-app-dir",
        APP_DIR,
        "-host",
        "127.0.0.1",
        "-port",
        "4000",
        "-log-level",
        "warn",
        "-log-style",
        "json",
      ],
      { env: buildBifrostEnvironment(), stdio: "inherit", windowsHide: true },
    );

    for (const signal of ["SIGINT", "SIGTERM"]) {
      process.once(signal, () => child.kill(signal));
    }

    const exitCode = await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => {
        if (signal) resolve(1);
        else resolve(code ?? 1);
      });
    });
    process.exitCode = exitCode;
  } finally {
    await new Promise((resolve) => catalogServer.close(() => resolve()));
  }
}

async function verifyInstallation() {
  const { artifact, transportVersion } = await readLock();
  const binaryPath = path.join(BIN_DIR, artifact.fileName);
  if (!(await verifyBinary(binaryPath, artifact))) {
    fail(`Bifrost ${transportVersion} is missing or failed its integrity check.`);
  }
  console.log(`Bifrost ${transportVersion} integrity check passed.`);
}

const action = process.argv[2];
try {
  if (action === "install") await installBinary();
  else if (action === "configure") await configureRuntime();
  else if (action === "verify") await verifyInstallation();
  else if (action === "start") await startGateway();
  else fail("Usage: node scripts/bifrost.mjs <install|configure|verify|start>");
} catch (error) {
  console.error(error instanceof Error ? error.message : "Bifrost command failed.");
  process.exitCode = 1;
}
