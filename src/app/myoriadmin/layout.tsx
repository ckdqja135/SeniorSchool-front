"use client";

import "@/styles/globals.css";
import DashboardLayout from "@/components/feature/admin/DashboardLayout";
import AuthGuard from "@/components/feature/admin/AuthGuard";
import { usePathname } from "next/navigation";
import React from "react";
import Script from "next/script";

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();

  // 로그인 페이지에서는 DashboardLayout을 사용하지 않음
  if (pathname === "/myoriadmin/sign-in") {
    return <>{children}</>;
  }

  return (
    <AuthGuard>
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}&submodules=geocoder`}
        strategy="afterInteractive"
      />
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </AuthGuard>
  );
}
