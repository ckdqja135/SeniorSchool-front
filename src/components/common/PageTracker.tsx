"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// 새로 로드된 첫 진입 여부 (전체 새로고침 때만 true 로 초기화된다)
let isFirstLoad = true;

const PageTracker = () => {
  const pathname = usePathname();

  useEffect(() => {
    const firstLoad = isFirstLoad;
    isFirstLoad = false;

    // 어드민 페이지 및 로컬 환경은 추적 제외
    if (pathname.startsWith("/myoriadmin")) return;
    if (typeof window !== "undefined" && window.location.hostname === "localhost") return;

    const track = () =>
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: pathname, referrer: document.referrer || "" }),
      }).catch(() => {});
    track();
    if (firstLoad) track();
  }, [pathname]);

  return null;
};

export default PageTracker;
