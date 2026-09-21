// 접속 경로 분석(/myoriadmin/analytics) 파생 지표 계산.
// DB(page_views)에는 pvPath / pvIp / pvUserAgent / pvReferer / createdAt 5개만 있으므로
// 방문자·세션·기기·채널·봇 등은 전부 이 5개에서 클라이언트에서 파생한다(추정치).
// 시간 계산은 브라우저 타임존과 무관하게 KST(UTC+9) 고정.

export interface RawLog {
  pvIdx: number | string;
  pvPath: string;
  pvIp: string | null;
  pvUserAgent: string | null;
  pvReferer: string | null;
  createdAt: string;
}

export interface UAInfo {
  bot: boolean;
  br: string;
  os: string;
  dev: string;
}

export interface Ev {
  t: Date;
  path: string;
  ip: string;
  ua: string;
  ref: string;
  info: UAInfo;
}

export interface Sess {
  key: string;
  ip: string;
  ua: string;
  info: UAInfo;
  ref: string;
  start: Date;
  end: Date;
  seq: Ev[];
}

export type RangeKey = "오늘" | "7일" | "30일" | "전체";

export interface RangeSpec {
  /** 프리셋 키. 직접 지정한 기간은 "기간" */
  key: RangeKey | "기간";
  /** 현재 구간 시작(포함). 전체면 null */
  start: Date | null;
  /** 현재 구간 끝(미포함) = 내일 00:00 KST */
  end: Date;
  /** 비교용 이전 구간 시작(포함). 전체면 null */
  prevStart: Date | null;
  days: number | null;
}

/* ───────── KST 시간 유틸 ───────── */

const KST_OFFSET = 9 * 60 * 60 * 1000;
const pad = (n: number) => String(n).padStart(2, "0");

export interface KstParts {
  y: number;
  m: number; // 0-based
  d: number;
  dow: number;
  h: number;
  min: number;
}

export function kst(date: Date): KstParts {
  const k = new Date(date.getTime() + KST_OFFSET);
  return {
    y: k.getUTCFullYear(),
    m: k.getUTCMonth(),
    d: k.getUTCDate(),
    dow: k.getUTCDay(),
    h: k.getUTCHours(),
    min: k.getUTCMinutes(),
  };
}

/** KST 기준 해당 날짜 00:00 의 실제 시각 */
export function kstDayStart(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m, d) - KST_OFFSET);
}

export function kstDayKey(date: Date): string {
  const p = kst(date);
  return `${p.y}-${pad(p.m + 1)}-${pad(p.d)}`;
}

/** API 쿼리용 YYYY-MM-DD (KST) */
export function toDateParam(date: Date): string {
  return kstDayKey(date);
}

export function rangeSpec(key: RangeKey, now: Date = new Date()): RangeSpec {
  const t = kst(now);
  const end = kstDayStart(t.y, t.m, t.d + 1);
  if (key === "전체") return { key, start: null, end, prevStart: null, days: null };
  const days = key === "오늘" ? 1 : key === "7일" ? 7 : 30;
  return {
    key,
    start: kstDayStart(t.y, t.m, t.d - (days - 1)),
    end,
    prevStart: kstDayStart(t.y, t.m, t.d - (2 * days - 1)),
    days,
  };
}

/** 직접 지정한 기간(YYYY-MM-DD ~ YYYY-MM-DD, KST, 양끝 포함). 순서가 뒤집혀 있으면 바꿔서 해석 */
export function rangeSpecCustom(startYmd: string, endYmd: string): RangeSpec {
  const parse = (ymd: string) => {
    const [y, m, d] = ymd.split("-").map(Number);
    return kstDayStart(y, m - 1, d);
  };
  let a = parse(startYmd);
  let b = parse(endYmd);
  if (a.getTime() > b.getTime()) [a, b] = [b, a];
  const end = new Date(b.getTime() + 86400_000);
  const days = Math.round((end.getTime() - a.getTime()) / 86400_000);
  return { key: "기간", start: a, end, prevStart: new Date(a.getTime() - days * 86400_000), days };
}

/** 헤더 부제: "최근 30일 (2026-08-23 ~ 2026-09-21)" */
export function rangeLabel(spec: RangeSpec): string {
  const last = new Date(spec.end.getTime() - 1);
  if (spec.key === "전체") return "전체 기간";
  if (spec.key === "오늘") return `오늘 (${kstDayKey(last)})`;
  if (spec.key === "기간") return `${kstDayKey(spec.start as Date)} ~ ${kstDayKey(last)} (${spec.days}일)`;
  return `최근 ${spec.days}일 (${kstDayKey(spec.start as Date)} ~ ${kstDayKey(last)})`;
}

/** "9.21 오후 9:05" */
export function timeStr(t: Date): string {
  const p = kst(t);
  const ap = p.h < 12 ? "오전" : "오후";
  const hh = p.h % 12 === 0 ? 12 : p.h % 12;
  return `${p.m + 1}.${p.d} ${ap} ${hh}:${pad(p.min)}`;
}

/** "오후 9:05" */
export function clockStr(t: Date): string {
  return timeStr(t).split(" ").slice(1).join(" ");
}

export const fmt = (n: number) => n.toLocaleString("ko-KR");

/* ───────── UA / Referer 분류 ───────── */

const BOT_RE = /bot|crawler|spider|slurp|headless|python-requests|python-urllib|curl\/|wget|Yeti|facebookexternalhit|Bytespider|GPTBot|ClaudeBot|Applebot|PetalBot|Scrapy|axios\/|node-fetch|Go-http-client/i;

export function parseUA(u: string): UAInfo {
  const bot = BOT_RE.test(u);
  let br = /KAKAOTALK/i.test(u)
    ? "카카오톡 인앱"
    : /NAVER\(inapp/i.test(u)
      ? "네이버 인앱"
      : /Instagram/i.test(u)
        ? "인스타그램 인앱"
        : /Edg\//.test(u)
          ? "Edge"
          : /SamsungBrowser/.test(u)
            ? "삼성인터넷"
            : /Whale\//.test(u)
              ? "웨일"
              : /Chrome\//.test(u)
                ? "Chrome"
                : /Version\/[\d.]+ (Mobile\/\S+ )?Safari/.test(u) || /Safari\//.test(u)
                  ? "Safari"
                  : /Firefox/.test(u)
                    ? "Firefox"
                    : "기타";
  let os = /iPhone|iPad|iOS/.test(u)
    ? "iOS"
    : /Android/.test(u)
      ? "Android"
      : /Windows/.test(u)
        ? "Windows"
        : /Mac OS X/.test(u)
          ? "macOS"
          : /Linux/.test(u)
            ? "Linux"
            : "기타";
  let dev = /iPad|Tablet/.test(u) ? "태블릿" : /Mobi|iPhone|Android/.test(u) ? "모바일" : "데스크톱";
  if (bot) {
    dev = "봇";
    os = "-";
    br = /Googlebot/i.test(u)
      ? "Googlebot"
      : /bingbot/i.test(u)
        ? "bingbot"
        : /AhrefsBot/i.test(u)
          ? "AhrefsBot"
          : /Yeti/i.test(u)
            ? "Yeti(네이버)"
            : /GPTBot/i.test(u)
              ? "GPTBot"
              : /ClaudeBot/i.test(u)
                ? "ClaudeBot"
                : /facebookexternalhit/i.test(u)
                  ? "facebook"
                  : /Bytespider/i.test(u)
                    ? "Bytespider"
                    : "기타 봇";
  }
  return { bot, br, os, dev };
}

export type Channel = "직접" | "내부 이동" | "검색" | "SNS" | "기타";

export function chan(ref: string): Channel {
  if (!ref) return "직접";
  if (/ori\.blue|localhost/.test(ref)) return "내부 이동";
  if (/google|naver|daum|bing|zum|yahoo|duckduckgo/i.test(ref)) return "검색";
  if (/instagram|facebook|t\.co|twitter|x\.com|kakao|threads|youtube|tiktok|band\.us/i.test(ref)) return "SNS";
  return "기타";
}

export function host(ref: string): string {
  if (!ref) return "(직접 유입)";
  return ref.replace(/^https?:\/\//, "").split("/")[0] || ref;
}

/** 채널 칩 색상 [fg, bg] */
export function chColor(c: string): [string, string] {
  const m: Record<string, [string, string]> = {
    직접: ["#4B4FA6", "#EEEEFB"],
    검색: ["#186A5E", "#E6F5F1"],
    SNS: ["#9A4B7A", "#FBEDF5"],
    "내부 이동": ["#6B7080", "#F2F3F7"],
    기타: ["#8A6A2A", "#FBF3E4"],
  };
  return m[c] || m["기타"];
}

/* ───────── 경로 라벨 ───────── */

// 첫 세그먼트 → 섹션명. 실제 라우트(src/app/*) 기준.
export const SECTIONS: Record<string, string> = {
  "": "홈",
  "matzal-al-mentor": "맛잘알 오빠",
  "matzal-al-board": "맛잘알 후기",
  "matzal-al-search": "맛잘알 검색",
  "church-mentor": "교회 오빠",
  "church-board": "교회 후기",
  "church-search": "교회 검색",
  "univ-mentor": "학교 오빠",
  "univ-board": "학교 후기",
  "univ-search": "학교 검색",
  "company-mentor": "회사 오빠",
  "company-board": "회사 후기",
  "company-search": "회사 검색",
  comp: "회사 상세",
  "outsource-mentor": "외주 오빠",
  "outsource-board": "외주 후기",
  "outsource-search": "외주 검색",
  outsource: "외주 목록",
  "outsource-detail": "외주 상세",
  freeboard: "자유게시판",
  community: "커뮤니티",
  search: "통합 검색",
  s: "공유 링크",
  ori: "오리",
  vendor: "벤더",
};

export function safeDecode(p: string): string {
  try {
    return decodeURI(p);
  } catch {
    return p;
  }
}

export function pathLabel(p: string): string {
  const seg = p.split("/").filter(Boolean);
  if (seg.length === 0) return "홈";
  const s = SECTIONS[seg[0]];
  if (seg.length === 1) return s || "";
  if (seg.length === 2 && s) return `${s} 상세`;
  return s || "";
}

/** 세션 흐름 표시용 마지막 세그먼트 */
export function shortPath(p: string): string {
  if (p === "/") return "홈";
  const s = p.split("/").filter(Boolean);
  return safeDecode(s[s.length - 1] || p);
}

/* ───────── 이벤트 / 세션 ───────── */

const uaCache = new Map<string, UAInfo>();

export function toEvents(rows: RawLog[]): Ev[] {
  const out: Ev[] = [];
  for (const r of rows) {
    const t = new Date(r.createdAt);
    if (isNaN(t.getTime())) continue;
    const ua = r.pvUserAgent || "";
    let info = uaCache.get(ua);
    if (!info) {
      info = parseUA(ua);
      uaCache.set(ua, info);
    }
    out.push({
      t,
      path: r.pvPath || "/",
      ip: (r.pvIp || "").replace(/^::ffff:/, ""),
      ua,
      ref: r.pvReferer || "",
      info,
    });
  }
  out.sort((a, b) => a.t.getTime() - b.t.getTime());
  return out;
}

/** 같은 IP+UA 를 30분 무활동 기준으로 묶는다 */
export function buildSessions(events: Ev[], gapMs = 30 * 60 * 1000): Sess[] {
  const byKey = new Map<string, Ev[]>();
  for (const e of events) {
    const k = `${e.ip}|${e.ua}`;
    const list = byKey.get(k);
    if (list) list.push(e);
    else byKey.set(k, [e]);
  }
  const out: Sess[] = [];
  byKey.forEach((list, key) => {
    let cur: Sess | null = null;
    for (const e of list) {
      if (!cur || e.t.getTime() - cur.end.getTime() > gapMs) {
        cur = { key, ip: e.ip, ua: e.ua, info: e.info, ref: e.ref, start: e.t, end: e.t, seq: [e] };
        out.push(cur);
      } else {
        cur.seq.push(e);
        cur.end = e.t;
      }
    }
  });
  out.sort((a, b) => a.start.getTime() - b.start.getTime());
  return out;
}

/** 세션의 유입 채널. 내부 이동으로 시작한 세션은 직접 유입으로 본다(도넛 합계 = 세션 수 유지) */
export function sessionChannel(s: Sess): Exclude<Channel, "내부 이동"> {
  const c = chan(s.ref);
  return c === "내부 이동" ? "직접" : c;
}

/* ───────── 집계 ───────── */

export const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"];

export interface Bucket {
  /** 버킷 시작 시각 */
  at: Date;
  label: string;
  /** 툴팁 제목: "9월 21일 (월)" / "20시 ~ 21시" */
  name: string;
  weekend: boolean;
  n: number;
  uniq: number;
  sess: number;
  bounce: number; // %
}

/**
 * 시간축 버킷. 오늘은 시간별(24), 나머지는 일별.
 * events/sessions 는 봇 제외 현재 구간 데이터.
 */
export function buildBuckets(spec: RangeSpec, events: Ev[], sessions: Sess[]): { hourly: boolean; buckets: Bucket[] } {
  const hourly = spec.days === 1;
  const buckets: Bucket[] = [];
  const idx = new Map<string, number>();

  if (hourly) {
    const day = spec.start as Date;
    for (let h = 0; h < 24; h++) {
      const at = new Date(day.getTime() + h * 3600_000);
      idx.set(String(h), buckets.length);
      buckets.push({ at, label: h % 3 === 0 ? `${h}시` : "", name: `${h}시 ~ ${h + 1}시`, weekend: false, n: 0, uniq: 0, sess: 0, bounce: 0 });
    }
  } else {
    let start = spec.start;
    if (!start) {
      const first = events[0]?.t ?? new Date(spec.end.getTime() - 86400_000);
      const p = kst(first);
      start = kstDayStart(p.y, p.m, p.d);
    }
    const days = Math.max(1, Math.round((spec.end.getTime() - start.getTime()) / 86400_000));
    const step = Math.max(1, Math.ceil(days / 6));
    for (let i = 0; i < days; i++) {
      const at = new Date(start.getTime() + i * 86400_000);
      const p = kst(at);
      idx.set(kstDayKey(at), buckets.length);
      buckets.push({
        at,
        label: i % step === 0 ? `${p.m + 1}.${p.d}` : "",
        name: `${p.m + 1}월 ${p.d}일 (${DOW_KO[p.dow]})`,
        weekend: p.dow === 0 || p.dow === 6,
        n: 0,
        uniq: 0,
        sess: 0,
        bounce: 0,
      });
    }
  }

  const keyOf = (t: Date) => (hourly ? String(kst(t).h) : kstDayKey(t));
  const uniqSets: Set<string>[] = buckets.map(() => new Set());
  const bounces: number[] = buckets.map(() => 0);

  for (const e of events) {
    const i = idx.get(keyOf(e.t));
    if (i === undefined) continue;
    buckets[i].n++;
    uniqSets[i].add(`${e.ip}|${e.ua}`);
  }
  for (const s of sessions) {
    const i = idx.get(keyOf(s.start));
    if (i === undefined) continue;
    buckets[i].sess++;
    if (s.seq.length === 1) bounces[i]++;
  }
  buckets.forEach((b, i) => {
    b.uniq = uniqSets[i].size;
    b.bounce = b.sess ? Math.round((bounces[i] / b.sess) * 100) : 0;
  });
  return { hourly, buckets };
}

export function countBy<T>(list: T[], key: (x: T) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const x of list) {
    const k = key(x);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

export function sortedEntries(obj: Record<string, number>): [string, number][] {
  return Object.entries(obj).sort((a, b) => b[1] - a[1]);
}

/** 스파크라인 polyline points (viewBox 0 0 100 26) */
export function sparkPoints(arr: number[]): string {
  if (arr.length === 0) return "";
  if (arr.length === 1) return `0,${(24 - (arr[0] ? 22 : 0)).toFixed(1)} 100,${(24 - (arr[0] ? 22 : 0)).toFixed(1)}`;
  const mx = Math.max(...arr, 1);
  return arr.map((v, i) => `${((i / (arr.length - 1)) * 100).toFixed(1)},${(24 - (v / mx) * 22).toFixed(1)}`).join(" ");
}

export function deltaStr(a: number, b: number | null): string {
  if (b === null || !b) return "—";
  const v = Math.round(((a - b) / b) * 100);
  return `${v >= 0 ? "+" : ""}${v}%`;
}

/** CSV(BOM 포함) 문자열 */
export function toCsv(events: Ev[]): string {
  const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
  const head = ["시간(KST)", "경로", "IP", "브라우저", "OS", "기기", "채널", "Referer", "User-Agent"];
  const lines = events.map((e) => {
    const p = kst(e.t);
    const ts = `${p.y}-${pad(p.m + 1)}-${pad(p.d)} ${pad(p.h)}:${pad(p.min)}`;
    return [ts, safeDecode(e.path), e.ip, e.info.br, e.info.os, e.info.dev, chan(e.ref), e.ref, e.ua].map(esc).join(",");
  });
  return "﻿" + [head.join(","), ...lines].join("\r\n");
}
