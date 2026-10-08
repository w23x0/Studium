// 功能主路径（P1）：只走开会话、发消息、关掉重开记录还在。用假模型，不调真模型。
import { defineConfig } from '@playwright/test';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const E2E_TOKEN = 'e2e-token-0123456789abcdef';
const port = 4399;
const exe = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: 'e2e',
  reporter: 'line',
  use: {
    baseURL: `http://127.0.0.1:${String(port)}`,
    ...(exe !== undefined ? { launchOptions: { executablePath: exe } } : {}),
  },
  webServer: {
    command: 'npx vite build --logLevel warn && npx tsx src/core/main.ts',
    url: `http://127.0.0.1:${String(port)}/`,
    reuseExistingServer: false,
    env: {
      STUDIUM_MODEL: 'fake',
      STUDIUM_DATA: join(tmpdir(), `studium-e2e-${String(Date.now())}`),
      STUDIUM_TOKEN: E2E_TOKEN,
      STUDIUM_PORT: String(port),
    },
  },
});
