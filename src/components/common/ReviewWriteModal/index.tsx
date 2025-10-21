'use client';

import { useState } from 'react';
import { FreeBoardPost } from '@/types';

interface ReviewWriteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (review: Omit<FreeBoardPost, 'boardIdx' | 'boardRegDate' | 'boardLike' | 'boardHits'>) => void;
}

export default function ReviewWriteModal({ isOpen, onClose, onSubmit }: ReviewWriteModalProps) {
  const [formData, setFormData] = useState({
    boardTitle: '',
    boardContent: '',
    boardID: '',
    category: '',
    tags: [] as string[],
    boardPassword: '',
  });
  const [tagInput, setTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.boardTitle.trim() || !formData.boardContent.trim() || !formData.category.trim() || !formData.boardPassword.trim()) {
      alert('제목, 내용, 카테고리, 비밀번호를 모두 입력해주세요.');
      return;
    }

    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        boardID: formData.boardID || '익명',
      });
      
      // 폼 초기화
      setFormData({
        boardTitle: '',
        boardContent: '',
        boardID: '',
        category: '',
        tags: [],
        boardPassword: '',
      });
      setTagInput('');
      onClose();
    } catch (error) {
      console.error('리뷰 작성 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim()) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* 배경 오버레이 */}
        <div 
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* 모달 */}
        <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">리뷰 작성</h2>
                <p className="text-sm text-gray-500">경험을 공유해주세요</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 폼 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 제목 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 *
              </label>
              <input
                type="text"
                value={formData.boardTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, boardTitle: e.target.value }))}
                placeholder="리뷰 제목을 입력해주세요"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                maxLength={100}
              />
            </div>

            {/* 카테고리 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                카테고리 * <span className="text-xs text-gray-500">(10자 이내)</span>
              </label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                placeholder="예: 맛집, 카페, 쇼핑, 여행 등"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                maxLength={10}
              />
              <div className="mt-1 text-xs text-gray-500">
                {formData.category.length}/10자
              </div>
            </div>

            {/* 내용 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용 *
              </label>
              <textarea
                value={formData.boardContent}
                onChange={(e) => setFormData(prev => ({ ...prev, boardContent: e.target.value }))}
                placeholder="경험을 자세히 작성해주세요"
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                maxLength={2000}
              />
              <div className="text-right text-sm text-gray-500 mt-1">
                {formData.boardContent.length}/2000
              </div>
            </div>

            {/* 작성자 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                작성자
              </label>
              <input
                type="text"
                value={formData.boardID}
                onChange={(e) => setFormData(prev => ({ ...prev, boardID: e.target.value }))}
                placeholder="닉네임을 입력해주세요 (선택사항)"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                maxLength={20}
              />
            </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호 * <span className="text-xs text-gray-500">(게시글 수정/삭제용, 4~20자)</span>
            </label>
            <input
              type="password"
              value={formData.boardPassword}
              onChange={(e) => setFormData(prev => ({ ...prev, boardPassword: e.target.value }))}
              placeholder="수정/삭제 시 사용할 비밀번호를 입력해주세요"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              minLength={4}
              maxLength={20}
              required
            />
          </div>

            {/* 태그 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                태그 (최대 5개)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="태그를 입력하고 Enter를 누르세요"
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || formData.tags.includes(tagInput.trim()) || formData.tags.length >= 5}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  추가
                </button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-800 text-sm rounded-full"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-indigo-600 hover:text-indigo-800"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* 버튼 */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isSubmitting ? '작성 중...' : '리뷰 작성'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
