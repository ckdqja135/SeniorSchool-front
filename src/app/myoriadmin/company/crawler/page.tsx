"use client";

/**
 * 회사 오빠 › 크롤러 관리 (맛잘알 크롤러와 같은 디자인 'Crawler Admin.dc.html').
 *
 * - 상단: 제목 + '수집 실행 / 데이터 보강' 탭, 현황 줄(전체 회사·최근 추가·홈페이지/대표이사/업종 보유율)
 * - 수집 실행: 소스·지역·검색 조건 → 미리보기 → 골라서 저장, 오른쪽 실행 기록
 * - 데이터 보강: 누락 필터·검색 목록 + 오른쪽 상세 편집, 체크한 회사 일괄 재수집
 *
 * 사이드바·상단 헤더는 관리자 공용 레이아웃(DashboardLayout)이 그린다.
 */
import { useCallback, useEffect, useState } from "react";
import { CollectTab } from "@/components/feature/admin/companyCrawler/CollectTab";
import { EnrichTab } from "@/components/feature/admin/companyCrawler/EnrichTab";
import { HealthStrip, type MissingFilter } from "@/components/feature/admin/companyCrawler/HealthStrip";
import {
  apiGet,
  fetchMissingCounts,
  type DbStats,
  type MissingCounts,
  type SourceInfo,
} from "@/components/feature/admin/companyCrawler/shared";

type Tab = "collect" | "enrich";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "collect", label: "수집 실행" },
  { key: "enrich", label: "데이터 보강" },
];

export default function CompanyCrawlerPage() {
  const [tab, setTab] = useState<Tab>("collect");
  const [enrichFilter, setEnrichFilter] = useState<MissingFilter>("noURL");

  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [stats, setStats] = useState<DbStats | null>(null);
  const [missing, setMissing] = useState<MissingCounts | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const refreshStats = useCallback(async () => {
    const [s, m] = await Promise.allSettled([
      apiGet<DbStats>("/admin/company-crawler/stats"),
      fetchMissingCounts(),
    ]);
    if (s.status === "fulfilled") setStats(s.value);
    if (m.status === "fulfilled") setMissing(m.value);
    setStatsLoading(false);
  }, []);

  useEffect(() => {
    refreshStats();
    apiGet<SourceInfo[]>("/admin/company-crawler/sources")
      .then((list) => setSources(list))
      .catch(() => setSources([]));
  }, [refreshStats]);

  const goFix = (f: MissingFilter) => {
    setEnrichFilter(f);
    setTab("enrich");
  };

  return (
    <main className="flex w-full max-w-[1480px] flex-col gap-4 px-7 pb-6 pt-6 text-[#151A26]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">크롤러 관리</h1>
          <p className="mt-1 text-[13px] text-[#7A8296]">회사 데이터를 수집하고, 빠진 정보를 채웁니다.</p>
        </div>
        <div role="tablist" aria-label="크롤러 작업" className="flex gap-0.5 rounded-[11px] bg-[#E9ECF3] p-[3px]">
          {TABS.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setTab(t.key)}
                className="whitespace-nowrap rounded-[9px] px-[18px] py-2 text-[13.5px]"
                style={{
                  background: on ? "#fff" : "transparent",
                  color: on ? "#151A26" : "#6B7389",
                  fontWeight: on ? 700 : 500,
                  boxShadow: on ? "0 1px 3px rgba(20,26,40,.12)" : "none",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <HealthStrip stats={stats} missing={missing} loading={statsLoading} onFix={goFix} />

      {/* 탭을 오가도 수집 결과·실행 중 상태가 사라지지 않게 숨기기만 한다 */}
      <div hidden={tab !== "collect"}>
        <CollectTab sources={sources} onDataChanged={refreshStats} />
      </div>
      {/* 보강 탭도 숨기기만 한다 — 일괄 재수집이 도는 중에 탭을 바꿔도 멈추지 않게 */}
      <div hidden={tab !== "enrich"}>
        <EnrichTab
          active={tab === "enrich"}
          filter={enrichFilter}
          onFilterChange={setEnrichFilter}
          missing={missing}
          onDataChanged={refreshStats}
        />
      </div>
    </main>
  );
}
