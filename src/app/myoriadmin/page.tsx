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
  id: number;
  type: string;
  action: string;
  name: string;
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
        setRecentActivities(data.data.slice(0, 6)); // 최대 6개만 표시
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
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stats-card bg-white rounded-lg shadow p-6 animate-fade-in-up" style={{ animationDelay: '0ms' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg animate-pulse-slow">
              <span className="text-xl">📝</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">총 게시글</h3>
              <p className="text-2xl font-bold text-green-600">{loading ? "..." : overviewData.totalPosts.toLocaleString()}</p>
              <p className="text-sm text-green-600">게시글 수</p>
            </div>
          </div>
        </div>

        <div className="stats-card bg-white rounded-lg shadow p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg animate-pulse-slow">
              <span className="text-xl">🎓</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">등록된 업체</h3>
              <p className="text-2xl font-bold text-yellow-600">{loading ? "..." : overviewData.totalCompanies.toLocaleString()}</p>
              <p className="text-sm text-green-600">학교+교회+회사, 등</p>
            </div>
          </div>
        </div>

        <div className="stats-card bg-white rounded-lg shadow p-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg animate-pulse-slow">
              <span className="text-xl">🚨</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">신고된 게시글</h3>
              <p className="text-2xl font-bold text-red-600">{loading ? "..." : overviewData.reportedPosts.toLocaleString()}</p>
              <p className="text-sm text-red-600">처리 대기 중</p>
            </div>
          </div>
        </div>

        <div className="stats-card bg-white rounded-lg shadow p-6 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg animate-pulse-slow">
              <span className="text-xl">📊</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">이번 주 활동</h3>
              <p className="text-2xl font-bold text-blue-600">{loading ? "..." : overviewData.thisWeekActivity.toLocaleString()}</p>
              <p className="text-sm text-blue-600">게시글+업체 등록</p>
            </div>
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
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">최근 활동</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {activityLoading ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-gray-500">최근 활동이 없습니다.</div>
            ) : (
              recentActivities.map((activity) => {
                // 타입에 따른 아이콘과 액션 텍스트 설정
                const getActivityInfo = (type: string, action: string) => {
                  const icons: Record<string, string> = {
                    church: "⛪",
                    school: "🏫",
                    company: "🏢",
                    restaurant: "🍽️",
                    outsource: "🔧",
                    post: "📝",
                    board: "📋"
                  };
                  
                  const actions: Record<string, string> = {
                    add: "등록됨",
                    update: "수정됨",
                    delete: "삭제됨",
                    create: "작성됨"
                  };
                  
                  return {
                    icon: icons[type] || "📌",
                    actionText: actions[action] || action
                  };
                };
                
                const { icon, actionText } = getActivityInfo(activity.type, activity.action);
                const timeAgo = new Date(activity.timestamp).toLocaleString('ko-KR', {
                  year: 'numeric',
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                
                return (
                  <div key={activity.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg bg-blue-500">
                      {icon}
                    </div>
                    <div className="ml-3 flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="font-semibold text-blue-600">{activity.name}</span> {actionText}
                      </p>
                      <p className="text-xs text-gray-500">{timeAgo}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 최근 사용자 테이블 */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">최근 사용자</h3>
          <p className="text-sm text-gray-600 mt-1">실시간 접속 현황</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  이메일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  역할
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  마지막 접속
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    최근 사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                recentUsers.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.role === '마스터' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLogin}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="flex items-center">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                        <span className="text-sm text-green-600">{user.status}</span>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">이번 달 신규 게시글</p>
              <p className="text-2xl font-bold">
                {monthlyLoading ? "..." : (currentMonth?.postCount || 0).toLocaleString()}개
              </p>
              {postGrowthRate !== 0 && (
                <p className={`text-xs mt-1 ${postGrowthRate > 0 ? 'text-green-200' : 'text-red-200'}`}>
                  {postGrowthRate > 0 ? '↑' : '↓'} {Math.abs(postGrowthRate)}% (지난 달 대비)
                </p>
              )}
            </div>
            <div className="text-3xl">📝</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">이번 달 신규 업체</p>
              <p className="text-2xl font-bold">
                {monthlyLoading ? "..." : (currentMonth?.companyCount || 0).toLocaleString()}건
              </p>
              {companyGrowthRate !== 0 && (
                <p className={`text-xs mt-1 ${companyGrowthRate > 0 ? 'text-yellow-200' : 'text-red-200'}`}>
                  {companyGrowthRate > 0 ? '↑' : '↓'} {Math.abs(companyGrowthRate)}% (지난 달 대비)
                </p>
              )}
            </div>
            <div className="text-3xl">🏫</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">최근 3개월 평균 활동</p>
              <p className="text-2xl font-bold">
                {monthlyLoading ? "..." : avgActivityLast3Months.toLocaleString()}건
              </p>
              <p className="text-xs text-blue-200 mt-1">월평균 게시글+업체</p>
            </div>
            <div className="text-3xl">📊</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMainPage;
