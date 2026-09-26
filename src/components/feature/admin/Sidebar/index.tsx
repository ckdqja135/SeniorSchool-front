"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { ServiceConfig } from "@/types/Services";
import { fetchActiveServices } from "@/lib/services/serviceConfigAPI";
import { useNavigationGuard } from "@/components/common/NavigationGuard";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

interface MenuItem {
  icon: string;
  label: string;
  href: string;
  subItems: SubMenuItem[];
}

interface SubMenuItem {
  label: string;
  href: string;
  subItems?: SubMenuItem[];
}

// 접힘 상태에서 아이콘 클릭 시 오른쪽으로 펼쳐지는 플라이아웃 위치
interface Flyout {
  item: MenuItem;
  top: number;
  left: number;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();
  const { requestNavigation } = useNavigationGuard();
  const [dynamicServices, setDynamicServices] = useState<ServiceConfig[]>([]);

  useEffect(() => {
    fetchActiveServices().then(setDynamicServices).catch(() => {});
  }, []);

  // 기존 정적 메뉴
  const staticMenuItems: MenuItem[] = [
    {
      icon: "📊",
      label: "Dashboard",
      href: "/myoriadmin",
      subItems: [],
    },
    {
      icon: "🗂️",
      label: "자유게시판",
      href: "/myoriadmin/freeboard",
      subItems: [
        { label: "자유게시판 관리", href: "/myoriadmin/freeboard" }
      ],
    },
    {
      icon: "🎓",
      label: "학교 오빠",
      href: "/myoriadmin/school",
      subItems: [
        { label: "학교 관리", href: "/myoriadmin/school/management" },
        { label: "대학교 추가 요청 관리", href: "/myoriadmin/school/requests" },
        { label: "후기 관리", href: "/myoriadmin/school/board" },
      ],
    },
    {
      icon: "⛪",
      label: "교회 오빠",
      href: "/myoriadmin/church",
      subItems: [
        { label: "교회 관리", href: "/myoriadmin/church" },
        { label: "교회 추가 요청 관리", href: "/myoriadmin/church/requests" },
        { label: "후기 관리", href: "/myoriadmin/church/board" },
      ],
    },
    {
      icon: "✍️",
      label: "회사 오빠",
      href: "/myoriadmin/company",
      subItems: [
        { label: "회사 관리", href: "/myoriadmin/company" },
        { label: "회사 추가 요청 관리", href: "/myoriadmin/company/requests" },
        { label: "후기 관리", href: "/myoriadmin/company/board" },
        { label: "크롤러 관리", href: "/myoriadmin/company/crawler" },
      ],
    },
    {
      icon: "💼",
      label: "외주 오빠",
      href: "/myoriadmin/outsource",
      subItems: [
        { label: "외주업체 관리", href: "/myoriadmin/outsource" },
        { label: "외주업체 추가 요청 관리", href: "/myoriadmin/outsource/requests" },
        { label: "후기 관리", href: "/myoriadmin/outsource/board" },
      ],
    },
    {
      icon: "🍽️",
      label: "맛잘알 오빠",
      href: "/myoriadmin/restaurant",
      subItems: [
        { label: "식당 관리", href: "/myoriadmin/restaurant" },
        { label: "식당 추가 요청 관리", href: "/myoriadmin/restaurant/requests" },
        { label: "후기 관리", href: "/myoriadmin/restaurant/board" },
        { label: "크롤러 관리", href: "/myoriadmin/restaurant/crawler" },
      ],
    },
  ];

  // 동적 서비스 메뉴 생성
  const dynamicMenuItems: MenuItem[] = dynamicServices.map((svc) => ({
    icon: svc.serviceEmoji,
    label: svc.serviceDisplay,
    href: `/myoriadmin/services/${svc.serviceSlug}`,
    subItems: [
      { label: `${svc.serviceName} 관리`, href: `/myoriadmin/services/${svc.serviceSlug}` },
      { label: `추가 요청 관리`, href: `/myoriadmin/services/${svc.serviceSlug}/requests` },
      { label: `후기 관리`, href: `/myoriadmin/services/${svc.serviceSlug}/board` },
    ],
  }));

  // 하단 고정 메뉴
  const bottomMenuItems: MenuItem[] = [
    {
      icon: "🛠️",
      label: "서비스 관리",
      href: "/myoriadmin/services",
      subItems: [
        { label: "서비스 목록", href: "/myoriadmin/services" },
        { label: "서비스 추가", href: "/myoriadmin/services/create" },
      ],
    },
    {
      icon: "📈",
      label: "접속 분석",
      href: "/myoriadmin/analytics",
      subItems: [],
    },
    {
      icon: "👥",
      label: "관리자 관리",
      href: "/myoriadmin/admin",
      subItems: [],
    },
    {
      icon: "📝",
      label: "게시글 관리",
      href: "/myoriadmin/posts",
      subItems: [
        { label: "신고 게시글", href: "/myoriadmin/posts/reported" }
      ],
    },
  ];

  // 최종 메뉴 조합
  const menuItems: MenuItem[] = [
    ...staticMenuItems,
    ...dynamicMenuItems,
    ...bottomMenuItems,
  ];

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedSubItem, setExpandedSubItem] = useState<string | null>(null);
  const [flyout, setFlyout] = useState<Flyout | null>(null);

  const toggleExpanded = (href: string) => {
    setExpandedItem(expandedItem === href ? null : href);
  };

  const toggleSubExpanded = (href: string) => {
    setExpandedSubItem(expandedSubItem === href ? null : href);
  };

  const isItemActive = (item: MenuItem) =>
    item.subItems.length > 0 ? pathname.startsWith(item.href) : pathname === item.href;

  // 접힌 상태에서 아이콘 클릭 → 오른쪽 플라이아웃 열기 (하위 메뉴가 있을 때만)
  const handleCollapsedClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    item: MenuItem
  ) => {
    if (item.subItems.length === 0) {
      setFlyout(null);
      requestNavigation(item.href);
      return;
    }
    // 이미 같은 항목이 열려 있으면 토글로 닫기
    if (flyout?.item.href === item.href) {
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
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const active = isItemActive(item);

            // ── 접힌 상태: 아이콘만 표시, 클릭 시 오른쪽으로 플라이아웃 ──
            if (isCollapsed) {
              const flyoutOpen = flyout?.item.href === item.href;
              return (
                <li key={item.href}>
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
              <li key={item.href}>
                <div>
                  {item.subItems.length > 0 ? (
                    <button
                      onClick={() => toggleExpanded(item.href)}
                      className={`w-full flex items-center justify-between p-2 rounded-md transition-all duration-200 hover:bg-gray-700 ${
                        active ? "bg-gray-700 shadow-lg ring-2 ring-gray-500 ring-opacity-50" : ""
                      }`}
                    >
                      <div className="flex items-center">
                        <span className="text-xl mr-3">{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                      </div>
                      <span className="text-xs">
                        {expandedItem === item.href ? "▼" : "▶"}
                      </span>
                    </button>
                  ) : (
                    <button onClick={() => requestNavigation(item.href)} className="w-full text-left">
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
                  {item.subItems.length > 0 && expandedItem === item.href && (
                    <ul className="ml-8 mt-2 space-y-1">
                      {item.subItems.map((subItem) => (
                        <li key={subItem.href}>
                          {subItem.subItems && subItem.subItems.length > 0 ? (
                            <div>
                              <button
                                onClick={() => toggleSubExpanded(subItem.href)}
                                className={`w-full flex items-center justify-between p-2 text-xs rounded-md transition-all duration-200 hover:bg-gray-700 ${
                                  pathname.startsWith(subItem.href) ? "bg-gray-700 shadow-md ring-1 ring-gray-500 ring-opacity-50" : ""
                                }`}
                              >
                                <span>{subItem.label}</span>
                                <span className="text-xs">
                                  {expandedSubItem === subItem.href ? "▼" : "▶"}
                                </span>
                              </button>

                              {/* Third level items */}
                              {expandedSubItem === subItem.href && (
                                <ul className="ml-4 mt-1 space-y-1">
                                  {subItem.subItems.map((thirdItem) => (
                                    <li key={thirdItem.href}>
                                      <button onClick={() => requestNavigation(thirdItem.href)} className="w-full text-left">
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
                            <button onClick={() => requestNavigation(subItem.href)} className="w-full text-left">
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
            className="fixed z-[60] w-56 bg-gray-800 text-white rounded-lg shadow-2xl ring-1 ring-black/30 py-2 overflow-y-auto"
            style={{
              top: flyout.top,
              left: flyout.left,
              maxHeight: `calc(100vh - ${flyout.top}px - 16px)`,
            }}
          >
            {/* 헤더 (아이콘 + 대분류명) */}
            <div className="flex items-center gap-2 px-3 pb-2 mb-1 border-b border-gray-700">
              <span className="text-lg leading-none">{flyout.item.icon}</span>
              <span className="text-sm font-semibold">{flyout.item.label}</span>
            </div>
            <ul className="space-y-1 px-1">
              {flyout.item.subItems.map((subItem) => (
                <li key={subItem.href}>
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
                        <li key={thirdItem.href}>
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
