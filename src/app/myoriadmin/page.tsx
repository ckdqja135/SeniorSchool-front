"use client";

import React from "react";

const AdminMainPage = () => {
  // 월별 통계 데이터 (게시글과 학교만)
  const monthlyData = [
    { month: "1월", posts: 45, schools: 8 },
    { month: "2월", posts: 67, schools: 12 },
    { month: "3월", posts: 89, schools: 15 },
    { month: "4월", posts: 112, schools: 18 },
    { month: "5월", posts: 145, schools: 22 },
    { month: "6월", posts: 178, schools: 25 },
    { month: "7월", posts: 201, schools: 28 },
    { month: "8월", posts: 234, schools: 31 }
  ];

  // 최근 사용자 데이터 (testAdmin, Ori 계정 반복)
  const recentUsers = [
    { name: "testAdmin", email: "testadmin@seniorschool.com", role: "관리자", lastLogin: "방금 전", status: "online" },
    { name: "Ori", email: "ori@seniorschool.com", role: "마스터", lastLogin: "2분 전", status: "online" },
    { name: "testAdmin", email: "testadmin@seniorschool.com", role: "관리자", lastLogin: "5분 전", status: "online" },
    { name: "Ori", email: "ori@seniorschool.com", role: "마스터", lastLogin: "8분 전", status: "online" },
    { name: "testAdmin", email: "testadmin@seniorschool.com", role: "관리자", lastLogin: "12분 전", status: "online" },
    { name: "Ori", email: "ori@seniorschool.com", role: "마스터", lastLogin: "15분 전", status: "online" }
  ];

  // 최근 활동 데이터 (학교 관련 활동)
  const recentActivities = [
    { type: "school_update", school: "서울대학교", action: "학교 정보 업데이트", time: "방금 전", icon: "🏫" },
    { type: "post_create", school: "연세대학교", action: "게시글 작성", time: "3분 전", icon: "📝" },
    { type: "school_update", school: "고려대학교", action: "학교 정보 업데이트", time: "7분 전", icon: "🏫" },
    { type: "post_create", school: "성균관대학교", action: "게시글 작성", time: "12분 전", icon: "📝" },
    { type: "school_update", school: "한양대학교", action: "학교 정보 업데이트", time: "18분 전", icon: "🏫" },
    { type: "post_create", school: "중앙대학교", action: "게시글 작성", time: "25분 전", icon: "📝" }
  ];

  // 최대값 계산 (차트 높이 조정용)
  const maxPosts = Math.max(...monthlyData.map(d => d.posts));
  const maxSchools = Math.max(...monthlyData.map(d => d.schools));

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
              <p className="text-2xl font-bold text-green-600">366</p>
              <p className="text-sm text-green-600">+8% 이번 달</p>
            </div>
          </div>
        </div>

        <div className="stats-card bg-white rounded-lg shadow p-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="flex items-center">
            <div className="p-3 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-lg animate-pulse-slow">
              <span className="text-xl">🎓</span>
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold text-gray-800">등록된 학교</h3>
              <p className="text-2xl font-bold text-yellow-600">43</p>
              <p className="text-sm text-green-600">+3 이번 달</p>
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
              <p className="text-2xl font-bold text-red-600">12</p>
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
              <p className="text-2xl font-bold text-blue-600">89</p>
              <p className="text-sm text-blue-600">게시글 + 학교 업데이트</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 월별 통계 차트 */}
        <div className="bg-white rounded-lg shadow p-6 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <h3 className="text-lg font-semibold text-gray-800 mb-4 gradient-text">월별 통계</h3>
          <div className="h-64 flex items-end justify-between gap-2 relative">
            {/* Y축 라벨 */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-400 pr-2">
              <span>{Math.ceil(maxSchools / 4 * 4)}</span>
              <span>{Math.ceil(maxSchools / 4 * 3)}</span>
              <span>{Math.ceil(maxSchools / 4 * 2)}</span>
              <span>{Math.ceil(maxSchools / 4 * 1)}</span>
              <span>0</span>
            </div>
            
            {/* 그리드 라인 */}
            <div className="absolute left-8 right-0 top-0 h-full flex flex-col justify-between">
              {[0, 1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="border-t border-gray-100 chart-grid-line" 
                  style={{ '--grid-index': i } as React.CSSProperties}
                ></div>
              ))}
            </div>
            
            {monthlyData.map((data, index) => (
              <div key={index} className="flex-1 flex flex-col items-center relative group">
                {/* 게시글 수 차트 - 그라데이션과 그림자 */}
                <div className="w-full bg-gradient-to-b from-green-50 to-green-100 rounded-t-lg relative group/post">
                  <div 
                    className="bg-gradient-to-t from-green-600 to-green-500 rounded-t-lg transition-all duration-700 ease-out hover:from-green-700 hover:to-green-600 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    style={{ 
                      height: `${Math.max((data.posts / maxPosts) * 120, 4)}px`,
                      animationDelay: `${index * 100}ms`
                    }}
                  >
                    {/* 차트 내부 패턴 */}
                    <div className="w-full h-full bg-gradient-to-b from-transparent via-green-400/20 to-transparent rounded-t-lg"></div>
                  </div>
                  
                  {/* 호버 툴팁 */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover/post:opacity-100 transition-all duration-300 pointer-events-none z-10 shadow-lg">
                    <div className="text-center">
                      <div className="font-semibold">{data.posts}개</div>
                      <div className="text-green-300">게시글</div>
                    </div>
                    {/* 툴팁 화살표 */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
                
                {/* 학교 수 차트 - 그라데이션과 그림자 */}
                <div className="w-full bg-gradient-to-b from-yellow-50 to-yellow-100 rounded-t-lg relative group/school mt-1">
                  <div 
                    className="bg-gradient-to-t from-yellow-600 to-yellow-500 rounded-t-lg transition-all duration-700 ease-out hover:from-yellow-700 hover:to-yellow-600 transform hover:scale-105 shadow-lg hover:shadow-xl"
                    style={{ 
                      height: `${Math.max((data.schools / maxSchools) * 80, 4)}px`,
                      animationDelay: `${index * 100 + 50}ms`
                    }}
                  >
                    {/* 차트 내부 패턴 */}
                    <div className="w-full h-full bg-gradient-to-b from-transparent via-yellow-400/20 to-transparent rounded-t-lg"></div>
                  </div>
                  
                  {/* 호버 툴팁 */}
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-3 py-2 rounded-lg opacity-0 group-hover/school:opacity-100 transition-all duration-300 pointer-events-none z-10 shadow-lg">
                    <div className="text-center">
                      <div className="font-semibold">{data.schools}건</div>
                      <div className="text-yellow-300">학교</div>
                    </div>
                    {/* 툴팁 화살표 */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
                
                {/* 월 라벨 */}
                <span className="text-xs text-gray-600 mt-3 text-center font-medium group-hover:text-gray-800 transition-colors">
                  {data.month}
                </span>
                
                {/* 월별 총계 표시 */}
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-lg text-xs text-gray-700 whitespace-nowrap">
                    총 {data.posts + data.schools}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* 차트 범례 - 더 예쁘게 */}
          <div className="flex items-center justify-center gap-8 mt-8">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-md"></div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">게시글</span>
                <span className="text-xs text-gray-500">월별 작성 수</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow-md"></div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-800">학교</span>
                <span className="text-xs text-gray-500">월별 등록 수</span>
              </div>
            </div>
          </div>
          
          {/* 차트 하단 통계 요약 */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{monthlyData[monthlyData.length - 1].posts}</div>
                <div className="text-xs text-gray-500">이번 달 게시글</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{monthlyData[monthlyData.length - 1].schools}</div>
                <div className="text-xs text-gray-500">이번 달 학교</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{monthlyData[monthlyData.length - 1].posts + monthlyData[monthlyData.length - 1].schools}</div>
                <div className="text-xs text-gray-500">총 활동</div>
              </div>
            </div>
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">최근 활동</h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-lg ${
                  activity.type === 'school_update' ? 'bg-blue-500' : 'bg-green-500'
                }`}>
                  {activity.icon}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-900">
                    <span className="font-semibold text-blue-600">{activity.school}</span> {activity.action}
                  </p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
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
              {recentUsers.map((user, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                        {user.name === 'testAdmin' ? 'T' : 'O'}
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 추가 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">이번 주 신규 게시글</p>
              <p className="text-2xl font-bold">47개</p>
            </div>
            <div className="text-3xl">📈</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm">이번 주 학교 업데이트</p>
              <p className="text-2xl font-bold">12건</p>
            </div>
            <div className="text-3xl">🏫</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm">처리 대기 신고</p>
              <p className="text-2xl font-bold">8건</p>
            </div>
            <div className="text-3xl">⚠️</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMainPage;
