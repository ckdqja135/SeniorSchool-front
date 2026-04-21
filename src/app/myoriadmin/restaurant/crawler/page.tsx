"use client";

import React, { useEffect, useState, useCallback } from "react";

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
  duplicate중복: number;
  coordFixed: number;
  saved: number;
  failed: number;
  alreadyInDB?: number;
}

interface DbStats {
  totalRestaurants: number;
  withMenu: number;
  withImage: number;
  withRating: number;
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

interface RestaurantRow {
  restaurantIdx: number;
  restaurantName: string;
  restaurantType?: string;
  restaurantAddr?: string;
  restaurantLocation?: string;
  restaurantLatX?: number | string;
  restaurantLatY?: number | string;
  restaurantURL?: string;
  restaurantImage?: string | null;
  restaurantMenu?: Array<{ name: string; price?: string | number }> | string | null;
  restaurantViewCount?: number;
  restaurantRating?: number | null;
  restaurantEstablished?: string;
  restaurantOwner?: string;
  restaurantLotAddr?: string;
  createdAt?: string;
}

interface ManageResult {
  restaurants: RestaurantRow[];
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
  kakao:  { ring: "ring-yellow-400", dot: "bg-yellow-400", bg: "bg-yellow-50",  text: "text-yellow-800", border: "border-yellow-300" },
  naver:  { ring: "ring-green-400",  dot: "bg-green-500",  bg: "bg-green-50",   text: "text-green-800",  border: "border-green-300" },
  siksin: { ring: "ring-orange-400", dot: "bg-orange-500", bg: "bg-orange-50",  text: "text-orange-800", border: "border-orange-300" },
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

const MatIcon: React.FC<{ name: string; className?: string; fill?: 0 | 1; size?: number }> = ({ name, className = "", fill = 0, size }) => (
  <span
    className={`material-symbols-outlined ${className}`}
    style={{ fontVariationSettings: `'FILL' ${fill}`, ...(size ? { fontSize: size } : {}) }}
  >
    {name}
  </span>
);

const RestaurantCrawlerPage: React.FC = () => {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<"batch" | "single" | "enrich" | "manage">("batch");

  // 소스 상태
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  // DB 현황
  const [dbStats, setDbStats] = useState<DbStats>({
    totalRestaurants: 0,
    withMenu: 0,
    withImage: 0,
    withRating: 0,
    recentAdded: 0,
  });

  // 통합 크롤링 옵션
  const [query, setQuery] = useState("맛집");
  const [region, setRegion] = useState("서울");
  const [subRegion, setSubRegion] = useState("전체");
  const [countPerSource, setCountPerSource] = useState(30);
  const [dryRun, setDryRun] = useState(true);

  // 통합 실행 상태
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [logs, setLogs] = useState<CrawlLog[]>([]);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // 개별 크롤링 상태
  const [singleSource, setSingleSource] = useState("");
  const [singleQuery, setSingleQuery] = useState("맛집");
  const [singleRegion, setSingleRegion] = useState("서울");
  const [singleSubRegion, setSingleSubRegion] = useState("전체");
  const [singleCount, setSingleCount] = useState(10);
  const [singleDryRun, setSingleDryRun] = useState(true);
  const [singleRunning, setSingleRunning] = useState(false);
  const [singleProgress, setSingleProgress] = useState("");
  const [singleResult, setSingleResult] = useState<CrawlResult | null>(null);
  const [singlePreview, setSinglePreview] = useState<any[]>([]);
  const [showSinglePreview, setShowSinglePreview] = useState(false);

  // 보강 상태
  const [enriching, setEnriching] = useState<string | null>(null);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [enrichBatchSize, setEnrichBatchSize] = useState(10);
  const [enrichRestaurants, setEnrichRestaurants] = useState<any[]>([]);
  const [enrichFilter, setEnrichFilter] = useState("all");
  const [enrichLoading, setEnrichLoading] = useState(false);

  // 관리 탭 상태 (NEW)
  const [mgSearchName, setMgSearchName] = useState("");
  const [mgSearchType, setMgSearchType] = useState("");
  const [mgSearchLocation, setMgSearchLocation] = useState("");
  const [mgAppliedQuery, setMgAppliedQuery] = useState({ name: "", type: "", location: "" });
  const [mgPage, setMgPage] = useState(1);
  const [mgLimit] = useState(20);
  const [mgResult, setMgResult] = useState<ManageResult | null>(null);
  const [mgLoading, setMgLoading] = useState(false);
  const [mgExpanded, setMgExpanded] = useState<Set<number>>(new Set());
  const [mgEditing, setMgEditing] = useState<{
    idx: number;
    field: "restaurantMenu" | "restaurantImage" | "restaurantURL";
  } | null>(null);
  const [mgEditMenu, setMgEditMenu] = useState<Array<{ name: string; price: string }>>([]);
  const [mgEditText, setMgEditText] = useState("");
  const [mgSaving, setMgSaving] = useState(false);

  // 초기 로드
  useEffect(() => {
    fetchSources();
    fetchDbStats();
  }, []);

  const fetchDbStats = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/crawler/stats`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) setDbStats(await res.json());
    } catch (err) {
      console.error("DB 현황 조회 실패:", err);
    }
  };

  const fetchSources = async () => {
    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/admin/crawler/sources`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data: SourceInfo[] = await res.json();
        const filtered = data.filter((s) => s.name !== "google");
        setSources(filtered);
        setSelectedSources(filtered.filter((s) => s.ready).map((s) => s.name));
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
      const res = await fetch(`${API_BASE_URL}/admin/crawler/run`, {
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
      const res = await fetch(`${API_BASE_URL}/admin/crawler/run`, {
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

      const res = await fetch(`${API_BASE_URL}/admin/crawler/run/${singleSource}?${params}`, {
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

      const res = await fetch(`${API_BASE_URL}/admin/crawler/run/${singleSource}?${params}`, {
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
  const fetchEnrichData = async () => {
    setEnrichLoading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const res = await fetch(`${API_BASE_URL}/restaurant`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];
        setEnrichRestaurants(list);
      }
    } catch (err) {
      console.error("식당 목록 조회 실패:", err);
    } finally {
      setEnrichLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "enrich" && enrichRestaurants.length === 0) fetchEnrichData();
  }, [activeTab]);

  const enrichFiltered = enrichRestaurants.filter((r: any) => {
    if (enrichFilter === "noMenu") return !r.restaurantMenu;
    if (enrichFilter === "noImage") return !r.restaurantImage;
    if (enrichFilter === "noURL") return !r.restaurantURL || r.restaurantURL === "";
    return true;
  });

  const handleEnrich = async (field: string) => {
    if (enriching) return;
    setEnriching(field);
    setEnrichResult(null);

    try {
      const accessToken = localStorage.getItem("accessToken");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000);
      const res = await fetch(`${API_BASE_URL}/admin/crawler/enrich`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ field, limit: enrichBatchSize }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      setEnrichResult(data);
      fetchEnrichData();
    } catch (err: any) {
      console.error("보강 크롤링 실패:", err);
      setEnrichResult({
        success: false,
        message:
          err.name === "AbortError"
            ? "타임아웃 (5분 초과). 배치 크기를 줄여주세요."
            : `보강 중 오류: ${err.message}`,
      });
    } finally {
      setEnriching(null);
    }
  };

  // ─── 관리 탭 (NEW) ─────────────────────────────────────
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
        if (q.name.trim()) params.set("restaurantName", q.name.trim());
        if (q.type.trim()) params.set("restaurantType", q.type.trim());
        if (q.location.trim()) params.set("restaurantLocation", q.location.trim());

        const res = await fetch(`${API_BASE_URL}/admin/restaurant/searchRestaurant?${params}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setMgResult({
            restaurants: data.restaurants || [],
            totalCount: data.totalCount || 0,
            totalPages: data.totalPages || 1,
            currentPage: data.currentPage || page,
          });
          setMgPage(page);
        } else {
          console.error("식당 검색 실패:", res.status);
        }
      } catch (err) {
        console.error("식당 검색 실패:", err);
      } finally {
        setMgLoading(false);
      }
    },
    [mgAppliedQuery, mgLimit]
  );

  useEffect(() => {
    if (activeTab === "manage" && !mgResult) {
      fetchManage(1, { name: "", type: "", location: "" });
    }
  }, [activeTab, mgResult, fetchManage]);

  const handleMgSearch = () => {
    const q = { name: mgSearchName, type: mgSearchType, location: mgSearchLocation };
    setMgAppliedQuery(q);
    fetchManage(1, q);
  };

  const handleMgReset = () => {
    setMgSearchName("");
    setMgSearchType("");
    setMgSearchLocation("");
    const q = { name: "", type: "", location: "" };
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
      const res = await fetch(`${API_BASE_URL}/admin/restaurant/${idx}`, {
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
              restaurants: prev.restaurants.map((r) =>
                r.restaurantIdx === idx ? ({ ...r, ...body } as RestaurantRow) : r
              ),
            }
          : prev
      );
      return true;
    } catch (err) {
      console.error(`식당 ${idx} 수정 실패:`, err);
      return false;
    } finally {
      setMgSaving(false);
    }
  };

  const startEditMenu = (r: RestaurantRow) => {
    const current = parseMenu(r.restaurantMenu) || [];
    setMgEditing({ idx: r.restaurantIdx, field: "restaurantMenu" });
    setMgEditMenu(
      current.map((m) => ({
        name: m.name || "",
        price: m.price == null ? "" : String(m.price),
      }))
    );
  };

  const startEditText = (r: RestaurantRow, field: "restaurantImage" | "restaurantURL") => {
    setMgEditing({ idx: r.restaurantIdx, field });
    setMgEditText(((r[field] as string) || ""));
  };

  const cancelEdit = () => {
    setMgEditing(null);
    setMgEditMenu([]);
    setMgEditText("");
  };

  const saveMenu = async (idx: number) => {
    const cleaned = mgEditMenu
      .map((m) => ({ name: m.name.trim(), price: m.price.trim() }))
      .filter((m) => m.name !== "");
    const ok = await updateField(idx, { restaurantMenu: cleaned });
    if (ok) {
      cancelEdit();
      fetchDbStats();
    } else {
      alert("저장에 실패했습니다.");
    }
  };

  const clearMenu = async (idx: number) => {
    if (!window.confirm("이 식당의 메뉴 정보를 모두 삭제하시겠습니까?")) return;
    const ok = await updateField(idx, { restaurantMenu: null });
    if (ok) {
      cancelEdit();
      fetchDbStats();
    } else {
      alert("삭제에 실패했습니다.");
    }
  };

  const saveText = async (
    idx: number,
    field: "restaurantImage" | "restaurantURL"
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
    field: "restaurantImage" | "restaurantURL"
  ) => {
    const label = field === "restaurantImage" ? "이미지" : "URL";
    if (!window.confirm(`이 식당의 ${label} 정보를 삭제하시겠습니까?`)) return;
    const ok = await updateField(idx, { [field]: null });
    if (ok) {
      cancelEdit();
      fetchDbStats();
    } else {
      alert("삭제에 실패했습니다.");
    }
  };

  // ─── 탭 목록 ────────────────────────────────────────────
  const tabs = [
    { key: "batch", label: "통합 크롤링", icon: "hub" },
    { key: "single", label: "개별 수집", icon: "capture" },
    { key: "enrich", label: "데이터 보강", icon: "auto_fix_high" },
    { key: "manage", label: "데이터 관리", icon: "table_view" },
  ] as const;

  return (
    <div className="crawler-mat min-h-full">
      <style dangerouslySetInnerHTML={{ __html: MATERIAL_STYLES }} />

      <main className="px-6 lg:px-8 py-8 max-w-[1480px] mx-auto">
        {/* ── Header ─────────────────────── */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-[24px] font-semibold tracking-tight text-[color:var(--on-surface)]">크롤링 실행</h1>
            <p className="text-[15px] text-[color:var(--outline)]">
              새로운 식당 데이터를 수집하고 상태를 모니터링합니다.
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

        {/* ── Metric Bento Grid ────────────── */}
        <section className="bento-grid mb-8">
          <StatBento
            accent="var(--primary)"
            icon="storefront"
            badge="전체 데이터"
            value={dbStats.totalRestaurants.toLocaleString()}
            sub={`최근 7일 +${dbStats.recentAdded.toLocaleString()}`}
            subIcon="trending_up"
            subTone="secondary"
          />
          <StatBento
            accent="var(--secondary)"
            icon="calendar_add_on"
            badge="최근 추가"
            value={`+${dbStats.recentAdded.toLocaleString()}`}
            sub="Pending verification"
          />
          <StatBento
            accent="var(--tertiary)"
            icon="restaurant_menu"
            badge="메뉴 보유"
            value={dbStats.withMenu.toLocaleString()}
            sub={dbStats.totalRestaurants > 0 ? `${Math.round((dbStats.withMenu / dbStats.totalRestaurants) * 100)}% 커버리지` : "-"}
            subIcon="check_circle"
            subTone="secondary"
          />
          <StatBento
            accent="var(--outline-variant)"
            icon="insert_photo"
            badge="이미지 보유"
            value={dbStats.withImage.toLocaleString()}
            sub={dbStats.totalRestaurants > 0 ? `${Math.round((dbStats.withImage / dbStats.totalRestaurants) * 100)}% 커버리지` : "-"}
          />
        </section>

        {/* ── Batch Tab ─────────────────────── */}
        {activeTab === "batch" && (
          <div className="bento-grid">
            {/* Config */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              <section className="glass-card rounded-xl p-6">
                <h3 className="text-[18px] font-semibold mb-4 flex items-center gap-2">
                  <MatIcon name="settings_applications" className="text-[color:var(--primary)]" />
                  수집 설정
                </h3>

                <div className="space-y-8">
                  {/* Sources */}
                  <div>
                    <label className="block text-[13px] font-medium text-[color:var(--on-surface-variant)] mb-3">
                      데이터 소스 (다중 선택)
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {sources.map((s) => {
                        const p = SOURCE_PALETTE[s.name] || { ring: "ring-blue-400", dot: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-300" };
                        const active = selectedSources.includes(s.name);
                        return (
                          <button
                            key={s.name}
                            onClick={() => s.ready && toggleSource(s.name)}
                            disabled={!s.ready}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-medium transition-colors ${
                              active
                                ? `${p.bg} ${p.text} ${p.border}`
                                : s.ready
                                ? `border-[color:var(--outline-variant)] text-[color:var(--outline)] bg-white hover:${p.bg} hover:${p.text}`
                                : "border-[color:var(--outline-variant)]/50 text-[color:var(--outline-variant)] bg-[color:var(--surface-container-low)] cursor-not-allowed"
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${active ? p.dot : "bg-[color:var(--outline-variant)]"}`}></span>
                            {s.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Region */}
                  <div>
                    <label className="block text-[13px] font-medium text-[color:var(--on-surface-variant)] mb-3">
                      지역 설정
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <StyledSelect
                        value={region}
                        onChange={(v) => { setRegion(v); setSubRegion("전체"); }}
                        options={REGION_OPTIONS}
                      />
                      <StyledSelect
                        value={subRegion}
                        onChange={setSubRegion}
                        options={SUB_REGIONS[region] || ["전체"]}
                        disabled={region === "전체"}
                      />
                    </div>
                  </div>

                  {/* Keyword + Count */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[13px] font-medium text-[color:var(--on-surface-variant)] mb-3">
                        검색어 필터
                      </label>
                      <div className="relative">
                        <MatIcon
                          name="search"
                          size={20}
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-[color:var(--outline)]"
                        />
                        <input
                          type="text"
                          value={query}
                          onChange={(e) => setQuery(e.target.value)}
                          placeholder="예: 한식, 파스타, 오마카세"
                          className="w-full bg-white border border-[color:var(--outline-variant)] rounded-lg pl-11 pr-4 py-3 text-[15px] text-[color:var(--on-surface)] placeholder:text-[color:var(--outline)] focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium text-[color:var(--on-surface-variant)] mb-3">
                        소스당 건수
                      </label>
                      <input
                        type="number"
                        value={countPerSource}
                        onChange={(e) => setCountPerSource(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
                        min={1}
                        max={100}
                        className="w-full bg-white border border-[color:var(--outline-variant)] rounded-lg px-4 py-3 text-[15px] focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Action Row */}
                  <div className="pt-4 border-t border-[color:var(--outline-variant)]/40 flex items-center justify-between gap-3">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={dryRun}
                        onChange={(e) => setDryRun(e.target.checked)}
                        className="w-4 h-4 rounded text-[color:var(--primary)] focus:ring-[color:var(--primary)]"
                      />
                      <span className="text-[13px] font-medium text-[color:var(--on-surface-variant)]">
                        미리보기만 (DB 저장 X)
                      </span>
                    </label>
                    <button
                      onClick={handleRun}
                      disabled={isRunning || selectedSources.length === 0}
                      className={`px-8 py-3 rounded-lg text-[13px] font-semibold transition-all active:scale-95 flex items-center gap-2 shadow-md ${
                        isRunning || selectedSources.length === 0
                          ? "bg-[color:var(--surface-container-high)] text-[color:var(--outline)] cursor-not-allowed shadow-none"
                          : dryRun
                          ? "bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary-container)] hover:shadow-lg"
                          : "bg-[color:var(--tertiary)] text-white hover:shadow-lg"
                      }`}
                    >
                      {isRunning ? (
                        <>
                          <Spinner /> {progress}
                        </>
                      ) : (
                        <>
                          <MatIcon name={dryRun ? "visibility" : "play_arrow"} size={20} fill={1} />
                          {dryRun ? `미리보기 (${selectedSources.length})` : `실행 + 저장 (${selectedSources.length})`}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              {/* Result Metrics */}
              {result && (
                <section className="space-y-4">
                  <div className={`rounded-xl p-4 border ${result.success ? "bg-[color:var(--secondary-container)]/30 border-[color:var(--secondary)]/30" : "bg-[color:var(--error-container)] border-[color:var(--error)]/30"}`}>
                    <p className={`text-[13px] font-medium ${result.success ? "text-[color:var(--secondary)]" : "text-[color:var(--error)]"}`}>
                      {result.message}
                    </p>
                  </div>
                  {result.stats && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      <MiniStat label="수집" value={result.stats.totalFetched} accent="var(--primary)" />
                      <MiniStat label="저장" value={result.stats.saved} accent="var(--secondary)" />
                      {result.stats.alreadyInDB != null && <MiniStat label="기존" value={result.stats.alreadyInDB} />}
                      <MiniStat label="중복" value={result.stats.duplicate중복} />
                      <MiniStat label="좌표 보정" value={result.stats.coordFixed} />
                      <MiniStat label="실패" value={result.stats.failed} accent={result.stats.failed > 0 ? "var(--error)" : undefined} />
                    </div>
                  )}
                  {result.stats?.sources && (
                    <div className="glass-card rounded-xl p-6">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--outline)] mb-4">
                        소스별 분포
                      </h4>
                      <div className="space-y-3">
                        {Object.entries(result.stats.sources).map(([src, cnt]) => {
                          const pct = result.stats.totalFetched > 0 ? Math.round(((cnt as number) / result.stats.totalFetched) * 100) : 0;
                          const barColor: Record<string, string> = { kakao: "bg-yellow-400", naver: "bg-green-500", siksin: "bg-orange-500" };
                          return (
                            <div key={src} className="space-y-1">
                              <div className="flex justify-between text-[11px] font-semibold uppercase tracking-wider text-[color:var(--on-surface-variant)]">
                                <span>{src}</span>
                                <span>
                                  {cnt as number}건 · {pct}%
                                </span>
                              </div>
                              <div className="w-full bg-[color:var(--surface-container)] rounded-full h-2">
                                <div
                                  className={`${barColor[src] || "bg-[color:var(--primary)]"} h-2 rounded-full transition-all`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Preview table */}
              {showPreview && previewData.length > 0 && (
                <section className="glass-card rounded-xl overflow-hidden">
                  <div className="p-5 flex justify-between items-center border-b border-[color:var(--outline-variant)]/40">
                    <div>
                      <h4 className="text-[16px] font-semibold">수집 데이터</h4>
                      <p className="text-[11px] text-[color:var(--outline)] mt-0.5">{previewData.length}건 수집됨</p>
                    </div>
                    <button
                      onClick={handleSavePreview}
                      disabled={isRunning}
                      className="bg-[color:var(--primary)] text-white px-5 py-2 rounded-lg text-[13px] font-semibold hover:bg-[color:var(--primary-container)] transition-colors disabled:bg-[color:var(--outline-variant)] active:scale-95"
                    >
                      DB 저장
                    </button>
                  </div>
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[color:var(--surface-container-low)] sticky top-0 z-10">
                        <tr>
                          <Th>#</Th><Th>출처</Th><Th>식당명</Th><Th>업종</Th><Th>주소</Th><Th>좌표</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--outline-variant)]/30">
                        {previewData.map((item, idx) => {
                          const p = SOURCE_PALETTE[item._source] || { bg: "bg-gray-100", text: "text-gray-600" };
                          return (
                            <tr key={idx} className="hover:bg-[color:var(--surface-container-low)]">
                              <Td className="text-[color:var(--outline)]">{idx + 1}</Td>
                              <Td>
                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${p.bg} ${p.text}`}>
                                  {item._source || "?"}
                                </span>
                              </Td>
                              <Td className="font-semibold">{item.restaurantName}</Td>
                              <Td className="text-[color:var(--on-surface-variant)]">{item.restaurantType}</Td>
                              <Td className="text-[color:var(--outline)] max-w-[250px] truncate">{item.restaurantAddr}</Td>
                              <Td className="text-[11px] font-mono text-[color:var(--outline)]">
                                {item.restaurantLatX && item.restaurantLatY
                                  ? `${Number(item.restaurantLatX).toFixed(2)}, ${Number(item.restaurantLatY).toFixed(2)}`
                                  : "-"}
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </div>

            {/* History Sidebar */}
            <div className="col-span-12 lg:col-span-4">
              <LogPanel logs={logs} />
            </div>
          </div>
        )}

        {/* ── Single Tab ────────────────────────── */}
        {activeTab === "single" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {sources.map((s) => {
                const p = SOURCE_PALETTE[s.name] || { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-300", dot: "bg-gray-400" };
                const selected = singleSource === s.name;
                return (
                  <button
                    key={s.name}
                    onClick={() => s.ready && setSingleSource(s.name)}
                    disabled={!s.ready}
                    className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                      selected
                        ? "border-[color:var(--primary)] bg-[color:var(--surface-container-low)] shadow-md"
                        : s.ready
                        ? "border-[color:var(--outline-variant)] bg-white hover:border-[color:var(--outline)] hover:shadow-sm"
                        : "border-[color:var(--outline-variant)]/50 bg-[color:var(--surface-container-low)] opacity-50 cursor-not-allowed"
                    }`}
                  >
                    {selected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-[color:var(--primary)] rounded-full flex items-center justify-center">
                        <MatIcon name="check" size={16} className="text-white" fill={1} />
                      </div>
                    )}
                    <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${p.bg} ${p.text}`}>
                      {s.name}
                    </span>
                    <h3 className="text-[15px] font-semibold text-[color:var(--on-surface)] mt-2">{s.label}</h3>
                    {s.ready ? (
                      <span className="text-[11px] text-[color:var(--secondary)] mt-1 block flex items-center gap-1">
                        <MatIcon name="check_circle" size={14} fill={1} /> API 연결됨
                      </span>
                    ) : (
                      <span className="text-[11px] text-[color:var(--error)] mt-1 block">{s.reason}</span>
                    )}
                    {s.note && <span className="text-[11px] text-[color:var(--outline)] mt-0.5 block">{s.note}</span>}
                  </button>
                );
              })}
            </div>

            {singleSource ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-5">
                  <div className="glass-card rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                          SOURCE_PALETTE[singleSource]?.bg || "bg-gray-100"
                        } ${SOURCE_PALETTE[singleSource]?.text || "text-gray-600"}`}
                      >
                        {singleSource}
                      </span>
                      <h2 className="text-[16px] font-semibold">
                        {sources.find((s) => s.name === singleSource)?.label} 크롤링
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-medium text-[color:var(--on-surface-variant)] mb-1.5">지역</label>
                        <div className="flex gap-2">
                          <StyledSelect
                            className="flex-1"
                            value={singleRegion}
                            onChange={(v) => { setSingleRegion(v); setSingleSubRegion("전체"); }}
                            options={REGION_OPTIONS}
                          />
                          <StyledSelect
                            className="flex-1"
                            value={singleSubRegion}
                            onChange={setSingleSubRegion}
                            options={SUB_REGIONS[singleRegion] || ["전체"]}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[color:var(--on-surface-variant)] mb-1.5">검색 키워드</label>
                        <input
                          type="text"
                          value={singleQuery}
                          onChange={(e) => setSingleQuery(e.target.value)}
                          placeholder="맛집, 한식, 카페..."
                          className="w-full px-3 py-2 bg-white border border-[color:var(--outline-variant)] rounded-lg text-[14px] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)] focus:border-[color:var(--primary)]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[color:var(--on-surface-variant)] mb-1.5">수집 건수</label>
                        <input
                          type="number"
                          value={singleCount}
                          onChange={(e) => setSingleCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                          min={1}
                          max={100}
                          className="w-full px-3 py-2 bg-white border border-[color:var(--outline-variant)] rounded-lg text-[14px] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)] focus:border-[color:var(--primary)]"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={singleDryRun}
                          onChange={(e) => setSingleDryRun(e.target.checked)}
                          className="w-4 h-4 rounded text-[color:var(--primary)]"
                        />
                        <span className="text-[13px] text-[color:var(--on-surface-variant)]">미리보기</span>
                      </label>

                      <button
                        onClick={handleSingleRun}
                        disabled={singleRunning}
                        className={`w-full py-3 rounded-lg font-semibold text-[13px] transition-all flex items-center justify-center gap-2 ${
                          singleRunning
                            ? "bg-[color:var(--surface-container-high)] text-[color:var(--outline)] cursor-not-allowed"
                            : singleDryRun
                            ? "bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary-container)]"
                            : "bg-[color:var(--tertiary)] text-white"
                        }`}
                      >
                        {singleRunning ? (
                          <>
                            <Spinner /> {singleProgress}
                          </>
                        ) : (
                          <>
                            <MatIcon name={singleDryRun ? "visibility" : "play_arrow"} size={18} fill={1} />
                            {singleDryRun ? "미리보기 실행" : "크롤링 + 저장"}
                          </>
                        )}
                      </button>
                      {!singleDryRun && (
                        <p className="text-[11px] text-[color:var(--tertiary)] text-center">DB에 바로 저장됩니다.</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                  {singleResult && (
                    <div
                      className={`rounded-xl border p-5 ${
                        singleResult.success
                          ? "bg-[color:var(--secondary-container)]/30 border-[color:var(--secondary)]/30"
                          : "bg-[color:var(--error-container)] border-[color:var(--error)]/30"
                      }`}
                    >
                      <p className={`text-[13px] font-medium mb-3 ${singleResult.success ? "text-[color:var(--secondary)]" : "text-[color:var(--error)]"}`}>
                        {singleResult.message}
                      </p>
                      {singleResult.stats && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <MiniStat label="수집" value={singleResult.stats.totalFetched} accent="var(--primary)" />
                          <MiniStat label="저장" value={singleResult.stats.saved} accent="var(--secondary)" />
                          <MiniStat label="중복" value={singleResult.stats.duplicate중복} />
                          <MiniStat label="실패" value={singleResult.stats.failed} accent={singleResult.stats.failed > 0 ? "var(--error)" : undefined} />
                        </div>
                      )}
                    </div>
                  )}

                  {showSinglePreview && singlePreview.length > 0 && (
                    <div className="glass-card rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-[color:var(--outline-variant)]/40 flex items-center justify-between">
                        <div>
                          <h2 className="text-[14px] font-semibold">
                            {sources.find((s) => s.name === singleSource)?.label} 수집 결과
                          </h2>
                          <p className="text-[11px] text-[color:var(--outline)]">{singlePreview.length}건 — 확인 후 저장하세요</p>
                        </div>
                        <button
                          onClick={handleSaveSinglePreview}
                          disabled={singleRunning}
                          className="px-4 py-2 bg-[color:var(--secondary)] text-white text-[13px] font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:bg-[color:var(--outline-variant)]"
                        >
                          전체 DB 저장
                        </button>
                      </div>
                      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                        <table className="w-full text-[13px]">
                          <thead className="bg-[color:var(--surface-container-low)] sticky top-0">
                            <tr>
                              <Th>#</Th><Th>식당명</Th><Th>업종</Th><Th>주소</Th><Th>좌표</Th><Th>URL</Th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[color:var(--outline-variant)]/30">
                            {singlePreview.map((item, idx) => (
                              <tr key={idx} className="hover:bg-[color:var(--surface-container-low)]">
                                <Td className="text-[color:var(--outline)]">{idx + 1}</Td>
                                <Td className="font-semibold max-w-[180px] truncate">{item.restaurantName}</Td>
                                <Td className="text-[color:var(--on-surface-variant)]">{item.restaurantType}</Td>
                                <Td className="text-[color:var(--outline)] max-w-[220px] truncate">{item.restaurantAddr}</Td>
                                <Td className="text-[11px] font-mono text-[color:var(--outline)]">
                                  {item.restaurantLatX && item.restaurantLatY
                                    ? `${Number(item.restaurantLatX).toFixed(4)}, ${Number(item.restaurantLatY).toFixed(4)}`
                                    : "-"}
                                </Td>
                                <Td>
                                  {item.restaurantURL ? (
                                    <a href={item.restaurantURL} target="_blank" rel="noopener noreferrer" className="text-[color:var(--primary)] hover:underline text-[11px]">
                                      링크
                                    </a>
                                  ) : "-"}
                                </Td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {!singleResult && !showSinglePreview && (
                    <div className="glass-card rounded-xl p-12 text-center">
                      <MatIcon name="tune" size={40} className="text-[color:var(--outline-variant)]" />
                      <p className="text-[color:var(--outline)] mt-3 text-[14px]">설정을 확인하고 실행 버튼을 눌러주세요.</p>
                      <p className="text-[11px] text-[color:var(--outline)] mt-1">미리보기를 먼저 실행하면 저장 전 결과를 확인할 수 있습니다.</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-xl p-12 text-center">
                <MatIcon name="rocket_launch" size={48} className="text-[color:var(--outline-variant)]" />
                <p className="text-[color:var(--outline)] mt-3 text-[16px] font-medium">크롤링할 소스를 선택해주세요</p>
                <p className="text-[12px] text-[color:var(--outline)] mt-1">위 카드에서 하나를 클릭하면 설정 화면이 표시됩니다.</p>
              </div>
            )}

            {logs.length > 0 && <LogPanel logs={logs} compact />}
          </div>
        )}

        {/* ── Enrich Tab ────────────────────────── */}
        {activeTab === "enrich" && (
          <div className="space-y-6">
            <section className="glass-card p-6 rounded-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--outline)]">필터</label>
                  <div className="flex gap-1 p-1 bg-[color:var(--surface-container-low)] rounded-lg">
                    {[
                      { key: "all", label: "전체" },
                      { key: "noMenu", label: "메뉴 없음" },
                      { key: "noImage", label: "이미지 없음" },
                      { key: "noURL", label: "URL 없음" },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setEnrichFilter(f.key)}
                        className={`px-4 py-2 rounded-md text-[13px] font-medium transition-all ${
                          enrichFilter === f.key
                            ? "bg-[color:var(--primary)] text-white"
                            : "text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-high)]"
                        }`}
                      >
                        {f.label}
                        {f.key !== "all" && (
                          <span className="ml-1 opacity-80">
                            ({enrichRestaurants.filter((r: any) =>
                              f.key === "noMenu" ? !r.restaurantMenu :
                              f.key === "noImage" ? !r.restaurantImage :
                              !r.restaurantURL || r.restaurantURL === ""
                            ).length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <span className="text-[12px] text-[color:var(--outline)] ml-2">{enrichFiltered.length.toLocaleString()}건</span>
                </div>
                <div className="flex items-center gap-2">
                  {(enrichFilter === "noMenu" || enrichFilter === "noImage") && (
                    <>
                      <select
                        value={enrichBatchSize}
                        onChange={(e) => setEnrichBatchSize(Number(e.target.value))}
                        className="text-[12px] border border-[color:var(--outline-variant)] rounded-lg px-2 py-1.5 bg-white"
                      >
                        <option value={10}>10개</option>
                        <option value={20}>20개</option>
                        <option value={50}>50개</option>
                      </select>
                      <button
                        onClick={() => handleEnrich(enrichFilter === "noMenu" ? "restaurantMenu" : "restaurantImage")}
                        disabled={enriching !== null}
                        className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex items-center gap-1.5 ${
                          enriching
                            ? "bg-[color:var(--tertiary-container)] text-[color:var(--tertiary)] animate-pulse"
                            : "bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary-container)]"
                        }`}
                      >
                        <MatIcon name="auto_fix_high" size={16} fill={1} />
                        {enriching ? "보강 중..." : "식신에서 보강"}
                      </button>
                    </>
                  )}
                  <button
                    onClick={fetchEnrichData}
                    className="px-4 py-2 bg-[color:var(--surface-container)] text-[color:var(--on-surface-variant)] rounded-lg hover:bg-[color:var(--surface-container-high)] text-[13px] font-medium flex items-center gap-1"
                  >
                    <MatIcon name="refresh" size={16} /> 새로고침
                  </button>
                </div>
              </div>
            </section>

            {enrichResult && (
              <div className="glass-card rounded-xl overflow-hidden">
                <div
                  className={`p-4 ${
                    enrichResult.success
                      ? "bg-[color:var(--secondary-container)]/30 border-b border-[color:var(--secondary)]/30"
                      : "bg-[color:var(--error-container)] border-b border-[color:var(--error)]/30"
                  }`}
                >
                  <p className={`text-[13px] font-medium ${enrichResult.success ? "text-[color:var(--secondary)]" : "text-[color:var(--error)]"}`}>
                    {enrichResult.message}
                  </p>
                </div>
                {enrichResult.results && enrichResult.results.length > 0 && (
                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[color:var(--surface-container-low)] sticky top-0 z-10">
                        <tr>
                          <Th>#</Th><Th>식당명</Th><Th>매칭된 이름</Th><Th>결과</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--outline-variant)]/30">
                        {enrichResult.results.map((r: any, i: number) => (
                          <tr key={i} className="hover:bg-[color:var(--surface-container-low)]">
                            <Td className="text-[color:var(--outline)]">{i + 1}</Td>
                            <Td className="font-semibold">{r.name}</Td>
                            <Td className="text-[color:var(--on-surface-variant)]">{r.matched || "-"}</Td>
                            <Td>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                r.status === "updated" ? "bg-[color:var(--secondary-container)] text-[color:var(--secondary)]" :
                                r.status === "no_data" ? "bg-[color:var(--tertiary-container)] text-[color:var(--tertiary)]" :
                                r.status === "not_found" ? "bg-[color:var(--surface-container-high)] text-[color:var(--outline)]" :
                                "bg-[color:var(--error-container)] text-[color:var(--error)]"
                              }`}>
                                {r.status === "updated" ? "보강 완료" :
                                 r.status === "no_data" ? "데이터 없음" :
                                 r.status === "not_found" ? "미발견" : "오류"}
                              </span>
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <div className="glass-card rounded-xl overflow-hidden">
              {enrichLoading ? (
                <p className="text-[13px] text-[color:var(--outline)] text-center py-12">식당 목록 로딩 중...</p>
              ) : enrichRestaurants.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-[color:var(--outline)] mb-2">식당 데이터가 없습니다.</p>
                  <button onClick={fetchEnrichData} className="text-[13px] text-[color:var(--primary)] hover:underline">
                    다시 로드
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[color:var(--surface-container-low)] sticky top-0 z-10">
                      <tr>
                        <Th>#</Th><Th>식당명</Th><Th>업종</Th><Th>주소</Th>
                        <Th className="text-center">메뉴</Th>
                        <Th className="text-center">이미지</Th>
                        <Th className="text-center">URL</Th>
                        <Th>조회수</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--outline-variant)]/30">
                      {enrichFiltered.slice(0, 200).map((r: any, idx: number) => (
                        <tr key={r.restaurantIdx || idx} className="hover:bg-[color:var(--surface-container-low)]">
                          <Td className="text-[color:var(--outline)]">{idx + 1}</Td>
                          <Td className="font-semibold max-w-[200px] truncate">{r.restaurantName}</Td>
                          <Td className="text-[color:var(--on-surface-variant)] max-w-[120px] truncate">{r.restaurantType}</Td>
                          <Td className="text-[color:var(--outline)] max-w-[250px] truncate">{r.restaurantAddr}</Td>
                          <Td className="text-center"><FieldBadge filled={!!r.restaurantMenu} /></Td>
                          <Td className="text-center"><FieldBadge filled={!!r.restaurantImage} /></Td>
                          <Td className="text-center"><FieldBadge filled={!!r.restaurantURL} /></Td>
                          <Td className="text-[color:var(--on-surface-variant)]">{(r.restaurantViewCount || 0).toLocaleString()}</Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {enrichFiltered.length > 200 && (
                    <p className="text-[11px] text-[color:var(--outline)] text-center py-3 bg-[color:var(--surface-container-low)]">
                      상위 200개만 표시 (전체 {enrichFiltered.length.toLocaleString()}개)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Manage Tab (NEW) ──────────────────── */}
        {activeTab === "manage" && (
          <div className="space-y-6">
            {/* Search */}
            <section className="glass-card rounded-xl p-6">
              <h3 className="text-[18px] font-semibold mb-4 flex items-center gap-2">
                <MatIcon name="search" className="text-[color:var(--primary)]" />
                식당 검색
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-[11px] font-medium text-[color:var(--on-surface-variant)] mb-1.5">식당명</label>
                  <input
                    type="text"
                    value={mgSearchName}
                    onChange={(e) => setMgSearchName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMgSearch()}
                    placeholder="식당 이름 일부"
                    className="w-full px-3 py-2.5 bg-white border border-[color:var(--outline-variant)] rounded-lg text-[14px] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)] focus:border-[color:var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[color:var(--on-surface-variant)] mb-1.5">업종 (정확히)</label>
                  <input
                    type="text"
                    value={mgSearchType}
                    onChange={(e) => setMgSearchType(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMgSearch()}
                    placeholder="한식, 카페 등"
                    className="w-full px-3 py-2.5 bg-white border border-[color:var(--outline-variant)] rounded-lg text-[14px] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)] focus:border-[color:var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[color:var(--on-surface-variant)] mb-1.5">지역/주소</label>
                  <input
                    type="text"
                    value={mgSearchLocation}
                    onChange={(e) => setMgSearchLocation(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleMgSearch()}
                    placeholder="강남, 서울 등"
                    className="w-full px-3 py-2.5 bg-white border border-[color:var(--outline-variant)] rounded-lg text-[14px] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)] focus:border-[color:var(--primary)]"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleMgReset}
                  className="px-5 py-2.5 rounded-lg border border-[color:var(--outline-variant)] text-[color:var(--on-surface)] text-[13px] font-medium hover:bg-[color:var(--surface-container-low)] transition-colors"
                >
                  초기화
                </button>
                <button
                  onClick={handleMgSearch}
                  disabled={mgLoading}
                  className="px-6 py-2.5 rounded-lg bg-[color:var(--primary)] text-white text-[13px] font-semibold hover:bg-[color:var(--primary-container)] transition-colors active:scale-95 disabled:bg-[color:var(--outline-variant)] flex items-center gap-2"
                >
                  {mgLoading ? <Spinner /> : <MatIcon name="search" size={18} fill={1} />}
                  검색
                </button>
              </div>
            </section>

            {/* Count + refresh */}
            {mgResult && (
              <div className="glass-card rounded-xl px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="text-[color:var(--outline)]">
                    전체 <strong className="text-[color:var(--on-surface)]">{mgResult.totalCount.toLocaleString()}</strong>건
                    {mgAppliedQuery.name || mgAppliedQuery.type || mgAppliedQuery.location ? (
                      <span className="ml-2 text-[color:var(--primary)]">(검색 결과)</span>
                    ) : null}
                  </span>
                  <span className="hidden sm:inline text-[11px] text-[color:var(--outline)]">
                    식당을 펼쳐 메뉴·이미지·URL을 개별 수정/삭제할 수 있습니다.
                  </span>
                </div>
                <button
                  onClick={() => fetchManage(mgPage)}
                  disabled={mgLoading}
                  className="px-4 py-2 rounded-lg bg-[color:var(--surface-container)] text-[color:var(--on-surface-variant)] text-[13px] font-medium hover:bg-[color:var(--surface-container-high)] flex items-center gap-1"
                >
                  <MatIcon name="refresh" size={16} /> 새로고침
                </button>
              </div>
            )}

            {/* Result table */}
            <div className="glass-card rounded-xl overflow-hidden">
              {mgLoading ? (
                <p className="text-[13px] text-[color:var(--outline)] text-center py-16">검색 중...</p>
              ) : !mgResult || mgResult.restaurants.length === 0 ? (
                <div className="text-center py-16">
                  <MatIcon name="search_off" size={40} className="text-[color:var(--outline-variant)]" />
                  <p className="text-[color:var(--outline)] mt-3 text-[14px]">검색 결과가 없습니다.</p>
                  <p className="text-[11px] text-[color:var(--outline)] mt-1">다른 조건으로 검색해보세요.</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[color:var(--surface-container-low)] sticky top-0 z-10">
                        <tr>
                          <Th className="w-10"></Th>
                          <Th>식당명</Th>
                          <Th>업종</Th>
                          <Th>주소</Th>
                          <Th className="text-center">메뉴</Th>
                          <Th className="text-center">이미지</Th>
                          <Th className="text-center">URL</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[color:var(--outline-variant)]/30">
                        {mgResult.restaurants.map((r) => {
                          const expanded = mgExpanded.has(r.restaurantIdx);
                          const menu = parseMenu(r.restaurantMenu);
                          const editingMenu = mgEditing?.idx === r.restaurantIdx && mgEditing.field === "restaurantMenu";
                          const editingImage = mgEditing?.idx === r.restaurantIdx && mgEditing.field === "restaurantImage";
                          const editingUrl = mgEditing?.idx === r.restaurantIdx && mgEditing.field === "restaurantURL";
                          return (
                            <React.Fragment key={r.restaurantIdx}>
                              <tr
                                className="transition-colors hover:bg-[color:var(--surface-container-low)] cursor-pointer"
                                onClick={() => toggleMgExpand(r.restaurantIdx)}
                              >
                                <td className="px-2 py-3">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleMgExpand(r.restaurantIdx); }}
                                    className="p-1 rounded hover:bg-[color:var(--surface-container)] text-[color:var(--outline)]"
                                    aria-label="상세 보기"
                                  >
                                    <MatIcon name={expanded ? "expand_less" : "expand_more"} size={20} />
                                  </button>
                                </td>
                                <Td className="font-semibold max-w-[220px] truncate">
                                  {r.restaurantName}
                                  <div className="text-[10px] text-[color:var(--outline)] font-mono font-normal mt-0.5">
                                    #{r.restaurantIdx}
                                  </div>
                                </Td>
                                <Td className="text-[color:var(--on-surface-variant)] max-w-[120px] truncate">{r.restaurantType || "-"}</Td>
                                <Td className="text-[color:var(--outline)] max-w-[280px] truncate">{r.restaurantAddr || "-"}</Td>
                                <Td className="text-center"><FieldBadge filled={!!menu && menu.length > 0} /></Td>
                                <Td className="text-center"><FieldBadge filled={!!r.restaurantImage} /></Td>
                                <Td className="text-center"><FieldBadge filled={!!r.restaurantURL} /></Td>
                              </tr>
                              {expanded && (
                                <tr className="bg-[color:var(--surface-container-low)]">
                                  <td colSpan={7} className="p-6">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                      {/* Left: read-only metadata */}
                                      <div className="space-y-3">
                                        <h5 className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--outline)] mb-2">기본 정보</h5>
                                        <DetailRow label="좌표" value={
                                          r.restaurantLatX && r.restaurantLatY
                                            ? `${Number(r.restaurantLatX).toFixed(6)}, ${Number(r.restaurantLatY).toFixed(6)}`
                                            : "-"
                                        } mono />
                                        <DetailRow label="지역" value={r.restaurantLocation || "-"} />
                                        <DetailRow label="지번주소" value={r.restaurantLotAddr || "-"} />
                                        <DetailRow label="평점" value={r.restaurantRating != null ? `★ ${r.restaurantRating}` : "-"} />
                                        <DetailRow label="조회수" value={(r.restaurantViewCount || 0).toLocaleString()} />
                                        <DetailRow label="등록일" value={r.createdAt ? new Date(r.createdAt).toLocaleString("ko-KR") : "-"} mono />
                                      </div>

                                      {/* Right: editable crawler fields */}
                                      <div className="space-y-4">
                                        <h5 className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--outline)] mb-2">
                                          크롤러 수집 필드 (수정 가능)
                                        </h5>

                                        {/* Menu editor */}
                                        <CrawlerFieldCard
                                          icon="restaurant_menu"
                                          title={`메뉴${menu ? ` (${menu.length})` : ""}`}
                                          isEditing={editingMenu}
                                          hasValue={!!menu && menu.length > 0}
                                          disabled={mgEditing !== null && !editingMenu}
                                          saving={mgSaving && editingMenu}
                                          onStartEdit={() => startEditMenu(r)}
                                          onSave={() => saveMenu(r.restaurantIdx)}
                                          onCancel={cancelEdit}
                                          onClear={() => clearMenu(r.restaurantIdx)}
                                        >
                                          {editingMenu ? (
                                            <div className="space-y-2">
                                              {mgEditMenu.length === 0 && (
                                                <p className="text-[11px] text-[color:var(--outline)] text-center py-2">
                                                  아래 버튼으로 메뉴 항목을 추가하세요.
                                                </p>
                                              )}
                                              {mgEditMenu.map((m, i) => (
                                                <div key={i} className="flex gap-2 items-center">
                                                  <input
                                                    type="text"
                                                    value={m.name}
                                                    onChange={(e) => {
                                                      const next = [...mgEditMenu];
                                                      next[i] = { ...next[i], name: e.target.value };
                                                      setMgEditMenu(next);
                                                    }}
                                                    placeholder="메뉴명"
                                                    className="flex-1 px-2 py-1.5 bg-white border border-[color:var(--outline-variant)] rounded text-[13px] focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                                                  />
                                                  <input
                                                    type="text"
                                                    value={m.price}
                                                    onChange={(e) => {
                                                      const next = [...mgEditMenu];
                                                      next[i] = { ...next[i], price: e.target.value };
                                                      setMgEditMenu(next);
                                                    }}
                                                    placeholder="가격"
                                                    className="w-28 px-2 py-1.5 bg-white border border-[color:var(--outline-variant)] rounded text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                                                  />
                                                  <button
                                                    onClick={() =>
                                                      setMgEditMenu(mgEditMenu.filter((_, idx) => idx !== i))
                                                    }
                                                    className="p-1.5 rounded text-[color:var(--error)] hover:bg-[color:var(--error-container)]"
                                                    aria-label="이 항목 제거"
                                                  >
                                                    <MatIcon name="close" size={16} />
                                                  </button>
                                                </div>
                                              ))}
                                              <button
                                                onClick={() =>
                                                  setMgEditMenu([...mgEditMenu, { name: "", price: "" }])
                                                }
                                                className="w-full py-1.5 border-2 border-dashed border-[color:var(--outline-variant)] rounded text-[12px] font-medium text-[color:var(--outline)] hover:border-[color:var(--primary)] hover:text-[color:var(--primary)] transition-colors flex items-center justify-center gap-1"
                                              >
                                                <MatIcon name="add" size={16} /> 메뉴 항목 추가
                                              </button>
                                            </div>
                                          ) : menu && menu.length > 0 ? (
                                            <ul className="space-y-1.5 max-h-[200px] overflow-y-auto">
                                              {menu.map((m, i) => (
                                                <li
                                                  key={i}
                                                  className="flex justify-between text-[13px] border-b border-[color:var(--outline-variant)]/30 pb-1 last:border-0"
                                                >
                                                  <span className="text-[color:var(--on-surface)]">{m.name}</span>
                                                  <span className="text-[color:var(--on-surface-variant)] font-mono">
                                                    {m.price != null && m.price !== "" ? m.price : "-"}
                                                  </span>
                                                </li>
                                              ))}
                                            </ul>
                                          ) : (
                                            <p className="text-[12px] text-[color:var(--outline)] text-center py-4">
                                              메뉴 정보 없음
                                            </p>
                                          )}
                                        </CrawlerFieldCard>

                                        {/* Image editor */}
                                        <CrawlerFieldCard
                                          icon="insert_photo"
                                          title="이미지"
                                          isEditing={editingImage}
                                          hasValue={!!r.restaurantImage}
                                          disabled={mgEditing !== null && !editingImage}
                                          saving={mgSaving && editingImage}
                                          onStartEdit={() => startEditText(r, "restaurantImage")}
                                          onSave={() => saveText(r.restaurantIdx, "restaurantImage")}
                                          onCancel={cancelEdit}
                                          onClear={() => clearText(r.restaurantIdx, "restaurantImage")}
                                        >
                                          {editingImage ? (
                                            <div className="space-y-2">
                                              <input
                                                type="text"
                                                value={mgEditText}
                                                onChange={(e) => setMgEditText(e.target.value)}
                                                placeholder="/uploads/... 또는 https://..."
                                                className="w-full px-2 py-2 bg-white border border-[color:var(--outline-variant)] rounded text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                                              />
                                              <p className="text-[11px] text-[color:var(--outline)]">
                                                이미지 경로(URL)만 수정할 수 있습니다. 비우고 저장하면 삭제됩니다.
                                              </p>
                                            </div>
                                          ) : r.restaurantImage ? (
                                            <div className="flex gap-3 items-start">
                                              {/* eslint-disable-next-line @next/next/no-img-element */}
                                              <img
                                                src={r.restaurantImage.startsWith("http") ? r.restaurantImage : `${API_BASE_URL}${r.restaurantImage}`}
                                                alt={r.restaurantName}
                                                className="w-20 h-20 object-cover rounded-md border border-[color:var(--outline-variant)]/50 flex-shrink-0"
                                                onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                                              />
                                              <span className="text-[11px] font-mono text-[color:var(--outline)] break-all flex-1">
                                                {r.restaurantImage}
                                              </span>
                                            </div>
                                          ) : (
                                            <p className="text-[12px] text-[color:var(--outline)] text-center py-4">
                                              이미지 없음
                                            </p>
                                          )}
                                        </CrawlerFieldCard>

                                        {/* URL editor */}
                                        <CrawlerFieldCard
                                          icon="link"
                                          title="웹사이트 URL"
                                          isEditing={editingUrl}
                                          hasValue={!!r.restaurantURL}
                                          disabled={mgEditing !== null && !editingUrl}
                                          saving={mgSaving && editingUrl}
                                          onStartEdit={() => startEditText(r, "restaurantURL")}
                                          onSave={() => saveText(r.restaurantIdx, "restaurantURL")}
                                          onCancel={cancelEdit}
                                          onClear={() => clearText(r.restaurantIdx, "restaurantURL")}
                                        >
                                          {editingUrl ? (
                                            <input
                                              type="text"
                                              value={mgEditText}
                                              onChange={(e) => setMgEditText(e.target.value)}
                                              placeholder="https://..."
                                              className="w-full px-2 py-2 bg-white border border-[color:var(--outline-variant)] rounded text-[13px] font-mono focus:outline-none focus:ring-1 focus:ring-[color:var(--primary)]"
                                            />
                                          ) : r.restaurantURL ? (
                                            <a
                                              href={r.restaurantURL}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-[13px] text-[color:var(--primary)] hover:underline break-all"
                                            >
                                              {r.restaurantURL}
                                            </a>
                                          ) : (
                                            <p className="text-[12px] text-[color:var(--outline)] text-center py-4">
                                              URL 없음
                                            </p>
                                          )}
                                        </CrawlerFieldCard>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Pagination */}
                  <Pagination
                    currentPage={mgResult.currentPage}
                    totalPages={mgResult.totalPages}
                    onPage={(p) => fetchManage(p)}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// ─── Sub-components ─────────────────────────────────────────

const StatBento: React.FC<{
  accent: string;
  icon: string;
  badge: string;
  value: string;
  sub: string;
  subIcon?: string;
  subTone?: "muted" | "secondary";
}> = ({ accent, icon, badge, value, sub, subIcon, subTone = "muted" }) => (
  <div className="col-span-12 md:col-span-6 lg:col-span-3 glass-card rounded-xl p-6 relative overflow-hidden group">
    <div className="absolute top-0 left-0 w-full h-1" style={{ background: accent }}></div>
    <div className="flex justify-between items-start mb-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
        style={{ background: `${accent}15`, color: accent }}
      >
        <MatIcon name={icon} fill={1} />
      </div>
      <span className="text-[11px] text-[color:var(--outline)] bg-[color:var(--surface-container)] px-2 py-1 rounded-full">
        {badge}
      </span>
    </div>
    <div className="text-[32px] font-bold tracking-tight text-[color:var(--on-surface)] mb-1">{value}</div>
    <div
      className={`text-[13px] flex items-center gap-1 ${
        subTone === "secondary" ? "text-[color:var(--secondary)]" : "text-[color:var(--outline)]"
      }`}
    >
      {subIcon && <MatIcon name={subIcon} size={16} fill={1} />}
      {sub}
    </div>
  </div>
);

const MiniStat: React.FC<{ label: string; value: number | string; accent?: string }> = ({ label, value, accent }) => (
  <div
    className="glass-card rounded-xl p-4"
    style={accent ? { borderLeft: `4px solid ${accent}` } : undefined}
  >
    <p className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--outline)] mb-1">{label}</p>
    <h3
      className="text-[22px] font-bold text-[color:var(--on-surface)]"
      style={accent ? { color: accent } : undefined}
    >
      {typeof value === "number" ? value.toLocaleString() : value}
    </h3>
  </div>
);

const FieldBadge: React.FC<{ filled: boolean }> = ({ filled }) =>
  filled ? (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[color:var(--secondary-container)] text-[color:var(--secondary)]">
      <MatIcon name="check" size={14} fill={1} />
    </span>
  ) : (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[color:var(--surface-container)] text-[color:var(--outline)]">
      <MatIcon name="close" size={14} />
    </span>
  );

const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = "", children, ...rest }) => (
  <th
    {...rest}
    className={`px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-[color:var(--outline)] ${className}`}
  >
    {children}
  </th>
);

const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = "", children, ...rest }) => (
  <td {...rest} className={`px-4 py-3 text-[13px] ${className}`}>
    {children}
  </td>
);

const StyledSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: string[];
  className?: string;
  disabled?: boolean;
}> = ({ value, onChange, options, className = "", disabled }) => (
  <div className={`relative ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full appearance-none bg-white border border-[color:var(--outline-variant)] rounded-lg px-4 py-3 pr-10 text-[14px] text-[color:var(--on-surface)] focus:border-[color:var(--primary)] focus:ring-1 focus:ring-[color:var(--primary)] focus:outline-none disabled:bg-[color:var(--surface-container-low)] disabled:text-[color:var(--outline)]"
    >
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[color:var(--outline)]">
      <MatIcon name="expand_more" size={20} />
    </div>
  </div>
);

const Spinner: React.FC = () => (
  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const LogPanel: React.FC<{ logs: CrawlLog[]; compact?: boolean }> = ({ logs, compact }) => (
  <div className={`glass-card rounded-xl p-6 ${compact ? "" : "h-full"} flex flex-col`}>
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-[16px] font-semibold flex items-center gap-2">
        <MatIcon name="history" className="text-[color:var(--secondary)]" fill={1} />
        최근 실행 기록
      </h3>
      {logs.length > 0 && (
        <span className="text-[11px] text-[color:var(--outline)]">{logs.length}건</span>
      )}
    </div>
    {logs.length === 0 ? (
      <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-[color:var(--surface-container)] mb-4 flex items-center justify-center text-[color:var(--outline)]">
          <MatIcon name="inbox" size={32} />
        </div>
        <p className="text-[13px] text-[color:var(--on-surface-variant)] mb-1">최근 실행된 내역이 없습니다.</p>
        <p className="text-[11px] text-[color:var(--outline)]">조건을 설정하고 수집을 시작해보세요.</p>
      </div>
    ) : (
      <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
        {logs.map((log) => (
          <div
            key={log.id}
            className="p-3 rounded-lg border border-[color:var(--outline-variant)]/50 hover:bg-[color:var(--surface-container-low)] transition-colors"
          >
            <div className="flex justify-between items-start mb-1.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[13px] font-semibold">
                  {log.region} · "{log.query}"
                </span>
                {log.sources.map((s) => (
                  <span
                    key={s}
                    className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                      SOURCE_PALETTE[s]?.bg || "bg-gray-100"
                    } ${SOURCE_PALETTE[s]?.text || "text-gray-600"}`}
                  >
                    {s}
                  </span>
                ))}
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                  log.result.success
                    ? "bg-[color:var(--secondary-container)]/40 text-[color:var(--secondary)]"
                    : "bg-[color:var(--error-container)] text-[color:var(--error)]"
                }`}
              >
                {log.result.success ? "완료" : "실패"}
              </span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="font-mono text-[color:var(--outline)]">{log.time}</span>
              <span className="text-[color:var(--on-surface-variant)]">{log.result.message}</span>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const Pagination: React.FC<{ currentPage: number; totalPages: number; onPage: (p: number) => void }> = ({
  currentPage,
  totalPages,
  onPage,
}) => {
  if (totalPages <= 1) return null;
  const windowSize = 7;
  const start = Math.max(1, Math.min(currentPage - Math.floor(windowSize / 2), totalPages - windowSize + 1));
  const end = Math.min(totalPages, start + windowSize - 1);
  const pages = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between px-6 py-4 bg-[color:var(--surface-container-low)] border-t border-[color:var(--outline-variant)]/40">
      <button
        onClick={() => onPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <MatIcon name="chevron_left" size={18} /> 이전
      </button>
      <div className="flex items-center gap-1">
        {start > 1 && (
          <>
            <PageButton page={1} active={false} onClick={onPage} />
            {start > 2 && <span className="text-[color:var(--outline)] px-1">…</span>}
          </>
        )}
        {pages.map((p) => (
          <PageButton key={p} page={p} active={p === currentPage} onClick={onPage} />
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="text-[color:var(--outline)] px-1">…</span>}
            <PageButton page={totalPages} active={false} onClick={onPage} />
          </>
        )}
      </div>
      <button
        onClick={() => onPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[12px] font-medium text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        다음 <MatIcon name="chevron_right" size={18} />
      </button>
    </div>
  );
};

const PageButton: React.FC<{ page: number; active: boolean; onClick: (p: number) => void }> = ({
  page,
  active,
  onClick,
}) => (
  <button
    onClick={() => onClick(page)}
    className={`min-w-[32px] h-8 px-2 rounded-md text-[12px] font-semibold transition-colors ${
      active
        ? "bg-[color:var(--primary)] text-white"
        : "text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container)]"
    }`}
  >
    {page}
  </button>
);

const CrawlerFieldCard: React.FC<{
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
    className={`bg-white border rounded-lg p-4 transition-colors ${
      isEditing
        ? "border-[color:var(--primary)] ring-1 ring-[color:var(--primary)]/20"
        : "border-[color:var(--outline-variant)]"
    } ${disabled ? "opacity-60" : ""}`}
  >
    <div className="flex items-center justify-between mb-3 gap-2">
      <h6 className="text-[13px] font-semibold flex items-center gap-1.5 text-[color:var(--on-surface)]">
        <MatIcon name={icon} size={18} className="text-[color:var(--primary)]" fill={1} />
        {title}
      </h6>
      <div className="flex gap-1">
        {isEditing ? (
          <>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-3 py-1 rounded text-[11px] font-semibold bg-[color:var(--primary)] text-white hover:bg-[color:var(--primary-container)] disabled:opacity-60 flex items-center gap-1"
            >
              {saving ? <Spinner /> : <MatIcon name="check" size={14} fill={1} />}
              저장
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-3 py-1 rounded text-[11px] font-semibold border border-[color:var(--outline-variant)] text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] disabled:opacity-60"
            >
              취소
            </button>
          </>
        ) : (
          <>
            <button
              onClick={onStartEdit}
              disabled={disabled}
              className="px-3 py-1 rounded text-[11px] font-semibold border border-[color:var(--outline-variant)] text-[color:var(--on-surface-variant)] hover:bg-[color:var(--surface-container-low)] hover:text-[color:var(--primary)] hover:border-[color:var(--primary)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              <MatIcon name="edit" size={14} /> 수정
            </button>
            {hasValue && (
              <button
                onClick={onClear}
                disabled={disabled}
                className="px-3 py-1 rounded text-[11px] font-semibold text-[color:var(--error)] hover:bg-[color:var(--error-container)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <MatIcon name="delete" size={14} /> 삭제
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
  <div className="grid grid-cols-[80px_1fr] gap-3 items-start text-[13px]">
    <span className="text-[11px] font-bold uppercase tracking-widest text-[color:var(--outline)] pt-0.5">{label}</span>
    <span className={`text-[color:var(--on-surface)] ${mono ? "font-mono text-[12px]" : ""}`}>{value}</span>
  </div>
);

function parseMenu(raw: RestaurantRow["restaurantMenu"]): Array<{ name: string; price?: string | number }> | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return null;
}

export default RestaurantCrawlerPage;
