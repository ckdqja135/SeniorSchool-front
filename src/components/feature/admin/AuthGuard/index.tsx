"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem("accessToken");
      const user = localStorage.getItem("user");

      if (!accessToken || !user) {
        setIsAuthenticated(false);
        if (pathname !== "/myoriadmin/sign-in") {
          router.replace("/myoriadmin/sign-in");
        }
        return;
      }

      // 토큰 유효성을 백엔드에 검증 요청
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/user/getAdminlist`, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        });

        if (response.status === 401 || response.status === 403) {
          // 토큰 만료 → 로그인 페이지로 이동
          localStorage.removeItem("user");
          localStorage.removeItem("accessToken");
          setIsAuthenticated(false);
          if (pathname !== "/myoriadmin/sign-in") {
            router.replace("/myoriadmin/sign-in");
          }
          return;
        }

        setIsAuthenticated(true);
      } catch {
        // 네트워크 오류 시 기존 토큰 유지
        setIsAuthenticated(true);
      }
    };

    checkAuth();
    
  }, [pathname, router]);

  // 로딩 중
  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  // 인증되지 않은 경우
  if (!isAuthenticated && pathname !== "/myoriadmin/sign-in") {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
