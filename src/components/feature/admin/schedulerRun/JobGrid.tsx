"use client";

/**
 * '스케줄러 실행' 카드 그리드.
 * 여러 개를 골라 같은 기간으로 한 번에 돌린다. 고른 순서대로 큐에 들어가 하나씩 실행된다.
 */
import { C, STATUS_TAG, fmtDateTime, fmtDuration, groupTag, type SchedulerJob } from "./shared";

export function JobGrid({
  jobs,
  loading,
  picked,
  onPickedChange,
  periodFrom,
  periodTo,
  onPeriodChange,
  onRun,
  running,
}: {
  jobs: SchedulerJob[];
  loading: boolean;
  picked: string[];
  onPickedChange: (keys: string[]) => void;
  periodFrom: string;
  periodTo: string;
  onPeriodChange: (from: string, to: string) => void;
  onRun: () => void;
  running: boolean;
}) {
  const allOn = jobs.length > 0 && picked.length === jobs.length;
  const toggle = (key: string) =>
    onPickedChange(picked.includes(key) ? picked.filter((k) => k !== key) : [...picked, key]);

  return (
    <section className="overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F5] px-[22px] py-4">
        <h2 className="text-[15px] font-extrabold">스케줄러 실행</h2>
        <span className="text-[12px] text-[#8A91A3]">실행할 스케줄러를 복수 선택하고 동일 기간으로 실행합니다</span>
      </div>

      <div className="flex flex-wrap items-center gap-2.5 border-b border-[#EEF0F5] px-[22px] py-3.5">
        <span className="text-[13px] font-semibold text-[#4A5266]">대상 기간</span>
        <input
          type="date"
          value={periodFrom}
          onChange={(e) => onPeriodChange(e.target.value, periodTo)}
          aria-label="대상 기간 시작"
          className="h-[38px] rounded-[10px] border border-[#DDE1EA] px-2.5 text-[13px] text-[#151A26] focus:border-[#1552D6] focus:outline-none"
        />
        <span className="text-[#AEB5C6]">~</span>
        <input
          type="date"
          value={periodTo}
          onChange={(e) => onPeriodChange(periodFrom, e.target.value)}
          aria-label="대상 기간 종료"
          className="h-[38px] rounded-[10px] border border-[#DDE1EA] px-2.5 text-[13px] text-[#151A26] focus:border-[#1552D6] focus:outline-none"
        />
        <span className="text-[11.5px] text-[#8A91A3]">※ 기간을 받는 스케줄러에만 적용됩니다</span>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => onPickedChange(allOn ? [] : jobs.map((j) => j.key))}
            disabled={loading || jobs.length === 0}
            className="h-[38px] whitespace-nowrap rounded-[10px] border border-[#DDE1EA] bg-white px-4 text-[13px] font-semibold text-[#151A26] hover:bg-[#F6F7FA] disabled:opacity-40"
          >
            {allOn ? "선택 해제" : "전체 선택"}
          </button>
          <button
            type="button"
            onClick={onRun}
            disabled={picked.length === 0 || running}
            className="h-[38px] whitespace-nowrap rounded-[10px] bg-[#1552D6] px-5 text-[13px] font-bold text-white hover:bg-[#0E3FAA] disabled:bg-[#AEB5C6]"
          >
            선택 실행 ({picked.length})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3.5 p-[22px]">
        {loading && jobs.length === 0 ? (
          <div className="col-span-full py-8 text-center text-[13px] text-[#8A91A3]">불러오는 중…</div>
        ) : jobs.length === 0 ? (
          <div className="col-span-full py-8 text-center text-[13px] text-[#8A91A3]">등록된 스케줄러가 없습니다.</div>
        ) : (
          jobs.map((j) => {
            const on = picked.includes(j.key);
            const last = j.lastRun;
            return (
              <div
                key={j.key}
                role="checkbox"
                aria-checked={on}
                tabIndex={0}
                onClick={() => toggle(j.key)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    toggle(j.key);
                  }
                }}
                className="flex cursor-pointer flex-col rounded-[12px] border bg-white p-3.5 transition-colors focus:outline-none focus-visible:border-[#1552D6]"
                style={{ borderColor: on ? C.primary : "#E3E6EE", background: on ? "#F5F8FF" : "#fff" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border text-[11px] font-bold text-white"
                    style={{ borderColor: on ? C.primary : "#CBD2E0", background: on ? C.primary : "#fff" }}
                  >
                    {on ? "✓" : ""}
                  </span>
                  <span
                    className="rounded-[5px] px-1.5 py-[3px] text-[10.5px] font-extrabold"
                    style={{ color: groupTag(j.group).fg, background: groupTag(j.group).bg }}
                  >
                    {j.group}
                  </span>
                </div>

                <div className="mt-2 break-keep text-[14px] font-bold text-[#151A26]">
                  {j.label} <span className="text-[12px] font-medium text-[#8A91A3]">({j.key})</span>
                </div>
                <p className="mt-1 break-keep text-[12.5px] leading-[1.5] text-[#6B7389]">{j.description}</p>
                <div className="mt-1.5 text-[11.5px] text-[#AEB5C6]">정기 실행 {j.cron}</div>

                <div className="mt-3 border-t border-[#EEF0F5] pt-2.5 text-[11.5px]">
                  {last ? (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="rounded-[5px] px-1.5 py-[2px] font-bold"
                        style={{ color: STATUS_TAG[last.status].fg, background: STATUS_TAG[last.status].bg }}
                      >
                        {STATUS_TAG[last.status].label}
                      </span>
                      <span className="text-[#8A91A3]">{fmtDateTime(last.startedAt)}</span>
                      {last.durationMs != null && <span className="text-[#AEB5C6]">· {fmtDuration(last.durationMs)}</span>}
                    </div>
                  ) : (
                    <span className="text-[#AEB5C6]">실행 이력 없음</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
