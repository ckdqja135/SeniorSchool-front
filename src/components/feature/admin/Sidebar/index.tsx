"use client";

import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { isMenuActive, type MenuItem } from "../adminMenu";
import type { AdminMenuState } from "../useAdminMenu";
import { useNavigationGuard } from "@/components/common/NavigationGuard";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  /** 메뉴 정의. 헤더 이동 경로와 같은 목록을 쓰려고 레이아웃에서 받는다 */
  menuItems: MenuItem[];
  /** 메뉴 조회 상태 — 로딩 중/그룹 미배정을 빈 사이드바와 구분해 보여준다 */
  menuState?: AdminMenuState;
}

// 접힘 상태에서 아이콘 클릭 시 오른쪽으로 펼쳐지는 플라이아웃 위치
interface Flyout {
  item: MenuItem;
  top: number;
  left: number;
}

/** 펼침 상태·React key 로 쓸 식별자. DB 메뉴는 menuIdx 가 있어 경로가 겹쳐도 안전하다 */
const keyOf = (item: { menuIdx?: number; href: string }) =>
  item.menuIdx != null ? `m${item.menuIdx}` : item.href;

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed, menuItems, menuState }) => {
  const pathname = usePathname();
  const { requestNavigation } = useNavigationGuard();

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedSubItem, setExpandedSubItem] = useState<string | null>(null);
  const [flyout, setFlyout] = useState<Flyout | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  // 화면 아래로 넘치지 않게 보정한 플라이아웃 top. 아래쪽 아이콘도 하위 메뉴가 잘리지 않게 위로 올린다
  const [flyoutTop, setFlyoutTop] = useState<number | null>(null);

  useLayoutEffect(() => {
    if (!flyout || !flyoutRef.current) {
      setFlyoutTop(null);
      return;
    }
    const margin = 16;
    const height = flyoutRef.current.offsetHeight;
    setFlyoutTop(Math.max(margin, Math.min(flyout.top, window.innerHeight - height - margin)));
  }, [flyout]);

  const toggleExpanded = (key: string) => {
    setExpandedItem(expandedItem === key ? null : key);
  };

  const toggleSubExpanded = (key: string) => {
    setExpandedSubItem(expandedSubItem === key ? null : key);
  };

  // 묶음 메뉴는 자기 경로가 없어 하위 경로로 판정한다 (matchPaths)
  const isItemActive = (item: MenuItem) => isMenuActive(item, pathname);

  // 경로가 없는 묶음 메뉴는 이동시키지 않는다 (href 가 하위에서 빌려온 값이거나 가짜다)
  const go = (item: { href: string; navigable?: boolean }) => {
    if (item.navigable === false) return;
    requestNavigation(item.href);
  };

  // 접힌 상태에서 아이콘 클릭 → 오른쪽 플라이아웃 열기 (하위 메뉴가 있을 때만)
  const handleCollapsedClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: MenuItem
  ) => {
    if (item.subItems.length === 0) {
      setFlyout(null);
      go(item);
      return;
    }
    // 이미 같은 항목이 열려 있으면 토글로 닫기
    if (flyout && keyOf(flyout.item) === keyOf(item)) {
      setFlyout(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    setFlyout({ item, top: rect.top, left: rect.right + 8 });
  };

  const navigateFromFlyout = (href: string) => {
    setFlyout(null);
    requestNavigation(href);
  };

  // 사이드바를 펼치면 열려 있던 플라이아웃 닫기
  useEffect(() => {
    if (!isCollapsed) setFlyout(null);
  }, [isCollapsed]);

  // 페이지 이동 시 플라이아웃 닫기
  useEffect(() => {
    setFlyout(null);
  }, [pathname]);

  return (
    <div
      className={`bg-gray-900 text-white transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      } min-h-screen flex flex-col`}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div
          className={`flex items-center ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Image src="/images/duck.png" alt="Ori Duck" width={36} height={36} />
              <span className="text-lg font-bold text-white">Ori Admin</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            title={isCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            className="p-2 rounded-md text-gray-300 hover:text-white hover:bg-gray-700 transition-colors"
          >
            {isCollapsed ? (
              // 햄버거 아이콘 (펼치기)
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            ) : (
              // 이중 왼쪽 화살표 (접기)
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-3 overflow-y-auto overflow-x-hidden">
        {/* 메뉴를 받는 중 — 하드코딩 트리를 미리 그리지 않아 깜빡임이 없다 */}
        {menuState === "loading" && (
          <ul className="space-y-2" aria-hidden>
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 p-2">
                <span className="h-5 w-5 shrink-0 animate-pulse rounded bg-gray-700" />
                {!isCollapsed && <span className="h-3 flex-1 animate-pulse rounded bg-gray-700" />}
              </li>
            ))}
          </ul>
        )}

        {/* 메뉴는 있는데 이 계정에 보일 게 없다 → 빈 사이드바로 오해하지 않게 알려준다 */}
        {menuState === "empty" && !isCollapsed && (
          <p className="px-2 py-4 text-xs leading-relaxed text-gray-400 break-keep">
            표시할 메뉴가 없습니다.
            <br />
            관리자에게 권한 그룹 배정을 요청해주세요.
          </p>
        )}

        <ul className="space-y-2">
          {menuItems.map((item) => {
            const active = isItemActive(item);

            // ── 접힌 상태: 아이콘만 표시, 클릭 시 오른쪽으로 플라이아웃 ──
            if (isCollapsed) {
              const flyoutOpen = flyout != null && keyOf(flyout.item) === keyOf(item);
              return (
                <li key={keyOf(item)}>
                  <button
                    onClick={(e) => handleCollapsedClick(e, item)}
                    title={item.label}
                    aria-label={item.label}
                    className={`w-full flex items-center justify-center p-2 rounded-md transition-all duration-200 hover:bg-gray-700 ${
                      active || flyoutOpen
                        ? "bg-gray-700 ring-2 ring-gray-500 ring-opacity-50"
                        : ""
                    }`}
                  >
                    <span className="text-xl leading-none">{item.icon}</span>
                  </button>
                </li>
              );
            }

            // ── 펼친 상태: 기존 아코디언 UI ──
            return (
              <li key={keyOf(item)}>
                <div>
                  {item.subItems.length > 0 ? (
                    <button
                      onClick={() => toggleExpanded(keyOf(item))}
                      className={`w-full flex items-center justify-between p-2 rounded-md transition-all duration-200 hover:bg-gray-700 ${
                        active ? "bg-gray-700 shadow-lg ring-2 ring-gray-500 ring-opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-xl mr-3">{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="text-xs">
                        {expandedItem === keyOf(item) ? "▼" : "▶"}
                      </span>
                    </button>
                  ) : (
                    <button onClick={() => go(item)} className="w-full text-left">
                      <div
                        className={`flex items-center p-2 rounded-md transition-all duration-200 hover:bg-gray-700 ${
                          active ? "bg-gray-700 shadow-lg ring-2 ring-gray-500 ring-opacity-50" : ""
                        }`}
                      >
                        <span className="text-xl mr-3">{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                      </div>
                    </button>
                  )}

                  {/* Sub Items */}
                  {item.subItems.length > 0 && expandedItem === keyOf(item) && (
                    <ul className="ml-8 mt-2 space-y-1">
                      {item.subItems.map((subItem) => (
                        <li key={keyOf(subItem)}>
                          {subItem.subItems && subItem.subItems.length > 0 ? (
                            <div>
                              <button
                                onClick={() => toggleSubExpanded(keyOf(subItem))}
                                className={`w-full flex items-center justify-between p-2 text-xs rounded-md transition-all duration-200 hover:bg-gray-700 ${
                                  pathname.startsWith(subItem.href) ? "bg-gray-700 shadow-md ring-1 ring-gray-500 ring-opacity-50" : ""
                                }`}
                              >
                                <span>{subItem.label}</span>
                                <span className="text-xs">
                                  {expandedSubItem === keyOf(subItem) ? "▼" : "▶"}
                                </span>
                              </button>

                              {/* Third level items */}
                              {expandedSubItem === keyOf(subItem) && (
                                <ul className="ml-4 mt-1 space-y-1">
                                  {subItem.subItems.map((thirdItem) => (
                                    <li key={keyOf(thirdItem)}>
                                      <button onClick={() => go(thirdItem)} className="w-full text-left">
                                        <div
                                          className={`block p-2 text-xs rounded-md transition-all duration-200 hover:bg-gray-700 ${
                                            pathname === thirdItem.href ? "bg-gray-700 shadow-sm ring-1 ring-gray-500 ring-opacity-50" : ""
                                          }`}
                                        >
                                          {thirdItem.label}
                                        </div>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : (
                            <button onClick={() => go(subItem)} className="w-full text-left">
                              <div
                                className={`block p-2 text-xs rounded-md transition-all duration-200 hover:bg-gray-700 ${
                                  pathname === subItem.href ? "bg-gray-700 shadow-md ring-1 ring-gray-500 ring-opacity-50" : ""
                                }`}
                              >
                                {subItem.label}
                              </div>
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* ── 접힘 상태 플라이아웃 (오른쪽으로 펼쳐지는 메뉴) ── */}
      {isCollapsed && flyout && (
        <>
          {/* 바깥 클릭 시 닫기 위한 투명 오버레이 */}
          <div
            className="fixed inset-0 z-[55]"
            onClick={() => setFlyout(null)}
          />
          <div
            ref={flyoutRef}
            className="fixed z-[60] w-56 bg-gray-800 text-white rounded-lg shadow-2xl ring-1 ring-black/30 py-2 overflow-y-auto"
            style={{
              top: flyoutTop ?? flyout.top,
              left: flyout.left,
              // 스크롤은 메뉴가 화면 높이보다 길 때만 생긴다
              maxHeight: "calc(100vh - 32px)",
            }}
          >
            {/* 헤더 (아이콘 + 대분류명) */}
            <div className="flex items-center gap-2 px-3 pb-2 mb-1 border-b border-gray-700">
              <span className="text-lg leading-none">{flyout.item.icon}</span>
              <span className="text-sm font-semibold">{flyout.item.label}</span>
            </div>
            <ul className="space-y-1 px-1">
              {flyout.item.subItems.map((subItem) => (
                <li key={keyOf(subItem)}>
                  <button
                    onClick={() => navigateFromFlyout(subItem.href)}
                    className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors hover:bg-gray-700 ${
                      pathname === subItem.href ? "bg-gray-700" : ""
                    }`}
                  >
                    {subItem.label}
                  </button>

                  {/* 3단계 하위 메뉴 */}
                  {subItem.subItems && subItem.subItems.length > 0 && (
                    <ul className="ml-3 mt-1 space-y-1 border-l border-gray-700 pl-2">
                      {subItem.subItems.map((thirdItem) => (
                        <li key={keyOf(thirdItem)}>
                          <button
                            onClick={() => navigateFromFlyout(thirdItem.href)}
                            className={`w-full text-left px-3 py-1.5 text-xs rounded-md transition-colors hover:bg-gray-700 ${
                              pathname === thirdItem.href ? "bg-gray-700" : ""
                            }`}
                          >
                            {thirdItem.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default Sidebar;
