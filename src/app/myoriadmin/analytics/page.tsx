"use client";

// 접속 경로 분석. 디자인: claude.ai/design 프로젝트 "Traffic Analytics.dc.html" 1:1 구현.
// 데이터는 /admin/pageview/logs 원본 행을 구간 전체로 받아(페이지 순회) 클라이언트에서 파생 지표를 계산한다.
// 사이드바/상단바는 myoriadmin/layout 의 DashboardLayout 이 제공하므로 여기서는 본문만 그린다.

import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import {
  Ev,
  RangeKey,
  RawLog,
  Sess,
  buildBuckets,
  buildSessions,
  chColor,
  chan,
  clockStr,
  countBy,
  deltaStr,
  fmt,
  host,
  kst,
  kstDayKey,
  pathLabel,
  rangeLabel,
  rangeSpec,
  rangeSpecCustom,
  safeDecode,
  sessionChannel,
  shortPath,
  sortedEntries,
  sparkPoints,
  timeStr,
  toCsv,
  toDateParam,
  toEvents,
} from "@/lib/admin/trafficAnalytics";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

/* ───────── 디자인 토큰 ───────── */
const A = "oklch(0.62 0.17 285)";
const C2 = "oklch(0.66 0.13 200)";
const C3 = "oklch(0.68 0.13 150)";
const C4 = "oklch(0.74 0.14 75)";
const C5 = "oklch(0.66 0.15 15)";
const PAL = [A, C2, C3, C4, C5];
const MONO = "'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace";
const SANS = "Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
const INK = "#14161C";
const MUTED = "#8C90A0";
const FAINT = "#9AA0AE";
const FAINTER = "#A6ABB8";

const card: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #E8E9EF",
  borderRadius: 14,
  padding: "18px 20px",
  boxShadow: "0 1px 2px rgba(16,18,28,.04)",
};
const cardTitle: React.CSSProperties = { fontSize: 14, fontWeight: 700, letterSpacing: "-.01em" };
const cardSub: React.CSSProperties = { fontSize: 11.5, color: FAINT, marginTop: 3 };
const ell: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const track: React.CSSProperties = { height: 5, borderRadius: 3, background: "#F0F1F5", overflow: "hidden" };

const TOP_N = 8;
const PER_PAGE = 14;
const SESS_PER_PAGE = 9;
const RANGES: RangeKey[] = ["오늘", "7일", "30일", "전체"];
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const LIMITS = ["순 방문자(UV)", "세션 지속 시간", "재방문율", "체류 시간·스크롤", "유입 캠페인(UTM)", "지역·언어", "전환·클릭"];

/* ───────── API ───────── */

const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem("accessToken"));

// logs 는 페이지네이션만 지원하므로 큰 페이지로 끝까지 순회한다(최대 25페이지 × 2000행).
async function fetchAllLogs(startDate: string | null, signal: AbortSignal, onProgress: (n: number) => void): Promise<RawLog[]> {
  const rows: RawLog[] = [];
  const rpp = 2000;
  for (let page = 1; page <= 25; page++) {
    const q = new URLSearchParams({ page: String(page), rowsPerPage: String(rpp), order: "DESC" });
    if (startDate) q.set("startDate", startDate);
    const res = await fetch(`${BASE_URL}/admin/pageview/logs?${q}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error(data.message || "조회 실패");
    rows.push(...(data.data as RawLog[]));
    onProgress(rows.length);
    if (page >= (data.totalPages as number)) break;
  }
  return rows;
}

/* ───────── 작은 UI 조각 ───────── */

function Seg({
  items,
  value,
  onChange,
  bg = "#F3F4F7",
  pad = "5px 11px",
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  bg?: string;
  pad?: string;
}) {
  return (
    <div style={{ display: "flex", background: bg, borderRadius: 9, padding: 3 }}>
      {items.map((l) => {
        const on = l === value;
        return (
          <button
            key={l}
            onClick={() => onChange(l)}
            style={{
              border: "none",
              background: on ? "#fff" : "transparent",
              color: on ? INK : "#7A7F8E",
              fontSize: 12,
              fontWeight: on ? 700 : 500,
              padding: pad,
              borderRadius: 7,
              cursor: "pointer",
              boxShadow: on ? "0 1px 2px rgba(16,18,28,.06)" : "none",
            }}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}

function Chip({ c }: { c: string }) {
  const [fg, bg] = chColor(c);
  return (
    <span
      style={{
        display: "inline-block",
        maxWidth: "100%",
        fontSize: 10.5,
        fontWeight: 700,
        color: fg,
        background: bg,
        padding: "3px 8px",
        borderRadius: 6,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {c}
    </span>
  );
}

function Empty({ text = "데이터 없음", h = 80 }: { text?: string; h?: number }) {
  return (
    <div style={{ height: h, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, color: FAINTER }}>{text}</div>
  );
}

function Pager({ page, maxPage, onPrev, onNext }: { page: number; maxPage: number; onPrev: () => void; onNext: () => void }) {
  const btn: React.CSSProperties = {
    border: "1px solid #E5E7EE",
    background: "#fff",
    fontSize: 12,
    padding: "6px 13px",
    borderRadius: 8,
    cursor: "pointer",
    color: "#4A4F60",
  };
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px" }}>
      <div style={{ fontSize: 12, color: FAINT }}>
        {page + 1} / {maxPage + 1} 페이지
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={onPrev} disabled={page <= 0} style={{ ...btn, opacity: page <= 0 ? 0.45 : 1 }}>
          이전
        </button>
        <button onClick={onNext} disabled={page >= maxPage} style={{ ...btn, opacity: page >= maxPage ? 0.45 : 1 }}>
          다음
        </button>
      </div>
    </div>
  );
}

/* ───────── 툴팁 ───────── */

interface TipState {
  x: number;
  y: number;
  title: string;
  lines: string[];
}
export interface TipApi {
  show: (e: React.MouseEvent, title: string, lines: string[]) => void;
  hide: () => void;
}

// 마우스를 따라다니는 툴팁. 자체 state 라 본문은 리렌더되지 않는다.
const TipLayer = React.forwardRef<TipApi>(function TipLayer(_, ref) {
  const [tip, setTip] = useState<TipState | null>(null);
  useImperativeHandle(ref, () => ({
    show: (e, title, lines) => setTip({ x: e.clientX, y: e.clientY, title, lines }),
    hide: () => setTip(null),
  }), []);
  if (!tip) return null;
  const W = 240;
  const vw = typeof window === "undefined" ? 1600 : window.innerWidth;
  const vh = typeof window === "undefined" ? 900 : window.innerHeight;
  const left = tip.x + 14 + W > vw ? tip.x - 14 - W : tip.x + 14;
  const top = tip.y + 18 + 90 > vh ? tip.y - 18 - 24 * (tip.lines.length + 1) : tip.y + 18;
  return (
    <div style={{ position: "fixed", left, top, zIndex: 1000, pointerEvents: "none", maxWidth: W, background: INK, color: "#fff", borderRadius: 8, padding: "7px 10px", fontSize: 11.5, lineHeight: 1.55, boxShadow: "0 8px 24px rgba(16,18,28,.22)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      <div style={{ fontWeight: 700, ...ell }}>{tip.title}</div>
      {tip.lines.map((l, i) => (
        <div key={i} style={{ color: "#C9CCD8", ...ell }}>{l}</div>
      ))}
    </div>
  );
});

const pct = (n: number, tot: number) => `${tot ? ((n / tot) * 100).toFixed(1) : "0.0"}%`;

/* ───────── 페이지 ───────── */

export default function AnalyticsPage() {
  const [range, setRange] = useState<RangeKey | "기간">("30일");
  // 직접 지정 기간: 입력값(draft)과 조회 버튼으로 확정된 값(applied)을 분리
  const todayYmd = kstDayKey(new Date());
  const [draftStart, setDraftStart] = useState(todayYmd);
  const [draftEnd, setDraftEnd] = useState(todayYmd);
  const [applied, setApplied] = useState<{ start: string; end: string } | null>(null);
  const [tab, setTab] = useState<"stats" | "logs">("stats");
  const [pathMode, setPathMode] = useState<"raw" | "section">("raw");
  const [logMode, setLogMode] = useState<"session" | "raw">("session");
  const [hideBots, setHideBots] = useState(true);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [sessPage, setSessPage] = useState(0);

  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const tipRef = useRef<TipApi>(null);
  const show = (e: React.MouseEvent, title: string, lines: string[]) => tipRef.current?.show(e, title, lines);
  const hide = () => tipRef.current?.hide();

  const spec = useMemo(
    () => (range === "기간" && applied ? rangeSpecCustom(applied.start, applied.end) : rangeSpec(range === "기간" ? "30일" : range)),
    [range, applied, tick], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const applyCustom = () => {
    if (!draftStart || !draftEnd) return;
    const same = applied && applied.start === draftStart && applied.end === draftEnd && range === "기간";
    if (same) setTick((t) => t + 1);
    else {
      setApplied({ start: draftStart, end: draftEnd });
      setRange("기간");
    }
  };

  // 구간이 바뀌면 (이전 비교 구간 포함) 원본 로그를 새로 받는다.
  // 서버는 startDate 를 UTC 자정으로 해석하므로 KST 하루 여유를 두고 받아 클라이언트에서 정확히 자른다.
  useEffect(() => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    setError(null);
    setProgress(0);
    const from = spec.prevStart ? toDateParam(new Date(spec.prevStart.getTime() - 86400_000)) : null;
    fetchAllLogs(from, ac.signal, (n) => !ac.signal.aborted && setProgress(n))
      .then((rows) => {
        if (ac.signal.aborted) return;
        setEvents(toEvents(rows));
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (ac.signal.aborted) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => ac.abort();
  }, [spec]);

  useEffect(() => {
    setPage(0);
    setSessPage(0);
  }, [range, q, hideBots, logMode]);

  /* ── 파생 데이터 ── */
  const d = useMemo(() => {
    const startMs = spec.start ? spec.start.getTime() : -Infinity;
    const endMs = spec.end.getTime();
    const prevMs = spec.prevStart ? spec.prevStart.getTime() : null;

    const cur = events.filter((e) => e.t.getTime() >= startMs && e.t.getTime() < endMs);
    const prev = prevMs === null ? [] : events.filter((e) => e.t.getTime() >= prevMs && e.t.getTime() < startMs);

    const human = cur.filter((e) => !e.info.bot);
    const humanPrev = prev.filter((e) => !e.info.bot);
    const uniq = new Set(human.map((e) => `${e.ip}|${e.ua}`)).size;
    const uniqPrev = new Set(humanPrev.map((e) => `${e.ip}|${e.ua}`)).size;

    const curS = buildSessions(cur);
    const humanS = curS.filter((s) => !s.info.bot);
    const prevS = prevMs === null ? null : buildSessions(humanPrev);
    const bounce = humanS.length ? Math.round((humanS.filter((s) => s.seq.length === 1).length / humanS.length) * 100) : 0;

    const { hourly, buckets } = buildBuckets(spec, human, humanS);

    const counts = countBy(human, (e) => e.path);
    const sect = countBy(human, (e) => e.path.split("/")[1] || "");

    const chAgg = countBy(humanS, (s) => sessionChannel(s));
    const ext = humanS.filter((s) => s.ref && chan(s.ref) !== "내부 이동");
    const refAgg = countBy(ext, (s) => host(s.ref));
    const direct = humanS.length - ext.length;

    const dev = countBy(human, (e) => e.info.dev);
    const br = countBy(human, (e) => e.info.br);
    const os = countBy(human, (e) => e.info.os);

    const heat: number[][] = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
    for (const e of human) {
      const p = kst(e.t);
      heat[p.dow][p.h]++;
    }

    const botEv = cur.filter((e) => e.info.bot);
    const botAgg = countBy(botEv, (e) => e.info.br);

    // 재방문: IP 단위로 묶고(같은 IP 의 UA 가 여럿이어도 한 줄) 등장한 날짜 수를 센다
    const ipDays = new Map<string, { ip: string; days: Set<string>; n: number }>();
    for (const e of human) {
      const k = e.ip;
      const r = ipDays.get(k) || { ip: e.ip, days: new Set<string>(), n: 0 };
      r.days.add(kstDayKey(e.t));
      r.n++;
      ipDays.set(k, r);
    }

    return { cur, prev, human, humanPrev, uniq, uniqPrev, curS, humanS, prevS, bounce, hourly, buckets, counts, sect, chAgg, refAgg, direct, dev, br, os, heat, botEv, botAgg, ipDays };
  }, [events, spec]);

  /* ── 통계 탭 뷰모델 ── */
  const prevLabel = spec.key === "전체" ? null : spec.days === 1 ? (spec.key === "오늘" ? "어제" : "전날") : `이전 ${spec.days}일`;
  const kpiSub = prevLabel ? `봇 제외 · ${prevLabel} 대비` : "봇 제외 · 전체 기간";
  const bucketN = d.buckets.map((b) => b.n);

  const kpis = [
    { label: "페이지뷰", value: fmt(d.human.length), delta: deltaStr(d.human.length, prevLabel ? d.humanPrev.length : null), up: d.human.length >= d.humanPrev.length, sub: kpiSub, spark: sparkPoints(bucketN), stroke: A },
    { label: "추정 방문자", value: fmt(d.uniq), delta: deltaStr(d.uniq, prevLabel ? d.uniqPrev : null), up: d.uniq >= d.uniqPrev, sub: "IP + UA 조합 기준", spark: sparkPoints(d.buckets.map((b) => b.uniq)), stroke: C2 },
    { label: "추정 세션", value: fmt(d.humanS.length), delta: deltaStr(d.humanS.length, d.prevS ? d.prevS.length : null), up: d.prevS ? d.humanS.length >= d.prevS.length : true, sub: "30분 무활동 기준 묶음", spark: sparkPoints(d.buckets.map((b) => b.sess)), stroke: C3 },
    { label: "1페이지 이탈", value: `${d.bounce}%`, delta: "", up: true, sub: "한 경로만 보고 종료한 세션", spark: sparkPoints(d.buckets.map((b) => b.bounce)), stroke: C4 },
  ];

  const mxD = Math.max(...bucketN, 1);
  const avg = d.buckets.length ? Math.round(d.human.length / d.buckets.length) : 0;
  const maxIdx = bucketN.indexOf(Math.max(...bucketN));
  const maxBucket = d.buckets[maxIdx];
  const maxDayLabel = maxBucket ? (d.hourly ? `${kst(maxBucket.at).h}시` : `${kst(maxBucket.at).m + 1}.${kst(maxBucket.at).d}`) : "-";

  const mxH = Math.max(...d.heat.flat(), 1);
  let peak = { n: -1, dow: 0, h: 0 };
  d.heat.forEach((row, r) =>
    row.forEach((n, h) => {
      if (n > peak.n) peak = { n, dow: r, h };
    }),
  );

  const chOrder = ["직접", "검색", "SNS", "기타"];
  const chTotal = chOrder.reduce((s, c) => s + (d.chAgg[c] || 0), 0) || 1;
  const stops: string[] = [];
  let acc = 0;
  const channels = chOrder
    .filter((c) => d.chAgg[c])
    .map((c, i) => {
      const n = d.chAgg[c];
      const p = (n / chTotal) * 100;
      stops.push(`${PAL[i]} ${acc.toFixed(1)}% ${(acc + p).toFixed(1)}%`);
      const seg = { name: c, n, count: `${fmt(n)}회`, pct: `${p.toFixed(0)}%`, color: PAL[i], from: acc, to: acc + p };
      acc += p;
      return seg;
    });
  // 도넛 위 마우스 각도 → 채널. 가운데 구멍이면 합계
  const onDonutMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < r.width / 2 - 26 || dist > r.width / 2) {
      show(e, "세션 합계", [`${fmt(d.humanS.length)}세션 · 봇 제외`]);
      return;
    }
    const deg = ((Math.atan2(dy, dx) * 180) / Math.PI + 90 + 360) % 360;
    const at = (deg / 360) * 100;
    const seg = channels.find((c) => at >= c.from && at < c.to) || channels[channels.length - 1];
    if (seg) show(e, `${seg.name} 유입`, [`${fmt(seg.n)} 세션 · ${seg.pct}`]);
  };
  const donut = stops.length ? `conic-gradient(${stops.join(",")})` : "#F0F1F5";

  const mkRows = (obj: Record<string, number>, colors: string[]) => {
    const ent = sortedEntries(obj);
    const tot = ent.reduce((s, e) => s + e[1], 0) || 1;
    const mx = ent[0] ? ent[0][1] : 1;
    return ent.slice(0, 5).map(([k, v], i) => ({ name: k, n: v, tot, count: fmt(v), pct: `${Math.round((v / tot) * 100)}%`, w: `${((v / mx) * 100).toFixed(1)}%`, color: colors[i % colors.length] }));
  };
  const uaCards = [
    { title: "기기 유형", rows: mkRows(d.dev, [A, C2, C3, C4]) },
    { title: "브라우저", rows: mkRows(d.br, PAL) },
    { title: "운영체제", rows: mkRows(d.os, PAL) },
  ];

  const pathSrc: [string, number][] = pathMode === "section" ? Object.entries(d.sect).map(([k, v]) => [`/${k}`, v]) : Object.entries(d.counts);
  const pathSorted = pathSrc.sort((a, b) => b[1] - a[1]).slice(0, TOP_N);
  const mxP = pathSorted[0] ? pathSorted[0][1] : 1;
  const pathTotal = pathSrc.reduce((s, e) => s + e[1], 0);
  const paths = pathSorted.map(([p, n], i) => ({
    rank: i + 1,
    n,
    path: safeDecode(p),
    label: pathLabel(p),
    count: `${fmt(n)}회`,
    w: `${((n / mxP) * 100).toFixed(1)}%`,
  }));

  const refList: [string, number][] = ([["(직접 유입)", d.direct]] as [string, number][]).concat(Object.entries(d.refAgg)).filter((e) => e[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const mxR = refList[0] ? refList[0][1] : 1;
  const referrers = refList.map(([h, n], i) => ({
    host: h,
    n,
    count: fmt(n),
    channel: h === "(직접 유입)" ? "직접" : chan(`https://${h}`),
    w: `${((n / mxR) * 100).toFixed(1)}%`,
    color: PAL[i % PAL.length],
  }));

  /* ── 로그 탭 뷰모델 ── */
  const ql = q.trim().toLowerCase();
  const match = useCallback(
    (e: Ev) => !ql || e.path.toLowerCase().includes(ql) || safeDecode(e.path).toLowerCase().includes(ql) || e.ip.includes(ql) || e.info.br.toLowerCase().includes(ql) || e.ua.toLowerCase().includes(ql),
    [ql],
  );
  const evFiltered = useMemo(() => d.cur.filter((e) => (!hideBots || !e.info.bot) && match(e)).sort((a, b) => b.t.getTime() - a.t.getTime()), [d.cur, hideBots, match]);
  const maxPage = Math.max(0, Math.ceil(evFiltered.length / PER_PAGE) - 1);
  const pg = Math.min(page, maxPage);
  const rows = evFiltered.slice(pg * PER_PAGE, pg * PER_PAGE + PER_PAGE);

  const sFiltered = useMemo(() => d.curS.filter((s) => (!hideBots || !s.info.bot) && s.seq.some(match)).sort((a, b) => b.start.getTime() - a.start.getTime()), [d.curS, hideBots, match]);
  const sMaxPage = Math.max(0, Math.ceil(sFiltered.length / SESS_PER_PAGE) - 1);
  const spg = Math.min(sessPage, sMaxPage);
  const sessions = sFiltered.slice(spg * SESS_PER_PAGE, spg * SESS_PER_PAGE + SESS_PER_PAGE);

  const recent = d.human.slice().sort((a, b) => b.t.getTime() - a.t.getTime()).slice(0, 6);
  const bots = sortedEntries(d.botAgg).map(([k, v]) => ({ name: k, count: `${fmt(v)}회` }));
  const botPct = `${Math.round((d.botEv.length / Math.max(1, d.cur.length)) * 100)}%`;
  const repeats = Array.from(d.ipDays.values())
    .filter((v) => v.days.size > 1)
    .sort((a, b) => b.n - a.n)
    .slice(0, 5);

  const resultLabel = logMode === "session" ? `${fmt(sFiltered.length)}세션 · ${fmt(evFiltered.length)}건` : `${fmt(evFiltered.length)}건`;

  const exportCsv = () => {
    const blob = new Blob([toCsv(d.cur)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ori-traffic-${range === "기간" && applied ? `${applied.start}_${applied.end}` : range}-${kstDayKey(new Date())}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const avatarOf = (dev: string): [string, string, string] => {
    switch (dev) {
      case "모바일":
        return ["MO", C2, "#E6F2F6"];
      case "태블릿":
        return ["TB", C3, "#E9F6EF"];
      case "봇":
        return ["BOT", "#6B7080", "#F2F3F7"];
      default:
        return ["PC", A, "#EEEEFB"];
    }
  };

  /* ───────── 렌더 ───────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: SANS, color: INK, fontSize: 14, paddingBottom: 32, WebkitFontSmoothing: "antialiased" }}>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap" />
      <style>{`
        .ta-row:hover{background:#F7F8FB}
        .ta-tr:hover{background:#FAFAFC}
        .ta-in:focus{outline:none;border-color:#C9CBE8 !important}
        .ta-fade{transition:opacity .2s}
        .ta-col:hover > div{filter:brightness(.82)}
        .ta-cell:hover{outline:2px solid #14161C;outline-offset:-1px}
        .ta-date{outline:none;color-scheme:light}
        .ta-date::-webkit-calendar-picker-indicator{opacity:.55;cursor:pointer}
      `}</style>
      <TipLayer ref={tipRef} />

      {/* 헤더 */}
      <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 14 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>접속 경로 분석</div>
          <div style={{ fontSize: 12.5, color: MUTED, marginTop: 4 }}>
            ori.blue · {rangeLabel(spec)} · 페이지뷰 기준{loading ? ` · 불러오는 중…${progress ? ` (${fmt(progress)}행)` : ""}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ display: "flex", background: "#fff", border: "1px solid #E5E7EE", borderRadius: 10, padding: 3 }}>
            {RANGES.map((r) => {
              const on = r === range;
              return (
                <button
                  key={r}
                  onClick={() => (on ? setTick((t) => t + 1) : setRange(r))}
                  style={{ border: "none", background: on ? A : "transparent", color: on ? "#fff" : "#6B7080", fontSize: 12.5, fontWeight: on ? 700 : 500, padding: "6px 13px", borderRadius: 8, cursor: "pointer" }}
                >
                  {r}
                </button>
              );
            })}
          </div>
          {/* 직접 기간 지정 */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, background: "#fff", border: `1px solid ${range === "기간" ? A : "#E5E7EE"}`, borderRadius: 10, padding: 3 }}>
            <input
              type="date"
              className="ta-date"
              value={draftStart}
              max={draftEnd || undefined}
              onChange={(e) => setDraftStart(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              style={{ border: "none", background: "transparent", fontSize: 12.5, color: "#4A4F60", padding: "4px 6px", fontFamily: MONO, width: 128 }}
            />
            <span style={{ fontSize: 12, color: FAINTER }}>~</span>
            <input
              type="date"
              className="ta-date"
              value={draftEnd}
              min={draftStart || undefined}
              onChange={(e) => setDraftEnd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyCustom()}
              style={{ border: "none", background: "transparent", fontSize: 12.5, color: "#4A4F60", padding: "4px 6px", fontFamily: MONO, width: 128 }}
            />
            <button
              onClick={applyCustom}
              disabled={!draftStart || !draftEnd}
              style={{ border: "none", background: range === "기간" ? A : "#F3F4F7", color: range === "기간" ? "#fff" : "#4A4F60", fontSize: 12.5, fontWeight: 700, padding: "6px 13px", borderRadius: 8, cursor: "pointer", marginLeft: 4 }}
            >
              조회
            </button>
          </div>
          <button onClick={exportCsv} disabled={!d.cur.length} style={{ border: "1px solid #E5E7EE", background: "#fff", color: "#4A4F60", fontSize: 12.5, fontWeight: 600, padding: "8px 14px", borderRadius: 10, cursor: "pointer", opacity: d.cur.length ? 1 : 0.5 }}>
            CSV 내보내기
          </button>
        </div>
      </header>

      {error && (
        <div style={{ background: "#FDF1F1", border: "1px solid #F3CACA", color: "#9B2C2C", borderRadius: 12, padding: "10px 14px", fontSize: 12.5 }}>
          데이터를 불러오지 못했습니다. ({error}){" "}
          <button onClick={() => setTick((t) => t + 1)} style={{ border: "none", background: "none", color: "#9B2C2C", fontWeight: 700, cursor: "pointer", textDecoration: "underline" }}>
            다시 시도
          </button>
        </div>
      )}

      {/* 탭 */}
      <div style={{ display: "flex", gap: 6, borderBottom: "1px solid #E5E7EE" }}>
        {(
          [
            ["방문 통계", "stats"],
            ["방문자 로그", "logs"],
          ] as const
        ).map(([l, v]) => {
          const on = v === tab;
          return (
            <button
              key={v}
              onClick={() => setTab(v)}
              style={{ border: "none", background: "none", padding: "10px 4px", marginRight: 18, fontSize: 14, fontWeight: on ? 700 : 500, color: on ? INK : MUTED, cursor: "pointer", borderBottom: `2px solid ${on ? A : "transparent"}`, marginBottom: -1 }}
            >
              {l}
            </button>
          );
        })}
      </div>

      {/* ═══════════ 방문 통계 ═══════════ */}
      {tab === "stats" && (
        <div className="ta-fade" style={{ display: "flex", flexDirection: "column", gap: 16, opacity: loading ? 0.55 : 1 }}>
          {/* KPI */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(196px,1fr))", gap: 14 }}>
            {kpis.map((k) => (
              <div key={k.label} style={{ ...card, padding: "16px 18px" }} onMouseMove={(e) => show(e, k.label, [`${k.value}${k.delta && k.delta !== "—" ? ` (${k.delta})` : ""}`, k.sub])} onMouseLeave={hide}>
                <div style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{k.label}</div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 8 }}>
                  <div style={{ fontSize: 27, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1 }}>{k.value}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: k.delta === "—" || !k.delta ? MUTED : k.up ? "oklch(0.55 0.14 150)" : "oklch(0.58 0.16 20)", paddingBottom: 2 }}>{k.delta}</div>
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 10 }}>
                  <div style={{ fontSize: 11.5, color: FAINT }}>{k.sub}</div>
                  <svg viewBox="0 0 100 26" preserveAspectRatio="none" style={{ width: 86, height: 26, overflow: "visible", flex: "0 0 86px" }}>
                    <polyline points={k.spark} fill="none" stroke={k.stroke} strokeWidth={1.6} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

          {/* 일별(시간별) 페이지뷰 */}
          <div style={{ ...card, padding: "18px 20px 14px" }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <div style={cardTitle}>{d.hourly ? "시간별 페이지뷰" : "일별 페이지뷰"}</div>
                <div style={cardSub}>{d.hourly ? "봇 제외 · KST 시간대" : "봇 제외 · 옅은 막대는 주말"}</div>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 11.5, color: MUTED }}>
                <div>
                  {d.hourly ? "시간평균" : "일평균"} <b style={{ color: INK, fontSize: 13 }}>{fmt(avg)}</b>
                </div>
                <div>
                  최고 <b style={{ color: INK, fontSize: 13 }}>{fmt(Math.max(...bucketN, 0))}</b> ({maxDayLabel})
                </div>
              </div>
            </div>
            {d.buckets.length === 0 || d.human.length === 0 ? (
              <Empty h={188} />
            ) : (
              <>
                <div style={{ position: "relative", height: 188, marginTop: 18 }}>
                  <div style={{ position: "absolute", left: 0, right: 0, bottom: `${((avg / mxD) * 100).toFixed(1)}%`, borderTop: "1px dashed #C9CCD8", height: 0 }}>
                    <span style={{ position: "absolute", right: 0, top: -16, fontSize: 10.5, color: FAINTER, background: "#fff", padding: "0 4px" }}>평균</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: d.buckets.length > 60 ? 1 : 4, height: "100%" }}>
                    {d.buckets.map((b) => (
                      <div
                        key={b.at.getTime()}
                        className="ta-col"
                        onMouseMove={(e) => show(e, b.name, [`페이지뷰 ${fmt(b.n)}`, `추정 방문자 ${fmt(b.uniq)} · 세션 ${fmt(b.sess)}`, `1페이지 이탈 ${b.bounce}%`])}
                        onMouseLeave={hide}
                        style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", alignItems: "flex-end", cursor: "pointer" }}
                      >
                        <div style={{ width: "100%", height: `${Math.max(2, (b.n / mxD) * 100).toFixed(1)}%`, background: b.weekend ? "oklch(0.62 0.17 285 / 0.28)" : A, borderRadius: "4px 4px 2px 2px" }} />
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: d.buckets.length > 60 ? 1 : 4, marginTop: 8 }}>
                  {d.buckets.map((b) => (
                    <div key={b.at.getTime()} style={{ flex: 1, minWidth: 0, textAlign: "center", fontSize: 10, color: FAINTER, fontFamily: MONO, whiteSpace: "nowrap" }}>
                      {b.label}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* 히트맵 + 유입 채널 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))", gap: 16 }}>
            <div style={card}>
              <div style={cardTitle}>요일 × 시간대 히트맵</div>
              <div style={cardSub}>createdAt에서 파생 · 진할수록 방문 많음</div>
              <div style={{ display: "grid", gridTemplateColumns: "22px repeat(24,1fr)", gap: 3, marginTop: 16 }}>
                {d.heat.map((row, r) => (
                  <React.Fragment key={r}>
                    <div style={{ aspectRatio: "1", borderRadius: 3, fontSize: 9, color: FAINT, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: MONO }}>{DOW[r]}</div>
                    {row.map((n, h) => (
                      <div
                        key={h}
                        className="ta-cell"
                        onMouseMove={(e) => show(e, `${DOW[r]}요일 ${h}시 ~ ${h + 1}시`, [`${fmt(n)}건 · 전체의 ${pct(n, d.human.length)}`])}
                        onMouseLeave={hide}
                        style={{ aspectRatio: "1", borderRadius: 3, cursor: "pointer", background: n === 0 ? "#F4F5F8" : `oklch(0.62 0.17 285 / ${(0.13 + (n / mxH) * 0.87).toFixed(2)})` }}
                      />
                    ))}
                  </React.Fragment>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "22px repeat(24,1fr)", gap: 3, marginTop: 5 }}>
                <div />
                {Array.from({ length: 24 }, (_, i) => (
                  <div key={i} style={{ fontSize: 9, color: FAINTER, textAlign: "center", fontFamily: MONO }}>
                    {i % 3 === 0 ? i : ""}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid #F0F1F5", fontSize: 12, color: "#5A5F6E" }}>
                가장 붐비는 시간 <b style={{ color: INK }}>{peak.n > 0 ? `${DOW[peak.dow]}요일 ${peak.h}시 (${peak.n}건)` : "-"}</b>
              </div>
            </div>

            <div style={card}>
              <div style={cardTitle}>유입 채널</div>
              <div style={cardSub}>Referrer 문자열 분류 · 세션 기준</div>
              <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 18, flexWrap: "wrap" }}>
                <div onMouseMove={onDonutMove} onMouseLeave={hide} style={{ position: "relative", width: 148, height: 148, flex: "0 0 148px", borderRadius: "50%", background: donut, cursor: "pointer" }}>
                  <div style={{ position: "absolute", inset: 26, borderRadius: "50%", background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>{fmt(d.humanS.length)}</div>
                    <div style={{ fontSize: 10.5, color: FAINT }}>세션</div>
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 150, display: "flex", flexDirection: "column", gap: 11 }}>
                  {channels.length === 0 && <Empty h={60} />}
                  {channels.map((c) => (
                    <div key={c.name} onMouseMove={(e) => show(e, `${c.name} 유입`, [`${fmt(c.n)} 세션 · ${c.pct}`])} onMouseLeave={hide} style={{ display: "flex", alignItems: "center", gap: 9, cursor: "default" }}>
                      <span style={{ width: 9, height: 9, borderRadius: 3, background: c.color, flex: "0 0 9px" }} />
                      <span style={{ fontSize: 12.5, flex: 1 }}>{c.name}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.pct}</span>
                      <span style={{ fontSize: 11.5, color: FAINT, width: 44, textAlign: "right" }}>{c.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* UA 카드 3종 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 16 }}>
            {uaCards.map((u) => (
              <div key={u.title} style={card}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                  <div style={cardTitle}>{u.title}</div>
                  <div style={{ fontSize: 11, color: FAINTER }}>UA 파싱</div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
                  {u.rows.length === 0 && <Empty h={60} />}
                  {u.rows.map((r) => (
                    <div key={r.name} onMouseMove={(e) => show(e, `${u.title} · ${r.name}`, [`${r.count}건 · 전체의 ${pct(r.n, r.tot)}`])} onMouseLeave={hide} style={{ cursor: "default" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", fontSize: 12.5 }}>
                        <span style={{ fontWeight: 600 }}>{r.name}</span>
                        <span style={{ color: MUTED }}>
                          {r.count} · <b style={{ color: INK }}>{r.pct}</b>
                        </span>
                      </div>
                      <div style={{ ...track, height: 6, borderRadius: 4, marginTop: 6 }}>
                        <div style={{ height: "100%", width: r.w, background: r.color, borderRadius: 4 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 인기 경로 + 유입 출처 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))", gap: 16 }}>
            <div style={card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={cardTitle}>인기 경로</div>
                  <div style={cardSub}>URL 디코딩 적용 · 상위 {TOP_N}개</div>
                </div>
                <Seg items={["전체 경로", "섹션별"]} value={pathMode === "section" ? "섹션별" : "전체 경로"} onChange={(l) => setPathMode(l === "섹션별" ? "section" : "raw")} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 14 }}>
                {paths.length === 0 && <Empty />}
                {paths.map((p) => (
                  <div key={p.path} className="ta-row" onMouseMove={(e) => show(e, p.path, [p.label || "", `${p.count} · 전체의 ${pct(p.n, pathTotal)}`].filter(Boolean))} onMouseLeave={hide} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 8px", borderRadius: 9 }}>
                    <span style={{ fontSize: 11, color: "#B0B5C2", width: 14, textAlign: "right", fontFamily: MONO }}>{p.rank}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                        <span style={{ fontFamily: MONO, fontSize: 12.5, color: "#2B2F3C", ...ell }}>{p.path}</span>
                        <span style={{ fontSize: 11, color: FAINTER, whiteSpace: "nowrap" }}>{p.label}</span>
                      </div>
                      <div style={{ ...track, marginTop: 6 }}>
                        <div style={{ height: "100%", width: p.w, background: A, borderRadius: 3 }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, width: 52, textAlign: "right" }}>{p.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={card}>
              <div style={cardTitle}>유입 출처</div>
              <div style={cardSub}>내부 이동 제외 · 도메인 단위 · 세션 기준</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 14 }}>
                {referrers.length === 0 && <Empty />}
                {referrers.map((r) => (
                  <div key={r.host} className="ta-row" onMouseMove={(e) => show(e, r.host, [`${r.channel} · ${r.count}세션 · 전체의 ${pct(r.n, d.humanS.length)}`])} onMouseLeave={hide} style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 8px", borderRadius: 9 }}>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: chColor(r.channel)[0], background: chColor(r.channel)[1], padding: "3px 7px", borderRadius: 6, whiteSpace: "nowrap" }}>{r.channel}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12.5, flex: 1, minWidth: 0, color: "#2B2F3C", ...ell }}>{r.host}</span>
                    <div style={{ ...track, width: 74, flex: "0 0 74px" }}>
                      <div style={{ height: "100%", width: r.w, background: r.color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, width: 44, textAlign: "right" }}>{r.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 한계 안내 */}
          <div style={{ background: "#FBFBFD", border: "1px dashed #DCDFE8", borderRadius: 14, padding: "16px 20px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "#5A5F6E" }}>이 화면에서 알 수 없는 것</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              {LIMITS.map((l) => (
                <span key={l} style={{ fontSize: 11.5, color: MUTED, background: "#fff", border: "1px solid #E8E9EF", padding: "5px 10px", borderRadius: 7 }}>
                  {l}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11.5, color: FAINT, marginTop: 11, lineHeight: 1.6 }}>
              방문자 수는 IP + User-Agent 조합으로 추정한 값입니다. 같은 IP를 쓰는 다른 사람은 한 명으로, 모바일 네트워크에서 IP가 바뀐 한 사람은 여러 명으로 세어집니다.
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ 방문자 로그 ═══════════ */}
      {tab === "logs" && (
        <div className="ta-fade" style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start", opacity: loading ? 0.55 : 1 }}>
          {/* 좌: 필터 + 목록 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 300, flex: "1 1 440px" }}>
            <div style={{ ...card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <input
                className="ta-in"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="경로 · IP · 브라우저 검색"
                style={{ flex: 1, minWidth: 180, border: "1px solid #E5E7EE", background: "#FAFAFC", borderRadius: 10, padding: "9px 12px", fontSize: 13, color: INK, fontFamily: "inherit" }}
              />
              <Seg items={["세션별", "원본 로그"]} value={logMode === "session" ? "세션별" : "원본 로그"} onChange={(l) => setLogMode(l === "세션별" ? "session" : "raw")} pad="6px 12px" />
              <button
                onClick={() => setHideBots((v) => !v)}
                style={{ border: `1px solid ${hideBots ? A : "#E5E7EE"}`, background: hideBots ? "#EEEEFB" : "#fff", color: hideBots ? "#4B4FA6" : "#6B7080", fontSize: 12, fontWeight: 600, padding: "7px 12px", borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", gap: 7 }}
              >
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: hideBots ? A : "#C9CCD8" }} />봇 제외
              </button>
              <div style={{ fontSize: 12, color: MUTED, marginLeft: "auto" }}>{resultLabel}</div>
            </div>

            {logMode === "session" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {sessions.length === 0 && (
                  <div style={card}>
                    <Empty />
                  </div>
                )}
                {sessions.map((s: Sess) => {
                  const ch = sessionChannel(s);
                  const [av, avFg, avBg] = avatarOf(s.info.dev);
                  const mins = Math.round((s.end.getTime() - s.start.getTime()) / 60000);
                  const trail = s.seq.slice(0, 6);
                  return (
                    <div key={`${s.key}|${s.start.getTime()}`} style={{ ...card, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
                        <div style={{ width: 30, height: 30, borderRadius: 9, background: avBg, color: avFg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flex: "0 0 30px" }}>{av}</div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                            <span style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 500 }}>{s.ip || "-"}</span>
                            <span style={{ fontSize: 11, color: "#6B7080", background: "#F3F4F7", padding: "2px 7px", borderRadius: 6 }}>
                              {s.info.br} · {s.info.os}
                            </span>
                            <span style={{ fontSize: 10.5, fontWeight: 700, color: chColor(ch)[0], background: chColor(ch)[1], padding: "2px 7px", borderRadius: 6 }}>{ch}</span>
                          </div>
                          <div style={{ fontSize: 11.5, color: FAINT, marginTop: 3 }}>
                            {timeStr(s.start)} · {mins > 0 ? `${mins}분 체류(추정)` : s.seq.length > 1 ? "1분 미만" : "단일 요청"}
                            {s.ref && ch !== "직접" ? ` · ${host(s.ref)}` : ""}
                          </div>
                        </div>
                        <div style={{ marginLeft: "auto", textAlign: "right" }}>
                          <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-.02em" }}>{s.seq.length}</div>
                          <div style={{ fontSize: 10.5, color: FAINT }}>페이지뷰</div>
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid #F2F3F7" }}>
                        {trail.map((e, i) => (
                          <span key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span title={safeDecode(e.path)} style={{ fontFamily: MONO, fontSize: 11.5, color: "#3A3F4E", background: "#F5F6FA", border: "1px solid #EAECF2", padding: "4px 9px", borderRadius: 7, whiteSpace: "nowrap" }}>
                              {shortPath(e.path)}
                            </span>
                            {i < trail.length - 1 && <span style={{ color: "#C4C8D2", fontSize: 11 }}>→</span>}
                          </span>
                        ))}
                        {s.seq.length > 6 && <span style={{ fontSize: 11, color: FAINTER }}>+{s.seq.length - 6}</span>}
                      </div>
                    </div>
                  );
                })}
                {sMaxPage > 0 && (
                  <div style={{ ...card, padding: 0 }}>
                    <Pager page={spg} maxPage={sMaxPage} onPrev={() => setSessPage(Math.max(0, spg - 1))} onNext={() => setSessPage(Math.min(sMaxPage, spg + 1))} />
                  </div>
                )}
              </div>
            ) : (
              <div style={{ ...card, padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "minmax(88px,0.9fr) minmax(0,2.2fr) minmax(0,1.5fr) minmax(58px,0.7fr)", gap: 10, padding: "11px 16px", background: "#FAFAFC", borderBottom: "1px solid #EDEEF3", fontSize: 11.5, fontWeight: 700, color: MUTED }}>
                  <div>시간</div>
                  <div>경로</div>
                  <div>방문자</div>
                  <div>유입</div>
                </div>
                {rows.length === 0 && <Empty h={120} />}
                {rows.map((e, i) => {
                  const ch = chan(e.ref);
                  return (
                    <div key={`${e.t.getTime()}-${i}`} className="ta-tr" style={{ display: "grid", gridTemplateColumns: "minmax(88px,0.9fr) minmax(0,2.2fr) minmax(0,1.5fr) minmax(58px,0.7fr)", gap: 10, padding: "11px 16px", borderBottom: "1px solid #F3F4F8", alignItems: "center" }}>
                      <div style={{ fontSize: 12, color: "#6B7080", fontFamily: MONO }}>{timeStr(e.t)}</div>
                      <div style={{ minWidth: 0 }}>
                        <div title={safeDecode(e.path)} style={{ fontFamily: MONO, fontSize: 12.5, color: "#2B2F3C", ...ell }}>{safeDecode(e.path)}</div>
                        <div style={{ fontSize: 10.5, color: FAINTER, marginTop: 2 }}>{pathLabel(e.path)}</div>
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontFamily: MONO, fontSize: 12, ...ell }}>{e.ip || "-"}</div>
                        <div title={e.ua} style={{ fontSize: 10.5, color: FAINTER, marginTop: 2, ...ell }}>
                          {e.info.br} · {e.info.os}
                        </div>
                      </div>
                      <div style={{ minWidth: 0 }} title={e.ref || undefined}>
                        <Chip c={ch} />
                      </div>
                    </div>
                  );
                })}
                <Pager page={pg} maxPage={maxPage} onPrev={() => setPage(Math.max(0, pg - 1))} onNext={() => setPage(Math.min(maxPage, pg + 1))} />
              </div>
            )}
          </div>

          {/* 우: 최근 접속 / 봇 / 재방문 */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: "1 1 264px", maxWidth: "100%", minWidth: 260 }}>
            <div style={{ ...card, padding: "16px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "oklch(0.68 0.16 150)" }} />
                <div style={{ fontSize: 13, fontWeight: 700 }}>최근 접속</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
                {recent.length === 0 && <Empty h={60} />}
                {recent.map((e, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div title={timeStr(e.t)} style={{ fontSize: 11, color: FAINTER, fontFamily: MONO, paddingTop: 1, flex: "0 0 52px", whiteSpace: "nowrap" }}>{clockStr(e.t)}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div title={safeDecode(e.path)} style={{ fontFamily: MONO, fontSize: 11.5, color: "#2B2F3C", ...ell }}>{safeDecode(e.path)}</div>
                      <div style={{ fontSize: 10.5, color: FAINTER, marginTop: 2, ...ell }}>
                        {e.ip || "-"} · {e.info.br}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...card, padding: "16px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>봇 트래픽</div>
              <div style={cardSub}>UA 패턴 매칭</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginTop: 12 }}>
                <div style={{ fontSize: 25, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1 }}>{botPct}</div>
                <div style={{ fontSize: 11.5, color: FAINT, paddingBottom: 3 }}>전체 {fmt(d.botEv.length)}건</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14 }}>
                {bots.length === 0 && <div style={{ fontSize: 12, color: FAINTER }}>감지된 봇 없음</div>}
                {bots.map((b) => (
                  <div key={b.name} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 12 }}>
                    <span style={{ fontFamily: MONO, flex: 1, color: "#4A4F60" }}>{b.name}</span>
                    <span style={{ fontWeight: 700 }}>{b.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ ...card, padding: "16px 18px" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>재방문 IP</div>
              <div style={{ ...cardSub, lineHeight: 1.55 }}>같은 IP가 다른 날 다시 등장한 경우</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                {repeats.length === 0 && <div style={{ fontSize: 12, color: FAINTER }}>재방문 없음</div>}
                {repeats.map((r, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontFamily: MONO, fontSize: 11.5, flex: 1, minWidth: 0, ...ell }}>{r.ip || "-"}</span>
                    <span style={{ fontSize: 10.5, color: MUTED }}>{r.days.size}일</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{r.n}회</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
