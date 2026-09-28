"use client";

/**
 * 상단 현황 줄: 전체 회사 · 최근 추가 · 홈페이지/대표이사/업종 보유율.
 * 보유율 칸을 누르면 '데이터 보강' 탭의 해당 누락 필터로 이동한다.
 */
import Link from "next/link";
import { Skeleton } from "@/components/common/Skeleton";
import { C, pct, type DbStats, type MissingCounts } from "./shared";

export type MissingFilter = "all" | "noURL" | "noCEO" | "noIndustry";

interface Cell {
  label: string;
  value: string;
  sub: string;
  subFg: string;
  /** 0~1. null 이면 막대를 숨긴다 */
  ratio: number | null;
  link?: string;
  href?: string;
  onClick?: () => void;
}

function barColor(ratio: number): string {
  if (ratio >= 0.95) return "#1EB45A";
  if (ratio >= 0.5) return "#E8A33A";
  return "#E05555";
}

export function HealthStrip({
  stats,
  missing,
  loading,
  onFix,
}: {
  stats: DbStats | null;
  missing: MissingCounts | null;
  loading: boolean;
  onFix: (f: MissingFilter) => void;
}) {
  const total = missing?.total || stats?.totalCompanies || 0;
  const coverage = (missingCount: number | undefined, label: string, f: MissingFilter): Cell => {
    const miss = missingCount ?? 0;
    const filled = Math.max(0, total - miss);
    const ratio = total ? filled / total : 0;
    return {
      label,
      value: pct(filled, total),
      sub: `${filled.toLocaleString()}곳`,
      subFg: C.faint,
      ratio,
      link: miss > 0 ? `누락 ${miss.toLocaleString()}곳 채우기 →` : "누락 없음",
      onClick: miss > 0 ? () => onFix(f) : undefined,
    };
  };

  const cells: Cell[] = [
    {
      label: "전체 회사",
      value: total.toLocaleString(),
      sub: `최근 7일 +${(stats?.recentAdded ?? 0).toLocaleString()}`,
      subFg: C.okFg,
      ratio: null,
    },
    {
      label: "최근 7일 추가",
      value: (stats?.recentAdded ?? 0).toLocaleString(),
      sub: "신규 수집분",
      subFg: C.faint,
      ratio: null,
      link: "회사 관리에서 검수 →",
      href: "/myoriadmin/company",
    },
    coverage(missing?.noURL, "홈페이지 보유", "noURL"),
    coverage(missing?.noCEO, "대표이사 보유", "noCEO"),
    coverage(missing?.noIndustry, "업종 보유", "noIndustry"),
  ];

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
      {cells.map((c) => {
        const body = (
          <>
            <div className="text-[12px] font-semibold text-[#7A8296]">{c.label}</div>
            {loading ? (
              <Skeleton className="mt-2 h-6 w-24" />
            ) : (
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-[22px] font-extrabold tracking-[-0.02em] text-[#151A26]">{c.value}</span>
                <span className="text-[12px] font-semibold" style={{ color: c.subFg }}>{c.sub}</span>
              </div>
            )}
            <div className="mt-2.5 h-[5px] overflow-hidden rounded bg-[#EEF0F5]" style={{ opacity: c.ratio === null ? 0 : 1 }}>
              {c.ratio !== null && (
                <div className="h-full rounded" style={{ width: `${Math.round(c.ratio * 1000) / 10}%`, background: barColor(c.ratio) }} />
              )}
            </div>
            <div className="mt-2 min-h-[16px] text-[11.5px] font-semibold text-[#1552D6]">{c.link}</div>
          </>
        );
        const cls = "border-b border-r border-[#EEF0F5] px-5 py-4 text-left last:border-r-0";
        if (c.href) {
          return (
            <Link key={c.label} href={c.href} className={`${cls} hover:bg-[#FAFBFD]`}>
              {body}
            </Link>
          );
        }
        if (c.onClick) {
          return (
            <button key={c.label} type="button" onClick={c.onClick} className={`${cls} hover:bg-[#FAFBFD] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1552D6]`}>
              {body}
            </button>
          );
        }
        return <div key={c.label} className={cls}>{body}</div>;
      })}
    </div>
  );
}
