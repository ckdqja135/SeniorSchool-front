'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ServiceConfig,
  EntityFieldConfig,
  DynamicEntity,
  ListParams,
} from '@/types/Services';
import {
  adminSearchEntities,
  createEntity,
  updateEntity,
  deleteEntity,
} from '@/lib/services/dynamicEntityAPI';

interface GenericEntityTableProps {
  config: ServiceConfig;
  slug: string;
}

const LIMIT = 10;

const GenericEntityTable: React.FC<GenericEntityTableProps> = ({ config, slug }) => {
  // --- State ---
  const [entities, setEntities] = useState<DynamicEntity[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<DynamicEntity | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Derive visible columns from config
  const listFields: EntityFieldConfig[] = (config.fields ?? [])
    .filter((f) => f.showInList)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // --- Data fetching ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ListParams = { page, limit: LIMIT };
      if (keyword) params.keyword = keyword;
      const res = await adminSearchEntities(slug, params);
      setEntities(res.data ?? []);
      setTotalCount(res.totalCount ?? 0);
    } catch (err: any) {
      setError(err?.message ?? '데이터를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [slug, page, keyword]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Search ---
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setKeyword(searchInput.trim());
  };

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(totalCount / LIMIT));

  // --- Modal helpers ---
  const buildEmptyForm = (): Record<string, any> => {
    const data: Record<string, any> = {};
    config.fields.forEach((f) => {
      data[f.fieldKey] = f.fieldType === 'number' ? '' : '';
    });
    return data;
  };

  const openAddModal = () => {
    setEditingEntity(null);
    setFormData(buildEmptyForm());
    setModalOpen(true);
  };

  const openEditModal = (entity: DynamicEntity) => {
    setEditingEntity(entity);
    const data: Record<string, any> = {};
    config.fields.forEach((f) => {
      data[f.fieldKey] = entity[f.fieldKey] ?? '';
    });
    setFormData(data);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingEntity(null);
    setFormData({});
  };

  // --- Form input change ---
  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  // --- Submit (create / update) ---
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      if (editingEntity) {
        await updateEntity(slug, editingEntity.entityIdx, formData);
      } else {
        await createEntity(slug, formData);
      }
      closeModal();
      await fetchData();
    } catch (err: any) {
      setError(err?.message ?? '저장에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  // --- Delete ---
  const handleDelete = async (id: number) => {
    setDeleting(true);
    setError(null);
    try {
      await deleteEntity(slug, id);
      setDeleteConfirmId(null);
      await fetchData();
    } catch (err: any) {
      setError(err?.message ?? '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  // --- Render helpers ---
  const renderInputForField = (field: EntityFieldConfig) => {
    const value = formData[field.fieldKey] ?? '';

    const baseClass =
      'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition';

    switch (field.fieldType) {
      case 'textarea':
        return (
          <textarea
            className={`${baseClass} min-h-[80px] resize-y`}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
            placeholder={field.fieldLabel}
            required={field.isRequired}
          />
        );
      case 'number':
        return (
          <input
            type="number"
            className={baseClass}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
            placeholder={field.fieldLabel}
            required={field.isRequired}
          />
        );
      case 'date':
        return (
          <input
            type="date"
            className={baseClass}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
            required={field.isRequired}
          />
        );
      case 'url':
        return (
          <input
            type="url"
            className={baseClass}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
            placeholder="https://"
            required={field.isRequired}
          />
        );
      case 'text':
      default:
        return (
          <input
            type="text"
            className={baseClass}
            value={value}
            onChange={(e) => handleFieldChange(field.fieldKey, e.target.value)}
            placeholder={field.fieldLabel}
            required={field.isRequired}
          />
        );
    }
  };

  const renderCellValue = (entity: DynamicEntity, field: EntityFieldConfig) => {
    const value = entity[field.fieldKey];
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400">-</span>;
    }

    switch (field.fieldType) {
      case 'url':
        return (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline truncate block max-w-[200px]"
            title={value}
          >
            {value}
          </a>
        );
      case 'date':
        return <span>{new Date(value).toLocaleDateString('ko-KR')}</span>;
      case 'image':
        return (
          <img
            src={value}
            alt=""
            className="w-10 h-10 rounded object-cover"
          />
        );
      case 'rating':
        return <span className="text-yellow-500">{'★'.repeat(Math.min(Number(value), 5))}</span>;
      default:
        return (
          <span className="truncate block max-w-[200px]" title={String(value)}>
            {String(value)}
          </span>
        );
    }
  };

  // --- Render ---
  return (
    <div className="w-full">
      {/* Header area */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 max-w-md">
          <input
            type="text"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
            placeholder="검색어를 입력하세요"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition"
          >
            검색
          </button>
        </form>

        {/* Add button */}
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          추가
        </button>
      </div>

      {/* Total count */}
      <div className="mb-3 text-sm text-gray-500">
        총 <span className="font-semibold text-gray-900">{totalCount}</span>건
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700">No</th>
              {listFields.map((field) => (
                <th
                  key={field.fieldIdx}
                  className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700"
                >
                  {field.fieldLabel}
                </th>
              ))}
              <th className="whitespace-nowrap px-4 py-3 font-semibold text-gray-700 text-center">
                관리
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={listFields.length + 2}
                  className="px-4 py-16 text-center"
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg
                      className="w-8 h-8 animate-spin text-blue-500"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    <span className="text-sm text-gray-500">불러오는 중...</span>
                  </div>
                </td>
              </tr>
            ) : entities.length === 0 ? (
              <tr>
                <td
                  colSpan={listFields.length + 2}
                  className="px-4 py-16 text-center text-gray-400"
                >
                  데이터가 없습니다.
                </td>
              </tr>
            ) : (
              entities.map((entity, idx) => (
                <tr
                  key={entity.entityIdx}
                  className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-gray-500">
                    {(page - 1) * LIMIT + idx + 1}
                  </td>
                  {listFields.map((field) => (
                    <td key={field.fieldIdx} className="px-4 py-3">
                      {renderCellValue(entity, field)}
                    </td>
                  ))}
                  <td className="whitespace-nowrap px-4 py-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(entity)}
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 transition"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(entity.entityIdx)}
                        className="rounded-md px-2.5 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 transition"
                      >
                        삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            이전
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((p) => {
              // Show first, last, current and neighbors
              if (p === 1 || p === totalPages) return true;
              if (Math.abs(p - page) <= 2) return true;
              return false;
            })
            .reduce<(number | 'ellipsis')[]>((acc, p, i, arr) => {
              if (i > 0 && p - (arr[i - 1] as number) > 1) {
                acc.push('ellipsis');
              }
              acc.push(p);
              return acc;
            }, [])
            .map((item, idx) =>
              item === 'ellipsis' ? (
                <span key={`e-${idx}`} className="px-2 text-gray-400">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  onClick={() => setPage(item as number)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                    page === item
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item}
                </button>
              )
            )}

          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            다음
          </button>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteConfirmId !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !deleting && setDeleteConfirmId(null)}
        >
          <div
            className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">삭제 확인</h3>
            <p className="text-sm text-gray-600 mb-6">
              정말 이 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                disabled={deleting}
                onClick={() => setDeleteConfirmId(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-40"
              >
                취소
              </button>
              <button
                disabled={deleting}
                onClick={() => handleDelete(deleteConfirmId)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => !submitting && closeModal()}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-6">
              {editingEntity ? '항목 수정' : '새 항목 추가'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              {config.fields
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((field) => (
                  <div key={field.fieldIdx}>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      {field.fieldLabel}
                      {field.isRequired && (
                        <span className="ml-0.5 text-red-500">*</span>
                      )}
                    </label>
                    {renderInputForField(field)}
                  </div>
                ))}

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={closeModal}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-40"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition disabled:opacity-60"
                >
                  {submitting
                    ? '저장 중...'
                    : editingEntity
                    ? '수정'
                    : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GenericEntityTable;
