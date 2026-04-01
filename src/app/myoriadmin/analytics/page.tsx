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
  const [tab, setTab] = useState<"stats" | "logs">("stats");
  const [pathStats, setPathStats] = useState<PathStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pathFilter, setPathFilter] = useState("");

  const getToken = () => localStorage.getItem("accessToken");

  const fetchStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      const [pathRes, dailyRes] = await Promise.all([
        fetch(`${BASE_URL}/admin/pageview/path-stats?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
        fetch(`${BASE_URL}/admin/pageview/daily-stats?${params}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        }),
      ]);

      const pathData = await pathRes.json();
      const dailyData = await dailyRes.json();

      if (pathData.success) setPathStats(pathData.data);
      if (dailyData.success) setDailyStats(dailyData.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), rowsPerPage: "30" });
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
    if (tab === "stats") fetchStats();
    else fetchLogs(1);
  }, [tab]);

  const handleSearch = () => {
    if (tab === "stats") fetchStats();
    else fetchLogs(1);
  };

  const totalVisits = dailyStats.reduce((sum, d) => sum + parseInt(d.count), 0);
  const maxCount = Math.max(...pathStats.map((p) => parseInt(p.count)), 1);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 헤더 */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-gray-900">접속 경로 분석</h1>
            <p className="text-xs text-gray-400 mt-0.5">ori.blue 사이트 방문 기록</p>
          </div>
          <div className="flex items-center gap-2">
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
            onClick={() => setTab("stats")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === "stats" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            통계
          </button>
          <button
            onClick={() => setTab("logs")}
            className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors ${tab === "logs" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
          >
            상세 로그
          </button>
        </div>
      </div>

      {tab === "stats" ? (
        <div className="flex gap-4 flex-1 min-h-0">
          {/* 일별 방문 수 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800">일별 방문 수</h2>
              <span className="text-xs text-gray-400">총 {totalVisits.toLocaleString()}회</span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400">로딩 중...</div>
            ) : dailyStats.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-sm text-gray-400">데이터 없음</div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-1 h-40 min-w-0">
                  {dailyStats.map((d) => {
                    const maxDay = Math.max(...dailyStats.map((x) => parseInt(x.count)), 1);
                    const height = Math.max((parseInt(d.count) / maxDay) * 100, 4);
                    return (
                      <div key={d.date} className="flex flex-col items-center gap-1 flex-1 min-w-[28px]" title={`${d.date}: ${d.count}회`}>
                        <span className="text-[9px] text-gray-400">{d.count}</span>
                        <div
                          className="w-full bg-indigo-400 rounded-t-sm hover:bg-indigo-500 transition-colors cursor-default"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[9px] text-gray-400 rotate-0">{d.date.slice(5)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 경로별 방문 횟수 */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 w-96 overflow-y-auto">
            <h2 className="text-sm font-semibold text-gray-800 mb-4">인기 경로 TOP 20</h2>
            {loading ? (
              <div className="text-sm text-gray-400 text-center py-10">로딩 중...</div>
            ) : pathStats.length === 0 ? (
              <div className="text-sm text-gray-400 text-center py-10">데이터 없음</div>
            ) : (
              <div className="space-y-2">
                {pathStats.map((p, i) => (
                  <div key={p.pvPath} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-700 truncate font-mono">{p.pvPath}</span>
                        <span className="text-xs font-semibold text-indigo-600 ml-2 shrink-0">{parseInt(p.count).toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className="bg-indigo-400 h-1.5 rounded-full"
                          style={{ width: `${(parseInt(p.count) / maxCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex-1 flex flex-col min-h-0">
          {/* 로그 필터 */}
          <div className="flex gap-2 mb-4">
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
            <span className="text-xs text-gray-400 self-center">총 {totalCount.toLocaleString()}건</span>
          </div>

          {/* 로그 테이블 */}
          <div className="flex-1 overflow-auto border border-gray-100 rounded-xl">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">시간</th>
                  <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">경로</th>
                  <th className="px-3 py-2.5 text-left text-gray-500 font-semibold">IP</th>
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
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" })}
                      </td>
                      <td className="px-3 py-2 font-mono text-indigo-600">{log.pvPath}</td>
                      <td className="px-3 py-2 text-gray-500">{log.pvIp || "-"}</td>
                      <td className="px-3 py-2 text-gray-400 truncate max-w-[150px]">{log.pvReferer || "-"}</td>
                      <td className="px-3 py-2 text-gray-400 truncate max-w-[200px]">{log.pvUserAgent || "-"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 페이지네이션 */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <button onClick={() => fetchLogs(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">이전</button>
            <span className="text-xs text-gray-500">{currentPage} / {totalPages}</span>
            <button onClick={() => fetchLogs(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50">다음</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
