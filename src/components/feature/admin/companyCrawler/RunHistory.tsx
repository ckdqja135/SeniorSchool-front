"use client";

/**
 * '실행 기록' 패널. 진행 중인 실행은 소스별 진행 막대로, 끝난 실행은 요약 한 줄로 보여준다.
 *
 * 서버는 실행 기록을 저장하지 않는다. 이 브라우저에서 돌린 실행을 localStorage 에 7일 동안 남긴다.
 */
import { C, SOURCE_TAG, fmtDuration, fmtTime, isSourceKey, type CrawlProgress, type RunLog } from "./shared";

// 맛잘알 크롤러와 같은 키를 쓰면 실행 기록이 섞인다
const STORE_KEY = "ori.admin.companyCrawler.runs";
const KEEP_MS = 7 * 24 * 60 * 60 * 1000;

export function loadRuns(): RunLog[] {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    const list: RunLog[] = raw ? JSON.parse(raw) : [];
    const since = Date.now() - KEEP_MS;
    return Array.isArray(list) ? list.filter((r) => r.finishedAt >= since) : [];
  } catch {
    return [];
  }
}

export function saveRuns(list: RunLog[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, 30)));
  } catch {
    /* 저장이 막힌 브라우저면 기록만 안 남는다 */
  }
}

export interface ActiveRun {
  title: string;
  sources: string[];
  countPerSource: number;
  progress: CrawlProgress | null;
}

type Status = { label: string; fg: string; bg: string };

function statusOf(r: RunLog, previewOpenId: string | null): Status {
  if (!r.ok) return { label: "실패", fg: C.badFg, bg: C.badBg };
  if (r.failedSources.length > 0) return { label: "일부 실패", fg: C.warnFg, bg: C.warnBg };
  if (r.saved > 0) return { label: "완료", fg: C.okFg, bg: C.okBg };
  if (r.id === previewOpenId) return { label: "저장 전", fg: C.primary, bg: "#E8EFFE" };
  return { label: "저장 안 함", fg: C.neutralFg, bg: C.neutralBg };
}

function srcLabel(s: string) {
  return isSourceKey(s) ? SOURCE_TAG[s].label : s;
}

export function RunHistory({
  runs,
  active,
  previewOpenId,
  onRerun,
  onShowPreview,
}: {
  runs: RunLog[];
  active: ActiveRun | null;
  /** 지금 화면에 결과가 열려 있는 실행 (그 실행만 '결과 보기'가 된다) */
  previewOpenId: string | null;
  onRerun: (run: RunLog, onlySources?: string[]) => void;
  onShowPreview: () => void;
}) {
  return (
    <div className="min-w-[300px] max-w-full flex-[1_1_320px] overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
      <div className="flex items-center justify-between border-b border-[#EEF0F5] px-[18px] py-4">
        <div className="text-[15px] font-extrabold">실행 기록</div>
        <span className="text-[12px] text-[#8A91A3]" title="서버에 저장되지 않아, 이 브라우저에서 실행한 기록만 보입니다">
          최근 7일 · 이 브라우저
        </span>
      </div>

      <div className="flex max-h-[720px] flex-col overflow-y-auto">
        {active && (
          <div className="flex flex-col gap-[9px] border-b border-[#F2F3F7] px-[18px] py-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-[7px]">
                <span className="whitespace-nowrap rounded-md px-[7px] py-[3px] text-[11px] font-extrabold" style={{ color: C.primary, background: "#E8EFFE" }}>
                  진행 중
                </span>
                <span className="truncate text-[13.5px] font-bold">{active.title}</span>
              </div>
              <span className="whitespace-nowrap text-[11.5px] text-[#8A91A3]">방금</span>
            </div>
            <div className="flex flex-col gap-[7px]">
              {active.sources.map((s) => {
                const info = active.progress?.sources?.[s];
                const fetched = info?.fetched ?? 0;
                const done = info?.status === "done";
                const failed = info?.status === "error";
                const w = done ? 100 : Math.min(100, Math.round((fetched / Math.max(1, active.countPerSource)) * 100));
                return (
                  <div key={s} className="flex items-center gap-2 text-[11.5px]">
                    <span className="w-[34px] font-semibold text-[#5A6275]">{srcLabel(s)}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded bg-[#EEF0F5]">
                      <div
                        className="h-full rounded transition-[width]"
                        style={{ width: `${w}%`, background: failed ? "#E05555" : done ? "#1EB45A" : C.primary }}
                      />
                    </div>
                    <span className="w-11 text-right tabular-nums text-[#8A91A3]">
                      {failed ? "실패" : info ? (done ? `${fetched}건` : `${fetched}/${active.countPerSource}`) : "대기"}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-[12px] text-[#5A6275]">
              {active.progress?.message ||
                (typeof active.progress?.totalFetched === "number"
                  ? `누적 ${active.progress.totalFetched}건`
                  : "수집을 시작했습니다")}
            </div>
          </div>
        )}

        {!active && runs.length === 0 && (
          <div className="px-[18px] py-12 text-center">
            <div className="text-[13px] text-[#5A6275]">아직 실행 기록이 없습니다.</div>
            <div className="mt-1 text-[11.5px] text-[#8A91A3]">조건을 정하고 수집을 시작해보세요.</div>
          </div>
        )}

        {runs.map((r) => {
          const st = statusOf(r, previewOpenId);
          const title = `${r.region} · ${r.query || "전체"}`;
          const meta = !r.ok
            ? r.message
            : r.failedSources.length > 0
              ? `${r.failedSources.map(srcLabel).join("·")} 실패 · 신규 ${r.fresh}`
              : r.saved > 0
                ? `저장 ${r.saved} · 신규 ${r.fresh} · 중복 ${r.existing + r.crossDup} · ${fmtDuration(r.finishedAt - r.startedAt)}`
                : `${r.fetched}건 수집 · 신규 ${r.fresh} · 중복 ${r.existing + r.crossDup} · ${fmtDuration(r.finishedAt - r.startedAt)}`;

          let action: { label: string; fg: string; onClick: () => void } | null = null;
          if (r.failedSources.length > 0 && r.ok) {
            action = { label: `${r.failedSources.map(srcLabel).join("·")}만 다시 실행`, fg: C.primary, onClick: () => onRerun(r, r.failedSources) };
          } else if (r.id === previewOpenId) {
            action = { label: "결과 보기", fg: C.primary, onClick: onShowPreview };
          } else {
            action = { label: "다시 실행", fg: C.primary, onClick: () => onRerun(r) };
          }

          return (
            <div key={r.id} className="flex flex-col gap-[9px] border-b border-[#F2F3F7] px-[18px] py-3.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-[7px]">
                  <span className="whitespace-nowrap rounded-md px-[7px] py-[3px] text-[11px] font-extrabold" style={{ color: st.fg, background: st.bg }}>
                    {st.label}
                  </span>
                  <span className="truncate text-[13.5px] font-bold">{title}</span>
                </div>
                <span className="whitespace-nowrap text-[11.5px] text-[#8A91A3]">{fmtTime(r.finishedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate text-[12px] text-[#5A6275]" title={meta}>{meta}</span>
                <button
                  type="button"
                  onClick={action.onClick}
                  disabled={!!active}
                  className="shrink-0 whitespace-nowrap p-0 text-[12px] font-bold disabled:opacity-40"
                  style={{ color: action.fg }}
                >
                  {action.label}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
