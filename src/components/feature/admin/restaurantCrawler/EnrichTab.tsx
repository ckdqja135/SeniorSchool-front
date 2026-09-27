"use client";

/**
 * '데이터 보강' 탭: 메뉴·이미지·URL 이 빠진 식당을 찾아 채운다.
 *
 * - 목록은 서버에서 필터(missing)·검색(name 또는 location)·페이지(offset) 를 걸어 받는다.
 * - 행을 누르면 오른쪽 상세 패널에서 편집, 체크한 행은 '누락 필드 재수집'으로 한꺼번에 채운다.
 * - 일괄 재수집은 비어 있는 필드만 채우고 곧바로 저장한다 (있는 값은 건드리지 않는다).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@/components/common/Skeleton";
import {
  C,
  SOURCE_TAG,
  apiGet,
  apiSend,
  parseMenu,
  searchParamsFor,
  sourceFromUrl,
  type MissingCounts,
  type RestaurantRow,
  type SourceKey,
} from "./shared";
import { recollect, type RecollectField } from "./recollect";
import { EnrichDetailPanel, type DetailTab } from "./EnrichDetailPanel";
import type { MissingFilter } from "./HealthStrip";

const PAGE_SIZE = 20;
/** 목록 스크롤 영역에 한 번에 보이는 최소 행 수 */
const MIN_VISIBLE_ROWS = 10;

const FILTERS: Array<{ key: MissingFilter; label: string; param?: string }> = [
  { key: "all", label: "전체" },
  { key: "noMenu", label: "메뉴 없음", param: "menu" },
  { key: "noImage", label: "이미지 없음", param: "image" },
  { key: "noURL", label: "URL 없음", param: "url" },
];

function countFor(f: MissingFilter, m: MissingCounts | null): number | null {
  if (!m) return null;
  return f === "all" ? m.total : f === "noMenu" ? m.noMenu : f === "noImage" ? m.noImage : m.noURL;
}

function FieldPill({ n, unit }: { n: number; unit: string }) {
  return (
    <span
      className="justify-self-start whitespace-nowrap rounded-md px-[7px] py-[3px] text-[12px] font-bold"
      style={n ? { color: C.okFg, background: C.okBg } : { color: C.badFg, background: C.badBg }}
    >
      {n ? `${n}${unit}` : "없음"}
    </span>
  );
}

function Check({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className="flex h-[17px] w-[17px] items-center justify-center rounded-[5px] border-[1.5px] text-[10px] font-extrabold text-white"
      style={{ borderColor: on ? C.primary : "#CBD2E0", background: on ? C.primary : "#fff" }}
    >
      {on ? "✓" : ""}
    </span>
  );
}

const GRID = "grid grid-cols-[32px_minmax(0,1.6fr)_minmax(0,1fr)_62px_62px_50px_64px] gap-2.5";

export function EnrichTab({
  filter,
  onFilterChange,
  missing,
  onDataChanged,
}: {
  filter: MissingFilter;
  onFilterChange: (f: MissingFilter) => void;
  missing: MissingCounts | null;
  onDataChanged: () => void;
}) {
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [srcFilter, setSrcFilter] = useState<"" | SourceKey>("");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<RestaurantRow[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selId, setSelId] = useState<string | null>(null);
  const [dTab, setDTab] = useState<DetailTab>("메뉴");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<{ done: number; total: number; filled: number } | null>(null);
  const [bulkNote, setBulkNote] = useState<string | null>(null);

  /** 행 목록 스크롤 영역. 페이지·필터가 바뀌면 맨 위로 되돌린다 */
  const listRef = useRef<HTMLDivElement | null>(null);
  /** 늦게 도착한 이전 요청이 새 결과를 덮지 않게 요청 번호를 센다 */
  const reqSeq = useRef(0);

  // 필터·검색이 바뀌면 첫 페이지부터
  useEffect(() => {
    setPage(0);
  }, [filter, q]);

  // 목록이 화면(관리자 레이아웃의 스크롤 영역) 바닥에 딱 맞게 높이를 잡는다 → 페이지 전체는 스크롤되지 않는다
  const [listMaxH, setListMaxH] = useState(480);
  const fitList = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    // 표의 가로 스크롤 감싸개(overflow-x-auto)는 세로로도 auto 로 계산되므로 그 바깥부터 찾는다
    let scroller: HTMLElement | null = el.closest(".overflow-x-auto")?.parentElement ?? el.parentElement;
    while (scroller && !/(auto|scroll)/.test(getComputedStyle(scroller).overflowY)) scroller = scroller.parentElement;
    const box = scroller ?? document.documentElement;
    const boxTop = scroller ? box.getBoundingClientRect().top : 0;
    const topInContent = el.getBoundingClientRect().top - boxTop + box.scrollTop;
    const padBottom = scroller ? parseFloat(getComputedStyle(scroller).paddingBottom) || 0 : 0;
    // 아래 페이지 버튼 줄(약 50px) + 카드 테두리 + 페이지 하단 여백
    const reserve = 50 + 2 + 24 + padBottom;
    // 화면이 작아도 한 번에 최소 10행은 보이게 한다 (행 높이는 실제 첫 행으로 잰다)
    const rowH = (el.querySelector('[role="button"]') as HTMLElement | null)?.offsetHeight || 53;
    setListMaxH(Math.max(rowH * MIN_VISIBLE_ROWS, Math.floor(box.clientHeight - topInContent - reserve)));
  }, []);
  useEffect(() => {
    fitList();
    window.addEventListener("resize", fitList);
    return () => window.removeEventListener("resize", fitList);
  }, [fitList, checked.size > 0, !!bulk, !!bulkNote, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // 체크는 지금 보이는 페이지 안에서만 의미가 있다
  useEffect(() => {
    setChecked(new Set());
    listRef.current?.scrollTo({ top: 0 });
  }, [filter, q, page]);

  const load = useCallback(async () => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE + 1), offset: String(page * PAGE_SIZE) });
      const f = FILTERS.find((x) => x.key === filter);
      if (f?.param) params.set("missing", f.param);
      const sp = searchParamsFor(q);
      if (sp.name) params.set("name", sp.name);
      if (sp.location) params.set("location", sp.location);
      const data = await apiGet<RestaurantRow[] | { data: RestaurantRow[] }>(`/restaurant?${params}`);
      if (seq !== reqSeq.current) return;
      const list = Array.isArray(data) ? data : data.data || [];
      // 한 건 더 받아서 다음 페이지가 있는지 판단한다 (서버가 전체 개수를 주지 않는다)
      setHasNext(list.length > PAGE_SIZE);
      setRows(list.slice(0, PAGE_SIZE));
    } catch (e) {
      if (seq !== reqSeq.current) return;
      setError((e as Error).message || "목록을 불러오지 못했습니다.");
      setRows([]);
      setHasNext(false);
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [filter, q, page]);

  useEffect(() => {
    load();
  }, [load]);

  // 출처는 DB 컬럼이 없어 URL 도메인으로 추정한다 → 지금 페이지 안에서만 거른다
  const visible = useMemo(
    () => (srcFilter ? rows.filter((r) => sourceFromUrl(r.restaurantURL) === srcFilter) : rows),
    [rows, srcFilter],
  );
  const sel = rows.find((r) => String(r.restaurantIdx) === selId) ?? null;

  const openRow = (r: RestaurantRow) => {
    setSelId(String(r.restaurantIdx));
    const menuN = parseMenu(r.restaurantMenu).length;
    setDTab(!menuN ? "메뉴" : !r.restaurantImage ? "이미지" : !r.restaurantURL ? "URL" : "메뉴");
  };

  const toggleCheck = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const allOn = visible.length > 0 && visible.every((r) => checked.has(String(r.restaurantIdx)));
  const toggleAll = () =>
    setChecked((prev) => {
      const next = new Set(prev);
      visible.forEach((r) => (allOn ? next.delete(String(r.restaurantIdx)) : next.add(String(r.restaurantIdx))));
      return next;
    });

  const applyPatch = (id: string, patch: Partial<RestaurantRow>) =>
    setRows((prev) => prev.map((r) => (String(r.restaurantIdx) === id ? { ...r, ...patch } : r)));

  /** 체크한 식당마다 빈 필드만 재수집해서 바로 저장 */
  const runBulk = async () => {
    const targets = rows.filter((r) => checked.has(String(r.restaurantIdx)));
    if (targets.length === 0) return;
    if (!window.confirm(`${targets.length}곳의 빈 필드를 다시 수집해 채울까요?\n이름이 맞는 가게에서만 가져오고, 이미 있는 값은 바꾸지 않습니다.`)) return;

    setBulk({ done: 0, total: targets.length, filled: 0 });
    setBulkNote(null);
    let filled = 0;
    const misses: string[] = [];
    for (let i = 0; i < targets.length; i++) {
      const r = targets[i];
      const need: RecollectField[] = [];
      if (parseMenu(r.restaurantMenu).length === 0) need.push("menu");
      if (!r.restaurantImage) need.push("image");
      if (!r.restaurantURL) need.push("url");
      if (need.length > 0) {
        try {
          const res = await recollect(r, need);
          const patch: Record<string, unknown> = {};
          if (res.menu) patch.restaurantMenu = res.menu;
          if (res.image) patch.restaurantImage = res.image;
          if (res.url) patch.restaurantURL = res.url;
          if (Object.keys(patch).length > 0) {
            await apiSend("PUT", `/admin/restaurant/${r.restaurantIdx}`, patch);
            applyPatch(String(r.restaurantIdx), patch as Partial<RestaurantRow>);
            filled += 1;
          } else {
            misses.push(r.restaurantName);
          }
        } catch {
          misses.push(r.restaurantName);
        }
      }
      setBulk({ done: i + 1, total: targets.length, filled });
    }
    setBulk(null);
    setChecked(new Set());
    setBulkNote(
      `${targets.length}곳 중 ${filled}곳을 채웠어요.` + (misses.length ? ` 못 찾은 곳: ${misses.slice(0, 5).join(", ")}${misses.length > 5 ? ` 외 ${misses.length - 5}곳` : ""}` : ""),
    );
    onDataChanged();
  };

  const total = countFor(filter, missing);
  const from = page * PAGE_SIZE + (rows.length ? 1 : 0);
  const to = page * PAGE_SIZE + rows.length;
  const rangeLabel = q
    ? `${from}–${to}곳 · '${q}' 검색 결과`
    : `${from}–${to}${total !== null ? ` / ${total.toLocaleString()}` : ""}곳`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3 rounded-[14px] border border-[#E6E9F0] bg-white px-3.5 py-3">
        <div role="radiogroup" aria-label="누락 필터" className="flex flex-wrap gap-0.5 rounded-[10px] bg-[#F1F3F8] p-[3px]">
          {FILTERS.map((f) => {
            const on = filter === f.key;
            const n = countFor(f.key, missing);
            return (
              <button
                key={f.key}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => {
                  onFilterChange(f.key);
                  setSelId(null);
                }}
                className="whitespace-nowrap rounded-lg px-3 py-[7px] text-[13px]"
                style={{
                  background: on ? "#fff" : "transparent",
                  color: on ? C.ink : "#6B7389",
                  fontWeight: on ? 700 : 500,
                  boxShadow: on ? "0 1px 3px rgba(20,26,40,.12)" : "none",
                }}
              >
                {f.label} <span className="font-semibold" style={{ color: on ? C.primary : "#9AA1B2" }}>{n === null ? "" : n.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
        <input
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") setQ(qInput.trim());
            if (e.key === "Escape") {
              setQInput("");
              setQ("");
            }
          }}
          onBlur={() => setQ(qInput.trim())}
          placeholder="식당명 · 지역 검색 (Enter)"
          aria-label="식당명 또는 지역 검색"
          className="h-[38px] min-w-[220px] flex-1 rounded-[10px] border border-[#DDE1EA] px-3 text-[13.5px] text-[#151A26] focus:border-[#1552D6] focus:outline-none"
        />
        <select
          value={srcFilter}
          onChange={(e) => setSrcFilter(e.target.value as "" | SourceKey)}
          aria-label="출처"
          title="출처는 URL 로 추정하며, 지금 보이는 페이지 안에서만 거릅니다"
          className="h-[38px] rounded-[10px] border border-[#DDE1EA] bg-white px-2.5 text-[13px] text-[#4A5266] focus:border-[#1552D6] focus:outline-none"
        >
          <option value="">모든 출처</option>
          {(Object.keys(SOURCE_TAG) as SourceKey[]).map((k) => (
            <option key={k} value={k}>{SOURCE_TAG[k].label}</option>
          ))}
        </select>
      </div>

      {bulkNote && (
        <div role="status" className="flex items-start justify-between gap-3 rounded-[12px] bg-[#E4F6EC] px-4 py-3">
          <p className="text-[13px] font-semibold text-[#0E7A43]">{bulkNote}</p>
          <button type="button" onClick={() => setBulkNote(null)} className="shrink-0 text-[12px] font-bold text-[#0E7A43]">닫기</button>
        </div>
      )}

      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-[1_1_560px] overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
          {(checked.size > 0 || bulk) && (
            <div className="flex flex-wrap items-center gap-3 bg-[#151A26] px-4 py-2.5 text-white">
              <span className="text-[13px] font-bold">
                {bulk ? `재수집 중 ${bulk.done}/${bulk.total} · 채움 ${bulk.filled}` : `${checked.size}곳 선택됨`}
              </span>
              <button
                type="button"
                onClick={runBulk}
                disabled={!!bulk}
                className="whitespace-nowrap rounded-lg bg-[#1552D6] px-3 py-[7px] text-[12.5px] font-bold text-white disabled:opacity-60"
              >
                누락 필드 재수집
              </button>
              <button
                type="button"
                onClick={() => setChecked(new Set())}
                disabled={!!bulk}
                className="ml-auto whitespace-nowrap text-[12.5px] text-[#AEB5C6] hover:text-white disabled:opacity-50"
              >
                선택 해제
              </button>
            </div>
          )}

          <div className="overflow-x-auto">
            <div className="min-w-[560px]">
              <div className={`${GRID} border-b border-[#EEF0F5] bg-[#FAFBFD] px-4 py-[11px] text-[11.5px] font-bold text-[#8A91A3]`}>
                <button type="button" onClick={toggleAll} aria-label={allOn ? "이 페이지 전체 해제" : "이 페이지 전체 선택"} className="flex">
                  <Check on={allOn} />
                </button>
                <span>식당</span>
                <span>지역</span>
                <span>메뉴</span>
                <span>이미지</span>
                <span>URL</span>
                <span>출처</span>
              </div>

              {/* 행만 안에서 스크롤한다. 머리줄은 위에 고정, 화면 전체는 움직이지 않는다 */}
              <div ref={listRef} className="overflow-y-auto overscroll-contain" style={{ maxHeight: listMaxH }}>
                {loading ? (
                  <div className="flex flex-col gap-3 px-4 py-3" aria-label="불러오는 중">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-9 w-full" />
                    ))}
                  </div>
                ) : error ? (
                  <div className="px-4 py-12 text-center">
                    <p className="text-[13px] text-[#C23B3B]">{error}</p>
                    <button type="button" onClick={load} className="mt-2 text-[12.5px] font-bold text-[#1552D6]">다시 시도</button>
                  </div>
                ) : visible.length === 0 ? (
                  <div className="px-4 py-12 text-center text-[13px] text-[#8A91A3]">조건에 맞는 식당이 없습니다.</div>
                ) : (
                  visible.map((r) => {
                    const id = String(r.restaurantIdx);
                    const on = checked.has(id);
                    const isSel = selId === id;
                    const src = sourceFromUrl(r.restaurantURL);
                    return (
                      <div
                        key={id}
                        role="button"
                        tabIndex={0}
                        aria-pressed={isSel}
                        onClick={() => openRow(r)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openRow(r);
                          }
                        }}
                        className={`${GRID} cursor-pointer items-center border-b border-[#F2F3F7] px-4 py-[11px] hover:bg-[#F7F9FD] focus:outline-none focus-visible:bg-[#F2F6FF]`}
                        style={{ background: isSel ? "#F2F6FF" : undefined, boxShadow: isSel ? `inset 3px 0 0 ${C.primary}` : undefined }}
                      >
                        <button
                          type="button"
                          aria-label={`${r.restaurantName} 선택`}
                          aria-pressed={on}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleCheck(id);
                          }}
                          className="flex"
                        >
                          <Check on={on} />
                        </button>
                        <div className="min-w-0">
                          <div className="truncate text-[13.5px] font-bold" title={r.restaurantName}>{r.restaurantName}</div>
                          <div className="mt-0.5 truncate text-[11.5px] text-[#8A91A3]">{r.restaurantType || "-"}</div>
                        </div>
                        <span className="truncate text-[12.5px] text-[#5A6275]" title={r.restaurantAddr}>{r.restaurantLocation || "-"}</span>
                        <FieldPill n={parseMenu(r.restaurantMenu).length} unit="개" />
                        <FieldPill n={r.restaurantImage ? 1 : 0} unit="장" />
                        <FieldPill n={r.restaurantURL ? 1 : 0} unit="개" />
                        <span>
                          {src ? (
                            <span className="rounded-[5px] px-1.5 py-[3px] text-[10.5px] font-extrabold" style={{ color: SOURCE_TAG[src].fg, background: SOURCE_TAG[src].bg }}>
                              {SOURCE_TAG[src].label}
                            </span>
                          ) : (
                            <span className="text-[11.5px] text-[#AEB5C6]">—</span>
                          )}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-4 py-3 text-[12.5px] text-[#7A8296]">
            <span>{loading ? "불러오는 중…" : rangeLabel}{srcFilter && !loading ? ` · ${SOURCE_TAG[srcFilter].label}만 ${visible.length}곳` : ""}</span>
            <div className="flex gap-1.5">
              <button
                type="button"
                disabled={page === 0 || loading}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-[#DDE1EA] bg-white px-3 py-1.5 text-[12px] text-[#4A5266] hover:bg-[#F6F7FA] disabled:opacity-40"
              >
                이전
              </button>
              <button
                type="button"
                disabled={!hasNext || loading}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-[#DDE1EA] bg-white px-3 py-1.5 text-[12px] text-[#4A5266] hover:bg-[#F6F7FA] disabled:opacity-40"
              >
                다음
              </button>
            </div>
          </div>
        </div>

        {sel && (
          <EnrichDetailPanel
            row={sel}
            tab={dTab}
            onTabChange={setDTab}
            onClose={() => setSelId(null)}
            onSaved={(patch) => {
              applyPatch(String(sel.restaurantIdx), patch);
              onDataChanged();
            }}
          />
        )}
      </div>
    </div>
  );
}
