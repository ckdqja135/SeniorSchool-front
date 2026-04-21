"use client";

import "@/styles/globals.css";
import DashboardLayout from "@/components/feature/admin/DashboardLayout";
import AuthGuard from "@/components/feature/admin/AuthGuard";
import { NavigationGuardProvider } from "@/components/common/NavigationGuard";
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
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
      />
      <Script
        src={`https://oapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${process.env.NEXT_PUBLIC_NAVER_CLIENT_ID}&submodules=geocoder`}
        strategy="afterInteractive"
      />
      <NavigationGuardProvider>
        <DashboardLayout>
          {children}
        </DashboardLayout>
      </NavigationGuardProvider>
    </AuthGuard>
  );
}
