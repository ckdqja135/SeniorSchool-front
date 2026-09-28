/**
 * 스케줄러 실행 화면 공용 정의 — 타입, API 호출, 색.
 * 크롤러 관리 화면(restaurantCrawler/)과 같은 디자인 팔레트를 쓴다.
 *
 * 백엔드: /admin/scheduler-run/{jobs,run,progress,queue/:id,runs}
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

/** 디자인 팔레트 (Crawler Admin.dc.html 과 동일) */
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

/**
 * 잡 카드의 분류 배지 색. 서비스마다 달라야 한 눈에 구분된다.
 * 각 서비스의 기존 강조색을 따른다 (맛잘알 rose · 회사 purple · 교회 red · 학교 green · 외주 amber).
 * 등록되지 않은 그룹은 회색으로 떨어진다.
 */
export const GROUP_TAG: Record<string, { fg: string; bg: string }> = {
  "맛잘알 오빠": { fg: "#B4234B", bg: "#FDECF1" },
  "회사 오빠": { fg: "#6B3FA0", bg: "#F2EBFB" },
  "교회 오빠": { fg: "#C23B3B", bg: "#FDECEC" },
  "학교 오빠": { fg: "#0E7A43", bg: "#E4F6EC" },
  "외주 오빠": { fg: "#B4461A", bg: "#FDEBE1" },
};

export function groupTag(group: string): { fg: string; bg: string } {
  return GROUP_TAG[group] ?? { fg: "#5A6275", bg: "#EEF0F5" };
}

export type RunStatus = "running" | "success" | "failed" | "canceled";

export const STATUS_TAG: Record<RunStatus, { label: string; fg: string; bg: string; dot: string }> = {
  running: { label: "진행중", fg: C.primary, bg: "#E8EFFE", dot: C.primary },
  success: { label: "성공", fg: C.okFg, bg: C.okBg, dot: "#1EB45A" },
  failed: { label: "실패", fg: C.badFg, bg: C.badBg, dot: "#E05555" },
  canceled: { label: "취소", fg: C.neutralFg, bg: C.neutralBg, dot: "#AEB5C6" },
};

export interface LastRun {
  jobKey: string;
  status: RunStatus;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  resultMessage: string | null;
}

export interface SchedulerJob {
  key: string;
  label: string;
  description: string;
  group: string;
  cron: string;
  supportsPeriod: boolean;
  lastRun: LastRun | null;
}

export interface QueueItem {
  id: string;
  jobKey: string;
  jobLabel: string;
  status: "waiting" | "running";
  trigger: "manual" | "cron";
  startedAt: number | null;
  elapsedMs: number | null;
  canCancel: boolean;
}

export interface Progress {
  items: QueueItem[];
  runningCount: number;
  waitingCount: number;
  /** 지난 성공 실행의 소요 시간. 진행 바를 그리는 기준 */
  expectedMs: number | null;
}

export interface RunRow {
  runIdx: number;
  jobKey: string;
  jobLabel: string;
  trigger: "manual" | "cron";
  status: RunStatus;
  periodFrom: string | null;
  periodTo: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  resultMessage: string | null;
  error: string | null;
}

export interface RunsResponse {
  rows: RunRow[];
  counts: { total: number; running: number; success: number; failed: number };
}

// ─── 값 도우미 ────────────────────────────────────────────

export function fmtDateTime(v?: string | null): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

export function fmtDuration(ms?: number | null): string {
  if (ms == null) return "-";
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}초`;
  const m = Math.floor(s / 60);
  return `${m}분 ${String(Math.round(s % 60)).padStart(2, "0")}초`;
}

/** 어제 (대상 기간 기본값) */
export function yesterday(): string {
  const d = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
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

export async function apiSend<T>(method: "POST" | "DELETE", path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: authHeaders(body !== undefined),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || data?.success === false) throw new Error(data?.message || `서버 오류 (${res.status})`);
  return data as T;
}
