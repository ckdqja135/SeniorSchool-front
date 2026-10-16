/**
 * 식당 한 곳을 지정해 빠진 필드를 다시 수집한다.
 *
 * 백엔드 보강 API(/admin/crawler/enrich)는 '조회수 상위 N곳' 만 골라 돌려서, 화면에서 고른 식당을
 * 대상으로 쓸 수 없다. 대신 단일 소스 수집(GET /admin/crawler/run/:source, dryRun)으로 그 식당 이름을
 * 검색하고, 이름이 맞는 결과에서 값을 가져온다. 저장은 호출하는 쪽이 결정한다.
 *
 * - 메뉴·이미지: 식신 (메뉴·대표 사진을 주는 유일한 소스)
 * - URL: 카카오 → 없으면 네이버
 */
import { apiGet, type CrawlResult, type MenuItem, type PreviewItem, type RestaurantRow, type SourceKey } from "./shared";

export type RecollectField = "menu" | "image" | "url";

export interface RecollectResult {
  menu?: MenuItem[];
  image?: string;
  url?: string;
  /** 어느 소스의 어떤 이름과 맞췄는지 (결과 안내용) */
  matched: Array<{ source: SourceKey; name: string }>;
  /** 소스별 실패 사유 */
  errors: string[];
}

/** 비교용 이름: 공백·괄호·흔한 지점 표기를 뺀다 */
function norm(name: string): string {
  return name
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/\s+/g, "")
    .replace(/(본점|직영점)$/, "")
    .toLowerCase();
}

function bestMatch(target: string, items: PreviewItem[]): PreviewItem | null {
  const t = norm(target);
  if (!t) return null;
  const exact = items.find((i) => norm(i.restaurantName || "") === t);
  if (exact) return exact;
  // 한쪽이 다른 쪽을 품는 경우 (예: '명동교자' ↔ '명동교자 본점'). 너무 짧은 이름은 오탐이 많아 제외
  if (t.length < 3) return null;
  return items.find((i) => {
    const n = norm(i.restaurantName || "");
    return n.length >= 3 && (n.includes(t) || t.includes(n));
  }) ?? null;
}

/** '서울특별시 강남구 …' → '서울 강남구' (수집 API 가 쓰는 지역 표기) */
export function regionOf(r: RestaurantRow): string {
  const src = (r.restaurantLocation || r.restaurantAddr || "").trim();
  const [a = "", b = ""] = src.split(/\s+/);
  const city = a
    .replace(/특별자치시|특별자치도|특별시|광역시/, "")
    .replace(/^(경기|강원|충청북|충청남|전라북|전라남|경상북|경상남)도$/, (m) =>
      ({ 경기도: "경기", 강원도: "강원", 충청북도: "충북", 충청남도: "충남", 전라북도: "전북", 전라남도: "전남", 경상북도: "경북", 경상남도: "경남" } as Record<string, string>)[m] ?? m,
    );
  return [city || "서울", b].filter(Boolean).join(" ");
}

async function search(source: SourceKey, r: RestaurantRow): Promise<PreviewItem | null> {
  const params = new URLSearchParams({
    query: r.restaurantName,
    region: regionOf(r),
    count: "5",
    dryRun: "true",
  });
  const data = await apiGet<CrawlResult>(`/admin/crawler/run/${source}?${params}`);
  return bestMatch(r.restaurantName, data.data || []);
}

export async function recollect(r: RestaurantRow, fields: RecollectField[]): Promise<RecollectResult> {
  const out: RecollectResult = { matched: [], errors: [] };
  const want = new Set(fields);

  if (want.has("menu") || want.has("image")) {
    try {
      const hit = await search("siksin", r);
      if (hit) {
        out.matched.push({ source: "siksin", name: hit.restaurantName });
        if (want.has("menu") && Array.isArray(hit.restaurantMenu) && hit.restaurantMenu.length > 0) out.menu = hit.restaurantMenu;
        if (want.has("image") && hit.restaurantImage) out.image = hit.restaurantImage;
      }
    } catch (e) {
      out.errors.push(`식신: ${(e as Error).message}`);
    }
  }

  if (want.has("url")) {
    for (const source of ["kakao", "naver"] as const) {
      try {
        const hit = await search(source, r);
        if (hit?.restaurantURL) {
          out.matched.push({ source, name: hit.restaurantName });
          out.url = hit.restaurantURL;
          break;
        }
      } catch (e) {
        out.errors.push(`${source === "kakao" ? "카카오" : "네이버"}: ${(e as Error).message}`);
      }
    }
  }

  return out;
}
