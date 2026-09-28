/**
 * 권한 관리 화면 공용 정의 — 타입과 API 호출.
 *
 * 백엔드: /admin/permission/{menus,menus/me,groups}  +  기존 /admin/user/*
 * 팔레트·fetch 래퍼는 어드민 공용(adminApi.ts)을 쓴다.
 */
import { apiGet, apiSend, apiGetRaw } from "../adminApi";

export { C } from "../adminApi";

// ─── 타입 ────────────────────────────────────────────────

export interface GroupRow {
  groupIdx: number;
  groupCode: string;
  groupName: string;
  /** master·admin 붙박이 그룹. 이름 변경·삭제가 막혀 있다 */
  isBuiltIn: boolean;
  userCount: number;
}

export interface MenuNode {
  menuIdx: number;
  menuName: string;
  menuPath: string | null;
  menuIcon: string | null;
  sortOrder: number;
  children: MenuNode[];
  /** 관리자 조회에만 실린다. master 그룹 키는 들어오지 않는다(코드에서 전체 노출) */
  rolePermissions?: Record<string, boolean>;
}

export interface AdminRow {
  userIdx: number;
  userId: string;
  userRole: string;
  groupIdx: number | null;
  groupCode: string | null;
  groupName: string | null;
  lastLogin: string | null;
  userStatus: number;
}

/** 메뉴별·그룹별 체크값 (트리 모양과 분리해서 들고 있는다) */
export type PermMap = Record<number, Record<string, boolean>>;

export const MASTER_CODE = "master";
/** 사이드바가 3단까지만 그리므로 백엔드도 3단으로 제한한다 */
export const MAX_DEPTH = 3;

// ─── 권한/메뉴 API ───────────────────────────────────────

interface EditorData {
  success: boolean;
  groups: GroupRow[];
  menus: MenuNode[];
}

/** 화면 초기 데이터. master 가 아니면 403 이라 상태 코드를 봐야 한다 */
export async function fetchEditorData(): Promise<
  { ok: true; groups: GroupRow[]; menus: MenuNode[] } | { ok: false; forbidden: boolean; message: string }
> {
  const { status, data } = await apiGetRaw<EditorData & { message?: string }>("/admin/permission/menus");
  if (status === 200 && data) {
    return { ok: true, groups: data.groups ?? [], menus: data.menus ?? [] };
  }
  return {
    ok: false,
    forbidden: status === 403,
    message: data?.message || `권한 정보를 불러오지 못했습니다. (${status})`,
  };
}

export interface SaveMenuItem {
  menuIdx: number;
  parentIdx: number | null;
  sortOrder: number;
  rolePermissions: Record<string, boolean>;
}

/** 순서·상위·그룹별 노출을 한 번에 저장. 받은 메뉴만 갱신하고 삭제는 하지 않는다 */
export function saveMenus(items: SaveMenuItem[]) {
  return apiSend<{ message: string; updated: number }>("PUT", "/admin/permission/menus", { items });
}

export function createMenu(body: { menuName: string; menuPath: string | null; menuIcon: string | null; parentIdx: number | null }) {
  return apiSend<{ message: string; menuIdx: number }>("POST", "/admin/permission/menus", body);
}

export function updateMenu(menuIdx: number, body: { menuName: string; menuPath: string | null; menuIcon: string | null }) {
  return apiSend<{ message: string }>("PATCH", `/admin/permission/menus/${menuIdx}`, body);
}

export function deleteMenu(menuIdx: number) {
  return apiSend<{ message: string; deletedCount: number }>("DELETE", `/admin/permission/menus/${menuIdx}`);
}

export function createGroup(groupName: string) {
  return apiSend<{ message: string; data: GroupRow }>("POST", "/admin/permission/groups", { groupName });
}

export function renameGroup(groupIdx: number, groupName: string) {
  return apiSend<{ message: string }>("PATCH", `/admin/permission/groups/${groupIdx}`, { groupName });
}

export function deleteGroup(groupIdx: number) {
  return apiSend<{ message: string }>("DELETE", `/admin/permission/groups/${groupIdx}`);
}

// ─── 계정 API (기존 /admin/user 재사용) ──────────────────

export function fetchAdmins() {
  return apiGet<AdminRow[]>("/admin/user/getAdminlist");
}

export function createAdminAccount(body: { userId: string; userPw: string; groupIdx: number }) {
  return apiSend<{ message: string }>("POST", "/admin/user/createAdmin", body);
}

/** 권한 그룹 변경 / 활성·비활성 / 비밀번호 재설정 — 보낸 필드만 바뀐다 */
export function patchAdminAccount(body: { userIdx: number; groupIdx?: number; userStatus?: number; userPw?: string }) {
  return apiSend<{ message: string }>("PATCH", "/admin/user/patchAdmin", body);
}

export function deleteAdminAccount(userIdx: number) {
  return apiSend<{ message: string }>("DELETE", "/admin/user/deleteAdmin", { userIdx });
}

// ─── 값 도우미 ───────────────────────────────────────────

export function fmtDateTime(v?: string | null): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
