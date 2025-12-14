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
    const checkAuth = () => {
      const accessToken = localStorage.getItem("accessToken");
      const user = localStorage.getItem("user");
      
      if (accessToken && user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
        // 로그인 페이지가 아닌 경우에만 리다이렉트
        if (pathname !== "/myoriadmin/sign-in") {
          router.replace("/myoriadmin/sign-in");
        }
      }
    };

    checkAuth();
    
    // 전역 fetch 가드: 401/403이면 토큰 제거 후 로그인 페이지로 이동
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (response && (response.status === 401 || response.status === 403)) {
          // 토큰 만료 또는 인증 실패
          localStorage.removeItem("user");
          localStorage.removeItem("accessToken");
          setIsAuthenticated(false);
          
          // 현재 경로가 로그인 페이지가 아니면 리다이렉트
          const currentPath = window.location.pathname;
          if (currentPath !== "/myoriadmin/sign-in" && currentPath.startsWith("/myoriadmin")) {
            router.replace("/myoriadmin/sign-in");
          }
        }
        return response;
      } catch (e) {
        // 네트워크 오류 시에는 기존 동작 유지
        throw e;
      }
    };
    
    // cleanup: 원래 fetch 복원
    return () => {
      window.fetch = originalFetch;
    };
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
