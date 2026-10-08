import { expect, test } from '@playwright/test';
import { E2E_TOKEN } from '../playwright.config.ts';

test('开会话 → 发消息 → 收到回复 → 关掉页面重开，记录还在', async ({ browser }) => {
  const first = await browser.newPage();
  await first.goto(`/?token=${E2E_TOKEN}`);
  await first.getByRole('button', { name: '新对话' }).click();
  await first.getByLabel('输入').fill('什么是加速度');
  await first.getByRole('button', { name: '发送' }).click();
  await expect(first.getByTestId('user-message')).toHaveText('什么是加速度');
  await expect(first.getByTestId('assistant-message')).toHaveText('（假模型）收到：什么是加速度');
  await first.close();

  const again = await browser.newPage();
  await again.goto(`/?token=${E2E_TOKEN}`);
  await expect(again.getByTestId('user-message')).toHaveText('什么是加速度');
  await expect(again.getByTestId('assistant-message')).toHaveText('（假模型）收到：什么是加速度');
});
