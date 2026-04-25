"use client";

import React, { useState, useEffect } from "react";

interface PathStat {
  pvPath: string;
  count: string;
}

interface DailyStat {
  date: string;
  count: string;
}

interface RefererStat {
  pvReferer: string;
  count: string;
}

interface LogEntry {
  pvIdx: number;
  pvPath: string;
  pvIp: string;
  pvUserAgent: string;
  pvReferer: string;
  createdAt: string;
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL;

const AnalyticsPage = () => {
  const [tab, setTab] = useState<"chart" | "logs">("chart");
  const [leftTab, setLeftTab] = useState<"path" | "referer">("path");
  const [pathStats, setPathStats] = useState<PathStat[]>([]);
  const [refererStats, setRefererStats] = useState<RefererStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [pathFilter, setPathFilter] = useState("");
  const [sortOrder, setSortOrder] = useState<"DESC" | "ASC">("DESC");

  const getToken = () => localStorage.getItem("accessToken");

  const applyPreset = (preset: "today" | "week" | "month" | "all") => {
    const now = new Date();
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    if (preset === "today") {
      setStartDate(today); setEndDate(today);
    } else if (preset === "week") {
      const mon = new Date(now);
      mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
      setStartDate(fmt(mon)); setEndDate(today);
    } else if (preset === "month") {
      setStartDate(fmt(new Date(now.getFullYear(), now.getMonth(), 1))); setEndDate(today);
    } else {
      setStartDate(""); setEndDate("");
    }
  };

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const [pathRes, dailyRes, refererRes] = await Promise.all([
        fetch(`${BASE_URL}/admin/pageview/path-stats?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${BASE_URL}/admin/pageview/daily-stats?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${BASE_URL}/admin/pageview/referer-stats?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const pathData = await pathRes.json();
      const dailyData = await dailyRes.json();
      const refererData = await refererRes.json();
      if (pathData.success) setPathStats(pathData.data);
      if (dailyData.success) setDailyStats(dailyData.data);
      if (refererData.success) setRefererStats(refererData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (page = 1, order = sortOrder) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), rowsPerPage: "30", order });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      if (pathFilter) params.set("path", pathFilter);

      const res = await fetch(`${BASE_URL}/admin/pageview/logs?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) {
        setLogs(data.data);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages);
        setCurrentPage(data.currentPage);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "chart") fetchStats();
    else { fetchLogs(1); fetchStats(); }
  }, [tab]);

  const handleSearch = () => {
    if (tab === "chart") fetchStats();
    else fetchLogs(1);
  };

  const handleSortChange = (order: "DESC" | "ASC") => {
    setSortOrder(order);
    fetchLogs(1, order);
  };

  const totalVisits = dailyStats.reduce((sum, d) => sum + parseInt(d.count), 0);
  const maxCount = Math.max(...pathStats.map((p) => parseInt(p.count)), 1);
  const maxDay = Math.max(...dailyStats.map((x) => parseInt(x.count)), 1);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">접속 경로 분석</h1>
            <p className="text-xs text-gray-400 mt-0.5">ori.blue 사이트 방문 기록</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {(["today", "week", "month", "all"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-gray-500 hover:bg-white hover:text-indigo-600 hover:shadow-sm"
                >
                  {{ today: "오늘", week: "이번 주", month: "이번 달", all: "전체" }[p]}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <span className="text-xs text-gray-400">~</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              조회
            </button>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab("chart")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === "chart" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            방문 통계
          </button>
          <button
            onClick={() => setTab("logs")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === "logs" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            방문자 로그
          </button>
        </div>
      </div>

      {tab === "chart" ? (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* 일별 방문 수 차트 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800">일별 방문 수</h2>
              <span className="text-xs text-gray-400">총 <span className="font-semibold text-indigo-600">{totalVisits.toLocaleString()}</span>회</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-56 text-sm text-gray-400">로딩 중...</div>
            ) : dailyStats.length === 0 ? (
              <div className="flex items-center justify-center h-56 text-sm text-gray-400">데이터 없음</div>
            ) : (
              <div className="overflow-x-auto">
                <div style={{ minWidth: `${dailyStats.length * 44}px` }}>
                  <div className="flex items-end gap-2 h-56">
                    {dailyStats.map((d) => {
                      const height = Math.max((parseInt(d.count) / maxDay) * 100, 3);
                      return (
                        <div key={d.date} className="flex flex-col items-center justify-end flex-1 min-w-[32px] max-w-[60px] h-full group">
                          <span className="text-[11px] text-indigo-500 font-semibold mb-1 opacity-0 group-hover:opacity-100 transition-opacity">{d.count}</span>
                          <div
                            className="w-full bg-indigo-400 rounded-t-md hover:bg-indigo-500 transition-colors cursor-default"
                            style={{ height: `${height}%` }}
                            title={`${d.date}: ${d.count}회`}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2 mt-2 border-t border-gray-100 pt-2">
                    {dailyStats.map((d) => (
                      <div key={d.date} className="flex-1 min-w-[32px] max-w-[60px] text-center">
                        <span className="text-[10px] text-gray-400">{d.date.slice(5)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* 좌: 인기 경로 / Referer 탭 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 w-[30%] shrink-0 flex flex-col min-h-0">
            {/* 탭 */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4 shrink-0">
              <button
                onClick={() => setLeftTab("path")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${leftTab === "path" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                인기 경로
              </button>
              <button
                onClick={() => setLeftTab("referer")}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${leftTab === "referer" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                인기 Referer
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {leftTab === "path" ? (
                pathStats.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-10">데이터 없음</div>
                ) : (
                  <div className="space-y-3">
                    {pathStats.map((p, i) => (
                      <div key={p.pvPath} className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-700 truncate font-mono">{decodeURIComponent(p.pvPath)}</span>
                            <span className="text-xs font-semibold text-indigo-600 ml-3 shrink-0">{parseInt(p.count).toLocaleString()}회</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5">
                            <div className="bg-indigo-400 h-1.5 rounded-full" style={{ width: `${(parseInt(p.count) / maxCount) * 100}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                refererStats.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-10">데이터 없음</div>
                ) : (
                  <div className="space-y-3">
                    {refererStats.map((r, i) => {
                      const maxRef = Math.max(...refererStats.map((x) => parseInt(x.count)), 1);
                      let label = r.pvReferer;
                      try {
                        const u = new URL(r.pvReferer);
                        label = u.pathname && u.pathname !== "/" ? u.hostname + u.pathname : u.hostname;
                      } catch {}
                      return (
                        <div key={r.pvReferer} className="flex items-center gap-3">
                          <span className="text-xs text-gray-400 w-5 text-right shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-gray-700 truncate" title={r.pvReferer}>{label}</span>
                              <span className="text-xs font-semibold text-indigo-600 ml-3 shrink-0">{parseInt(r.count).toLocaleString()}회</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className="bg-purple-400 h-1.5 rounded-full" style={{ width: `${(parseInt(r.count) / maxRef) * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>

          {/* 우: 방문자 로그 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex-1 flex flex-col min-h-0">
          {/* 로그 필터 & 정렬 */}
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              placeholder="경로 검색 (예: /church-mentor)"
              value={pathFilter}
              onChange={(e) => setPathFilter(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchLogs(1)}
              className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              onClick={() => fetchLogs(1)}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              검색
            </button>
            {/* 정렬 토글 */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 shrink-0">
              <button
                onClick={() => handleSortChange("DESC")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${sortOrder === "DESC" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                최신순
              </button>
              <button
                onClick={() => handleSortChange("ASC")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${sortOrder === "ASC" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
              >
                과거순
              </button>
            </div>
            <span className="text-xs text-gray-400 shrink-0">총 {totalCount.toLocaleString()}건</span>
          </div>

          {/* 로그 테이블 */}
          <div className="flex-1 overflow-auto border border-gray-100 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 text-left text-gray-500 font-semibold whitespace-nowrap">시간</th>
                  <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">경로</th>
                  <th className="px-3 py-2.5 text-left text-gray-500 font-semibold whitespace-nowrap">IP</th>
                  <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">Referer</th>
                  <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">User-Agent</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-400">로딩 중...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={5} className="px-3 py-10 text-center text-gray-400">데이터 없음</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.pvIdx} className="border-t border-gray-50 hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-indigo-600">{log.pvPath}</td>
                      <td className="px-3 py-2.5 text-gray-500 whitespace-nowrap">{log.pvIp || "-"}</td>
                      <td className="px-3 py-2.5 text-gray-400 truncate max-w-[150px]">{log.pvReferer || "-"}</td>
                      <td className="px-3 py-2.5 text-gray-400 truncate max-w-[200px]">{log.pvUserAgent || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <button onClick={() => fetchLogs(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">이전</button>
            <span className="text-xs text-gray-500">{currentPage} / {totalPages}</span>
            <button onClick={() => fetchLogs(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors">다음</button>
          </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
