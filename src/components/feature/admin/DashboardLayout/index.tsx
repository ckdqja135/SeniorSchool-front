"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "../Sidebar/index";
import { UserProps } from "@/types/User";
import { ServiceConfig } from "@/types/Services";
import { fetchActiveServices } from "@/lib/services/serviceConfigAPI";
import { buildAdminMenu, resolveBreadcrumb } from "../adminMenu";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [user, setUser] = useState<UserProps | null>(null);
  const [services, setServices] = useState<ServiceConfig[]>([]);
  const router = useRouter();
  const pathname = usePathname();

  // 사이드바와 헤더 이동 경로가 같은 메뉴 정의를 쓴다
  useEffect(() => {
    fetchActiveServices().then(setServices).catch(() => {});
  }, []);
  const menuItems = useMemo(() => buildAdminMenu(services), [services]);
  const crumbs = useMemo(() => resolveBreadcrumb(pathname, menuItems), [pathname, menuItems]);

  useEffect(() => {
    // localStorage에서 사용자 정보 가져오기
    const userStr = localStorage.getItem("user");
    if (userStr) {
      try {
        const userData = JSON.parse(userStr);
        setUser(userData);
      } catch (error) {
        console.error("사용자 정보 파싱 오류:", error);
      }
    }

    // 사이드바 접힘 상태 복원
    if (localStorage.getItem("adminSidebarCollapsed") === "true") {
      setIsCollapsed(true);
    }
  }, []);

  // 사이드바 접힘 상태 저장
  const handleToggleCollapsed = (collapsed: boolean) => {
    setIsCollapsed(collapsed);
    localStorage.setItem("adminSidebarCollapsed", String(collapsed));
  };

  const handleLogout = () => {
    // 로컬스토리지에서 사용자 정보 제거
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    
    // 로그인 페이지로 리다이렉트
    router.push("/myoriadmin/sign-in");
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={handleToggleCollapsed} menuItems={menuItems} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="relative z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-8 py-3">
          <div className="flex items-center justify-between">
            {/* 현재 경로의 이동 경로 (예: 맛잘알 오빠 / 크롤러 관리) */}
            <nav aria-label="현재 위치" className="flex min-w-0 items-center gap-2 text-[13.5px] text-[#7A8296]">
              {crumbs.map((c, i) => {
                const last = i === crumbs.length - 1;
                return (
                  <React.Fragment key={`${c.href}-${i}`}>
                    {i > 0 && <span className="text-[#C3C8D4]" aria-hidden>/</span>}
                    {last ? (
                      <b aria-current="page" className="truncate text-[15px] font-bold text-[#151A26]">{c.label}</b>
                    ) : (
                      <Link href={c.href} className="truncate hover:text-[#151A26]">{c.label}</Link>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>

            {/* User Menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              >
                <div className="w-7 h-7 bg-gradient-to-br from-gray-700 to-gray-900 rounded-lg flex items-center justify-center text-white text-xs font-semibold">
                  {(user?.username || "A").charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-gray-700">{user?.username || "Admin"}</span>
                <svg className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isUserMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg shadow-gray-200/50 py-1.5 z-50 border border-gray-100">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
