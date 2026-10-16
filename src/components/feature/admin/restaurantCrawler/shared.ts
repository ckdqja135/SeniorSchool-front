/**
 * 맛잘알 크롤러 관리 화면 공용 정의 — 타입, API 호출, 색·라벨, 지역 목록.
 *
 * 백엔드: /admin/crawler/* (수집·진행 상황·저장·현황), GET /restaurant (보강 목록),
 * PUT /admin/restaurant/:idx (필드 수정, base64 이미지 저장 지원).
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

/** 디자인 팔레트 (Crawler Admin.dc.html) */
export const C = {
  primary: "#1552D6",
  ink: "#151A26",
  muted: "#7A8296",
  faint: "#8A91A3",
  line: "#E6E9F0",
  lineSoft: "#EEF0F5",
  okFg: "#0E7A43",
  okBg: "#E4F6EC",
  badFg: "#C23B3B",
  badBg: "#FDECEC",
  neutralFg: "#5A6275",
  neutralBg: "#EEF0F5",
  warnFg: "#B4461A",
  warnBg: "#FDEBE1",
} as const;

export type SourceKey = "kakao" | "naver" | "siksin";

export const SOURCE_TAG: Record<SourceKey, { code: string; label: string; fg: string; bg: string }> = {
  kakao: { code: "KAKAO", label: "카카오", fg: "#8A5A00", bg: "#FFF4CC" },
  naver: { code: "NAVER", label: "네이버", fg: "#0B7A3B", bg: "#E2F6E9" },
  siksin: { code: "SIKSIN", label: "식신", fg: "#B4461A", bg: "#FDEBE1" },
};

export function isSourceKey(v: unknown): v is SourceKey {
  return v === "kakao" || v === "naver" || v === "siksin";
}

/**
 * DB 에는 출처 컬럼이 없다. 수집 때 넣은 restaurantURL 의 도메인으로 출처를 추정한다
 * (카카오 place_url · 네이버 link · 식신 상세 링크). 알 수 없으면 null.
 */
export function sourceFromUrl(url?: string | null): SourceKey | null {
  if (!url) return null;
  if (/kakao\.com/i.test(url)) return "kakao";
  if (/naver\.(com|me)/i.test(url)) return "naver";
  if (/siksinhot\.com|siksin/i.test(url)) return "siksin";
  return null;
}

export interface SourceInfo {
  name: string;
  label: string;
  ready: boolean;
  reason?: string;
  note?: string;
}

export interface DbStats {
  totalRestaurants: number;
  withMenu: number;
  withImage: number;
  withRating: number;
  recentAdded: number;
}

/** GET /admin/crawler/missing-stats 를 필터 칩·현황 줄에 쓰기 좋게 정리한 값 */
export interface MissingCounts {
  total: number;
  noMenu: number;
  noImage: number;
  noURL: number;
}

export interface CrawlStats {
  sources?: Record<string, number>;
  totalFetched: number;
  duplicateSkipped?: number;
  crossSourceDuplicate?: number;
  coordFixed?: number;
  saved?: number;
  failed?: number;
  alreadyInDB?: number;
}

export interface CrawlProgress {
  found: boolean;
  phase?: string;
  message?: string;
  sources?: Record<string, { status: string; fetched: number; error?: string }>;
  totalFetched?: number;
  alreadyInDB?: number;
  crossSourceDuplicate?: number;
}

export interface CrawlResult {
  success: boolean;
  message: string;
  stats: CrawlStats;
  data?: PreviewItem[];
}

export interface MenuItem {
  name: string;
  price?: string | number | null;
}

/** 수집 미리보기 한 건 (백엔드 normalize 결과 + 판정 표시) */
export interface PreviewItem {
  restaurantName: string;
  restaurantType?: string;
  restaurantAddr?: string;
  restaurantLatX?: number | string | null;
  restaurantLatY?: number | string | null;
  restaurantURL?: string;
  restaurantImage?: string | null;
  restaurantMenu?: MenuItem[] | null;
  _source?: string;
  _existsInDb?: number | null;
  _duplicateOf?: number | null;
  [k: string]: unknown;
}

export interface RestaurantRow {
  restaurantIdx: string | number;
  restaurantName: string;
  restaurantType?: string;
  restaurantAddr?: string;
  restaurantLocation?: string;
  restaurantLatX?: number | string | null;
  restaurantLatY?: number | string | null;
  restaurantURL?: string | null;
  restaurantImage?: string | null;
  restaurantMenu?: MenuItem[] | string | null;
  restaurantViewCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/** 실행 기록. 서버에 저장되지 않아 이 브라우저(localStorage)에만 남긴다 */
export interface RunLog {
  id: string;
  startedAt: number;
  finishedAt: number;
  sources: string[];
  region: string;
  query: string;
  countPerSource: number;
  ok: boolean;
  message: string;
  fetched: number;
  fresh: number;
  existing: number;
  crossDup: number;
  saved: number;
  /** 소스별 오류 (일부 실패 판정·'○○만 다시 실행' 용) */
  failedSources: string[];
}

// ─── 판정 ────────────────────────────────────────────────

export type Judge = "new" | "exists" | "dup" | "nocoord";

export const JUDGE_LABEL: Record<Judge, { label: string; fg: string; bg: string }> = {
  new: { label: "신규", fg: C.okFg, bg: C.okBg },
  exists: { label: "기존과 중복", fg: C.neutralFg, bg: C.neutralBg },
  dup: { label: "중복 의심", fg: "#8A5A00", bg: "#FFF4CC" },
  nocoord: { label: "좌표 없음", fg: C.badFg, bg: C.badBg },
};

/** 좌표가 없으면 저장 때 백엔드가 건너뛴다 → 먼저 판정한다 */
export function judgeOf(item: PreviewItem): Judge {
  const lat = Number(item.restaurantLatX);
  const lng = Number(item.restaurantLatY);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) return "nocoord";
  if (item._existsInDb) return "exists";
  if (item._duplicateOf !== null && item._duplicateOf !== undefined) return "dup";
  return "new";
}

// ─── 값 도우미 ────────────────────────────────────────────

export function parseMenu(raw: RestaurantRow["restaurantMenu"]): MenuItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function imageSrc(path?: string | null): string | null {
  if (!path) return null;
  if (/^(https?:|data:)/.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function pct(part: number, total: number): string {
  if (!total) return "0%";
  const v = (part / total) * 100;
  return `${v >= 99.5 && v < 100 ? v.toFixed(1) : Math.round(v)}%`;
}

export function fmtTime(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fmtDuration(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}분 ${String(s % 60).padStart(2, "0")}초` : `${s}초`;
}

// ─── API ────────────────────────────────────────────────

function authHeaders(json = false): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || `서버 오류 (${res.status})`);
  return data as T;
}

export async function apiSend<T>(method: "POST" | "PUT", path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) throw new Error(data?.message || `서버 오류 (${res.status})`);
  return data as T;
}

export async function fetchMissingCounts(): Promise<MissingCounts> {
  const d = await apiGet<Array<{ key: string; total: number; missing: number }>>("/admin/crawler/missing-stats");
  const byKey = (k: string) => d.find((x) => x.key === k)?.missing ?? 0;
  return {
    total: d[0]?.total ?? 0,
    noMenu: byKey("restaurantMenu"),
    noImage: byKey("restaurantImage"),
    noURL: byKey("restaurantURL"),
  };
}

// ─── 지역 ────────────────────────────────────────────────

export const CITY_OPTIONS = [
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

export const SUB_REGIONS: Record<string, string[]> = {
  서울: ["전체","강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"],
  부산: ["전체","강서구","금정구","기장군","남구","동구","동래구","부산진구","북구","사상구","사하구","서구","수영구","연제구","영도구","중구","해운대구"],
  대구: ["전체","남구","달서구","달성군","동구","북구","서구","수성구","중구"],
  인천: ["전체","강화군","계양구","남동구","동구","미추홀구","부평구","서구","연수구","옹진군","중구"],
  광주: ["전체","광산구","남구","동구","북구","서구"],
  대전: ["전체","대덕구","동구","서구","유성구","중구"],
  울산: ["전체","남구","동구","북구","울주군","중구"],
  세종: ["전체"],
  경기: ["전체","가평군","고양시","과천시","광명시","광주시","구리시","군포시","김포시","남양주시","동두천시","부천시","성남시","수원시","시흥시","안산시","안성시","안양시","양주시","양평군","여주시","연천군","오산시","용인시","의왕시","의정부시","이천시","파주시","평택시","포천시","하남시","화성시"],
  강원: ["전체","강릉시","고성군","동해시","삼척시","속초시","양구군","양양군","영월군","원주시","인제군","정선군","철원군","춘천시","태백시","평창군","홍천군","화천군","횡성군"],
  충북: ["전체","괴산군","단양군","보은군","영동군","옥천군","음성군","제천시","증평군","진천군","청주시","충주시"],
  충남: ["전체","계룡시","공주시","금산군","논산시","당진시","보령시","부여군","서산시","서천군","아산시","예산군","천안시","청양군","태안군","홍성군"],
  전북: ["전체","고창군","군산시","김제시","남원시","무주군","부안군","순창군","완주군","익산시","임실군","장수군","전주시","정읍시","진안군"],
  전남: ["전체","강진군","고흥군","곡성군","광양시","구례군","나주시","담양군","목포시","무안군","보성군","순천시","신안군","여수시","영광군","영암군","완도군","장성군","장흥군","진도군","함평군","해남군","화순군"],
  경북: ["전체","경산시","경주시","고령군","구미시","군위군","김천시","문경시","봉화군","상주시","성주군","안동시","영덕군","영양군","영주시","영천시","예천군","울릉군","울진군","의성군","청도군","청송군","칠곡군","포항시"],
  경남: ["전체","거제시","거창군","고성군","김해시","남해군","밀양시","사천시","산청군","양산시","의령군","진주시","창녕군","창원시","통영시","하동군","함안군","함양군","합천군"],
  제주: ["전체","제주시","서귀포시"],
};

/** 보강 검색창 한 칸으로 이름·지역을 같이 받는다. 지역 이름이면 location 으로 보낸다 */
const REGION_TOKENS = new Set<string>([
  ...CITY_OPTIONS,
  ...Object.values(SUB_REGIONS).flat().filter((v) => v !== "전체"),
]);

export function searchParamsFor(q: string): { name?: string; location?: string } {
  const t = q.trim();
  if (!t) return {};
  const parts = t.split(/\s+/);
  if (parts.every((p) => REGION_TOKENS.has(p))) return { location: t };
  return { name: t };
}
