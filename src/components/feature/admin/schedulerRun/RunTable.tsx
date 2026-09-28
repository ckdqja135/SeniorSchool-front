"use client";

/** '스케줄러 실행 현황' 표 + 우상단 집계 칩. 수동·정기 실행이 같이 쌓인다. */
import { C, STATUS_TAG, fmtDateTime, fmtDuration, type RunsResponse } from "./shared";

const GRID = "grid grid-cols-[minmax(0,1.4fr)_76px_minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1.1fr)_84px_minmax(0,1.3fr)] gap-2.5";

function CountChip({ label, value, fg, bg }: { label: string; value: number; fg: string; bg: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12px] font-semibold" style={{ background: bg }}>
      <span className="text-[#5A6275]">{label}</span>
      <span className="tabular-nums font-bold" style={{ color: fg }}>{value.toLocaleString()}</span>
    </span>
  );
}

export function RunTable({ data, loading }: { data: RunsResponse | null; loading: boolean }) {
  const rows = data?.rows ?? [];
  const c = data?.counts;

  return (
    <section className="overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F5] px-[22px] py-4">
        <h2 className="text-[15px] font-extrabold">스케줄러 실행 현황</h2>
        {c && (
          <div className="flex flex-wrap gap-1.5">
            <CountChip label="전체" value={c.total} fg={C.ink} bg="#F1F3F8" />
            <CountChip label="진행중" value={c.running} fg={C.primary} bg="#E8EFFE" />
            <CountChip label="성공" value={c.success} fg={C.okFg} bg={C.okBg} />
            <CountChip label="실패" value={c.failed} fg={C.badFg} bg={C.badBg} />
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[860px]">
          <div className={`${GRID} border-b border-[#EEF0F5] bg-[#FAFBFD] px-[22px] py-2.5 text-[11.5px] font-bold text-[#7A8296]`}>
            <span>작업명</span>
            <span>상태</span>
            <span>대상 기간</span>
            <span>시작 시간</span>
            <span>종료 시간</span>
            <span>소요 시간</span>
            <span>결과</span>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {loading && rows.length === 0 ? (
              <div className="px-[22px] py-12 text-center text-[13px] text-[#8A91A3]">불러오는 중…</div>
            ) : rows.length === 0 ? (
              <div className="px-[22px] py-12 text-center text-[13px] text-[#8A91A3]">아직 실행 기록이 없습니다.</div>
            ) : (
              rows.map((r) => {
                const tag = STATUS_TAG[r.status] ?? STATUS_TAG.canceled;
                const period = r.periodFrom || r.periodTo ? `${r.periodFrom ?? ""} ~ ${r.periodTo ?? ""}` : "-";
                return (
                  <div key={r.runIdx} className={`${GRID} items-center border-b border-[#F2F3F7] px-[22px] py-[11px] text-[12.5px]`}>
                    <span className="min-w-0 truncate font-bold text-[#151A26]" title={`${r.jobLabel} (${r.jobKey})`}>
                      {r.jobLabel}
                      {r.trigger === "cron" && <span className="ml-1 text-[11px] font-medium text-[#AEB5C6]">정기</span>}
                    </span>
                    <span className="flex items-center gap-1.5 whitespace-nowrap font-semibold" style={{ color: tag.fg }}>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: tag.dot }} aria-hidden />
                      {tag.label}
                    </span>
                    <span className="truncate text-[#8A91A3]">{period}</span>
                    <span className="tabular-nums text-[#5A6275]">{fmtDateTime(r.startedAt)}</span>
                    <span className="tabular-nums text-[#5A6275]">{fmtDateTime(r.finishedAt)}</span>
                    <span className="tabular-nums text-[#5A6275]">{fmtDuration(r.durationMs)}</span>
                    <span className="min-w-0 truncate" style={{ color: r.error ? C.badFg : "#4A5266" }} title={r.error || r.resultMessage || ""}>
                      {r.error || r.resultMessage || "-"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
