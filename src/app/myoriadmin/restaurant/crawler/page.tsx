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

// 정적 소스 정의 (API 무관하게 항상 표시)
const STATIC_SOURCES: { name: string; label: string; desc: string; envKey: string; bg: string; text: string; border: string }[] = [
  { name: "kakao", label: "카카오", desc: "Kakao Local API (카테고리 + 키워드)", envKey: "KAKAO_REST_API_KEY", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300" },
  { name: "naver", label: "네이버", desc: "Naver 지역 검색 API", envKey: "NAVER_CLIENT_ID / SECRET", bg: "bg-green-50", text: "text-green-700", border: "border-green-300" },
  { name: "siksin", label: "식신", desc: "", envKey: "", bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
];

const SOURCE_LABELS: Record<string, { color: string; bg: string; text: string }> = {
  kakao: { color: "yellow", bg: "bg-yellow-100", text: "text-yellow-700" },
  naver: { color: "green", bg: "bg-green-100", text: "text-green-700" },
  siksin: { color: "red", bg: "bg-red-100", text: "text-red-700" },
};

const RestaurantCrawlerPage: React.FC = () => {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<"batch" | "single" | "enrich">("batch");

  // 소스 상태
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);

  // DB 현황 (기본값 0으로 초기화 → 페이지 로드 즉시 카드 표시)
  const [dbStats, setDbStats] = useState<DbStats>({
    totalRestaurants: 0,
    withMenu: 0,
    withImage: 0,
    withRating: 0,
    recentAdded: 0,
  });

  // 크롤링 옵션 (통합)
  const [query, setQuery] = useState("맛집");
  const [region, setRegion] = useState("서울");
  const [subRegion, setSubRegion] = useState("전체");
  const [countPerSource, setCountPerSource] = useState(30);
  const [dryRun, setDryRun] = useState(true);

  // 실행 상태 (통합)
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<CrawlResult | null>(null);
  const [logs, setLogs] = useState<CrawlLog[]>([]);

  // 미리보기 데이터 (통합)
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

  // 데이터 보강 상태
  const [missingStats, setMissingStats] = useState<{ key: string; label: string; total: number; missing: number; filled: number }[]>([]);
  const [enriching, setEnriching] = useState<string | null>(null);
  const [enrichResult, setEnrichResult] = useState<any>(null);
  const [enrichBatchSize, setEnrichBatchSize] = useState(10);

  // 소스 목록 + DB 현황 조회
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
      if (res.ok) {
        const data: DbStats = await res.json();
        setDbStats(data);
      }
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
        setSources(data.filter((s) => s.name !== "google"));
        // 사용 가능한 소스 자동 선택
        setSelectedSources(data.filter((s) => s.ready).map((s) => s.name));
      }
    } catch (err) {
      console.error("소스 조회 실패:", err);
    }
  };

  // 소스 토글
  const toggleSource = (name: string) => {
    setSelectedSources((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  };

  // 지역 + 하위 행정구역 조합
  const fullRegion = region === "전체" ? "서울" : (subRegion === "전체" ? region : `${region} ${subRegion}`);

  // 크롤링 실행
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

      // 로그 추가
      setLogs((prev) => [
        {
          id: Date.now(),
          time: new Date().toLocaleString("ko-KR"),
          sources: selectedSources,
          region: fullRegion,
          query,
          result: data,
        },
        ...prev,
      ].slice(0, 20));

      setProgress("");
    } catch (err) {
      console.error("크롤링 실행 실패:", err);
      setProgress("실행 중 오류가 발생했습니다.");
    } finally {
      setIsRunning(false);
      fetchDbStats();
    }
  }, [selectedSources, query, fullRegion, countPerSource, dryRun]);

  // 미리보기 데이터를 실제 저장
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
    }
  }, [selectedSources, query, fullRegion, countPerSource, previewData.length]);

  // ─── 개별 크롤링 실행 ────────────────────────────────────
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

      // 로그에도 추가
      setLogs((prev) => [
        {
          id: Date.now(),
          time: new Date().toLocaleString("ko-KR"),
          sources: [singleSource],
          region: singleFullRegion,
          query: singleQuery,
          result: data,
        },
        ...prev,
      ].slice(0, 20));

      setSingleProgress("");
    } catch (err) {
      console.error("개별 크롤링 실패:", err);
      setSingleProgress("실행 중 오류가 발생했습니다.");
    } finally {
      setSingleRunning(false);
    }
  }, [singleSource, singleQuery, singleRegion, singleSubRegion, singleCount, singleDryRun]);

  // 개별 미리보기 → DB 저장
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
    }
  }, [singleSource, singleQuery, singleRegion, singleSubRegion, singleCount, singlePreview.length]);

  // 데이터 보강: 식당 목록 로드
  const [enrichRestaurants, setEnrichRestaurants] = useState<any[]>([]);
  const [enrichFilter, setEnrichFilter] = useState("all"); // all, noMenu, noImage, noURL
  const [enrichLoading, setEnrichLoading] = useState(false);

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
        console.log(`[Enrich] 식당 ${list.length}건 로드`);
        setEnrichRestaurants(list);
      } else {
        console.error("식당 목록 응답 오류:", res.status);
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
    if (enrichFilter === "noURL") return !r.restaurantURL || r.restaurantURL === '';
    return true;
  });

  // 보강 크롤링 실행
  const handleEnrich = async (field: string) => {
    if (enriching) return;
    setEnriching(field);
    setEnrichResult(null);

    try {
      const accessToken = localStorage.getItem("accessToken");
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 300000); // 5분 타임아웃
      const res = await fetch(`${API_BASE_URL}/admin/crawler/enrich`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ field, limit: enrichBatchSize }),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      setEnrichResult(data);
      fetchEnrichData(); // 목록 갱신
    } catch (err: any) {
      console.error("보강 크롤링 실패:", err);
      setEnrichResult({ success: false, message: err.name === 'AbortError' ? '타임아웃 (5분 초과). 배치 크기를 줄여주세요.' : `보강 중 오류: ${err.message}` });
    } finally {
      setEnriching(null);
    }
  };

  return (
    <div className="px-8 py-8 space-y-6 w-full">
      {/* 메트릭 그리드 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-blue-600">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">총 등록 식당</p>
          <h3 className="text-3xl font-black tracking-tight text-gray-900">{dbStats.totalRestaurants.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">최근 7일 추가</p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-black tracking-tight text-green-600">+{dbStats.recentAdded.toLocaleString()}</h3>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-orange-500">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">메뉴 보유</p>
          <h3 className="text-3xl font-black tracking-tight text-gray-900">{dbStats.withMenu.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-purple-500">
          <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">이미지 보유</p>
          <h3 className="text-3xl font-black tracking-tight text-gray-900">{dbStats.withImage.toLocaleString()}</h3>
        </div>
      </section>

      {/* 탭 네비게이션 */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab("batch")}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === "batch"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          통합 크롤링
        </button>
        <button
          onClick={() => setActiveTab("single")}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === "single"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          개별 크롤링
        </button>
        <button
          onClick={() => setActiveTab("enrich")}
          className={`px-4 py-2 rounded-md text-xs font-semibold transition-all ${
            activeTab === "enrich"
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          데이터 보강
        </button>
      </div>

      {/* ═══ 통합 크롤링 탭 ═══ */}
      {activeTab === "batch" && (
      <div className="space-y-6">
        {/* 필터 섹션 */}
        <section className="bg-white p-8 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-end gap-8">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500">소스</label>
              <div className="flex gap-2 p-1.5 bg-gray-50 rounded-lg">
                {sources.map((source) => {
                  const colors: Record<string, string> = { kakao: "bg-yellow-100 text-yellow-800", naver: "bg-green-100 text-green-800", siksin: "bg-orange-100 text-orange-800" };
                  const activeColor = colors[source.name] || "bg-blue-100 text-blue-800";
                  return (
                    <button
                      key={source.name}
                      onClick={() => source.ready && toggleSource(source.name)}
                      disabled={!source.ready}
                      className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                        selectedSources.includes(source.name)
                          ? activeColor
                          : source.ready
                          ? "text-gray-400 hover:bg-gray-100"
                          : "text-gray-300 cursor-not-allowed"
                      }`}
                    >
                      {source.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="min-w-[200px] space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500">지역</label>
              <div className="flex gap-1.5">
                <select
                  value={region}
                  onChange={(e) => { setRegion(e.target.value); setSubRegion("전체"); }}
                  className="bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 py-2 px-3"
                >
                  {REGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                {region !== "전체" && (
                  <select
                    value={subRegion}
                    onChange={(e) => setSubRegion(e.target.value)}
                    className="bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 py-2 px-3"
                  >
                    {(SUB_REGIONS[region] || ["전체"]).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-[150px] space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500">키워드</label>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="맛집, 카페, 한식..."
                className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 py-2 px-4"
              />
            </div>
            <div className="w-24 space-y-2">
              <label className="block text-[11px] font-bold uppercase tracking-widest text-gray-500">건수</label>
              <input
                type="number"
                value={countPerSource}
                onChange={(e) => setCountPerSource(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
                min={1} max={100}
                className="w-full bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 py-2 px-4"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <span className="text-xs font-medium text-gray-600">미리보기</span>
              </label>
              <button
                onClick={handleRun}
                disabled={isRunning || selectedSources.length === 0}
                className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 active:scale-95 ${
                  isRunning || selectedSources.length === 0
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : dryRun
                    ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-sm hover:shadow-md"
                    : "bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-sm hover:shadow-md"
                }`}
              >
                {isRunning ? (
                  <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{progress}</>
                ) : (
                  <>{dryRun ? `미리보기 (${selectedSources.length})` : `실행+저장 (${selectedSources.length})`}</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* 결과 영역 */}
        <div className="space-y-6">
          {/* 실행 결과 — 메트릭 그리드 */}
          {result && (
            <section className="space-y-4">
              <div className={`rounded-xl p-4 ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <p className={`text-sm font-semibold ${result.success ? "text-green-700" : "text-red-700"}`}>{result.message}</p>
              </div>
              {result.stats && (
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-600">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">수집</p>
                    <h3 className="text-2xl font-black text-gray-900">{result.stats.totalFetched}</h3>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">저장</p>
                    <h3 className="text-2xl font-black text-green-600">{result.stats.saved}</h3>
                  </div>
                  {result.stats.alreadyInDB != null && (
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">기존</p>
                      <h3 className="text-2xl font-black text-gray-900">{result.stats.alreadyInDB}</h3>
                    </div>
                  )}
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">중복</p>
                    <h3 className="text-2xl font-black text-gray-900">{result.stats.duplicate중복}</h3>
                  </div>
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">좌표 보정</p>
                    <h3 className="text-2xl font-black text-gray-900">{result.stats.coordFixed}</h3>
                  </div>
                  <div className={`bg-white p-4 rounded-xl shadow-sm ${result.stats.failed > 0 ? 'border-l-4 border-red-500' : ''}`}>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1">실패</p>
                    <h3 className={`text-2xl font-black ${result.stats.failed > 0 ? 'text-red-600' : 'text-green-600'}`}>{result.stats.failed}</h3>
                  </div>
                </div>
              )}
              {/* 소스 분포 */}
              {result.stats?.sources && (
                <div className="bg-white p-6 rounded-xl shadow-sm">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-4">소스별 분포</h4>
                  <div className="space-y-3">
                    {Object.entries(result.stats.sources).map(([src, cnt]) => {
                      const pct = result.stats.totalFetched > 0 ? Math.round(((cnt as number) / result.stats.totalFetched) * 100) : 0;
                      const colors: Record<string, string> = { kakao: "bg-yellow-400", naver: "bg-green-500", siksin: "bg-orange-500" };
                      return (
                        <div key={src} className="space-y-1">
                          <div className="flex justify-between text-xs font-semibold uppercase tracking-wider">
                            <span>{src}</span>
                            <span>{cnt as number}건</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div className={`${colors[src] || 'bg-blue-500'} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 미리보기 테이블 */}
          {showPreview && previewData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-6 flex justify-between items-center border-b border-gray-50">
                <div>
                  <h4 className="font-bold tracking-tight">수집 데이터</h4>
                  <p className="text-xs text-gray-400 mt-0.5">{previewData.length}건 수집됨</p>
                </div>
                <button
                  onClick={handleSavePreview}
                  disabled={isRunning}
                  className="bg-gradient-to-br from-blue-600 to-blue-700 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:shadow-md transition-all disabled:from-gray-300 disabled:to-gray-400 active:scale-95"
                >
                  DB 저장
                </button>
              </div>
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">#</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">출처</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">식당명</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">업종</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">주소</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">좌표</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {previewData.map((item, idx) => {
                      const srcColors: Record<string, string> = { kakao: "bg-yellow-100 text-yellow-800", naver: "bg-green-100 text-green-800", siksin: "bg-orange-100 text-orange-800" };
                      return (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                          <td className="px-6 py-3 text-xs font-medium text-gray-400">{idx + 1}</td>
                          <td className="px-6 py-3">
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${srcColors[item._source] || 'bg-gray-100 text-gray-600'}`}>
                              {item._source || '?'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm font-semibold text-gray-900">{item.restaurantName}</td>
                          <td className="px-6 py-3 text-sm text-gray-600">{item.restaurantType}</td>
                          <td className="px-6 py-3 text-sm text-gray-500 max-w-[250px] truncate">{item.restaurantAddr}</td>
                          <td className="px-6 py-3 text-xs font-mono text-gray-400 group-hover:text-blue-600">
                            {item.restaurantLatX && item.restaurantLatY
                              ? `${Number(item.restaurantLatX).toFixed(2)}, ${Number(item.restaurantLatY).toFixed(2)}`
                              : '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 실행 타임라인 */}
          <section className="bg-white p-6 rounded-xl shadow-sm">
            <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-6">실행 기록</h4>
            {logs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">아직 실행 기록이 없습니다.</p>
            ) : (
              <div className="space-y-4 relative">
                <div className="absolute left-[7px] top-2 bottom-2 w-px border-l-2 border-dashed border-gray-200" />
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 relative">
                    <div className={`w-4 h-4 rounded-full mt-1 ring-4 flex-shrink-0 ${
                      log.result.success ? 'bg-blue-600 ring-blue-100' : 'bg-red-500 ring-red-100'
                    }`} />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">{log.region} &quot;{log.query}&quot;</span>
                          {log.sources.map((s) => {
                            const c: Record<string, string> = { kakao: "bg-yellow-100 text-yellow-800", naver: "bg-green-100 text-green-800", siksin: "bg-orange-100 text-orange-800" };
                            return <span key={s} className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${c[s] || 'bg-gray-100 text-gray-600'}`}>{s}</span>;
                          })}
                        </div>
                        <span className="text-[10px] font-mono text-gray-400">{log.time}</span>
                      </div>
                      <p className="text-sm text-gray-500">{log.result.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
      )}

      {/* ═══ 개별 크롤링 (수동) 탭 ═══ */}
      {activeTab === "single" && (
      <div className="space-y-6">
        {/* 소스 카드 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sources.map((source) => {
            const meta = SOURCE_LABELS[source.name] || { color: "gray", bg: "bg-gray-100", text: "text-gray-600" };
            const isSelected = singleSource === source.name;
            return (
              <button
                key={source.name}
                onClick={() => source.ready && setSingleSource(source.name)}
                disabled={!source.ready}
                className={`relative p-5 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-200"
                    : source.ready
                    ? "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                    : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                }`}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${meta.bg} ${meta.text}`}>{source.name.toUpperCase()}</span>
                <h3 className="text-sm font-bold text-gray-900 mt-2">{source.label}</h3>
                {source.ready ? (
                  <span className="text-xs text-green-600 mt-1 block">API 연결됨</span>
                ) : (
                  <span className="text-xs text-red-500 mt-1 block">{source.reason}</span>
                )}
                {source.note && <span className="text-xs text-gray-400 mt-0.5 block">{source.note}</span>}
              </button>
            );
          })}
        </div>

        {/* 선택된 소스의 설정 + 실행 */}
        {singleSource && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 좌측: 설정 */}
            <div className="lg:col-span-1 space-y-5">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${SOURCE_LABELS[singleSource]?.bg || "bg-gray-100"} ${SOURCE_LABELS[singleSource]?.text || "text-gray-600"}`}>{singleSource.toUpperCase()}</span>
                  <h2 className="text-base font-bold text-gray-900">
                    {sources.find((s) => s.name === singleSource)?.label} 크롤링
                  </h2>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">지역</label>
                    <div className="flex gap-2">
                      <select
                        value={singleRegion}
                        onChange={(e) => { setSingleRegion(e.target.value); setSingleSubRegion("전체"); }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {REGION_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <select
                        value={singleSubRegion}
                        onChange={(e) => setSingleSubRegion(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {(SUB_REGIONS[singleRegion] || ["전체"]).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">검색 키워드</label>
                    <input
                      type="text"
                      value={singleQuery}
                      onChange={(e) => setSingleQuery(e.target.value)}
                      placeholder="맛집, 한식, 카페..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">수집 건수</label>
                    <input
                      type="number"
                      value={singleCount}
                      onChange={(e) => setSingleCount(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      min={1}
                      max={100}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={singleDryRun}
                        onChange={(e) => setSingleDryRun(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-700">미리보기</span>
                    </label>
                  </div>

                  <button
                    onClick={handleSingleRun}
                    disabled={singleRunning}
                    className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                      singleRunning
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                        : singleDryRun
                        ? "bg-blue-600 text-white hover:bg-blue-700"
                        : "bg-orange-500 text-white hover:bg-orange-600"
                    }`}
                  >
                    {singleRunning ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {singleProgress}
                      </span>
                    ) : singleDryRun ? (
                      "미리보기 실행"
                    ) : (
                      "크롤링 + DB 저장"
                    )}
                  </button>

                  {!singleDryRun && (
                    <p className="text-xs text-orange-600 text-center">DB에 바로 저장됩니다.</p>
                  )}
                </div>
              </div>
            </div>

            {/* 우측: 결과 */}
            <div className="lg:col-span-2 space-y-6">
              {/* 결과 통계 */}
              {singleResult && (
                <div className={`rounded-xl border p-5 ${singleResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <p className={`text-sm font-medium mb-3 ${singleResult.success ? "text-green-700" : "text-red-700"}`}>
                    {singleResult.message}
                  </p>
                  {singleResult.stats && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-600">{singleResult.stats.totalFetched}</p>
                        <p className="text-xs text-gray-500">수집</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-green-600">{singleResult.stats.saved}</p>
                        <p className="text-xs text-gray-500">저장</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-yellow-600">{singleResult.stats.duplicate중복}</p>
                        <p className="text-xs text-gray-500">중복</p>
                      </div>
                      <div className="bg-white rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-red-600">{singleResult.stats.failed}</p>
                        <p className="text-xs text-gray-500">실패</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* 미리보기 테이블 */}
              {showSinglePreview && singlePreview.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-700">
                        {sources.find((s) => s.name === singleSource)?.label} 수집 결과
                      </h2>
                      <p className="text-xs text-gray-400">{singlePreview.length}건 — 확인 후 저장하세요</p>
                    </div>
                    <button
                      onClick={handleSaveSinglePreview}
                      disabled={singleRunning}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300"
                    >
                      전체 DB 저장
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">식당명</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">업종</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">주소</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">좌표</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">URL</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {singlePreview.map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                            <td className="px-3 py-2 font-medium text-gray-900 max-w-[180px] truncate">{item.restaurantName}</td>
                            <td className="px-3 py-2 text-gray-600">{item.restaurantType}</td>
                            <td className="px-3 py-2 text-gray-500 max-w-[220px] truncate">{item.restaurantAddr}</td>
                            <td className="px-3 py-2 text-gray-400 text-xs">
                              {item.restaurantLatX && item.restaurantLatY
                                ? `${Number(item.restaurantLatX).toFixed(4)}, ${Number(item.restaurantLatY).toFixed(4)}`
                                : "-"}
                            </td>
                            <td className="px-3 py-2 max-w-[100px] truncate">
                              {item.restaurantURL ? (
                                <a href={item.restaurantURL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">
                                  링크
                                </a>
                              ) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 미선택 안내 */}
              {!singleResult && !showSinglePreview && (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                  <span className={`inline-block px-3 py-1 rounded text-sm font-bold ${SOURCE_LABELS[singleSource]?.bg || "bg-gray-100"} ${SOURCE_LABELS[singleSource]?.text || "text-gray-600"}`}>{singleSource.toUpperCase()}</span>
                  <p className="text-gray-500 mt-3">설정을 확인하고 실행 버튼을 눌러주세요.</p>
                  <p className="text-xs text-gray-400 mt-1">미리보기를 먼저 실행하면 저장 전 결과를 확인할 수 있습니다.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 소스 미선택 안내 */}
        {!singleSource && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <svg className="w-10 h-10 text-gray-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
            <p className="text-gray-500 mt-3 text-lg">크롤링할 소스를 선택해주세요</p>
            <p className="text-xs text-gray-400 mt-1">위의 카드에서 하나를 클릭하면 해당 소스의 설정 화면이 표시됩니다.</p>
          </div>
        )}

        {/* 공유 실행 기록 */}
        {logs.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">실행 기록</h2>
            </div>
            <div className="p-4 space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${log.result.success ? "bg-green-500" : "bg-red-500"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-500">{log.time}</span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs font-medium text-gray-700">{log.region} "{log.query}"</span>
                      <span className="text-xs text-gray-400">|</span>
                      {log.sources.map((s) => (
                        <span key={s} className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          s === "kakao" ? "bg-yellow-100 text-yellow-700" :
                          s === "naver" ? "bg-green-100 text-green-700" :
                          s === "siksin" ? "bg-red-100 text-red-700" :
                          "bg-gray-200 text-gray-600"
                        }`}>{s}</span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{log.result.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      )}

      {/* 데이터 보강 탭 */}
      {activeTab === "enrich" && (
      <div className="space-y-6">
        {/* 필터 바 + 보강 버튼 */}
        <section className="bg-white p-8 rounded-xl shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-[11px] font-bold uppercase tracking-widest text-gray-500">필터</label>
              <div className="flex gap-1.5 p-1.5 bg-gray-50 rounded-lg">
                {[
                  { key: "all", label: "전체" },
                  { key: "noMenu", label: "메뉴 없음" },
                  { key: "noImage", label: "이미지 없음" },
                  { key: "noURL", label: "URL 없음" },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setEnrichFilter(f.key)}
                    className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
                      enrichFilter === f.key
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 hover:bg-gray-100"
                    }`}
                  >
                    {f.label}
                    {f.key !== "all" && (
                      <span className="ml-1 opacity-70">
                        ({enrichRestaurants.filter((r: any) =>
                          f.key === "noMenu" ? !r.restaurantMenu :
                          f.key === "noImage" ? !r.restaurantImage :
                          !r.restaurantURL || r.restaurantURL === ''
                        ).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-400 ml-2">{enrichFiltered.length.toLocaleString()}건</span>
            </div>
            <div className="flex items-center gap-2">
              {(enrichFilter === "noMenu" || enrichFilter === "noImage") && (
                <>
                  <select
                    value={enrichBatchSize}
                    onChange={(e) => setEnrichBatchSize(Number(e.target.value))}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5"
                  >
                    <option value={10}>10개</option>
                    <option value={20}>20개</option>
                    <option value={50}>50개</option>
                  </select>
                  <button
                    onClick={() => handleEnrich(enrichFilter === "noMenu" ? "restaurantMenu" : "restaurantImage")}
                    disabled={enriching !== null}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      enriching ? "bg-yellow-100 text-yellow-700 animate-pulse" : "bg-blue-500 text-white hover:bg-blue-600"
                    }`}
                  >
                    {enriching ? "보강 중..." : `식신에서 보강`}
                  </button>
                </>
              )}
              <button onClick={fetchEnrichData} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm font-medium">새로고침</button>
            </div>
          </div>
        </section>

        {/* 보강 결과 */}
        {enrichResult && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className={`p-4 ${enrichResult.success ? "bg-green-50 border-b border-green-200" : "bg-red-50 border-b border-red-200"}`}>
              <p className={`text-sm font-semibold ${enrichResult.success ? "text-green-700" : "text-red-700"}`}>{enrichResult.message}</p>
            </div>
            {enrichResult.results && enrichResult.results.length > 0 && (
              <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">#</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">식당명</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">매칭된 이름</th>
                      <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">결과</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {enrichResult.results.map((r: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-3 text-xs text-gray-400">{i + 1}</td>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900">{r.name}</td>
                        <td className="px-6 py-3 text-sm text-gray-600">{r.matched || '-'}</td>
                        <td className="px-6 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'updated' ? 'bg-green-100 text-green-700' :
                            r.status === 'no_data' ? 'bg-yellow-100 text-yellow-700' :
                            r.status === 'not_found' ? 'bg-gray-100 text-gray-500' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {r.status === 'updated' ? '보강 완료' : r.status === 'no_data' ? '데이터 없음' : r.status === 'not_found' ? '미발견' : '오류'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 식당 테이블 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {enrichLoading ? (
            <p className="text-sm text-gray-400 text-center py-12">식당 목록 로딩 중...</p>
          ) : enrichRestaurants.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400 mb-2">식당 데이터가 없습니다.</p>
              <button onClick={fetchEnrichData} className="text-sm text-blue-600 hover:underline">다시 로드</button>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">#</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">식당명</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">업종</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">주소</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500 text-center">메뉴</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500 text-center">이미지</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500 text-center">URL</th>
                    <th className="px-6 py-3 text-[11px] font-bold uppercase tracking-widest text-gray-500">조회수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {enrichFiltered.slice(0, 200).map((r: any, idx: number) => (
                    <tr key={r.restaurantIdx || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-xs font-medium text-gray-400">{idx + 1}</td>
                      <td className="px-6 py-3 text-sm font-semibold text-gray-900 max-w-[200px] truncate">{r.restaurantName}</td>
                      <td className="px-6 py-3 text-sm text-gray-600 max-w-[120px] truncate">{r.restaurantType}</td>
                      <td className="px-6 py-3 text-sm text-gray-500 max-w-[250px] truncate">{r.restaurantAddr}</td>
                      <td className="px-6 py-3 text-center">
                        {r.restaurantMenu
                          ? <span className="inline-block w-5 h-5 bg-green-100 text-green-600 rounded-full text-xs leading-5 font-bold">O</span>
                          : <span className="inline-block w-5 h-5 bg-red-50 text-red-400 rounded-full text-xs leading-5">X</span>}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {r.restaurantImage
                          ? <span className="inline-block w-5 h-5 bg-green-100 text-green-600 rounded-full text-xs leading-5 font-bold">O</span>
                          : <span className="inline-block w-5 h-5 bg-red-50 text-red-400 rounded-full text-xs leading-5">X</span>}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {r.restaurantURL
                          ? <span className="inline-block w-5 h-5 bg-green-100 text-green-600 rounded-full text-xs leading-5 font-bold">O</span>
                          : <span className="inline-block w-5 h-5 bg-red-50 text-red-400 rounded-full text-xs leading-5">X</span>}
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">{(r.restaurantViewCount || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {enrichFiltered.length > 200 && (
                <p className="text-xs text-gray-400 text-center py-3 bg-gray-50">상위 200개만 표시 (전체 {enrichFiltered.length.toLocaleString()}개)</p>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};

export default RestaurantCrawlerPage;
