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
        if (pathname !== "/admin/sign-in") {
          router.push("/admin/sign-in");
        }
      }
    };

    checkAuth();
  }, [pathname, router]);

  // 로딩 중
  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  // 인증되지 않은 경우
  if (!isAuthenticated && pathname !== "/admin/sign-in") {
    return null;
  }

  return <>{children}</>;
};

export default AuthGuard;
