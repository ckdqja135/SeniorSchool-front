"use client";

import "@/styles/globals.css";
import DashboardLayout from "@/components/feature/admin/DashboardLayout";
import { usePathname } from "next/navigation";
import React from "react";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  
  // 로그인 페이지에서는 DashboardLayout을 사용하지 않음
  if (pathname === "/admin/sign-in") {
    return <>{children}</>;
  }

  return (
    <DashboardLayout>
      {children}
    </DashboardLayout>
  );
}
