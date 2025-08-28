"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, setIsCollapsed }) => {
  const pathname = usePathname();

  const menuItems = [
    {
      icon: "📊",
      label: "Dashboard",
      href: "/admin",
      subItems: [],
    },
    {
      icon: "🎓",
      label: "학교 오빠",
      href: "/admin/school",
      subItems: [
        { label: "학교 관리", href: "/admin/school/management" },
        { 
          label: "게시글 관리", 
          href: "/admin/school/posts",
          subItems: [
            { label: "신고 게시글", href: "/admin/school/posts/reported" }
          ]
        },
      ],
    },
    {
      icon: "✍️",
      label: "회사 오빠",
      href: "/admin/company",
      subItems: [],
    },
    {
      icon: "👥",
      label: "관리자 관리",
      href: "/admin/admin",
      subItems: [],
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
            <span className="text-lg font-semibold">Admin Page</span>
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
                    className={`w-full flex items-center justify-between p-2 rounded-md transition-colors hover:bg-gray-700 ${
                      pathname.startsWith(item.href) ? "bg-blue-600" : ""
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
                      className={`flex items-center p-2 rounded-md transition-colors hover:bg-gray-700 ${
                        pathname === item.href ? "bg-blue-600" : ""
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
                                className={`w-full flex items-center justify-between p-2 text-xs rounded-md transition-colors hover:bg-gray-700 ${
                                  pathname.startsWith(subItem.href) ? "bg-blue-600" : ""
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
                                          className={`block p-2 text-xs rounded-md transition-colors hover:bg-gray-700 ${
                                            pathname === thirdItem.href ? "bg-blue-600" : ""
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
                                className={`block p-2 text-xs rounded-md transition-colors hover:bg-gray-700 ${
                                  pathname === subItem.href ? "bg-blue-600" : ""
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
