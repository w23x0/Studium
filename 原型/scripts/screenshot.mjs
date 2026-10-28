// 给界面截图，agent 改完界面自己看一眼（不是自动测试）：
//   node scripts/screenshot.mjs <地址> <存到哪.png> [--width=1280] [--height=800] [--dark] [--full]
// 地址带口令与“在哪”，如 http://127.0.0.1:4399/?token=…#/p/<项目>；服务要先起好（最好在拷贝的数据上）。
// 浏览器用本机 Playwright 缓存里的 chromium（playwright-core 版本与它对齐，不另下载）。
import { chromium } from 'playwright-core';

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}`));
const num = (name, fallback) => Number(flag(name)?.split('=')[1] ?? fallback);
const [url, out] = args.filter((a) => !a.startsWith('--'));
if (url === undefined || out === undefined) {
  console.error(
    '用法：node scripts/screenshot.mjs <地址> <存到哪.png> [--width=1280] [--height=800] [--dark] [--full]',
  );
  process.exit(1);
}

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: num('width', 1280), height: num('height', 800) },
    colorScheme: flag('dark') !== undefined ? 'dark' : 'light',
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: out, fullPage: flag('full') !== undefined });
  console.log(`已存 ${out}`);
} finally {
  await browser.close();
}
