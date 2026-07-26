"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const PageTracker = () => {
  const pathname = usePathname();

  useEffect(() => {
    // 어드민 페이지 및 로컬 환경은 추적 제외
    if (pathname.startsWith("/myoriadmin")) return;
    if (typeof window !== "undefined" && window.location.hostname === "localhost") return;

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || "" }),
    }).catch(() => {});
  }, [pathname]);

  return null;
};

export default PageTracker;
