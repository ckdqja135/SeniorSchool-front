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
  duplicateSkipped: number;
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
  "서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종",
  "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주",
];

// 정적 소스 정의 (API 무관하게 항상 표시)
const STATIC_SOURCES: { name: string; label: string; desc: string; envKey: string; bg: string; text: string; border: string }[] = [
  { name: "kakao", label: "카카오", desc: "Kakao Local API (카테고리 + 키워드)", envKey: "KAKAO_REST_API_KEY", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-300" },
  { name: "naver", label: "네이버", desc: "Naver 지역 검색 API", envKey: "NAVER_CLIENT_ID / SECRET", bg: "bg-green-50", text: "text-green-700", border: "border-green-300" },
  { name: "siksin", label: "식신", desc: "웹 크롤링 (API 키 불필요)", envKey: "", bg: "bg-red-50", text: "text-red-700", border: "border-red-300" },
];

const SOURCE_LABELS: Record<string, { color: string; bg: string; text: string }> = {
  kakao: { color: "yellow", bg: "bg-yellow-100", text: "text-yellow-700" },
  naver: { color: "green", bg: "bg-green-100", text: "text-green-700" },
  siksin: { color: "red", bg: "bg-red-100", text: "text-red-700" },
};

const RestaurantCrawlerPage: React.FC = () => {
  // 탭 상태
  const [activeTab, setActiveTab] = useState<"batch" | "single">("batch");

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
  const [singleCount, setSingleCount] = useState(10);
  const [singleDryRun, setSingleDryRun] = useState(true);
  const [singleRunning, setSingleRunning] = useState(false);
  const [singleProgress, setSingleProgress] = useState("");
  const [singleResult, setSingleResult] = useState<CrawlResult | null>(null);
  const [singlePreview, setSinglePreview] = useState<any[]>([]);
  const [showSinglePreview, setShowSinglePreview] = useState(false);

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
          region,
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
          region,
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
  }, [selectedSources, query, region, countPerSource, dryRun]);

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
          region,
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
  }, [selectedSources, query, region, countPerSource, previewData.length]);

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
      const params = new URLSearchParams({
        query: singleQuery,
        region: singleRegion,
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
          region: singleRegion,
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
  }, [singleSource, singleQuery, singleRegion, singleCount, singleDryRun]);

  // 개별 미리보기 → DB 저장
  const handleSaveSinglePreview = useCallback(async () => {
    if (!window.confirm(`${singlePreview.length}건을 DB에 저장하시겠습니까?`)) return;

    setSingleRunning(true);
    setSingleProgress("DB 저장 중...");

    try {
      const accessToken = localStorage.getItem("accessToken");
      const params = new URLSearchParams({
        query: singleQuery,
        region: singleRegion,
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
  }, [singleSource, singleQuery, singleRegion, singleCount, singlePreview.length]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">맛집 크롤러 관리</h1>
        <p className="text-gray-500 mt-1">맛집 데이터를 수집합니다.</p>
      </div>

      {/* DB 현황 - 항상 표시 */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{dbStats.totalRestaurants.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">총 등록 식당</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-green-600">+{dbStats.recentAdded.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">최근 7일 추가</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-orange-600">{dbStats.withMenu.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">메뉴 보유</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{dbStats.withImage.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">이미지 보유</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{dbStats.withRating.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">평점 보유</p>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("batch")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "batch"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          통합 크롤링
        </button>
        <button
          onClick={() => setActiveTab("single")}
          className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all ${
            activeTab === "single"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          개별 크롤링 (수동)
        </button>
      </div>

      {/* ═══ 통합 크롤링 탭 ═══ */}
      {activeTab === "batch" && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 좌측: 설정 패널 */}
        <div className="lg:col-span-1 space-y-6">
          {/* 소스 선택 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">크롤링 소스</h2>
            <div className="space-y-2">
              {sources.map((source) => (
                <label
                  key={source.name}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedSources.includes(source.name)
                      ? "border-blue-400 bg-blue-50"
                      : source.ready
                      ? "border-gray-200 hover:border-gray-300"
                      : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSources.includes(source.name)}
                    onChange={() => source.ready && toggleSource(source.name)}
                    disabled={!source.ready}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">{source.label}</span>
                      {source.ready ? (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">사용 가능</span>
                      ) : (
                        <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">미설정</span>
                      )}
                    </div>
                    {!source.ready && source.reason && (
                      <p className="text-xs text-red-500 mt-0.5">{source.reason}</p>
                    )}
                    {source.note && (
                      <p className="text-xs text-gray-400 mt-0.5">{source.note}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 검색 옵션 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">검색 옵션</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">지역</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {REGION_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">검색 키워드</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="맛집, 카페, 한식..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">소스당 수집 건수</label>
                <input
                  type="number"
                  value={countPerSource}
                  onChange={(e) => setCountPerSource(Math.max(1, Math.min(100, parseInt(e.target.value) || 10)))}
                  min={1}
                  max={100}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">최대 100건/소스</p>
              </div>
            </div>
          </div>

          {/* 실행 버튼 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">미리보기 모드</span>
              </label>
              <span className="text-xs text-gray-400">(DB 저장 없이 결과만 확인)</span>
            </div>

            <button
              onClick={handleRun}
              disabled={isRunning || selectedSources.length === 0}
              className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                isRunning || selectedSources.length === 0
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : dryRun
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "bg-orange-500 text-white hover:bg-orange-600"
              }`}
            >
              {isRunning ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {progress}
                </span>
              ) : dryRun ? (
                `미리보기 실행 (${selectedSources.length}개 소스)`
              ) : (
                `크롤링 실행 + DB 저장 (${selectedSources.length}개 소스)`
              )}
            </button>

            {!dryRun && (
              <p className="text-xs text-orange-600 text-center">DB에 바로 저장됩니다. 미리보기를 먼저 권장합니다.</p>
            )}
          </div>
        </div>

        {/* 우측: 결과 패널 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 실행 결과 */}
          {result && (
            <div className={`rounded-xl border p-5 ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
              <h2 className="text-sm font-semibold text-gray-700 mb-3">실행 결과</h2>
              <p className={`text-sm font-medium mb-3 ${result.success ? "text-green-700" : "text-red-700"}`}>
                {result.message}
              </p>

              {result.stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-600">{result.stats.totalFetched}</p>
                    <p className="text-xs text-gray-500">총 수집</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">{result.stats.saved}</p>
                    <p className="text-xs text-gray-500">DB 저장</p>
                  </div>
                  {result.stats.alreadyInDB != null && (
                    <div className="bg-white rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-600">{result.stats.alreadyInDB}</p>
                      <p className="text-xs text-gray-500">기존 데이터</p>
                    </div>
                  )}
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">{result.stats.duplicateSkipped}</p>
                    <p className="text-xs text-gray-500">중복 스킵</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{result.stats.coordFixed}</p>
                    <p className="text-xs text-gray-500">좌표 보정</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600">{result.stats.failed}</p>
                    <p className="text-xs text-gray-500">실패</p>
                  </div>
                  {result.stats.sources && (
                    <div className="bg-white rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">소스별 수집</p>
                      {Object.entries(result.stats.sources).map(([src, cnt]) => (
                        <p key={src} className="text-xs text-gray-700">
                          <span className="font-medium">{src}</span>: {cnt}건
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 미리보기 테이블 */}
          {showPreview && previewData.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-gray-700">미리보기 데이터</h2>
                  <p className="text-xs text-gray-400">{previewData.length}건 수집됨 - 확인 후 저장하세요</p>
                </div>
                <button
                  onClick={handleSavePreview}
                  disabled={isRunning}
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
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">출처</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">식당명</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">업종</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">주소</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">평점</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">좌표</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium ${
                            item._source === 'kakao' ? 'bg-yellow-100 text-yellow-700' :
                            item._source === 'naver' ? 'bg-green-100 text-green-700' :
                            item._source === 'siksin' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {item._source || '?'}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium text-gray-900 max-w-[200px] truncate">{item.restaurantName}</td>
                        <td className="px-3 py-2 text-gray-600">{item.restaurantType}</td>
                        <td className="px-3 py-2 text-gray-500 max-w-[250px] truncate">{item.restaurantAddr}</td>
                        <td className="px-3 py-2 text-gray-600">{item.restaurantRating || '-'}</td>
                        <td className="px-3 py-2 text-gray-400 text-xs">
                          {item.restaurantLatX && item.restaurantLatY
                            ? `${Number(item.restaurantLatX).toFixed(4)}, ${Number(item.restaurantLatY).toFixed(4)}`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 실행 로그 */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-700">실행 기록</h2>
            </div>
            <div className="p-4">
              {logs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">아직 실행 기록이 없습니다.</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${log.result.success ? 'bg-green-500' : 'bg-red-500'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-gray-500">{log.time}</span>
                          <span className="text-xs text-gray-400">|</span>
                          <span className="text-xs font-medium text-gray-700">{log.region} "{log.query}"</span>
                          <span className="text-xs text-gray-400">|</span>
                          {log.sources.map((s) => (
                            <span key={s} className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{s}</span>
                          ))}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{log.result.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
                    <select
                      value={singleRegion}
                      onChange={(e) => setSingleRegion(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {REGION_OPTIONS.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
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
                        <p className="text-2xl font-bold text-yellow-600">{singleResult.stats.duplicateSkipped}</p>
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
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">평점</th>
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
                            <td className="px-3 py-2 text-gray-600">{item.restaurantRating || "-"}</td>
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
    </div>
  );
};

export default RestaurantCrawlerPage;
