"use client";

import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, Filler);

interface DashboardOverview {
  totalPosts: number;
  totalCompanies: number;
  reportedPosts: number;
  thisWeekActivity: number;
}

interface OverviewResponse {
  success: boolean;
  data: DashboardOverview;
}

interface MonthlyStats {
  month: string;
  postCount: number;
  companyCount: number;
}

interface MonthlyStatsResponse {
  success: boolean;
  data: MonthlyStats[];
}

interface RecentActivity {
  id: string;
  type: string;
  action: string;
  name: string;
  entityName: string | null;
  timestamp: string;
}

interface RecentActivityResponse {
  success: boolean;
  data: RecentActivity[];
}

interface RecentUser {
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  status: string;
  timestamp: number; // 실제 시간 기록용
}

const AdminMainPage = () => {
  const [overviewData, setOverviewData] = useState<DashboardOverview>({
    totalPosts: 0,
    totalCompanies: 0,
    reportedPosts: 0,
    thisWeekActivity: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyStats[]>([]);
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyLoading, setMonthlyLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  // 개요 통계 조회
  const fetchOverview = async () => {
    setLoading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("https://api.reviewhub.life/admin/dashboard/overview", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const data: OverviewResponse = await response.json();
      
      if (data.success && data.data) {
        setOverviewData(data.data);
      }
    } catch (error) {
      console.error("개요 통계 조회 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  // 월별 통계 조회
  const fetchMonthlyStats = async () => {
    setMonthlyLoading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("https://api.reviewhub.life/admin/dashboard/monthly-stats", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const data: MonthlyStatsResponse = await response.json();
      
      if (data.success && data.data) {
        // 데이터를 날짜순으로 정렬하고 최근 8개월만 표시
        const sortedData = [...data.data].sort((a, b) => b.month.localeCompare(a.month)).slice(0, 8);
        setMonthlyData(sortedData);
      }
    } catch (error) {
      console.error("월별 통계 조회 실패:", error);
    } finally {
      setMonthlyLoading(false);
    }
  };

  // 최근 활동 조회
  const fetchRecentActivities = async () => {
    setActivityLoading(true);
    try {
      const accessToken = localStorage.getItem("accessToken");
      const response = await fetch("https://api.reviewhub.life/admin/dashboard/recent-activities", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const data: RecentActivityResponse = await response.json();
      
      if (data.success && data.data) {
        setRecentActivities(data.data.slice(0, 15)); // 최대 15개 표시
      }
    } catch (error) {
      console.error("최근 활동 조회 실패:", error);
    } finally {
      setActivityLoading(false);
    }
  };

  // 시간을 "방금 전", "N분 전" 형식으로 변환
  const getTimeAgo = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  // localStorage에서 최근 사용자 목록 불러오기 (timestamp 포함 원본)
  const loadRecentUsersRaw = (): RecentUser[] => {
    try {
      const stored = localStorage.getItem("recentUsers");
      if (stored) {
        return JSON.parse(stored) as RecentUser[];
      }
    } catch (error) {
      console.error("최근 사용자 로드 실패:", error);
    }
    return [];
  };

  // localStorage에서 최근 사용자 목록 불러오기 (시간 업데이트된 버전)
  const loadRecentUsers = (): RecentUser[] => {
    const users = loadRecentUsersRaw();
    return users.map(user => ({
      ...user,
      lastLogin: getTimeAgo(user.timestamp)
    }));
  };

  // 현재 사용자를 최근 사용자 목록에 추가
  const addCurrentUserToRecent = () => {
    try {
      const userStr = localStorage.getItem("user");
      if (!userStr) return;

      const user = JSON.parse(userStr);
      const now = Date.now();
      
      // 역할 결정 (username에 따라)
      const role = user.username === "Ori" || user.username === "ori" ? "마스터" : "관리자";
      
      const newUser: RecentUser = {
        name: user.username || "Unknown",
        email: user.email || `${user.username}@seniorschool.com`,
        role: role,
        lastLogin: "방금 전",
        status: "online",
        timestamp: now
      };

      // 기존 목록 불러오기 (timestamp 포함 원본)
      const existingUsers = loadRecentUsersRaw();
      
      // 같은 사용자가 이미 있으면 제거 (중복 제거)
      const filteredUsers = existingUsers.filter(u => u.email !== newUser.email);
      
      // 새 사용자를 맨 앞에 추가
      const updatedUsers = [newUser, ...filteredUsers].slice(0, 10); // 최대 10명만 유지
      
      // localStorage에 저장 (timestamp 포함)
      localStorage.setItem("recentUsers", JSON.stringify(updatedUsers));
      
      // 상태 업데이트 (시간 업데이트된 버전)
      const displayUsers = updatedUsers.map(u => ({
        ...u,
        lastLogin: getTimeAgo(u.timestamp)
      }));
      setRecentUsers(displayUsers.slice(0, 6)); // 화면에는 최대 6명만 표시
    } catch (error) {
      console.error("최근 사용자 추가 실패:", error);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchMonthlyStats();
    fetchRecentActivities();
    
    // 최근 사용자 초기화 및 현재 사용자 추가
    const storedUsers = loadRecentUsers();
    if (storedUsers.length > 0) {
      setRecentUsers(storedUsers.slice(0, 6));
    }
    addCurrentUserToRecent();
  }, []);

  // 주기적으로 시간 업데이트 (1분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      const updatedUsers = loadRecentUsers();
      setRecentUsers(updatedUsers.slice(0, 6));
    }, 60000); // 1분마다 업데이트

    return () => clearInterval(interval);
  }, []);

  // 최대값 계산 (차트 높이 조정용)
  const maxPosts = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.postCount)) : 1;
  const maxCompanies = monthlyData.length > 0 ? Math.max(...monthlyData.map(d => d.companyCount)) : 1;

  // 추가 통계 계산
  // 이번 달 데이터
  const currentMonth = monthlyData[0];
  // 지난 달 데이터
  const lastMonth = monthlyData[1];
  
  // 지난 달 대비 게시글 증감률
  const postGrowthRate = currentMonth && lastMonth && lastMonth.postCount > 0
    ? Math.round(((currentMonth.postCount - lastMonth.postCount) / lastMonth.postCount) * 100)
    : 0;
  
  // 지난 달 대비 업체 증감률
  const companyGrowthRate = currentMonth && lastMonth && lastMonth.companyCount > 0
    ? Math.round(((currentMonth.companyCount - lastMonth.companyCount) / lastMonth.companyCount) * 100)
    : 0;
  
  // 최근 3개월 평균 게시글 수
  const avgPostsLast3Months = monthlyData.length >= 3
    ? Math.round(monthlyData.slice(0, 3).reduce((sum, d) => sum + d.postCount, 0) / 3)
    : 0;
  
  // 최근 3개월 평균 업체 수
  const avgCompaniesLast3Months = monthlyData.length >= 3
    ? Math.round(monthlyData.slice(0, 3).reduce((sum, d) => sum + d.companyCount, 0) / 3)
    : 0;
  
  // 월평균 활동 수 (게시글 + 업체)
  const avgActivityLast3Months = avgPostsLast3Months + avgCompaniesLast3Months;

  return (
    <div className="space-y-6 max-w-[1600px]">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">총 게시글</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? "..." : overviewData.totalPosts.toLocaleString()}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">등록된 업체</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? "..." : overviewData.totalCompanies.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">학교+교회+회사</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-rose-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              {!loading && overviewData.reportedPosts > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 rounded-full">대기중</span>
              )}
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">신고된 게시글</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? "..." : overviewData.reportedPosts.toLocaleString()}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-6 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -translate-y-8 translate-x-8"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">이번 주 활동</p>
            <p className="text-3xl font-bold text-gray-900">{loading ? "..." : overviewData.thisWeekActivity.toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">게시글+업체 등록</p>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 월별 통계 차트 */}
        <div className="bg-white rounded-lg shadow p-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">월별 통계</h3>
              <p className="text-sm text-gray-500 mt-1">게시글 및 업체 등록 추이</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                <span className="text-xs text-gray-600">게시글</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                <span className="text-xs text-gray-600">업체</span>
              </div>
            </div>
          </div>
          <div className="h-72">
            {monthlyLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400">로딩 중...</div>
            ) : (
              <Bar
                data={{
                  labels: [...monthlyData].reverse().map(d => {
                    const parts = d.month.split("-");
                    return parts.length === 2 ? `${parseInt(parts[1])}월` : d.month;
                  }),
                  datasets: [
                    {
                      label: "게시글",
                      data: [...monthlyData].reverse().map(d => d.postCount),
                      backgroundColor: "rgba(99, 102, 241, 0.8)",
                      hoverBackgroundColor: "rgba(99, 102, 241, 1)",
                      borderRadius: 6,
                      borderSkipped: false,
                      barPercentage: 0.6,
                      categoryPercentage: 0.7,
                    },
                    {
                      label: "업체",
                      data: [...monthlyData].reverse().map(d => d.companyCount),
                      backgroundColor: "rgba(16, 185, 129, 0.8)",
                      hoverBackgroundColor: "rgba(16, 185, 129, 1)",
                      borderRadius: 6,
                      borderSkipped: false,
                      barPercentage: 0.6,
                      categoryPercentage: 0.7,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: "index",
                    intersect: false,
                  },
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: "rgba(17, 24, 39, 0.9)",
                      titleFont: { size: 13, weight: "bold" },
                      bodyFont: { size: 12 },
                      padding: 12,
                      cornerRadius: 8,
                      boxPadding: 4,
                      callbacks: {
                        label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y}건`,
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: { display: false },
                      ticks: { color: "#9ca3af", font: { size: 12 } },
                      border: { display: false },
                    },
                    y: {
                      grid: { color: "rgba(243, 244, 246, 1)" },
                      ticks: { color: "#9ca3af", font: { size: 11 }, stepSize: Math.ceil(Math.max(maxPosts, maxCompanies) / 5) },
                      border: { display: false },
                      beginAtZero: true,
                    },
                  },
                }}
              />
            )}
          </div>
          {/* 차트 하단 통계 요약 */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-indigo-600">{monthlyLoading ? "..." : monthlyData[0]?.postCount || 0}</div>
                <div className="text-xs text-gray-500">이번 달 게시글</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-600">{monthlyLoading ? "..." : monthlyData[0]?.companyCount || 0}</div>
                <div className="text-xs text-gray-500">이번 달 업체</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-700">{monthlyLoading ? "..." : (monthlyData[0]?.postCount || 0) + (monthlyData[0]?.companyCount || 0)}</div>
                <div className="text-xs text-gray-500">총 활동</div>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">최근 활동</h3>
              <p className="text-sm text-gray-400 mt-0.5">실시간 업데이트</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <div className="space-y-1 max-h-[420px] overflow-y-auto">
            {activityLoading ? (
              <div className="text-center py-8 text-gray-400">로딩 중...</div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-400">최근 활동이 없습니다.</div>
            ) : (
              recentActivities.map((activity) => {
                const getActivityInfo = (type: string, action: string) => {
                  const typeLabels: Record<string, string> = {
                    church_post: "교회 게시글",
                    school_post: "학교 게시글",
                    company_post: "회사 게시글",
                    restaurant_post: "식당 게시글",
                    outsource_post: "외주 게시글",
                    freeboard_post: "자유게시판",
                    church: "교회",
                    school: "학교",
                    company: "회사",
                    restaurant: "식당",
                    outsource: "외주업체",
                  };

                  const actionLabels: Record<string, string> = {
                    create: "새로 작성",
                    add: "등록",
                    update: "수정",
                    delete: "삭제",
                  };

                  const typeIcons: Record<string, string> = {
                    church_post: "⛪",
                    school_post: "🏫",
                    company_post: "🏢",
                    restaurant_post: "🍽️",
                    outsource_post: "🔧",
                    freeboard_post: "📋",
                    church: "⛪",
                    school: "🏫",
                    company: "🏢",
                    restaurant: "🍽️",
                    outsource: "🔧",
                  };

                  const typeColors: Record<string, string> = {
                    church_post: "bg-purple-100 text-purple-600",
                    school_post: "bg-blue-100 text-blue-600",
                    company_post: "bg-amber-100 text-amber-600",
                    restaurant_post: "bg-orange-100 text-orange-600",
                    outsource_post: "bg-slate-100 text-slate-600",
                    freeboard_post: "bg-indigo-100 text-indigo-600",
                    church: "bg-purple-100 text-purple-600",
                    school: "bg-blue-100 text-blue-600",
                    company: "bg-amber-100 text-amber-600",
                    restaurant: "bg-orange-100 text-orange-600",
                    outsource: "bg-slate-100 text-slate-600",
                  };

                  const actionColors: Record<string, string> = {
                    create: "text-emerald-600",
                    add: "text-emerald-600",
                    update: "text-blue-600",
                    delete: "text-rose-600",
                  };

                  return {
                    typeLabel: typeLabels[type] || type,
                    actionLabel: actionLabels[action] || action,
                    icon: typeIcons[type] || "📌",
                    colorClass: typeColors[type] || "bg-gray-100 text-gray-600",
                    actionColor: actionColors[action] || "text-gray-600",
                  };
                };

                const { typeLabel, actionLabel, icon, colorClass, actionColor } = getActivityInfo(activity.type, activity.action);
                const timeAgo = new Date(activity.timestamp).toLocaleString('ko-KR', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <div key={activity.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm shrink-0 ${colorClass}`}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{typeLabel}</span>
                        <span className={`text-xs font-semibold ${actionColor}`}>{actionLabel}</span>
                      </div>
                      <p className="text-sm text-gray-900 truncate font-medium">{activity.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {activity.entityName && (
                          <span className="text-xs text-gray-400 truncate">@ {activity.entityName}</span>
                        )}
                        <span className="text-xs text-gray-300">{timeAgo}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 최근 사용자 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">최근 사용자</h3>
            <p className="text-sm text-gray-400 mt-0.5">실시간 접속 현황</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-400">Live</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-t border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">이름</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">이메일</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">역할</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">마지막 접속</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500">상태</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">
                    최근 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                recentUsers.map((user, index) => (
                  <tr key={index} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                        user.role === '마스터'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {user.lastLogin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                        <span className="text-xs font-medium text-emerald-600">{user.status}</span>
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 추가 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-emerald-100 text-sm font-medium">이번 달 신규 게시글</p>
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold">
              {monthlyLoading ? "..." : (currentMonth?.postCount || 0).toLocaleString()}
              <span className="text-lg font-normal ml-1">개</span>
            </p>
            {postGrowthRate !== 0 && (
              <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${postGrowthRate > 0 ? 'bg-white/20' : 'bg-red-400/30'}`}>
                {postGrowthRate > 0 ? '↑' : '↓'} {Math.abs(postGrowthRate)}%
                <span className="text-white/70">지난 달 대비</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-amber-100 text-sm font-medium">이번 달 신규 업체</p>
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold">
              {monthlyLoading ? "..." : (currentMonth?.companyCount || 0).toLocaleString()}
              <span className="text-lg font-normal ml-1">건</span>
            </p>
            {companyGrowthRate !== 0 && (
              <div className={`inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${companyGrowthRate > 0 ? 'bg-white/20' : 'bg-red-400/30'}`}>
                {companyGrowthRate > 0 ? '↑' : '↓'} {Math.abs(companyGrowthRate)}%
                <span className="text-white/70">지난 달 대비</span>
              </div>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-500/20">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12"></div>
          <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-8 -translate-x-8"></div>
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <p className="text-indigo-100 text-sm font-medium">최근 3개월 평균 활동</p>
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-bold">
              {monthlyLoading ? "..." : avgActivityLast3Months.toLocaleString()}
              <span className="text-lg font-normal ml-1">건</span>
            </p>
            <p className="text-xs text-white/60 mt-2">월평균 게시글+업체</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMainPage;
