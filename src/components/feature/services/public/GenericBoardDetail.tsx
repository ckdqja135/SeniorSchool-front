'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ServiceConfig, DynamicBoard } from '@/types/Services';
import { fetchBoardDetail, toggleBoardLike } from '@/lib/services/dynamicBoardAPI';

interface GenericBoardDetailProps {
  config: ServiceConfig;
  boardId: number;
}

const GenericBoardDetail: React.FC<GenericBoardDetailProps> = ({ config, boardId }) => {
  const router = useRouter();

  const [board, setBoard] = useState<DynamicBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLiking, setIsLiking] = useState(false);

  // Fetch board detail
  const loadBoard = useCallback(async () => {
    if (!config.serviceSlug || !boardId) return;
    setLoading(true);
    setError(null);

    try {
      const data = await fetchBoardDetail(config.serviceSlug, boardId);
      setBoard(data);
    } catch (err) {
      console.error('게시글 상세 조회 오류:', err);
      setError(err instanceof Error ? err.message : '게시글을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [config.serviceSlug, boardId]);

  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

  // Handle like toggle
  const handleLike = async () => {
    if (!board || isLiking) return;
    setIsLiking(true);

    try {
      const result = await toggleBoardLike(config.serviceSlug, board.boardIdx);
      if (result.success) {
        setBoard((prev) =>
          prev ? { ...prev, boardLike: result.likes } : prev
        );
      }
    } catch (err) {
      console.error('좋아요 토글 실패:', err);
    } finally {
      setIsLiking(false);
    }
  };

  // Format date to readable string
  const formatDate = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hour = date.getHours();
    const minute = date.getMinutes();
    const ampm = hour < 12 ? '오전' : '오후';
    const displayHour = hour % 12 || 12;
    return `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')} ${ampm} ${displayHour}:${String(minute).padStart(2, '0')}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
            style={{ borderColor: config.serviceColor }}
          />
          <p className="mt-4 text-gray-600">게시글을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">오류가 발생했습니다</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => loadBoard()}
              className="px-5 py-2 text-white rounded-lg transition-colors hover:opacity-90"
              style={{ backgroundColor: config.serviceColor }}
            >
              다시 시도
            </button>
            <button
              onClick={() => router.back()}
              className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              돌아가기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Board not found
  if (!board) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">게시글을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-6">요청하신 게시글이 존재하지 않거나 삭제되었습니다.</p>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 text-white rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: config.serviceColor }}
          >
            돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-6"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span className="font-medium">돌아가기</span>
        </button>

        {/* Board content card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-gray-100">
            {/* Entity name badge */}
            {board.entityName && (
              <div className="mb-3">
                <span
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: config.serviceColor }}
                >
                  {board.entityName}
                </span>
              </div>
            )}

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {board.boardTitle}
            </h1>

            {/* Meta info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {board.boardId}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(board.boardRegDate)}
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                조회 {board.boardHits}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div
              className="prose prose-sm max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap"
              style={{ wordBreak: 'break-all', overflowWrap: 'break-word' }}
            >
              {board.boardContent}
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              {/* Like button */}
              <button
                onClick={handleLike}
                disabled={isLiking}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all duration-200 ${
                  isLiking
                    ? 'opacity-50 cursor-not-allowed border-gray-200 text-gray-400'
                    : 'border-gray-200 text-gray-600 hover:border-red-300 hover:text-red-500 hover:bg-red-50'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill={board.boardLike > 0 ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
                <span className="text-sm font-medium">
                  좋아요 {board.boardLike}
                </span>
              </button>

              {/* Comment count if available */}
              {board.commentCount !== undefined && (
                <span className="flex items-center gap-1.5 text-sm text-gray-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  댓글 {board.commentCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenericBoardDetail;
