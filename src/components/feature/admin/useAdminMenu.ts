"use client";

/**
 * 사이드바 메뉴를 DB(권한 그룹 기준)에서 받아 온다.
 *
 * 상태 네 가지를 구분한다 — 이 구분이 이 훅의 핵심이다.
 *   loading  : 아직 응답 전. 하드코딩 트리를 미리 그리지 않아 '전체 메뉴가 보였다 걸러지는' 깜빡임이 없다
 *   db       : 정상. 권한에 맞는 메뉴
 *   empty    : 메뉴는 있는데(totalMenus>0) 이 계정에 보일 게 없다 → 그룹 미배정 안내
 *   fallback : 조회 실패거나 DB 가 아직 비었다(totalMenus=0) → 예전 하드코딩 트리로 버틴다
 *
 * totalMenus 를 백엔드가 같이 주는 이유가 empty 와 fallback 을 가르기 위해서다.
 * 이게 없으면 마이그레이션 미적용 시 사이드바가 그냥 비어 어드민을 쓸 수 없다.
 *
 * 로그인 계정은 토큰으로 판별하므로 localStorage 의 user 를 기다리지 않는다.
 */
import { useCallback, useEffect, useState } from "react";
import type { ServiceConfig } from "@/types/Services";
import { apiGet } from "./adminApi";
import { buildAdminMenu, buildMenuFromDb, type DbMenuNode, type MenuItem } from "./adminMenu";

export type AdminMenuState = "loading" | "db" | "empty" | "fallback";

interface MyMenusResponse {
  success: boolean;
  menus: DbMenuNode[];
  totalMenus: number;
  hasGroup: boolean;
}

export function useAdminMenu(services: ServiceConfig[]): {
  menuItems: MenuItem[];
  state: AdminMenuState;
  reload: () => void;
} {
  const [dbMenus, setDbMenus] = useState<DbMenuNode[] | null>(null);
  const [state, setState] = useState<AdminMenuState>("loading");
  const [nonce, setNonce] = useState(0);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    let alive = true;

    apiGet<MyMenusResponse>("/admin/permission/menus/me")
      .then((r) => {
        if (!alive) return;
        if (!r.totalMenus) {
          // DB에 메뉴가 아직 없다 (마이그레이션 미적용) → 하드코딩 트리로 버틴다
          console.warn("[adminMenu] DB 메뉴가 비어 있어 기본 메뉴로 표시합니다.");
          setState("fallback");
          return;
        }
        setDbMenus(r.menus || []);
        setState((r.menus || []).length === 0 ? "empty" : "db");
      })
      .catch((e) => {
        if (!alive) return;
        console.warn(`[adminMenu] 메뉴 조회 실패, 기본 메뉴로 표시합니다: ${e?.message ?? e}`);
        setState("fallback");
      });

    return () => {
      alive = false;
    };
  }, [nonce]);

  const menuItems =
    state === "db" && dbMenus
      ? buildMenuFromDb(dbMenus, services)
      : state === "fallback"
        ? buildAdminMenu(services)
        : [];

  return { menuItems, state, reload };
}
