import { expect, test, type Page } from '@playwright/test';

const PAGE_PATH = '/matzal-al-mentor';

/** 서울 강동구 천호동 — 1km 안에 등록 맛집이 있는 좌표 */
const CHEONHO = { latitude: 37.5368, longitude: 127.1325 };
/** 태평양 한가운데 — 1km 안에 맛집이 하나도 없는 좌표 */
const NOWHERE = { latitude: 0, longitude: -160 };

const nearbyButton = (page: Page) => page.getByRole('button', { name: '내 주변 추천' });

/** 추천 결과 카드(이름·주소·거리·상세보기 버튼을 모두 감싸는 영역) */
const resultCard = (page: Page) =>
  page
    .locator('div')
    .filter({ has: page.getByText('오늘의 추천', { exact: true }) })
    .filter({ has: page.getByRole('button', { name: '상세보기' }) })
    .last();

/** 버튼을 누르고 추천 카드가 뜰 때까지 기다린 뒤 카드 내용을 돌려준다 */
async function runNearbyRoulette(page: Page) {
  await nearbyButton(page).click();

  const card = resultCard(page);
  await expect(card).toBeVisible();

  const name = (await card.locator('h4').innerText()).trim();
  const distText = await card.getByText(/📍\s*\d+(?:\.\d+)?km/).innerText();
  const distKm = Number(distText.replace(/[^\d.]/g, ''));

  return { card, name, distKm };
}

test.describe('맛잘알 오빠 — 내 주변 추천', () => {
  test.use({ geolocation: CHEONHO });

  test.beforeEach(async ({ page }) => {
    await page.goto(PAGE_PATH);
    await expect(nearbyButton(page)).toBeEnabled();
  });

  test('위치를 허용하면 1km 이내 맛집이 추천 카드로 나온다', async ({ page }) => {
    // 클릭 직후에는 "찾는 중..." 으로 바뀌고 버튼이 잠긴다
    await nearbyButton(page).click();
    const spinning = page.getByRole('button', { name: '찾는 중...' });
    await expect(spinning).toBeVisible();
    await expect(spinning).toBeDisabled();

    const card = resultCard(page);
    await expect(card).toBeVisible();

    // 이름 / 주소 / 업종 / 거리가 모두 채워져 있어야 한다
    await expect(card.locator('h4')).not.toBeEmpty();
    await expect(card.getByText(/📍\s*\d+(?:\.\d+)?km/)).toBeVisible();
    await expect(card.getByRole('button', { name: '상세보기' })).toBeVisible();

    // 반경 1km 필터가 실제로 걸렸는지 확인 (fallback 없이 1km 컷)
    const distText = await card.getByText(/📍\s*\d+(?:\.\d+)?km/).innerText();
    expect(Number(distText.replace(/[^\d.]/g, ''))).toBeLessThanOrEqual(1);

    // 결과가 나오면 버튼은 다시 눌 수 있는 상태로 돌아온다
    await expect(nearbyButton(page)).toBeEnabled();
  });

  test('상세보기를 누르면 해당 맛집 상세 페이지로 이동한다', async ({ page }) => {
    const { card, name } = await runNearbyRoulette(page);

    await card.getByRole('button', { name: '상세보기' }).click();

    // /matzal-al-mentor/<맛집명>?restaurantIdx=...&restaurantAddr=...
    await page.waitForURL(/\/matzal-al-mentor\/[^/?]+\?.*restaurantIdx=\d+/);
    await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
    await expect(page.getByRole('heading', { name: '식당 정보' })).toBeVisible();
  });

  test('여러 번 눌러도 매번 1km 이내 결과를 준다', async ({ page }) => {
    const picked: string[] = [];

    for (let i = 0; i < 3; i += 1) {
      const { name, distKm } = await runNearbyRoulette(page);
      expect(distKm).toBeLessThanOrEqual(1);
      picked.push(name);
    }

    // 랜덤이라 "매번 다른 결과"는 단정할 수 없다(후보가 1곳이면 계속 같음).
    // 3회 모두 유효한 결과가 나왔는지만 보장하고 실제 뽑힌 값은 로그로 남긴다.
    expect(picked).toHaveLength(3);
    console.log('추천된 맛집:', picked.join(', '));
  });
});

test.describe('맛잘알 오빠 — 내 주변 추천 예외 처리', () => {
  test('위치 권한을 거부하면 안내 모달이 뜬다', async ({ page }) => {
    // 이 테스트만 권한을 주지 않는다 → getCurrentPosition 이 PERMISSION_DENIED 로 실패
    await page.context().clearPermissions();
    await page.goto(PAGE_PATH);

    await nearbyButton(page).click();

    const modal = page.getByText('위치 권한이 거부됨');
    await expect(modal).toBeVisible();
    await expect(page.getByText(/위치 권한을\s*허용으로 변경한 후 다시 시도해주세요/)).toBeVisible();

    // 브라우저 기본 alert 이 아니라 인앱 모달이어야 하고, 확인으로 닫혀야 한다
    await page.getByRole('button', { name: '확인' }).click();
    await expect(modal).toBeHidden();
    await expect(nearbyButton(page)).toBeEnabled();
  });

  test('주변 1km 안에 맛집이 없으면 "주변 맛집 없음" 모달이 뜬다', async ({ page }) => {
    await page.context().setGeolocation(NOWHERE);
    await page.goto(PAGE_PATH);

    await nearbyButton(page).click();

    await expect(page.getByText('주변 맛집 없음')).toBeVisible();
    await expect(page.getByText(/1km 이내에 등록된 맛집이 없습니다/)).toBeVisible();
    await expect(resultCard(page)).toBeHidden();

    await page.getByRole('button', { name: '확인' }).click();
    await expect(nearbyButton(page)).toBeEnabled();
  });
});
