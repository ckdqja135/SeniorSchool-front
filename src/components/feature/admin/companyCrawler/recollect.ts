/**
 * 회사 한 곳을 지정해 빠진 필드를 다시 수집한다.
 *
 * 백엔드 보강 API(/admin/company-crawler/enrich)는 대상을 자기가 골라서 돌리므로, 화면에서 고른 회사를
 * 지정할 수 없다. 대신 단일 소스 수집(GET /admin/company-crawler/run/:source, dryRun)으로 그 회사 이름을
 * 검색하고, 이름이 맞는 결과에서 값을 가져온다. 저장은 호출하는 쪽이 결정한다.
 *
 * - 홈페이지(url): 네이버 → 없으면 카카오
 * - 대표이사(ceo) · 업종(industry): 공공데이터 → 없으면 네이버
 *   (카카오 로컬은 업종 카테고리만 주고 대표자는 주지 않는다)
 */
import { apiGet, isBlank, type CrawlResult, type PreviewItem, type CompanyRow, type SourceKey } from "./shared";

export type RecollectField = "url" | "ceo" | "industry";

export interface RecollectResult {
  url?: string;
  ceo?: string;
  industry?: string;
  /** 어느 소스의 어떤 이름과 맞췄는지 (결과 안내용) */
  matched: Array<{ source: SourceKey; name: string }>;
  /** 소스별 실패 사유 */
  errors: string[];
}

/** 비교용 이름: 공백·괄호와 흔한 법인 표기를 뺀다 */
function norm(name: string): string {
  return name
    .replace(/\(.*?\)|\[.*?\]/g, "")
    .replace(/주식회사|㈜|\(주\)|유한회사|㈐|\(유\)/g, "")
    .replace(/\s+/g, "")
    .replace(/(코퍼레이션|그룹|홀딩스)$/, "")
    .toLowerCase();
}

function bestMatch(target: string, items: PreviewItem[]): PreviewItem | null {
  const t = norm(target);
  if (!t) return null;
  const exact = items.find((i) => norm(i.compName || "") === t);
  if (exact) return exact;
  // 한쪽이 다른 쪽을 품는 경우 (예: '카카오' ↔ '카카오엔터프라이즈'). 너무 짧은 이름은 오탐이 많아 제외
  if (t.length < 3) return null;
  return items.find((i) => {
    const n = norm(i.compName || "");
    return n.length >= 3 && (n.includes(t) || t.includes(n));
  }) ?? null;
}

/** '서울특별시 강남구 …' → '서울 강남구' (수집 API 가 쓰는 지역 표기) */
export function regionOf(r: CompanyRow): string {
  const src = (r.compLocate || r.compAddr || "").trim();
  const [a = "", b = ""] = src.split(/\s+/);
  const city = a
    .replace(/특별자치시|특별자치도|특별시|광역시/, "")
    .replace(/^(경기|강원|충청북|충청남|전라북|전라남|경상북|경상남)도$/, (m) =>
      ({ 경기도: "경기", 강원도: "강원", 충청북도: "충북", 충청남도: "충남", 전라북도: "전북", 전라남도: "전남", 경상북도: "경북", 경상남도: "경남" } as Record<string, string>)[m] ?? m,
    );
  return [city || "서울", b].filter(Boolean).join(" ");
}

const SOURCE_LABEL: Record<SourceKey, string> = { kakao: "카카오", naver: "네이버", publicData: "공공데이터" };

async function search(source: SourceKey, r: CompanyRow): Promise<PreviewItem | null> {
  const params = new URLSearchParams({
    query: r.compName,
    region: regionOf(r),
    count: "5",
    dryRun: "true",
  });
  const data = await apiGet<CrawlResult>(`/admin/company-crawler/run/${source}?${params}`);
  return bestMatch(r.compName, data.data || []);
}

export async function recollect(r: CompanyRow, fields: RecollectField[]): Promise<RecollectResult> {
  const out: RecollectResult = { matched: [], errors: [] };
  const want = new Set(fields);

  // 소스를 한 번만 조회해 세 필드를 같이 채운다 (같은 소스를 필드마다 다시 부르지 않게)
  const order: SourceKey[] = ["naver", "publicData", "kakao"];
  for (const source of order) {
    const stillNeed =
      (want.has("url") && !out.url) ||
      (want.has("ceo") && !out.ceo) ||
      (want.has("industry") && !out.industry);
    if (!stillNeed) break;

    try {
      const hit = await search(source, r);
      if (!hit) continue;
      let used = false;
      if (want.has("url") && !out.url && !isBlank(hit.compURL)) {
        out.url = hit.compURL as string;
        used = true;
      }
      if (want.has("ceo") && !out.ceo && !isBlank(hit.compCEO, "미정")) {
        out.ceo = hit.compCEO as string;
        used = true;
      }
      if (want.has("industry") && !out.industry && !isBlank(hit.compIndustry, "기타")) {
        out.industry = hit.compIndustry as string;
        used = true;
      }
      if (used) out.matched.push({ source, name: hit.compName });
    } catch (e) {
      out.errors.push(`${SOURCE_LABEL[source]}: ${(e as Error).message}`);
    }
  }

  return out;
}
