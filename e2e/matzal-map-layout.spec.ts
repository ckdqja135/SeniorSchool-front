import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * 입체 탐색 지도의 PC / 모바일 배치 회귀 테스트.
 *
 * PC 는 디자인대로 바뀌었고(목록 좌측 전체 높이 + 상세 별도 패널 + 우하단 컨트롤),
 * 모바일은 예전 그대로(하단 시트 + 선택 시 상세로 교체)여야 한다.
 */

const PAGE_PATH = '/matzal-al-mentor';

const mapShell = (page: Page) => page.locator('[data-explore-renderer]');
const listPanel = (page: Page) => page.getByRole('region', { name: '주변 식당 목록' });
const detailPanel = (page: Page) => page.getByRole('region', { name: /정보$/ });
const modeControl = (page: Page) => page.getByRole('group', { name: '지도 모드' });
const categoryChips = (page: Page) => page.getByRole('radiogroup', { name: '업종 카테고리' });

async function openMapTab(page: Page) {
  await page.goto(PAGE_PATH);
  // 카드/지도 토글의 '지도' (aria-pressed 를 가진 쪽). 상세 페이지 링크와 구분된다
  await page.locator('button[aria-pressed]', { hasText: '지도' }).click();
  await expect(mapShell(page)).toBeVisible();
  await expect(modeControl(page)).toBeVisible();
}

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error('요소의 bounding box 를 얻지 못했습니다');
  return b;
}

/** 목록의 첫 식당을 고른다. 주변 결과가 안 오면 null (지도 로딩 실패 등) */
async function selectFirstRestaurant(page: Page): Promise<string | null> {
  const rows = listPanel(page).locator('ul button');
  try {
    await expect(rows.first()).toBeVisible({ timeout: 40_000 });
  } catch {
    return null;
  }
  const name = (await rows.first().innerText()).split('\n')[0].trim();
  await rows.first().click();
  return name;
}

test.describe('지도 — PC 배치', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('목록이 좌측 전체 높이로 서고 상단바·칩이 가운데 좁게 모인다', async ({ page }) => {
    await openMapTab(page);

    const shell = await box(mapShell(page));

    // 기본 펼침이지만 접힘 → 펼침 높이 애니메이션(260ms)이 있어 값이 앉을 때까지 기다린다
    await expect.poll(async () => (await box(listPanel(page))).height).toBeGreaterThan(shell.height * 0.6);

    const panel = await box(listPanel(page));
    expect(Math.round(panel.x - shell.x)).toBeLessThanOrEqual(20);
    expect(Math.round(panel.width)).toBe(380);

    // 칩이 지도 가운데에 모여 있고 좌측 패널 위를 가로지르지 않는다
    const chips = await box(categoryChips(page));
    expect(Math.abs(chips.x + chips.width / 2 - (shell.x + shell.width / 2))).toBeLessThan(60);
    expect(chips.width).toBeLessThanOrEqual(524);
  });

  test('식당을 골라도 목록이 남고 상세가 그 오른쪽에 열린다', async ({ page }) => {
    await openMapTab(page);

    const name = await selectFirstRestaurant(page);
    test.skip(name === null, '주변 식당 결과가 없어 선택 흐름을 확인할 수 없습니다');

    // 이번 변경의 핵심: 목록이 사라지지 않는다
    await expect(listPanel(page)).toBeVisible();
    await expect(detailPanel(page)).toBeVisible();

    const list = await box(listPanel(page));
    const detail = await box(detailPanel(page));
    expect(detail.x).toBeGreaterThanOrEqual(list.x + list.width);
    expect(Math.round(detail.width)).toBe(340);
    expect(Math.abs(detail.y - list.y)).toBeLessThan(24);

    // 닫으면 상세만 사라지고 목록은 그대로
    await detailPanel(page).getByRole('button', { name: '선택 해제' }).click();
    await expect(detailPanel(page)).toBeHidden();
    await expect(listPanel(page)).toBeVisible();
  });

  test('목록을 최소화했다 다시 펼칠 수 있다', async ({ page }) => {
    await openMapTab(page);

    const shell = await box(mapShell(page));
    await expect.poll(async () => (await box(listPanel(page))).height).toBeGreaterThan(shell.height * 0.6);

    await page.getByRole('button', { name: '목록 최소화' }).click();
    await expect.poll(async () => (await box(listPanel(page))).height).toBeLessThan(120);

    await page.getByRole('button', { name: '목록 펼치기' }).click();
    await expect.poll(async () => (await box(listPanel(page))).height).toBeGreaterThan(shell.height * 0.6);
  });

  test('모드 컨트롤이 우하단에 가로로 놓이고 확대/축소가 그 위에 온다', async ({ page }) => {
    await openMapTab(page);

    const shell = await box(mapShell(page));
    const mode = await box(modeControl(page));

    expect(Math.round(shell.x + shell.width - (mode.x + mode.width))).toBeLessThanOrEqual(20);
    expect(Math.round(shell.y + shell.height - (mode.y + mode.height))).toBeLessThanOrEqual(20);
    // 세로 스택이 아니라 가로 배치
    expect(mode.width).toBeGreaterThan(mode.height);

    // 확대 버튼이 모드 컨트롤 위쪽 → 서로 겹치지 않는다
    const zoomIn = page.getByRole('button', { name: /확대$/ }).first();
    const zoom = await box(zoomIn);
    expect(zoom.y + zoom.height).toBeLessThanOrEqual(mode.y + 1);
  });

  test('컨트롤은 마우스를 얹기 전까지 흐리고, 패널은 항상 또렷하다', async ({ page }) => {
    await openMapTab(page);

    const control = modeControl(page);
    expect(Number(await control.evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(1);

    await control.hover();
    await expect
      .poll(async () => Number(await control.evaluate((el) => getComputedStyle(el).opacity)))
      .toBe(1);

    // 목록은 내용을 읽어야 하므로 호버 대상이 아니다
    expect(Number(await listPanel(page).evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
  });

  test('지도를 드래그하는 동안 패널이 비치고 손을 떼면 돌아온다', async ({ page }) => {
    await openMapTab(page);

    const name = await selectFirstRestaurant(page);
    test.skip(name === null, '주변 식당 결과가 없어 확인할 수 없습니다');

    const opacity = (l: Locator) => l.evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(await opacity(listPanel(page))).toBe(1);

    // 패널을 피해 지도 위에서 드래그를 시작한다
    const shell = await box(mapShell(page));
    const from = { x: shell.x + shell.width * 0.8, y: shell.y + shell.height * 0.5 };
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(from.x + 60, from.y + 40, { steps: 8 });

    await expect.poll(() => opacity(listPanel(page))).toBeLessThan(1);
    await expect.poll(() => opacity(detailPanel(page))).toBeLessThan(1);

    await page.mouse.up();
    await expect.poll(() => opacity(listPanel(page))).toBe(1);
    await expect.poll(() => opacity(detailPanel(page))).toBe(1);
  });
});

test.describe('지도 — 모바일은 그대로', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test('패널이 전폭 하단 시트로 남는다', async ({ page }) => {
    await openMapTab(page);

    const shell = await box(mapShell(page));
    const panel = await box(listPanel(page));

    expect(Math.round(panel.x - shell.x)).toBeLessThanOrEqual(2);
    // 셸 테두리(1px) 만큼 차이날 수 있다
    expect(Math.abs(panel.width - shell.width)).toBeLessThanOrEqual(4);
    // 바닥에 붙어 있다
    expect(Math.abs(shell.y + shell.height - (panel.y + panel.height))).toBeLessThan(4);
    // 데스크톱 전용 토글은 없어야 한다
    await expect(page.getByRole('button', { name: /^목록 (최소화|펼치기)$/ })).toHaveCount(0);
  });

  test('식당을 고르면 예전처럼 목록 자리에 상세가 들어온다', async ({ page }) => {
    await openMapTab(page);

    const name = await selectFirstRestaurant(page);
    test.skip(name === null, '주변 식당 결과가 없어 선택 흐름을 확인할 수 없습니다');

    // 별도 패널이 아니라 교체 — 목록 패널 자체가 상세로 바뀐다
    await expect(listPanel(page)).toBeHidden();
    await expect(page.getByRole('region', { name: `${name} 정보` })).toBeVisible();
  });

  test('컨트롤이 흐려지지 않고 모드 컨트롤은 세로 스택을 유지한다', async ({ page }) => {
    await openMapTab(page);

    expect(Number(await modeControl(page).evaluate((el) => getComputedStyle(el).opacity))).toBe(1);

    const mode = await box(modeControl(page));
    expect(mode.height).toBeGreaterThan(mode.width);
  });
});
