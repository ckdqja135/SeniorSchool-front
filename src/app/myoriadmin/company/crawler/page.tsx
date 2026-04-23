"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";

const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

interface SourceInfo {
  name: string;
  label: string;
  ready: boolean;
  reason?: string;
  note?: string;
}

interface CrawlStats {
  sources: Record<string, number>;
  totalFetched: number;
  duplicateSkipped: number;
  coordFixed: number;
  saved: number;
  failed: number;
  alreadyInDB?: number;
}

interface DbStats {
  totalCompanies: number;
  withURL: number;
  withCEO: number;
  withIndustry: number;
  recentAdded: number;
}

interface CrawlResult {
  success: boolean;
  message: string;
  stats: CrawlStats;
  data?: any[];
  saved?: string[];
}

interface CrawlLog {
  id: number;
  time: string;
  sources: string[];
  region: string;
  query: string;
  result: CrawlResult;
}

interface CompanyRow {
  compIdx: number;
  compName: string;
  compType?: string;
  compIndustry?: string;
  compCEO?: string;
  compLocate?: string;
  compAddr?: string;
  compLotAddr?: string;
  compLateX?: number | string;
  compLateY?: number | string;
  compURL?: string | null;
  compEstablish?: string;
  compViewCount?: number;
  createdAt?: string;
}

interface ManageResult {
  companies: CompanyRow[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

const REGION_OPTIONS = [
  "전체", "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

const SUB_REGIONS: Record<string, string[]> = {
  서울: ["전체","강남구","강동구","강북구","강서구","관악구","광진구","구로구","금천구","노원구","도봉구","동대문구","동작구","마포구","서대문구","서초구","성동구","성북구","송파구","양천구","영등포구","용산구","은평구","종로구","중구","중랑구"],
  부산: ["전체","강서구","금정구","기장군","남구","동구","동래구","부산진구","북구","사상구","사하구","서구","수영구","연제구","영도구","중구","해운대구"],
  대구: ["전체","남구","달서구","달성군","동구","북구","서구","수성구","중구"],
  인천: ["전체","강화군","계양구","남동구","동구","미추홀구","부평구","서구","연수구","옹진군","중구"],
  광주: ["전체","광산구","남구","동구","북구","서구"],
  대전: ["전체","대덕구","동구","서구","유성구","중구"],
  울산: ["전체","남구","동구","북구","울주군","중구"],
  세종: ["전체"],
  경기: ["전체","가평군","고양시","과천시","광명시","광주시","구리시","군포시","김포시","남양주시","동두천시","부천시","성남시","수원시","시흥시","안산시","안성시","안양시","양주시","양평군","여주시","연천군","오산시","용인시","의왕시","의정부시","이천시","파주시","평택시","포천시","하남시","화성시"],
  강원: ["전체","강릉시","고성군","동해시","삼척시","속초시","양구군","양양군","영월군","원주시","인제군","정선군","철원군","춘천시","태백시","평창군","홍천군","화천군","횡성군"],
  충북: ["전체","괴산군","단양군","보은군","영동군","옥천군","음성군","제천시","증평군","진천군","청주시","충주시"],
  충남: ["전체","계룡시","공주시","금산군","논산시","당진시","보령시","부여군","서산시","서천군","아산시","예산군","천안시","청양군","태안군","홍성군"],
  전북: ["전체","고창군","군산시","김제시","남원시","무주군","부안군","순창군","완주군","익산시","임실군","장수군","전주시","정읍시","진안군"],
  전남: ["전체","강진군","고흥군","곡성군","광양시","구례군","나주시","담양군","목포시","무안군","보성군","순천시","신안군","여수시","영광군","영암군","완도군","장성군","장흥군","진도군","함평군","해남군","화순군"],
  경북: ["전체","경산시","경주시","고령군","구미시","군위군","김천시","문경시","봉화군","상주시","성주군","안동시","영덕군","영양군","영주시","영천시","예천군","울릉군","울진군","의성군","청도군","청송군","칠곡군","포항시"],
  경남: ["전체","거제시","거창군","고성군","김해시","남해군","밀양시","사천시","산청군","양산시","의령군","진주시","창녕군","창원시","통영시","하동군","함안군","함양군","합천군"],
  제주: ["전체","제주시","서귀포시"],
};

const SOURCE_PALETTE: Record<string, { ring: string; dot: string; bg: string; text: string; border: string }> = {
  kakao:     { ring: "ring-yellow-400", dot: "bg-yellow-400", bg: "bg-yellow-50", text: "text-yellow-800", border: "border-yellow-300" },
  naver:     { ring: "ring-green-400",  dot: "bg-green-500",  bg: "bg-green-50",  text: "text-green-800",  border: "border-green-300" },
  publicData:{ ring: "ring-blue-400",   dot: "bg-blue-500",   bg: "bg-blue-50",   text: "text-blue-800",   border: "border-blue-300" },
};

const MATERIAL_STYLES = `
  .crawler-mat {
    --primary: #004ac6;
    --primary-container: #2563eb;
    --on-primary: #ffffff;
    --on-primary-container: #eeefff;
    --secondary: #006c49;
    --secondary-container: #6cf8bb;
    --tertiary: #784b00;
    --tertiary-container: #ffddb8;
    --error: #ba1a1a;
    --error-container: #ffdad6;
    --surface: #f8f9ff;
    --surface-container-lowest: #ffffff;
    --surface-container-low: #eff4ff;
    --surface-container: #e5eeff;
    --surface-container-high: #dce9ff;
    --surface-container-highest: #d3e4fe;
    --surface-variant: #d3e4fe;
    --on-surface: #0b1c30;
    --on-surface-variant: #434655;
    --outline: #737686;
    --outline-variant: #c3c6d7;
    font-family: 'Manrope', 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
    background: var(--surface);
    color: var(--on-surface);
    letter-spacing: -0.005em;
  }
  .crawler-mat .glass-card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
    border: 1px solid rgba(226, 232, 240, 0.8);
  }
  .crawler-mat .bento-grid {
    display: grid;
    grid-template-columns: repeat(12, 1fr);
    gap: 1.5rem;
  }
  .crawler-mat .material-symbols-outlined {
    font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    vertical-align: middle;
    user-select: none;
  }
`;

const MatIcon: React.FC<{ name: string; className?: string; fill?: 0 | 1; size?: number }> = ({
  name, className = "", fill = 0, size,
}) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill}`, ...(size ? { fontSize: size } : {}) }}
  >
    {name}
  </span>
);

const Spinner: React.FC = () => (
  <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
);

const StatBento: React.FC<{
  accent: string;
  icon: string;
  badge: string;
  value: string;
  sub?: string;
  subIcon?: string;
  subTone?: "primary" | "secondary" | "error";
}> = ({ accent, icon, badge, value, sub, subIcon, subTone = "primary" }) => (
  <div
    className="col-span-12 md:col-span-6 xl:col-span-3 glass-card rounded-xl p-5 flex flex-col gap-2"
    style={{ borderTop: `3px solid ${accent}` }}
  >
    <div className="flex items-center gap-2">
      <MatIcon name={icon} size={22} fill={1} className="text-[color:var(--primary)]" />
      <span className="text-[11px] font-semibold uppercase tracking-wider text-[color:var(--outline)]">
        {badge}
      </span>
    </div>
    <div className="text-[28px] font-bold leading-none">{value}</div>
    {sub && (
      <div className="flex items-center gap-1 text-[12px] text-[color:var(--outline)]">
        {subIcon && (
          <MatIcon
            name={subIcon}
            size={14}
            className={
              subTone === "secondary"
                ? "text-[color:var(--secondary)]"
                : subTone === "error"
                ? "text-[color:var(--error)]"
                : "text-[color:var(--primary)]"
            }
          />
        )}
        <span>{sub}</span>
      </div>
    )}
  </div>
);

const SourceChip: React.FC<{
  source: SourceInfo;
  selected: boolean;
  onToggle: () => void;
}> = ({ source, selected, onToggle }) => {
  const palette = SOURCE_PALETTE[source.name] || SOURCE_PALETTE.kakao;
  return (
    <button
      onClick={onToggle}
      disabled={!source.ready}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[13px] font-medium transition-all ${
        !source.ready
          ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
          : selected
          ? `${palette.bg} ${palette.border} ${palette.text} ring-2 ${palette.ring}/30`
          : "bg-white border-[color:var(--outline-variant)] text-[color:var(--on-surface-variant)] hover:border-[color:var(--primary)]/40"
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${source.ready ? palette.dot : "bg-gray-300"}`} />
      <span>{source.label}</span>
      {!source.ready && <span className="text-[10px]">({source.reason})</span>}
    </button>
  );
};

const EnrichStatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const map: Record<string, { color: string; text: string }> = {
    updated: { color: "bg-green-100 text-green-700 border-green-300", text: "갱신" },
    not_found: { color: "bg-gray-100 text-gray-600 border-gray-300", text: "미매칭" },
    no_data: { color: "bg-yellow-100 text-yellow-700 border-yellow-300", text: "데이터없음" },
    error: { color: "bg-red-100 text-red-700 border-red-300", text: "오류" },
  };
  const s = map[status] || map.not_found;
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold rounded border ${s.color}`}>
      {s.text}
    </span>
  );
};

const CompanyCrawlerPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"batch" | "single" | "enrich" | "manage">("batch");

  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  const [dbStats, setDbStats] = useState<DbStats>({
    totalCompanies: 0,
    withURL: 0,
    withCEO: 0,
    withIndustry: 0,
    recentAdded: 0,
  });

  // 통합 크롤링 옵션
  const [query, setQuery] = useState("회사");
  const [region, setRegion] = useState("서울");
  const [subRegion, setSubRegion] = useState("전체");
  const [countPerSource, setCountPerSource] = useState(30);
  const [dryRun, setDryRun] = useState(true);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // 개별 크롤링
  const [singleSource, setSingleSource] = useState("");
  const [singleQuery, setSingleQuery] = useState("회사");
  const [singleRegion, setSingleRegion] = useState("서울");
  const [singleSubRegion, setSingleSubRegion] = useState("전체");
  const [singleCount, setSingleCount] = useState(10);
  const [singleDryRun, setSingleDryRun] = useState(true);
  const [singleRunning, setSingleRunning] = useState(false);
  const [singleProgress, setSingleProgress] = useState("");
  const [singleResult, setSingleResult] = useState<CrawlResult | null>(null);
  const [singlePreview, setSinglePreview] = useState<any[]>([]);
  const [showSinglePreview, setShowSinglePreview] = useState(false);

  // 보강
  const [enriching, setEnriching] = useState<string | null>(null);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [enrichBatchSize, setEnrichBatchSize] = useState(10);
  const [enrichProgress, setEnrichProgress] = useState<
    Array<{ index: number; total: number; name: string; status: string; matched?: string; elapsedMs?: number }>
  >([]);
  const [enrichTotal, setEnrichTotal] = useState(0);
  const [enrichCurrent, setEnrichCurrent] = useState(0);
  const [missingStats, setMissingStats] = useState<Array<{ key: string; label: string; total: number; missing: number; filled: number }>>([]);
  const enrichLogRef = useRef<HTMLDivElement>(null);

  // 관리 탭
  const [mgSearchName, setMgSearchName] = useState("");
  const [mgSearchLocate, setMgSearchLocate] = useState("");
  const [mgAppliedQuery, setMgAppliedQuery] = useState({ name: "", locate: "" });
  const [mgPage, setMgPage] = useState(1);
  const [mgLimit] = useState(20);
  const [mgResult, setMgResult] = useState<ManageResult | null>(null);
  const [mgLoading, setMgLoading] = useState(false);
  const [mgExpanded, setMgExpanded] = useState<Set<number>>(new Set());
  const [mgEditing, setMgEditing] = useState<{
    idx: number;
    field: "compURL" | "compCEO" | "compIndustry";
  } | null>(null);
  const [mgEditText, setMgEditText] = useState("");
  const [mgSaving, setMgSaving] = useState(false);

  useEffect(() => {
    fetchSources();
    fetchDbStats();
  }, []);

  useEffect(() => {
    if (enrichLogRef.current) {
      enrichLogRef.current.scrollTop = enrichLogRef.current.scrollHeight;
    }
  }, [enrichProgress]);

  const fetchDbStats = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/company-crawler/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setDbStats(await res.json());
    } catch (err) {
      console.error("DB 현황 조회 실패:", err);
    }
  };

  const fetchMissingStats = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/company-crawler/missing-stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setMissingStats(await res.json());
    } catch (err) {
      console.error("missing-stats 조회 실패:", err);
    }
  };

  const fetchSources = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/company-crawler/sources`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data: SourceInfo[] = await res.json();
        setSources(data);
        setSelectedSources(data.filter((s) => s.ready).map((s) => s.name));
      }
    } catch (err) {
      console.error("소스 조회 실패:", err);
    }
  };

  const toggleSource = (name: string) => {
    setSelectedSources((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  const fullRegion =
    region === "전체" ? "서울" : subRegion === "전체" ? region : `${region} ${subRegion}`;

  // ─── 통합 크롤링 ────────────────────────────────────────
  const handleRun = useCallback(async () => {
    if (selectedSources.length === 0) {
      alert("최소 1개 이상의 소스를 선택해주세요.");
      return;
    }

    setIsRunning(true);
    setResult(null);
    setPreviewData([]);
    setShowPreview(false);
    setProgress(dryRun ? "미리보기 수집 중..." : "크롤링 실행 중...");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/company-crawler/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sources: selectedSources,
          query,
          region: fullRegion,
          countPerSource,
          dryRun,
        }),
      });

      const data: CrawlResult = await res.json();
      setResult(data);
      if (dryRun && data.data) {
        setPreviewData(data.data);
        setShowPreview(true);
      }
      setLogs((prev) =>
        [
          {
            id: Date.now(),
            time: new Date().toLocaleString("ko-KR"),
            sources: selectedSources,
            region: fullRegion,
            query,
            result: data,
          },
          ...prev,
        ].slice(0, 20)
      );
      setProgress("");
    } catch (err) {
      console.error("크롤링 실행 실패:", err);
      setProgress("실행 중 오류가 발생했습니다.");
    } finally {
      setIsRunning(false);
      fetchDbStats();
    }
  }, [selectedSources, query, fullRegion, countPerSource, dryRun]);

  const handleSavePreview = useCallback(async () => {
    if (!window.confirm(`미리보기 ${previewData.length}건을 실제로 DB에 저장하시겠습니까?`)) return;

    setIsRunning(true);
    setProgress("DB 저장 중...");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/company-crawler/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sources: selectedSources,
          query,
          region: fullRegion,
          countPerSource,
          dryRun: false,
        }),
      });
      const data: CrawlResult = await res.json();
      setResult(data);
      setShowPreview(false);
      setPreviewData([]);
      setProgress("");
      alert(data.message);
    } catch (err) {
      console.error("저장 실패:", err);
      setProgress("저장 중 오류가 발생했습니다.");
    } finally {
      setIsRunning(false);
      fetchDbStats();
    }
  }, [selectedSources, query, fullRegion, countPerSource, previewData.length]);

  // ─── 개별 크롤링 ────────────────────────────────────────
  const handleSingleRun = useCallback(async () => {
    if (!singleSource) {
      alert("크롤링할 소스를 선택해주세요.");
      return;
    }

    setSingleRunning(true);
    setSingleResult(null);
    setSinglePreview([]);
    setShowSinglePreview(false);
    setSingleProgress(singleDryRun ? "미리보기 수집 중..." : "크롤링 실행 중...");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const singleFullRegion = singleSubRegion === "전체" ? singleRegion : `${singleRegion} ${singleSubRegion}`;
      const params = new URLSearchParams({
        query: singleQuery,
        region: singleFullRegion,
        count: String(singleCount),
        dryRun: String(singleDryRun),
      });

      const res = await fetch(`${API_BASE_URL}/admin/company-crawler/run/${singleSource}?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data: CrawlResult = await res.json();
      setSingleResult(data);
      if (singleDryRun && data.data) {
        setSinglePreview(data.data);
        setShowSinglePreview(true);
      }
      setLogs((prev) =>
        [
          {
            id: Date.now(),
            time: new Date().toLocaleString("ko-KR"),
            sources: [singleSource],
            region: singleFullRegion,
            query: singleQuery,
            result: data,
          },
          ...prev,
        ].slice(0, 20)
      );
      setSingleProgress("");
    } catch (err) {
      console.error("개별 크롤링 실패:", err);
      setSingleProgress("실행 중 오류가 발생했습니다.");
    } finally {
      setSingleRunning(false);
    }
  }, [singleSource, singleQuery, singleRegion, singleSubRegion, singleCount, singleDryRun]);

  const handleSaveSinglePreview = useCallback(async () => {
    if (!window.confirm(`${singlePreview.length}건을 DB에 저장하시겠습니까?`)) return;

    setSingleRunning(true);
    setSingleProgress("DB 저장 중...");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const singleFullRegion = singleSubRegion === "전체" ? singleRegion : `${singleRegion} ${singleSubRegion}`;
      const params = new URLSearchParams({
        query: singleQuery,
        region: singleFullRegion,
        count: String(singleCount),
        dryRun: "false",
      });

      const res = await fetch(`${API_BASE_URL}/admin/company-crawler/run/${singleSource}?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data: CrawlResult = await res.json();
      setSingleResult(data);
      setShowSinglePreview(false);
      setSinglePreview([]);
      setSingleProgress("");
      alert(data.message);
    } catch (err) {
      console.error("저장 실패:", err);
      setSingleProgress("저장 중 오류가 발생했습니다.");
    } finally {
      setSingleRunning(false);
      fetchDbStats();
    }
  }, [singleSource, singleQuery, singleRegion, singleSubRegion, singleCount, singlePreview.length]);

  // ─── 보강 ─────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "enrich") {
      fetchMissingStats();
    }
  }, [activeTab]);

  const handleEnrich = async (field: string) => {
    if (enriching) return;
    setEnriching(field);
    setEnrichResult(null);
    setEnrichProgress([]);
    setEnrichTotal(0);
    setEnrichCurrent(0);

    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/company-crawler/enrich/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ field, limit: enrichBatchSize }),
      });

      if (!res.ok) {
        let msg = `요청 실패 (${res.status})`;
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {}
        setEnrichResult({ success: false, message: msg });
        return;
      }

      if (!res.body) {
        setEnrichResult({ success: false, message: "스트리밍 응답이 지원되지 않습니다." });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newlineIdx;
        while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, newlineIdx).trim();
          buffer = buffer.slice(newlineIdx + 1);
          if (!line) continue;
          try {
            const msg = JSON.parse(line);
            if (msg.type === "start") {
              setEnrichTotal(msg.total || 0);
              setEnrichCurrent(0);
            } else if (msg.type === "progress") {
              setEnrichCurrent((msg.index ?? 0) + 1);
              setEnrichProgress((prev) => [
                ...prev,
                {
                  index: msg.index,
                  total: msg.total,
                  name: msg.name,
                  status: msg.status,
                  matched: msg.matched,
                  elapsedMs: msg.elapsedMs,
                },
              ]);
            } else if (msg.type === "done") {
              setEnrichResult({
                success: msg.success,
                message: msg.message,
                total: msg.total,
                updated: msg.updated,
                results: msg.results || [],
              });
            }
          } catch (e) {
            console.warn("NDJSON 파싱 실패:", line, e);
          }
        }
      }
      fetchDbStats();
      fetchMissingStats();
    } catch (err: any) {
      console.error("보강 크롤링 실패:", err);
      setEnrichResult({ success: false, message: `보강 중 오류: ${err.message}` });
    } finally {
      setEnriching(null);
    }
  };

  // ─── 관리 탭 ─────────────────────────────────────
  const fetchManage = useCallback(
    async (page = 1, q = mgAppliedQuery) => {
      setMgLoading(true);
      setMgEditing(null);
      try {
        const accessToken = localStorage.getItem("accessToken");
        const params = new URLSearchParams({
          page: String(page),
          rowsPerPage: String(mgLimit),
        });
        if (q.name.trim()) params.set("compName", q.name.trim());
        if (q.locate.trim()) params.set("compLocate", q.locate.trim());

        const res = await fetch(`${API_BASE_URL}/admin/comp/searchComp?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const body = await res.json();
          // 백엔드 응답: { status, message, data: [...], totalCount, pagination: { totalPages, currentPage, ... } }
          const pg = body.pagination || {};
          setMgResult({
            companies: Array.isArray(body.data) ? body.data : [],
            totalCount: body.totalCount ?? pg.totalCount ?? 0,
            totalPages: pg.totalPages ?? 1,
            currentPage: pg.currentPage ?? page,
          });
          setMgPage(page);
        } else {
          console.error("회사 검색 실패:", res.status);
        }
      } catch (err) {
        console.error("회사 검색 실패:", err);
      } finally {
        setMgLoading(false);
      }
    },
    [mgAppliedQuery, mgLimit]
  );

  useEffect(() => {
    if (activeTab === "manage" && !mgResult) {
      fetchManage(1, { name: "", locate: "" });
    }
  }, [activeTab, mgResult, fetchManage]);

  const handleMgSearch = () => {
    const q = { name: mgSearchName, locate: mgSearchLocate };
    setMgAppliedQuery(q);
    fetchManage(1, q);
  };

  const handleMgReset = () => {
    setMgSearchName("");
    setMgSearchLocate("");
    const q = { name: "", locate: "" };
    setMgAppliedQuery(q);
    fetchManage(1, q);
  };

  const toggleMgExpand = (idx: number) => {
    setMgExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const updateField = async (
    idx: number,
    body: Record<string, unknown>
  ): Promise<boolean> => {
    setMgSaving(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/comp/putCompData/${idx}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) return false;
      setMgResult((prev) =>
        prev
          ? {
              ...prev,
              companies: prev.companies.map((c) =>
                c.compIdx === idx ? ({ ...c, ...body } as CompanyRow) : c
              ),
            }
          : prev
      );
      return true;
    } catch (err) {
      console.error(`회사 ${idx} 수정 실패:`, err);
      return false;
    } finally {
      setMgSaving(false);
    }
  };

  const startEditText = (c: CompanyRow, field: "compURL" | "compCEO" | "compIndustry") => {
    setMgEditing({ idx: c.compIdx, field });
    setMgEditText(((c[field] as string) || ""));
  };

  const cancelEdit = () => {
    setMgEditing(null);
    setMgEditText("");
  };

  const saveText = async (
    idx: number,
    field: "compURL" | "compCEO" | "compIndustry"
  ) => {
    const val = mgEditText.trim();
    const ok = await updateField(idx, { [field]: val || null });
    if (ok) {
      cancelEdit();
      fetchDbStats();
    } else {
      alert("저장에 실패했습니다.");
    }
  };

  const clearText = async (
    idx: number,
    field: "compURL" | "compCEO" | "compIndustry"
  ) => {
    const labelMap = { compURL: "홈페이지", compCEO: "대표이사", compIndustry: "업종" };
    if (!window.confirm(`이 회사의 ${labelMap[field]} 정보를 삭제하시겠습니까?`)) return;
    const ok = await updateField(idx, { [field]: null });
    if (ok) {
      cancelEdit();
      fetchDbStats();
    } else {
      alert("삭제에 실패했습니다.");
    }
  };

  const tabs = [
    { key: "batch", label: "통합 크롤링", icon: "hub" },
    { key: "single", label: "개별 수집", icon: "capture" },
    { key: "enrich", label: "데이터 보강", icon: "auto_fix_high" },
    { key: "manage", label: "데이터 관리", icon: "table_view" },
  ] as const;

  const subRegionList = SUB_REGIONS[region] || ["전체"];
  const singleSubRegionList = SUB_REGIONS[singleRegion] || ["전체"];

  return (
    <div className="crawler-mat min-h-full">
      <style dangerouslySetInnerHTML={{ __html: MATERIAL_STYLES }} />

      <main className="px-6 lg:px-8 py-8 max-w-[1480px] mx-auto">
        {/* ── Header ─────────────────── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[color:var(--on-surface)]">회사 크롤링 실행</h1>
            <p className="text-[15px] text-[color:var(--outline)]">
              새로운 회사 데이터를 수집하고 상태를 모니터링합니다.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-[color:var(--surface-container-low)] p-1 rounded-lg border border-[color:var(--outline-variant)]/40">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${
                  activeTab === t.key
                    ? "bg-white shadow-sm text-[color:var(--primary)]"
                    : "text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-highest)]/50"
                }`}
              >
                <MatIcon name={t.icon} size={18} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            ))}
          </div>
        </header>

        {/* ── Stats bento ─────────────── */}
        <section className="bento-grid mb-8">
          <StatBento
            accent="var(--primary)"
            icon="apartment"
            badge="전체 회사"
            value={dbStats.totalCompanies.toLocaleString()}
            sub={`최근 7일 +${dbStats.recentAdded.toLocaleString()}`}
            subIcon="trending_up"
            subTone="secondary"
          />
          <StatBento
            accent="var(--secondary)"
            icon="link"
            badge="홈페이지 보유"
            value={dbStats.withURL.toLocaleString()}
            sub={dbStats.totalCompanies > 0 ? `${Math.round((dbStats.withURL / dbStats.totalCompanies) * 100)}% 커버리지` : "-"}
            subIcon="check_circle"
            subTone="secondary"
          />
          <StatBento
            accent="var(--tertiary)"
            icon="person"
            badge="대표자 확인"
            value={dbStats.withCEO.toLocaleString()}
            sub={dbStats.totalCompanies > 0 ? `${Math.round((dbStats.withCEO / dbStats.totalCompanies) * 100)}% 커버리지` : "-"}
          />
          <StatBento
            accent="var(--outline-variant)"
            icon="category"
            badge="업종 확인"
            value={dbStats.withIndustry.toLocaleString()}
            sub={dbStats.totalCompanies > 0 ? `${Math.round((dbStats.withIndustry / dbStats.totalCompanies) * 100)}% 커버리지` : "-"}
          />
        </section>

        {/* ── Batch Tab ─────────────── */}
        {activeTab === "batch" && (
          <div className="bento-grid">
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <section className="glass-card rounded-xl p-6">
                <h3 className="text-[18px] font-semibold mb-4 flex items-center gap-2">
                  <MatIcon name="settings_applications" className="text-[color:var(--primary)]" />
                  수집 설정
                </h3>

                {/* Sources */}
                <div className="mb-5">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-2 block">
                    크롤링 소스
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {sources.map((s) => (
                      <SourceChip
                        key={s.name}
                        source={s}
                        selected={selectedSources.includes(s.name)}
                        onToggle={() => toggleSource(s.name)}
                      />
                    ))}
                  </div>
                </div>

                {/* Config grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">검색 키워드</label>
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)]"
                      placeholder="하나만 입력 (예: 전자 / 바이오 / 게임 / IT기업)"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">소스당 수집 건수</label>
                    <input
                      type="number"
                      min={1}
                      max={200}
                      value={countPerSource === 0 ? "" : countPerSource}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") { setCountPerSource(0); return; }
                        const n = parseInt(v);
                        if (!isNaN(n)) setCountPerSource(n);
                      }}
                      onBlur={() => { if (!countPerSource || countPerSource < 1) setCountPerSource(30); }}
                      className="w-full px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">시/도</label>
                    <select
                      value={region}
                      onChange={(e) => { setRegion(e.target.value); setSubRegion("전체"); }}
                      className="w-full px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)]"
                    >
                      {REGION_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">세부 지역</label>
                    <select
                      value={subRegion}
                      onChange={(e) => setSubRegion(e.target.value)}
                      className="w-full px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)]"
                    >
                      {subRegionList.map((sr) => (
                        <option key={sr} value={sr}>{sr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-5">
                  <label className="flex items-center gap-2 text-[13px] text-[color:var(--on-surface-variant)]">
                    <input
                      type="checkbox"
                      checked={dryRun}
                      onChange={(e) => setDryRun(e.target.checked)}
                      className="w-4 h-4 accent-[color:var(--primary)]"
                    />
                    미리보기 (DB 저장 안 함)
                  </label>
                  <div className="flex-1" />
                  <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[color:var(--primary)] text-white font-semibold rounded-lg hover:bg-[color:var(--primary-container)] disabled:opacity-50 transition-colors"
                  >
                    {isRunning ? <Spinner /> : <MatIcon name="play_arrow" size={18} fill={1} />}
                    {dryRun ? "미리보기 실행" : "크롤링 실행"}
                  </button>
                </div>

                {progress && (
                  <div className="mt-4 p-3 bg-[color:var(--surface-container-low)] rounded-lg text-[13px] text-[color:var(--on-surface-variant)] flex items-center gap-2">
                    <Spinner />
                    {progress}
                  </div>
                )}

                {result && !showPreview && (
                  <div className="mt-5 p-4 bg-[color:var(--surface-container-low)] rounded-lg border border-[color:var(--outline-variant)]/40">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[14px] font-semibold">{result.message}</p>
                      <MatIcon
                        name={result.success ? "task_alt" : "error"}
                        fill={1}
                        className={result.success ? "text-[color:var(--secondary)]" : "text-[color:var(--error)]"}
                      />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
                      <StatItem label="수집" value={result.stats?.totalFetched || 0} />
                      <StatItem label="저장" value={result.stats?.saved || 0} />
                      <StatItem label="중복" value={result.stats?.duplicateSkipped || 0} />
                      <StatItem label="좌표보정" value={result.stats?.coordFixed || 0} />
                    </div>
                  </div>
                )}
              </section>

              {/* Preview */}
              {showPreview && previewData.length > 0 && (
                <section className="glass-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[16px] font-semibold flex items-center gap-2">
                      <MatIcon name="preview" fill={1} className="text-[color:var(--primary)]" />
                      미리보기 ({previewData.length}건)
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowPreview(false); setPreviewData([]); }}
                        className="px-3 py-1.5 text-[12px] font-semibold border border-[color:var(--outline-variant)] rounded-md hover:bg-[color:var(--surface-container-low)]"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSavePreview}
                        disabled={isRunning}
                        className="px-4 py-1.5 text-[12px] font-semibold bg-[color:var(--primary)] text-white rounded-md hover:bg-[color:var(--primary-container)] disabled:opacity-50"
                      >
                        전체 저장
                      </button>
                    </div>
                  </div>
                  <PreviewTable data={previewData} />
                </section>
              )}
            </div>

            {/* Log panel */}
            <aside className="col-span-12 lg:col-span-4">
              <section className="glass-card rounded-xl p-6 h-full">
                <h3 className="text-[16px] font-semibold mb-4 flex items-center gap-2">
                  <MatIcon name="history" className="text-[color:var(--primary)]" />
                  실행 기록
                </h3>
                {logs.length === 0 ? (
                  <p className="text-[13px] text-[color:var(--outline)]">실행 기록이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {logs.map((l) => (
                      <div
                        key={l.id}
                        className="p-3 bg-[color:var(--surface-container-low)] rounded-lg border border-[color:var(--outline-variant)]/40"
                      >
                        <div className="flex items-center justify-between text-[11px] text-[color:var(--outline)] mb-1">
                          <span>{l.time}</span>
                          <span className={l.result.success ? "text-[color:var(--secondary)]" : "text-[color:var(--error)]"}>
                            {l.result.success ? "✓" : "✗"}
                          </span>
                        </div>
                        <p className="text-[12px] font-medium text-[color:var(--on-surface)] truncate">
                          {l.region} / {l.query}
                        </p>
                        <div className="flex gap-1 mt-1">
                          {l.sources.map((s) => (
                            <span
                              key={s}
                              className={`px-1.5 py-0.5 text-[10px] rounded ${SOURCE_PALETTE[s]?.bg || "bg-gray-100"} ${SOURCE_PALETTE[s]?.text || "text-gray-600"}`}
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                        <p className="text-[11px] text-[color:var(--outline)] mt-1">
                          저장 {l.result.stats?.saved || 0} · 중복 {l.result.stats?.duplicateSkipped || 0}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </aside>
          </div>
        )}

        {/* ── Single Tab ─────────────── */}
        {activeTab === "single" && (
          <div className="bento-grid">
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <section className="glass-card rounded-xl p-6">
                <h3 className="text-[18px] font-semibold mb-4 flex items-center gap-2">
                  <MatIcon name="capture" className="text-[color:var(--primary)]" />
                  개별 소스 수집 (테스트)
                </h3>

                <div className="flex flex-wrap gap-2 mb-5">
                  {sources.map((s) => (
                    <button
                      key={s.name}
                      disabled={!s.ready}
                      onClick={() => setSingleSource(s.name)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[13px] font-medium transition-all ${
                        !s.ready
                          ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
                          : singleSource === s.name
                          ? `${SOURCE_PALETTE[s.name]?.bg || "bg-yellow-50"} ${SOURCE_PALETTE[s.name]?.border || "border-yellow-300"} ${SOURCE_PALETTE[s.name]?.text || "text-yellow-800"} ring-2 ${SOURCE_PALETTE[s.name]?.ring || "ring-yellow-400"}/30`
                          : "bg-white border-[color:var(--outline-variant)] hover:border-[color:var(--primary)]/40"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${s.ready ? SOURCE_PALETTE[s.name]?.dot || "bg-yellow-400" : "bg-gray-300"}`} />
                      {s.label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">키워드</label>
                    <input
                      type="text"
                      value={singleQuery}
                      onChange={(e) => setSingleQuery(e.target.value)}
                      className="w-full px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">수집 건수</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={singleCount === 0 ? "" : singleCount}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "") { setSingleCount(0); return; }
                        const n = parseInt(v);
                        if (!isNaN(n)) setSingleCount(n);
                      }}
                      onBlur={() => { if (!singleCount || singleCount < 1) setSingleCount(10); }}
                      className="w-full px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)]"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">시/도</label>
                    <select
                      value={singleRegion}
                      onChange={(e) => { setSingleRegion(e.target.value); setSingleSubRegion("전체"); }}
                      className="w-full px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)]"
                    >
                      {REGION_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">세부 지역</label>
                    <select
                      value={singleSubRegion}
                      onChange={(e) => setSingleSubRegion(e.target.value)}
                      className="w-full px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] bg-white focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)]"
                    >
                      {singleSubRegionList.map((sr) => (
                        <option key={sr} value={sr}>{sr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-5">
                  <label className="flex items-center gap-2 text-[13px] text-[color:var(--on-surface-variant)]">
                    <input
                      type="checkbox"
                      checked={singleDryRun}
                      onChange={(e) => setSingleDryRun(e.target.checked)}
                      className="w-4 h-4 accent-[color:var(--primary)]"
                    />
                    미리보기 (DB 저장 안 함)
                  </label>
                  <div className="flex-1" />
                  <button
                    onClick={handleSingleRun}
                    disabled={singleRunning || !singleSource}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[color:var(--primary)] text-white font-semibold rounded-lg hover:bg-[color:var(--primary-container)] disabled:opacity-50 transition-colors"
                  >
                    {singleRunning ? <Spinner /> : <MatIcon name="play_arrow" size={18} fill={1} />}
                    {singleDryRun ? "미리보기 실행" : "크롤링 실행"}
                  </button>
                </div>

                {singleProgress && (
                  <div className="mt-4 p-3 bg-[color:var(--surface-container-low)] rounded-lg text-[13px] flex items-center gap-2">
                    <Spinner />
                    {singleProgress}
                  </div>
                )}

                {singleResult && !showSinglePreview && (
                  <div className="mt-5 p-4 bg-[color:var(--surface-container-low)] rounded-lg border border-[color:var(--outline-variant)]/40">
                    <p className="text-[14px] font-semibold mb-2">{singleResult.message}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
                      <StatItem label="수집" value={singleResult.stats?.totalFetched || 0} />
                      <StatItem label="저장" value={singleResult.stats?.saved || 0} />
                      <StatItem label="중복" value={singleResult.stats?.duplicateSkipped || 0} />
                      <StatItem label="좌표보정" value={singleResult.stats?.coordFixed || 0} />
                    </div>
                  </div>
                )}
              </section>

              {showSinglePreview && singlePreview.length > 0 && (
                <section className="glass-card rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[16px] font-semibold flex items-center gap-2">
                      <MatIcon name="preview" fill={1} className="text-[color:var(--primary)]" />
                      미리보기 ({singlePreview.length}건)
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setShowSinglePreview(false); setSinglePreview([]); }}
                        className="px-3 py-1.5 text-[12px] font-semibold border border-[color:var(--outline-variant)] rounded-md hover:bg-[color:var(--surface-container-low)]"
                      >
                        취소
                      </button>
                      <button
                        onClick={handleSaveSinglePreview}
                        disabled={singleRunning}
                        className="px-4 py-1.5 text-[12px] font-semibold bg-[color:var(--primary)] text-white rounded-md hover:bg-[color:var(--primary-container)] disabled:opacity-50"
                      >
                        전체 저장
                      </button>
                    </div>
                  </div>
                  <PreviewTable data={singlePreview} />
                </section>
              )}
            </div>
          </div>
        )}

        {/* ── Enrich Tab ─────────────── */}
        {activeTab === "enrich" && (
          <div className="bento-grid">
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <section className="glass-card rounded-xl p-6">
                <h3 className="text-[18px] font-semibold mb-2 flex items-center gap-2">
                  <MatIcon name="auto_fix_high" className="text-[color:var(--primary)]" />
                  데이터 보강 (네이버 기반)
                </h3>
                <p className="text-[13px] text-[color:var(--outline)] mb-4">
                  비어있는 필드를 선택하면 기존 회사들을 네이버 웹/로컬 검색으로 조회해 자동 보강합니다.
                </p>

                {missingStats.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                    {missingStats.map((m) => (
                      <div key={m.key} className="p-3 bg-[color:var(--surface-container-low)] rounded-lg border border-[color:var(--outline-variant)]/40">
                        <div className="text-[11px] uppercase tracking-wider text-[color:var(--outline)] mb-1">{m.label}</div>
                        <div className="text-[18px] font-bold">
                          {m.filled.toLocaleString()}
                          <span className="text-[11px] font-normal text-[color:var(--outline)]"> / {m.total.toLocaleString()}</span>
                        </div>
                        <div className="text-[11px] text-[color:var(--error)]">빈값 {m.missing.toLocaleString()}</div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mb-4">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">
                    배치 크기 (한번에 처리할 회사 수)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={enrichBatchSize === 0 ? "" : enrichBatchSize}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "") { setEnrichBatchSize(0); return; }
                      const n = parseInt(v);
                      if (!isNaN(n)) setEnrichBatchSize(n);
                    }}
                    onBlur={() => { if (!enrichBatchSize || enrichBatchSize < 1) setEnrichBatchSize(10); }}
                    className="w-32 px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px]"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <EnrichButton
                    label="홈페이지 보강"
                    field="compURL"
                    icon="link"
                    enriching={enriching}
                    onClick={handleEnrich}
                  />
                  <EnrichButton
                    label="주소 보강"
                    field="compAddr"
                    icon="location_on"
                    enriching={enriching}
                    onClick={handleEnrich}
                  />
                  <EnrichButton
                    label="업종 보강"
                    field="compIndustry"
                    icon="category"
                    enriching={enriching}
                    onClick={handleEnrich}
                  />
                </div>
              </section>

              {/* Live progress */}
              {(enriching || enrichProgress.length > 0 || enrichResult) && (
                <section className="glass-card rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[14px] font-semibold flex items-center gap-2">
                      <MatIcon
                        name={enriching ? "autorenew" : enrichResult?.success ? "task_alt" : "history"}
                        fill={1}
                        size={20}
                        className={enriching ? "text-[color:var(--primary)] animate-spin" : "text-[color:var(--secondary)]"}
                      />
                      {enriching ? "보강 중..." : enrichResult ? "보강 완료" : "최근 보강 기록"}
                    </h4>
                    {enrichTotal > 0 && (
                      <span className="text-[12px] font-mono text-[color:var(--on-surface)]">
                        {enrichCurrent} / {enrichTotal}
                      </span>
                    )}
                  </div>

                  {enrichTotal > 0 && (
                    <div className="w-full bg-[color:var(--surface-container)] rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-[color:var(--primary)] h-2 rounded-full transition-all"
                        style={{ width: `${Math.round((enrichCurrent / enrichTotal) * 100)}%` }}
                      />
                    </div>
                  )}

                  <div
                    ref={enrichLogRef}
                    className="max-h-[300px] overflow-y-auto bg-[color:var(--surface-container-low)] rounded-lg p-3 font-mono text-[11px] leading-relaxed"
                  >
                    {enrichProgress.length === 0 ? (
                      <p className="text-[color:var(--outline)]">대상 회사를 찾는 중...</p>
                    ) : (
                      enrichProgress.map((p, i) => (
                        <div key={i} className="flex gap-2 py-0.5 border-b border-[color:var(--outline-variant)]/20 last:border-0">
                          <span className="text-[color:var(--outline)] w-10 shrink-0">{String(p.index + 1).padStart(3, " ")}.</span>
                          <span className="w-[80px] shrink-0">
                            <EnrichStatusBadge status={p.status} />
                          </span>
                          <span className="text-[color:var(--on-surface)] truncate flex-1">{p.name}</span>
                          {p.matched && p.matched !== p.name && (
                            <span className="text-[color:var(--outline)] truncate max-w-[180px]">→ {p.matched}</span>
                          )}
                          {typeof p.elapsedMs === "number" && (
                            <span className="text-[color:var(--outline)] shrink-0">{p.elapsedMs}ms</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {enrichResult && (
                    <div className={`p-3 rounded-lg text-[13px] ${enrichResult.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                      {enrichResult.message}
                    </div>
                  )}
                </section>
              )}
            </div>
          </div>
        )}

        {/* ── Manage Tab ─────────────── */}
        {activeTab === "manage" && (
          <div className="space-y-6">
            <section className="glass-card rounded-xl p-6">
              <h3 className="text-[18px] font-semibold mb-4 flex items-center gap-2">
                <MatIcon name="table_view" className="text-[color:var(--primary)]" />
                회사 데이터 관리
              </h3>
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">회사명</label>
                  <input
                    type="text"
                    value={mgSearchName}
                    onChange={(e) => setMgSearchName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMgSearch()}
                    className="w-full px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)]"
                    placeholder="회사명 검색"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="text-[12px] font-semibold uppercase tracking-wider text-[color:var(--outline)] mb-1 block">지역</label>
                  <input
                    type="text"
                    value={mgSearchLocate}
                    onChange={(e) => setMgSearchLocate(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMgSearch()}
                    className="w-full px-3 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/20 focus:border-[color:var(--primary)]"
                    placeholder="예: 서울"
                  />
                </div>
                <button
                  onClick={handleMgSearch}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[color:var(--primary)] text-white rounded-lg text-[13px] font-semibold hover:bg-[color:var(--primary-container)]"
                >
                  <MatIcon name="search" size={16} /> 검색
                </button>
                <button
                  onClick={handleMgReset}
                  className="flex items-center gap-1.5 px-4 py-2 border border-[color:var(--outline-variant)] rounded-lg text-[13px] font-semibold hover:bg-[color:var(--surface-container-low)]"
                >
                  <MatIcon name="refresh" size={16} /> 초기화
                </button>
              </div>
            </section>

            <section className="glass-card rounded-xl p-6">
              {mgLoading ? (
                <div className="flex items-center justify-center py-8 text-[color:var(--outline)]">
                  <Spinner /> <span className="ml-2">불러오는 중...</span>
                </div>
              ) : !mgResult || mgResult.companies.length === 0 ? (
                <p className="text-center py-8 text-[color:var(--outline)]">검색 결과가 없습니다.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[13px] text-[color:var(--outline)]">
                      총 <span className="font-semibold text-[color:var(--on-surface)]">{mgResult.totalCount.toLocaleString()}</span>건
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => mgPage > 1 && fetchManage(mgPage - 1)}
                        disabled={mgPage <= 1}
                        className="px-3 py-1 border border-[color:var(--outline-variant)] rounded-md text-[12px] disabled:opacity-40 hover:bg-[color:var(--surface-container-low)]"
                      >
                        이전
                      </button>
                      <span className="text-[12px] font-mono">{mgResult.currentPage} / {mgResult.totalPages}</span>
                      <button
                        onClick={() => mgPage < mgResult.totalPages && fetchManage(mgPage + 1)}
                        disabled={mgPage >= mgResult.totalPages}
                        className="px-3 py-1 border border-[color:var(--outline-variant)] rounded-md text-[12px] disabled:opacity-40 hover:bg-[color:var(--surface-container-low)]"
                      >
                        다음
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {mgResult.companies.map((c) => {
                      const expanded = mgExpanded.has(c.compIdx);
                      return (
                        <div
                          key={c.compIdx}
                          className="border border-[color:var(--outline-variant)]/60 rounded-lg overflow-hidden"
                        >
                          <button
                            onClick={() => toggleMgExpand(c.compIdx)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[color:var(--surface-container-low)]"
                          >
                            <MatIcon
                              name={expanded ? "expand_more" : "chevron_right"}
                              size={20}
                              className="text-[color:var(--outline)]"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-[14px] truncate">{c.compName}</span>
                                <span className="text-[11px] px-1.5 py-0.5 bg-[color:var(--surface-container)] text-[color:var(--on-surface-variant)] rounded">
                                  {c.compIndustry || "기타"}
                                </span>
                                <span className="text-[11px] text-[color:var(--outline)]">{c.compLocate}</span>
                              </div>
                              <p className="text-[11px] text-[color:var(--outline)] truncate mt-0.5">{c.compAddr}</p>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {!c.compURL && <MatIcon name="link_off" size={14} className="text-[color:var(--error)]" />}
                              {(!c.compCEO || c.compCEO === "미정") && <MatIcon name="person_off" size={14} className="text-[color:var(--error)]" />}
                            </div>
                          </button>

                          {expanded && (
                            <div className="px-4 py-4 bg-[color:var(--surface-container-lowest)] border-t border-[color:var(--outline-variant)]/40 grid grid-cols-1 md:grid-cols-3 gap-3">
                              <CompanyFieldCard
                                icon="link"
                                title="홈페이지"
                                isEditing={mgEditing?.idx === c.compIdx && mgEditing.field === "compURL"}
                                hasValue={!!c.compURL}
                                disabled={!!mgEditing && (mgEditing.idx !== c.compIdx || mgEditing.field !== "compURL")}
                                saving={mgSaving}
                                onStartEdit={() => startEditText(c, "compURL")}
                                onSave={() => saveText(c.compIdx, "compURL")}
                                onCancel={cancelEdit}
                                onClear={() => clearText(c.compIdx, "compURL")}
                              >
                                {mgEditing?.idx === c.compIdx && mgEditing.field === "compURL" ? (
                                  <input
                                    type="text"
                                    value={mgEditText}
                                    onChange={(e) => setMgEditText(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-[color:var(--outline-variant)] rounded text-[12px]"
                                    placeholder="https://..."
                                  />
                                ) : c.compURL ? (
                                  <a
                                    href={c.compURL}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-[12px] text-[color:var(--primary)] hover:underline break-all"
                                  >
                                    {c.compURL}
                                  </a>
                                ) : (
                                  <span className="text-[12px] text-[color:var(--outline)]">(없음)</span>
                                )}
                              </CompanyFieldCard>

                              <CompanyFieldCard
                                icon="person"
                                title="대표이사"
                                isEditing={mgEditing?.idx === c.compIdx && mgEditing.field === "compCEO"}
                                hasValue={!!(c.compCEO && c.compCEO !== "미정")}
                                disabled={!!mgEditing && (mgEditing.idx !== c.compIdx || mgEditing.field !== "compCEO")}
                                saving={mgSaving}
                                onStartEdit={() => startEditText(c, "compCEO")}
                                onSave={() => saveText(c.compIdx, "compCEO")}
                                onCancel={cancelEdit}
                                onClear={() => clearText(c.compIdx, "compCEO")}
                              >
                                {mgEditing?.idx === c.compIdx && mgEditing.field === "compCEO" ? (
                                  <input
                                    type="text"
                                    value={mgEditText}
                                    onChange={(e) => setMgEditText(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-[color:var(--outline-variant)] rounded text-[12px]"
                                  />
                                ) : (
                                  <span className="text-[12px]">{c.compCEO || "(없음)"}</span>
                                )}
                              </CompanyFieldCard>

                              <CompanyFieldCard
                                icon="category"
                                title="업종"
                                isEditing={mgEditing?.idx === c.compIdx && mgEditing.field === "compIndustry"}
                                hasValue={!!(c.compIndustry && c.compIndustry !== "기타")}
                                disabled={!!mgEditing && (mgEditing.idx !== c.compIdx || mgEditing.field !== "compIndustry")}
                                saving={mgSaving}
                                onStartEdit={() => startEditText(c, "compIndustry")}
                                onSave={() => saveText(c.compIdx, "compIndustry")}
                                onCancel={cancelEdit}
                                onClear={() => clearText(c.compIdx, "compIndustry")}
                              >
                                {mgEditing?.idx === c.compIdx && mgEditing.field === "compIndustry" ? (
                                  <input
                                    type="text"
                                    value={mgEditText}
                                    onChange={(e) => setMgEditText(e.target.value)}
                                    className="w-full px-2 py-1.5 border border-[color:var(--outline-variant)] rounded text-[12px]"
                                  />
                                ) : (
                                  <span className="text-[12px]">{c.compIndustry || "(없음)"}</span>
                                )}
                              </CompanyFieldCard>

                              <div className="md:col-span-3 text-[11px] text-[color:var(--outline)] grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-[color:var(--outline-variant)]/30">
                                <DetailRow label="유형" value={c.compType || "-"} />
                                <DetailRow label="설립" value={c.compEstablish || "-"} />
                                <DetailRow label="위도" value={c.compLateX ? String(c.compLateX).slice(0, 8) : "-"} mono />
                                <DetailRow label="경도" value={c.compLateY ? String(c.compLateY).slice(0, 8) : "-"} mono />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────
const StatItem: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div className="p-2 bg-white rounded-md border border-[color:var(--outline-variant)]/40">
    <div className="text-[10px] uppercase tracking-wider text-[color:var(--outline)]">{label}</div>
    <div className="text-[14px] font-bold font-mono">{value.toLocaleString()}</div>
  </div>
);

const PreviewTable: React.FC<{ data: any[] }> = ({ data }) => (
  <div className="overflow-x-auto max-h-[400px]">
    <table className="w-full text-[12px]">
      <thead className="bg-[color:var(--surface-container-low)] sticky top-0">
        <tr>
          <th className="text-left px-3 py-2 font-semibold">회사명</th>
          <th className="text-left px-3 py-2 font-semibold">업종</th>
          <th className="text-left px-3 py-2 font-semibold">지역</th>
          <th className="text-left px-3 py-2 font-semibold">주소</th>
          <th className="text-left px-3 py-2 font-semibold">소스</th>
        </tr>
      </thead>
      <tbody>
        {data.slice(0, 100).map((d, i) => (
          <tr key={i} className="border-t border-[color:var(--outline-variant)]/30">
            <td className="px-3 py-1.5 font-medium truncate max-w-[180px]">{d.compName || d.name}</td>
            <td className="px-3 py-1.5 text-[color:var(--outline)] truncate max-w-[120px]">{d.compIndustry}</td>
            <td className="px-3 py-1.5">{d.compLocate}</td>
            <td className="px-3 py-1.5 text-[color:var(--outline)] truncate max-w-[240px]">{d.compAddr}</td>
            <td className="px-3 py-1.5">
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${SOURCE_PALETTE[d._source]?.bg || "bg-gray-100"} ${SOURCE_PALETTE[d._source]?.text || "text-gray-600"}`}>
                {d._source}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {data.length > 100 && (
      <p className="text-center py-2 text-[11px] text-[color:var(--outline)]">... 외 {data.length - 100}건 (전체 저장 시 반영)</p>
    )}
  </div>
);

const EnrichButton: React.FC<{
  label: string;
  field: string;
  icon: string;
  enriching: string | null;
  onClick: (field: string) => void;
}> = ({ label, field, icon, enriching, onClick }) => {
  const active = enriching === field;
  return (
    <button
      onClick={() => onClick(field)}
      disabled={!!enriching}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-all ${
        active
          ? "bg-[color:var(--primary-container)] text-white"
          : "bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary-container)]"
      } disabled:opacity-60`}
    >
      {active ? <Spinner /> : <MatIcon name={icon} size={16} fill={1} />}
      {label}
    </button>
  );
};

const CompanyFieldCard: React.FC<{
  icon: string;
  title: string;
  isEditing: boolean;
  hasValue: boolean;
  disabled?: boolean;
  saving?: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onClear: () => void;
  children: React.ReactNode;
}> = ({ icon, title, isEditing, hasValue, disabled, saving, onStartEdit, onSave, onCancel, onClear, children }) => (
  <div
    className={`bg-white border rounded-lg p-3 transition-colors ${
      isEditing
        ? "border-[color:var(--primary)] ring-1 ring-[color:var(--primary)]/20"
        : "border-[color:var(--outline-variant)]"
    } ${disabled ? "opacity-60" : ""}`}
  >
    <div className="flex items-center justify-between mb-2 gap-2">
      <h6 className="text-[12px] font-semibold flex items-center gap-1.5">
        <MatIcon name={icon} size={16} className="text-[color:var(--primary)]" fill={1} />
        {title}
      </h6>
      <div className="flex gap-1">
        {isEditing ? (
          <>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[color:var(--primary)] text-white disabled:opacity-60 flex items-center gap-0.5"
            >
              {saving ? <Spinner /> : <MatIcon name="check" size={12} fill={1} />}
              저장
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-2 py-0.5 rounded text-[10px] font-semibold border border-[color:var(--outline-variant)]"
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStartEdit}
              disabled={disabled}
              className="px-2 py-0.5 rounded text-[10px] font-semibold border border-[color:var(--outline-variant)] hover:text-[color:var(--primary)] hover:border-[color:var(--primary)] disabled:opacity-50"
            >
              수정
            </button>
            {hasValue && (
              <button
                onClick={onClear}
                disabled={disabled}
                className="px-2 py-0.5 rounded text-[10px] font-semibold text-[color:var(--error)] hover:bg-[color:var(--error-container)] disabled:opacity-50"
              >
                삭제
              </button>
            )}
          </>
        )}
      </div>
    </div>
    {children}
  </div>
);

const DetailRow: React.FC<{ label: string; value: React.ReactNode; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <span className="text-[10px] uppercase tracking-wider text-[color:var(--outline)] mr-2">{label}</span>
    <span className={`text-[11px] ${mono ? "font-mono" : ""}`}>{value}</span>
  </div>
);

export default CompanyCrawlerPage;
