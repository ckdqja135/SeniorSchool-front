"use client";

/**
 * '진행 상황' 패널 — 실행 현황 표 바로 위에 둔다.
 *
 * 큐를 번호 원으로 가로 배열하고 → 로 잇는다. 실행 중인 건 파란 원 + 진행 바,
 * 대기 중인 건 회색 원이고 ✕ 로 큐에서 뺄 수 있다.
 * 실행 중인 건 중간에 끊으면 데이터가 어중간해지므로 취소 버튼을 주지 않는다.
 *
 * 잡 자체는 진행률을 모르므로, 진행 바는 '지난 성공 실행의 소요 시간' 대비 경과로 그린다.
 */
import { C, type Progress } from "./shared";

export function QueuePanel({
  progress,
  onCancel,
  canceling,
}: {
  progress: Progress | null;
  onCancel: (id: string) => void;
  canceling: string | null;
}) {
  const items = progress?.items ?? [];
  const runningCount = progress?.runningCount ?? 0;
  const waitingCount = progress?.waitingCount ?? 0;
  const active = runningCount > 0 || waitingCount > 0;

  if (!active) return null;

  return (
    <section className="overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F5] px-[22px] py-4">
        <h2 className="text-[15px] font-extrabold">진행 상황</h2>
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] text-[#8A91A3]">
            실행 중 {runningCount}건 · 대기 {waitingCount}건
          </span>
          <span
            className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold"
            style={{ color: C.primary, background: "#E8EFFE" }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.primary }} aria-hidden />
            실행 중
          </span>
        </div>
      </div>

      <div className="overflow-x-auto px-[22px] py-5">
        <ol className="flex min-w-max items-start gap-0">
          {items.map((it, i) => {
            const isRun = it.status === "running";
            const ratio =
              isRun && progress?.expectedMs && it.elapsedMs != null
                ? Math.min(0.95, it.elapsedMs / progress.expectedMs)
                : null;
            return (
              <li key={it.id} className="flex items-start">
                <div className="flex w-[124px] flex-col items-center">
                  <div className="relative">
                    <span
                      className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-[15px] font-bold text-white"
                      style={{ background: isRun ? C.primary : "#AEB5C6" }}
                    >
                      {i + 1}
                    </span>
                    {it.canCancel && (
                      <button
                        type="button"
                        onClick={() => onCancel(it.id)}
                        disabled={canceling === it.id}
                        aria-label={`${it.jobLabel} 대기 취소`}
                        title="대기에서 빼기"
                        className="absolute -right-1.5 -top-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[#E6E9F0] bg-white text-[10px] text-[#6B7389] shadow-sm hover:bg-[#FDECEC] hover:text-[#C23B3B] disabled:opacity-40"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <div className="mt-2 break-keep px-1 text-center text-[12.5px] font-bold text-[#151A26]">
                    {it.jobLabel}
                  </div>
                  <div className="mt-0.5 text-[11.5px]" style={{ color: isRun ? C.primary : "#8A91A3" }}>
                    {isRun ? "진행중" : "대기중"}
                    {it.trigger === "cron" && <span className="ml-1 text-[#AEB5C6]">(정기)</span>}
                  </div>

                  {isRun && (
                    <div className="mt-2 h-[3px] w-[96px] overflow-hidden rounded-full bg-[#E6E9F0]">
                      <div
                        className="h-full rounded-full transition-[width] duration-700"
                        style={{
                          width: ratio != null ? `${ratio * 100}%` : "35%",
                          background: C.primary,
                        }}
                      />
                    </div>
                  )}
                </div>

                {i < items.length - 1 && (
                  <span className="mt-[18px] px-1 text-[16px] text-[#CBD2E0]" aria-hidden>
                    →
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
