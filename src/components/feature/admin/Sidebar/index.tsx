"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

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

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();

  const menuItems: MenuItem[] = [
    {
      icon: "📊",
      label: "Dashboard",
      href: "/myoriadmin",
      subItems: [],
    },
    {
      icon: "🎓",
      label: "학교 오빠",
      href: "/myoriadmin/school",
      subItems: [
        { label: "학교 관리", href: "/myoriadmin/school/management" },
        { label: "대학교 추가 요청", href: "/myoriadmin/school/requests" },
      ],
    },
    {
      icon: "⛪",
      label: "교회 오빠",
      href: "/myoriadmin/church",
      subItems: [
        { label: "교회 관리", href: "/myoriadmin/church" },
        { label: "교회 추가 요청", href: "/myoriadmin/church/requests" },
      ],
    },
    {
      icon: "✍️",
      label: "회사 오빠",
      href: "/myoriadmin/company",
      subItems: [
        { label: "회사 관리", href: "/myoriadmin/company" },
        { label: "회사 추가 요청", href: "/myoriadmin/company/requests" },
      ],
    },
    {
      icon: "💼",
      label: "외주 오빠",
      href: "/myoriadmin/outsource",
      subItems: [
        { label: "외주업체 관리", href: "/myoriadmin/outsource" },
        { label: "외주업체 추가 요청", href: "/myoriadmin/outsource/requests" },
      ],
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
    }
  ];

  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [expandedSubItem, setExpandedSubItem] = useState<string | null>(null);

  const toggleExpanded = (href: string) => {
    setExpandedItem(expandedItem === href ? null : href);
  };

  const toggleSubExpanded = (href: string) => {
    setExpandedSubItem(expandedSubItem === href ? null : href);
  };

  return (
    <div
      className={`bg-gray-900 text-white transition-all duration-300 ${
        isCollapsed ? "w-16" : "w-64"
      } min-h-screen flex flex-col`}
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
                <Image src="/images/duck.png" alt="Ori Duck" width={40} height={40} />
              <span className="text-lg font-bold text-white">Ori Admin</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
          >
            {isCollapsed ? "☰" : "✕"}
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.href}>
              <div>
                {item.subItems.length > 0 ? (
                  <button
                    onClick={() => toggleExpanded(item.href)}
                    className={`w-full flex items-center justify-between p-2 rounded-md transition-all duration-200 hover:bg-gray-700 ${
                      pathname.startsWith(item.href) ? "bg-gray-700 shadow-lg ring-2 ring-gray-500 ring-opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{item.icon}</span>
                      {!isCollapsed && (
                        <span className="text-sm">{item.label}</span>
                      )}
                    </div>
                    {!isCollapsed && (
                      <span className="text-xs">
                        {expandedItem === item.href ? "▼" : "▶"}
                      </span>
                    )}
                  </button>
                ) : (
                  <Link href={item.href}>
                    <div
                      className={`flex items-center p-2 rounded-md transition-all duration-200 hover:bg-gray-700 ${
                        pathname === item.href ? "bg-gray-700 shadow-lg ring-2 ring-gray-500 ring-opacity-50" : ""
                      }`}
                    >
                      <span className="text-xl mr-3">{item.icon}</span>
                      {!isCollapsed && (
                        <span className="text-sm">{item.label}</span>
                      )}
                    </div>
                  </Link>
                )}

                {/* Sub Items */}
                {item.subItems.length > 0 &&
                  expandedItem === item.href &&
                  !isCollapsed && (
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
                                      <Link href={thirdItem.href}>
                                        <div
                                          className={`block p-2 text-xs rounded-md transition-all duration-200 hover:bg-gray-700 ${
                                            pathname === thirdItem.href ? "bg-gray-700 shadow-sm ring-1 ring-gray-500 ring-opacity-50" : ""
                                          }`}
                                        >
                                          {thirdItem.label}
                                        </div>
                                      </Link>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ) : (
                            <Link href={subItem.href}>
                              <div
                                className={`block p-2 text-xs rounded-md transition-all duration-200 hover:bg-gray-700 ${
                                  pathname === subItem.href ? "bg-gray-700 shadow-md ring-1 ring-gray-500 ring-opacity-50" : ""
                                }`}
                              >
                                {subItem.label}
                              </div>
                            </Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
              </div>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
