"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const PageTracker = () => {
  const pathname = usePathname();

  useEffect(() => {
    // 어드민 페이지는 추적 제외
    if (pathname.startsWith("/myoriadmin")) return;

    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: pathname, referrer: document.referrer || "" }),
    }).catch(() => {});
  }, [pathname]);

  return null;
};

export default PageTracker;
