"use client";

/**
 * '수집 실행' 탭: 소스·지역·검색 조건을 정해 수집하고(항상 미리보기), 결과에서 골라 저장한다.
 *
 * - 수집은 블로킹 요청 하나라서, 같은 runId 로 /admin/crawler/progress 를 1초마다 물어 진행 막대를 그린다.
 * - 저장은 화면에 보이는 행을 그대로 보낸다(/admin/crawler/save) — 다시 수집하면 검토한 목록과 달라질 수 있다.
 * - 기존과 중복·중복 의심·좌표 없음은 기본으로 선택에서 뺀다.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  C,
  CITY_OPTIONS,
  JUDGE_LABEL,
  SOURCE_TAG,
  SUB_REGIONS,
  apiGet,
  apiSend,
  fmtTime,
  isSourceKey,
  judgeOf,
  type CrawlProgress,
  type CrawlResult,
  type Judge,
  type PreviewItem,
  type RunLog,
  type SourceInfo,
} from "./shared";
import { RunHistory, loadRuns, saveRuns, type ActiveRun } from "./RunHistory";

const PER_MIN = 10;
const PER_MAX = 100;
const PER_STEP = 10;

function StepTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-[13.5px] font-bold">
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#151A26] text-[11px] text-white">{n}</span>
      {children}
    </div>
  );
}

function Check({ on, size = 18 }: { on: boolean; size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-[5px] border-[1.5px] text-[11px] font-extrabold text-white"
      style={{ width: size, height: size, borderColor: on ? C.primary : "#CBD2E0", background: on ? C.primary : "#fff" }}
    >
      {on ? "✓" : ""}
    </span>
  );
}

function SrcTag({ source }: { source?: string }) {
  if (!isSourceKey(source)) {
    return <span className="rounded-[5px] bg-[#EEF0F5] px-1.5 py-[3px] text-[10.5px] font-extrabold text-[#5A6275]">{source || "?"}</span>;
  }
  const t = SOURCE_TAG[source];
  return (
    <span className="rounded-[5px] px-1.5 py-[3px] text-[10.5px] font-extrabold" style={{ color: t.fg, background: t.bg }}>
      {t.label}
    </span>
  );
}

const selectCls =
  "h-[42px] min-w-0 flex-1 rounded-[10px] border border-[#DDE1EA] bg-white px-3 text-[14px] text-[#151A26] focus:border-[#1552D6] focus:outline-none disabled:bg-[#F6F7FA] disabled:text-[#8A91A3]";

export function CollectTab({ sources, onDataChanged }: { sources: SourceInfo[]; onDataChanged: () => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  const [city, setCity] = useState("서울");
  const [gu, setGu] = useState("전체");
  const [kw, setKw] = useState("맛집");
  const [per, setPer] = useState(30);

  const [active, setActive] = useState<ActiveRun | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [runs, setRuns] = useState<RunLog[]>([]);

  const [preview, setPreview] = useState<{ runId: string; region: string; query: string; items: PreviewItem[] } | null>(null);
  const [previewShown, setPreviewShown] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  /** 폴링으로 받은 최신 진행 상황. 끝났을 때 어느 소스가 실패했는지 판정하는 데 쓴다 */
  const progressRef = useRef<CrawlProgress | null>(null);

  useEffect(() => setRuns(loadRuns()), []);

  // 소스 목록을 받으면 준비된 소스를 기본 선택
  useEffect(() => {
    setPicked(sources.filter((s) => s.ready).map((s) => s.name));
  }, [sources]);

  const region = gu === "전체" ? city : `${city} ${gu}`;
  const running = active !== null;

  const updateRuns = useCallback((fn: (prev: RunLog[]) => RunLog[]) => {
    setRuns((prev) => {
      const next = fn(prev);
      saveRuns(next);
      return next;
    });
  }, []);

  const lastRunOf = useCallback(
    (source: string) => runs.find((r) => r.sources.includes(source))?.finishedAt ?? null,
    [runs],
  );

  const run = useCallback(
    async (opts: { sources: string[]; region: string; query: string; per: number }) => {
      if (opts.sources.length === 0) {
        setError("소스를 하나 이상 선택해주세요.");
        return;
      }
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const startedAt = Date.now();
      setError(null);
      setActive({ title: `${opts.region} · ${opts.query || "전체"}`, sources: opts.sources, countPerSource: opts.per, progress: null });

      progressRef.current = null;
      const poll = window.setInterval(async () => {
        try {
          const p = await apiGet<CrawlProgress>(`/admin/crawler/progress/${runId}`);
          if (p?.found) {
            progressRef.current = p;
            setActive((a) => (a ? { ...a, progress: p } : a));
          }
        } catch {
          /* 폴링 실패는 넘긴다 — 본 요청 결과가 최종 판단 기준 */
        }
      }, 1000);

      try {
        const data = await apiSend<CrawlResult>("POST", "/admin/crawler/run", {
          sources: opts.sources,
          query: opts.query,
          region: opts.region,
          countPerSource: opts.per,
          dryRun: true,
          runId,
        });
        const items = data.data || [];
        const judged = items.map(judgeOf);
        const failedSources = opts.sources.filter((s) => progressRef.current?.sources?.[s]?.status === "error");

        setPreview({ runId, region: opts.region, query: opts.query, items });
        setPreviewShown(true);
        setSelected(new Set(items.map((_, i) => i).filter((i) => judged[i] === "new")));
        updateRuns((prev) => [
          {
            id: runId,
            startedAt,
            finishedAt: Date.now(),
            sources: opts.sources,
            region: opts.region,
            query: opts.query,
            countPerSource: opts.per,
            ok: true,
            message: data.message,
            fetched: items.length,
            fresh: judged.filter((j) => j === "new").length,
            existing: judged.filter((j) => j === "exists").length,
            crossDup: judged.filter((j) => j === "dup").length,
            saved: 0,
            failedSources,
          },
          ...prev,
        ]);
      } catch (e) {
        const message = (e as Error).message || "수집 중 오류가 발생했습니다.";
        setError(message);
        updateRuns((prev) => [
          {
            id: runId,
            startedAt,
            finishedAt: Date.now(),
            sources: opts.sources,
            region: opts.region,
            query: opts.query,
            countPerSource: opts.per,
            ok: false,
            message,
            fetched: 0,
            fresh: 0,
            existing: 0,
            crossDup: 0,
            saved: 0,
            failedSources: [],
          },
          ...prev,
        ]);
      } finally {
        window.clearInterval(poll);
        setActive(null);
      }
    },
    [updateRuns],
  );

  const startFromForm = () => run({ sources: picked, region, query: kw.trim(), per });

  const rerun = (r: RunLog, only?: string[]) => {
    const [c, g] = r.region.split(" ");
    if (CITY_OPTIONS.includes(c)) {
      setCity(c);
      setGu(g && SUB_REGIONS[c]?.includes(g) ? g : "전체");
    }
    setKw(r.query);
    setPer(r.countPerSource);
    const srcs = only ?? r.sources;
    setPicked(srcs);
    run({ sources: srcs, region: r.region, query: r.query, per: r.countPerSource });
  };

  const items = preview?.items ?? [];
  const judges = useMemo(() => items.map(judgeOf), [items]);
  const counts = useMemo(() => {
    const c: Record<Judge, number> = { new: 0, exists: 0, dup: 0, nocoord: 0 };
    judges.forEach((j) => (c[j] += 1));
    return c;
  }, [judges]);

  const toggleRow = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const allOn = items.length > 0 && selected.size === items.length;
  const toggleAll = () => setSelected(allOn ? new Set() : new Set(items.map((_, i) => i)));

  const save = async () => {
    if (!preview) return;
    const chosen = items.filter((_, i) => selected.has(i));
    if (chosen.length === 0) return;
    const risky = chosen.filter((it) => judgeOf(it) !== "new").length;
    const warn = risky > 0 ? `\n(기존과 중복·중복 의심·좌표 없음 ${risky}건 포함)` : "";
    if (!window.confirm(`선택한 ${chosen.length}건을 저장할까요?${warn}`)) return;

    setSaving(true);
    setError(null);
    try {
      const res = await apiSend<{ message: string; stats?: { saved?: number } }>("POST", "/admin/crawler/save", { items: chosen });
      const savedN = res.stats?.saved ?? chosen.length;
      // 저장한 행은 빼고 나머지를 남겨 이어서 고를 수 있게 한다
      const rest = items.filter((_, i) => !selected.has(i));
      setPreview(rest.length > 0 ? { ...preview, items: rest } : null);
      setPreviewShown(rest.length > 0);
      setSelected(new Set());
      updateRuns((prev) => prev.map((r) => (r.id === preview.runId ? { ...r, saved: r.saved + savedN } : r)));
      onDataChanged();
      window.alert(res.message);
    } catch (e) {
      setError((e as Error).message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const pickedLabels = picked.filter(isSourceKey).map((s) => SOURCE_TAG[s].label);
  const summary =
    (pickedLabels.length ? `${pickedLabels.join("·")} ${pickedLabels.length}개 소스` : "소스를 선택하세요") +
    ` · ${city} ${gu}` +
    (kw.trim() ? ` · '${kw.trim()}'` : "");

  return (
    <div className="flex flex-wrap items-start gap-4">
      <div className="flex min-w-0 flex-[1_1_640px] flex-col gap-4">
        {/* 조건 카드 */}
        <div className="overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
          <div className="flex flex-col gap-[22px] px-[22px] py-5">
            <div>
              <StepTitle n={1}>데이터 소스</StepTitle>
              <div className="mt-3 grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-2.5">
                {sources.map((s) => {
                  const on = picked.includes(s.name);
                  const tag = isSourceKey(s.name) ? SOURCE_TAG[s.name] : { code: s.name.toUpperCase(), label: s.label, fg: "#5A6275", bg: "#EEF0F5" };
                  const last = lastRunOf(s.name);
                  return (
                    <button
                      key={s.name}
                      type="button"
                      disabled={!s.ready || running}
                      aria-pressed={on}
                      onClick={() => setPicked((p) => (on ? p.filter((x) => x !== s.name) : [...p, s.name]))}
                      className="flex flex-col gap-2 rounded-xl border-[1.5px] p-3.5 text-left disabled:cursor-not-allowed disabled:opacity-60"
                      style={{ borderColor: on ? C.primary : "#E3E6EE", background: on ? "#F5F8FF" : "#fff" }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="rounded-[5px] px-[7px] py-[3px] text-[10.5px] font-extrabold tracking-[0.04em]" style={{ color: tag.fg, background: tag.bg }}>
                          {tag.code}
                        </span>
                        <Check on={on} />
                      </div>
                      <div className="text-[15px] font-extrabold text-[#151A26]">{s.label}</div>
                      {s.ready ? (
                        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#0E7A43]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#1EB45A]" />
                          {s.note ? `${s.note.replace(/\s*\(API 키 불필요\)/, "")} · API 키 불필요` : "API 연결됨"}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[#C23B3B]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#E05555]" />
                          {s.reason || "사용 불가"}
                        </div>
                      )}
                      <div className="border-t border-[#EEF0F5] pt-2 text-[11.5px] text-[#8A91A3]">
                        {last ? `마지막 실행 ${fmtTime(last)}` : "이 브라우저 실행 기록 없음"}
                      </div>
                    </button>
                  );
                })}
                {sources.length === 0 && <div className="text-[13px] text-[#8A91A3]">소스 목록을 불러오는 중…</div>}
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
              <div>
                <StepTitle n={2}>지역</StepTitle>
                <div className="mt-3 flex gap-2">
                  <select
                    aria-label="시/도"
                    value={city}
                    disabled={running}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setGu("전체");
                    }}
                    className={selectCls}
                  >
                    {CITY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  </select>
                  <select aria-label="구/군" value={gu} disabled={running} onChange={(e) => setGu(e.target.value)} className={selectCls}>
                    {(SUB_REGIONS[city] || ["전체"]).map((o) => <option key={o}>{o}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <StepTitle n={3}>검색 조건</StepTitle>
                <div className="mt-3 flex gap-2">
                  <input
                    value={kw}
                    disabled={running}
                    onChange={(e) => setKw(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && !running && startFromForm()}
                    placeholder="검색어 (예: 맛집, 한식)"
                    aria-label="검색어"
                    className="h-[42px] min-w-0 flex-1 rounded-[10px] border border-[#DDE1EA] px-3 text-[14px] text-[#151A26] focus:border-[#1552D6] focus:outline-none"
                  />
                  <div className="flex h-[42px] shrink-0 items-center overflow-hidden rounded-[10px] border border-[#DDE1EA]">
                    <button
                      type="button"
                      aria-label="소스당 건수 줄이기"
                      disabled={running || per <= PER_MIN}
                      onClick={() => setPer((v) => Math.max(PER_MIN, v - PER_STEP))}
                      className="h-full w-[34px] bg-[#F6F7FA] text-[16px] text-[#5A6275] disabled:opacity-40"
                    >
                      −
                    </button>
                    <div className="w-[66px] whitespace-nowrap text-center text-[14px] font-bold" aria-live="polite">
                      {per}
                      <span className="text-[11px] font-medium text-[#8A91A3]"> 건</span>
                    </div>
                    <button
                      type="button"
                      aria-label="소스당 건수 늘리기"
                      disabled={running || per >= PER_MAX}
                      onClick={() => setPer((v) => Math.min(PER_MAX, v + PER_STEP))}
                      className="h-full w-[34px] bg-[#F6F7FA] text-[16px] text-[#5A6275] disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="mt-1.5 text-[11.5px] text-[#8A91A3]">소스당 건수</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF0F5] bg-[#F8F9FC] px-[22px] py-3.5">
            <div className="text-[13px] leading-normal text-[#4A5266]">
              {summary} · 최대 <b className="text-[#151A26]">{(picked.length * per).toLocaleString()}건</b>
            </div>
            <button
              type="button"
              onClick={startFromForm}
              disabled={running || picked.length === 0}
              className="h-[42px] whitespace-nowrap rounded-[10px] bg-[#1552D6] px-[22px] text-[13.5px] font-bold text-white hover:bg-[#0E3FAA] disabled:cursor-not-allowed disabled:bg-[#AEB5C6]"
            >
              {running ? "수집 중…" : "수집 시작"}
            </button>
          </div>
        </div>

        {error && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-[12px] border border-[#F4C7C7] bg-[#FDECEC] px-4 py-3">
            <p className="text-[13px] font-semibold text-[#C23B3B]">{error}</p>
            <button type="button" onClick={() => setError(null)} className="shrink-0 text-[12px] font-bold text-[#C23B3B]">
              닫기
            </button>
          </div>
        )}

        {/* 수집 결과 */}
        {preview && previewShown && (
          <div className="overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EEF0F5] px-[22px] py-4">
              <div className="flex flex-wrap items-center gap-2.5">
                <div className="text-[15px] font-extrabold">수집 결과</div>
                <span className="text-[12px] text-[#8A91A3]">
                  저장 전 · {preview.region} · &apos;{preview.query || "전체"}&apos;
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(["new", "exists", "dup", "nocoord"] as Judge[])
                  .filter((j) => j === "new" || counts[j] > 0)
                  .map((j) => (
                    <span key={j} className="whitespace-nowrap rounded-[7px] px-[9px] py-[5px] text-[12px] font-bold" style={{ color: JUDGE_LABEL[j].fg, background: JUDGE_LABEL[j].bg }}>
                      {JUDGE_LABEL[j].label} {counts[j]}
                    </span>
                  ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[36px_minmax(0,1.4fr)_80px_minmax(0,1.6fr)_90px_56px_56px] items-center gap-2.5 border-b border-[#EEF0F5] bg-[#FAFBFD] px-[22px] py-2.5 text-[11.5px] font-bold text-[#8A91A3]">
                  <button type="button" onClick={toggleAll} aria-label={allOn ? "전체 해제" : "전체 선택"} className="flex">
                    <Check on={allOn} size={17} />
                  </button>
                  <span>식당명</span>
                  <span>소스</span>
                  <span>주소</span>
                  <span>판정</span>
                  <span>메뉴</span>
                  <span>이미지</span>
                </div>
                <div className="max-h-[520px] overflow-y-auto">
                  {items.map((it, i) => {
                    const on = selected.has(i);
                    const j = judges[i];
                    const menuN = Array.isArray(it.restaurantMenu) ? it.restaurantMenu.length : 0;
                    const imgN = it.restaurantImage ? 1 : 0;
                    const dupOf = it._duplicateOf !== null && it._duplicateOf !== undefined ? items[it._duplicateOf] : null;
                    return (
                      <div
                        key={`${it.restaurantName}-${i}`}
                        role="checkbox"
                        aria-checked={on}
                        tabIndex={0}
                        onClick={() => toggleRow(i)}
                        onKeyDown={(e) => {
                          if (e.key === " " || e.key === "Enter") {
                            e.preventDefault();
                            toggleRow(i);
                          }
                        }}
                        className="grid cursor-pointer grid-cols-[36px_minmax(0,1.4fr)_80px_minmax(0,1.6fr)_90px_56px_56px] items-center gap-2.5 border-b border-[#F2F3F7] px-[22px] py-[11px] text-[13px] hover:bg-[#FAFBFD] focus:outline-none focus-visible:bg-[#F2F6FF]"
                        style={{ opacity: on ? 1 : 0.55 }}
                      >
                        <Check on={on} size={17} />
                        <span className="truncate font-bold" title={it.restaurantName}>{it.restaurantName}</span>
                        <span><SrcTag source={it._source} /></span>
                        <span className="truncate text-[#5A6275]" title={it.restaurantAddr}>{it.restaurantAddr || "주소 확인 불가"}</span>
                        <span>
                          <span
                            className="whitespace-nowrap rounded-md px-[7px] py-[3px] text-[11px] font-bold"
                            style={{ color: JUDGE_LABEL[j].fg, background: JUDGE_LABEL[j].bg }}
                            title={dupOf ? `${dupOf.restaurantName} (${dupOf._source}) 와 같은 가게로 보입니다` : undefined}
                          >
                            {JUDGE_LABEL[j].label}
                          </span>
                        </span>
                        <span className="font-semibold" style={{ color: menuN ? C.ink : C.badFg }}>{menuN || "—"}</span>
                        <span className="font-semibold" style={{ color: imgN ? C.ink : C.badFg }}>{imgN || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] py-3.5">
              <span className="text-[12.5px] text-[#7A8296]">
                {items.length}건 중 {selected.size}건 선택 · 중복·좌표 없음은 기본 제외
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewShown(false)}
                  className="h-[38px] whitespace-nowrap rounded-[9px] border border-[#DDE1EA] bg-white px-3.5 text-[13px] font-semibold text-[#4A5266] hover:bg-[#F6F7FA]"
                >
                  닫기
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={saving || selected.size === 0}
                  className="h-[38px] whitespace-nowrap rounded-[9px] bg-[#1552D6] px-4 text-[13px] font-bold text-white hover:bg-[#0E3FAA] disabled:cursor-not-allowed disabled:bg-[#AEB5C6]"
                >
                  {saving ? "저장 중…" : `선택 ${selected.size}건 저장`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <RunHistory
        runs={runs}
        active={active}
        previewOpenId={preview?.runId ?? null}
        onRerun={rerun}
        onShowPreview={() => setPreviewShown(true)}
      />
    </div>
  );
}
