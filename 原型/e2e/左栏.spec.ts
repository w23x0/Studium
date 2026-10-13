// 左栏：收起 / 展开（记住）、搜索、全部项目页、⋯ 菜单置顶与改名、开发者模式开关。
// 不开新项目、不删、不发消息（和主路径共用一个数据目录，免得互相影响）。
import { expect, test } from '@playwright/test';
import { E2E_TOKEN } from '../playwright.config.ts';

test('左栏：收起记住、搜索打开项目、全部项目页置顶与改名、开发者模式开关', async ({ page }) => {
  await page.goto(`/?token=${E2E_TOKEN}`);
  const sidebar = page.getByTestId('sidebar');
  await expect(sidebar.getByTestId('sidebar-recents')).toContainText('项目对话');

  // 收起后只剩一列图标，刷新后还是收起的
  await page.getByTestId('sidebar-toggle').click();
  await expect(sidebar).toHaveAttribute('data-collapsed', 'true');
  await page.reload();
  await expect(page.getByTestId('sidebar')).toHaveAttribute('data-collapsed', 'true');
  await page.getByTestId('sidebar-toggle').click();
  await expect(page.getByTestId('sidebar')).not.toHaveAttribute('data-collapsed', 'true');

  // 搜索：按项目名找到，点了进项目页
  await page.getByTestId('sidebar-search').click();
  await page.getByTestId('search-input').fill('项目');
  await page.getByRole('dialog').getByRole('button').filter({ hasText: '项目 1' }).first().click();
  await expect(page.getByTestId('project-home')).toBeVisible();
  await expect(page.getByTestId('project-chats')).toContainText('项目对话');

  // 全部项目页：⋯ 菜单置顶 → 左栏置顶里出现；改名 → 名字换了
  await page.getByTestId('sidebar-projects').click();
  const card = page.getByTestId('project-card').first();
  await card.getByTestId('row-menu').click();
  await page.getByRole('menuitem', { name: '置顶' }).click();
  await expect(page.getByTestId('sidebar-pinned')).toContainText('项目 1');
  await card.getByTestId('row-menu').click();
  await page.getByRole('menuitem', { name: '重命名' }).click();
  await page.getByRole('textbox', { name: '改个名字' }).fill('力学入门');
  await page.getByRole('button', { name: '保存' }).click();
  await expect(card).toContainText('力学入门');
  await expect(page.getByTestId('sidebar-pinned')).toContainText('力学入门');

  // 开发者模式：默认开（右上角能开面板，面板首页有资料等入口）；关掉后按钮不见
  await page.getByTestId('sidebar-project').first().click();
  await page.getByTestId('panel-toggle').click();
  await expect(page.getByTestId('nav-library')).toBeVisible();
  await page.getByTestId('account-menu').click();
  await page.getByTestId('open-settings').click();
  await page.getByTestId('dev-mode').uncheck();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('panel-toggle')).toHaveCount(0);
  await expect(page.getByTestId('nav-library')).toHaveCount(0);
  await page.getByTestId('account-menu').click();
  await page.getByTestId('open-settings').click();
  await page.getByTestId('dev-mode').check();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('panel-toggle')).toBeVisible();
});
