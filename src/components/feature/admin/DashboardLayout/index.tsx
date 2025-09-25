"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../Sidebar/index";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();

  const handleHomeClick = () => {
    router.push("/myoriadmin");
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
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 
              className="text-2xl font-semibold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={handleHomeClick}
            >
              Dashboard
            </h1>
            
            {/* User Menu */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button 
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  <span className="text-sm">Admin</span>
                  <span className="text-xs">▼</span>
                </button>
                
                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
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
