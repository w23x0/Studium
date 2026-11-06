import type { ApiConnection } from './api-connection.ts';
import { existsSync, mkdirSync, readlinkSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import type { ConversationSpec } from './port.ts';

/** 独立配置与会话存放处；只链接 CLI 的登录文件，不读取或复制凭据。 */
export function prepareCodexHome(
  dataRoot: string,
  api = false,
): {
  home: string;
  loginHome: string;
  cwd: string;
} {
  const home = join(dataRoot, api ? 'codex-api-runtime' : 'codex-runtime');
  const cwd = join(home, 'empty');
  const loginHome = resolve(process.env.CODEX_HOME ?? join(homedir(), '.codex'));
  mkdirSync(cwd, { recursive: true, mode: 0o700 });
  const source = join(loginHome, 'auth.json');
  const target = join(home, 'auth.json');
  if (!api && existsSync(source)) {
    try {
      symlinkSync(source, target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
      if (readlinkSync(target) !== source) {
        throw new Error(
          'Studium 的 Codex 登录链接与当前 CODEX_HOME 不一致，请先检查 codex-runtime/auth.json',
          { cause: error },
        );
      }
    }
  }
  return { home, loginHome, cwd };
}

/** CLI --config 的值是 TOML；参数直接交 spawn，不经过 shell。 */
function toml(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.map(toml).join(',')}]`;
  if (typeof value === 'object' && value !== null) {
    return `{${Object.entries(value)
      .map(([k, v]) => `${JSON.stringify(k)}=${toml(v)}`)
      .join(',')}}`;
  }
  throw new Error('Codex 配置含不能表示的值');
}

export function codexArgs(
  spec: ConversationSpec,
  dataRoot: string,
  loginHome: string,
  api?: ApiConnection,
): string[] {
  const sb = spec.sandbox;
  const filesystem: Record<string, string> = { ':root': sb === undefined ? 'deny' : 'read' };
  if (sb !== undefined) {
    filesystem[resolve(dataRoot)] = 'deny';
    for (const e of sb.readOnly) filesystem[resolve(e.path)] = 'read';
    for (const p of sb.denyRead ?? []) filesystem[resolve(p)] = 'deny';
    filesystem[resolve(loginHome)] = 'deny';
    filesystem[resolve(sb.workdir)] = 'write';
  }
  const config = {
    ...(api !== undefined
      ? {
          model_provider: 'studium_api',
          model_providers: {
            studium_api: {
              name: 'Studium API',
              base_url: api.baseUrl,
              env_key: 'STUDIUM_PROVIDER_API_KEY',
              wire_api: 'responses',
              requires_openai_auth: false,
            },
          },
        }
      : {}),
    // 不加载用户的 config.toml；项目指令、skills、插件、hooks、记忆也不混进 Studium。
    project_doc_max_bytes: 0,
    project_doc_fallback_filenames: [],
    developer_instructions: '',
    cli_auth_credentials_store: 'file',
    check_for_update_on_startup: false,
    default_permissions: 'studium',
    permissions: { studium: { filesystem, network: { enabled: sb?.network === true } } },
    approval_policy: 'never',
    allow_login_shell: false,
    shell_environment_policy: {
      inherit: 'core',
      exclude: ['STUDIUM_PROVIDER_API_KEY'],
      set: {},
      experimental_use_profile: false,
    },
    web_search: spec.webSearch === true ? 'live' : 'disabled',
    skills: { bundled: { enabled: false }, include_instructions: false },
    memories: { generate_memories: false, use_memories: false },
    tools: { update_plan: { enabled: false }, experimental_request_user_input: { enabled: false } },
    features: {
      shell_tool: sb !== undefined && sb.commands !== false,
      view_image: sb !== undefined,
      skip_host_skill_discovery: true,
      shell_snapshot: false,
      apps: false,
      plugins: false,
      hooks: false,
      codex_hooks: false,
      plugin_hooks: false,
      memories: false,
      memory_tool: false,
      multi_agent: false,
      multi_agent_v2: false,
      goals: false,
      js_repl: false,
      code_mode: false,
      code_mode_only: false,
      browser_use: false,
      computer_use: false,
      image_generation: false,
      request_permissions_tool: false,
      tool_suggest: false,
      tool_search: false,
    },
  };
  return Object.entries(config).flatMap(([key, value]) => ['-c', `${key}=${toml(value)}`]);
}

/** 登录由 app-server 管理；业务密钥和外层 agent 会话变量不传给它。 */
export function codexEnv(home: string, api?: ApiConnection): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const name of [
    'PATH',
    'HOME',
    'USER',
    'LOGNAME',
    'SHELL',
    'LANG',
    'LC_ALL',
    'TMPDIR',
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'ALL_PROXY',
    'NO_PROXY',
    'http_proxy',
    'https_proxy',
    'all_proxy',
    'no_proxy',
    'SSL_CERT_FILE',
    'SSL_CERT_DIR',
  ]) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  env.CODEX_HOME = home;
  if (api !== undefined) env.STUDIUM_PROVIDER_API_KEY = api.apiKey;
  return env;
}
