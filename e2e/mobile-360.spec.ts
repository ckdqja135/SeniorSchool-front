import { expect, test, type Page } from '@playwright/test';

/**
 * 모바일 최소 기준(360px)에서 레이아웃이 깨지지 않는지 본다.
 *
 * - 가로 스크롤이 생기거나 요소가 화면 밖으로 밀리면 실패
 * - 짧은 라벨(업종·가격·조회수 같은 것)이 두 줄로 접히면 실패
 *   문장은 두 줄이 정상이므로 12자 이하만 검사한다.
 */

test.use({ viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true });

/** 화면 밖으로 나간 요소 + 두 줄로 접힌 짧은 라벨을 모아 온다 */
async function scanLayout(page: Page) {
  return page.evaluate(() => {
    const label = (el: Element) => {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 30);
      const cls = (el.getAttribute('class') || '').split(/\s+/).slice(0, 2).join('.');
      return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} "${t}"`;
    };
    // 캐러셀처럼 부모가 overflow 를 감추는 건 화면 밖으로 치지 않는다
    const clipped = (el: Element) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p);
        if (o.overflowX !== 'visible' || o.overflowY !== 'visible') return true;
      }
      return false;
    };

    const offscreen: string[] = [];
    const wrapped: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || !el.getClientRects().length) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;

      if ((r.right > window.innerWidth + 1 || r.left < -1) && !clipped(el)) offscreen.push(label(el));

      if (Array.from(el.children).some((c) => getComputedStyle(c).display !== 'none')) continue;
      const text = (el.textContent || '').trim();
      if (!text || text.length > 12) continue;
      if (cs.whiteSpace === 'nowrap' || cs.whiteSpace === 'pre') continue;
      // 실제 줄 수 = 서로 다른 top 의 개수.
      // JSX 는 `{n}개의 후기` 처럼 텍스트를 여러 노드로 쪼개서 같은 줄에도 rect 가 여러 개 나온다.
      const range = document.createRange();
      range.selectNodeContents(el);
      const tops = new Set(Array.from(range.getClientRects()).map((r) => Math.round(r.top)));
      if (tops.size >= 2) wrapped.push(label(el));
    }
    return {
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      offscreen: offscreen.slice(0, 6),
      wrapped: wrapped.slice(0, 6),
    };
  });
}

const ROUTES = [
  '/matzal-al-mentor',
  '/church-mentor',
  '/company-mentor',
  '/univ-mentor',
  '/outsource-mentor',
  '/freeboard',
  '/search',
];

for (const route of ROUTES) {
  test(`${route} — 360px 에서 넘침·짧은 라벨 줄바꿈 없음`, async ({ page }) => {
    await page.goto(route);
    await page.waitForTimeout(3500);

    const res = await scanLayout(page);
    expect(res.scrollWidth, '가로 스크롤이 생기면 안 된다').toBeLessThanOrEqual(res.innerWidth + 1);
    expect(res.offscreen, '화면 밖으로 밀린 요소').toEqual([]);
    expect(res.wrapped, '두 줄로 접힌 짧은 라벨').toEqual([]);
  });
}

test('식당 상세 — 360px 에서 라벨·가격이 한 줄로 유지된다', async ({ page, request }) => {
  // 목록 API 에서 실제 식당 하나를 집어 상세로 들어간다 (페이지 안에서 부르면 CORS 에 막힌다)
  let target: { name: string; idx: string } | null = null;
  try {
    // 전체 목록은 7천 건이라 느리다. 반경 조회로 한 건만 받는다
    const res = await request.get(
      'https://api.ori.blue/restaurant/nearby?lat=37.5665&lng=126.978&radius=3&limit=5',
      { timeout: 45_000 },
    );
    const body = res.ok() ? await res.json() : null;
    const list: any[] = Array.isArray(body) ? body : (body?.data ?? []);
    const hit = list.find((x) => x?.restaurantName && x?.restaurantIdx);
    if (hit) target = { name: String(hit.restaurantName), idx: String(hit.restaurantIdx) };
  } catch {
    target = null;
  }
  test.skip(target === null, '식당 목록을 받지 못해 상세를 확인할 수 없습니다');

  await page.goto(`/matzal-al-mentor/${encodeURIComponent(target!.name)}?restaurantIdx=${target!.idx}`);
  await page.waitForTimeout(4000);

  const res = await scanLayout(page);
  expect(res.scrollWidth).toBeLessThanOrEqual(res.innerWidth + 1);
  expect(res.offscreen).toEqual([]);
  expect(res.wrapped).toEqual([]);
});
