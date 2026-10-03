/**
 * 어드민 화면 공용 API 호출 + 디자인 팔레트.
 *
 * 크롤러 관리 · 스케줄러 실행 · 권한 관리가 같은 팔레트와 같은 호출 방식을 쓴다.
 * (원래 schedulerRun/shared.ts 에 있던 것을 여러 화면이 쓰게 되어 여기로 옮겼다)
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

function authHeaders(json = false): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

/** 응답에 실린 message 를 그대로 Error 로 올린다 (백엔드가 한글 안내문을 준다) */
async function unwrap<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok || (data as any)?.success === false) {
    throw new Error((data as any)?.message || `서버 오류 (${res.status})`);
  }
  return data as T;
}

export async function apiGet<T>(path: string): Promise<T> {
  return unwrap<T>(await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() }));
}

export type SendMethod = "POST" | "PUT" | "PATCH" | "DELETE";

export async function apiSend<T>(method: SendMethod, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: authHeaders(body !== undefined),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  return unwrap<T>(res);
}

/** 상태 코드를 알아야 하는 곳(권한 없음 403 구분 등)에서 쓴다 */
export async function apiGetRaw<T>(path: string): Promise<{ status: number; data: T | null }> {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: authHeaders() });
  const data = await res.json().catch(() => null);
  return { status: res.status, data: data as T | null };
}
