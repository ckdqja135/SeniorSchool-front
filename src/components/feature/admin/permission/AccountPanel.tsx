"use client";

/**
 * '계정 목록' 패널.
 *
 * 등급 선택은 한 칸이다 — 권한 그룹 select 에 master 그룹도 들어가고,
 * master 를 고르면 백엔드가 userRole='master' 로, 그 외는 admin + 해당 그룹으로 바꾼다.
 */
import { useState } from "react";
import { C, fmtDateTime, MASTER_CODE, type AdminRow, type GroupRow } from "./shared";

const GRID = "grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.1fr)_80px_minmax(0,1fr)_200px] gap-2.5";

export function AccountPanel({
  admins,
  groups,
  currentCode,
  loading,
  busyIdx,
  onChangeGroup,
  onToggleStatus,
  onResetPassword,
  onDelete,
  onAdd,
}: {
  admins: AdminRow[];
  groups: GroupRow[];
  currentCode: string | null;
  loading: boolean;
  busyIdx: number | null;
  onChangeGroup: (user: AdminRow, groupIdx: number) => void;
  onToggleStatus: (user: AdminRow) => void;
  onResetPassword: (user: AdminRow) => void;
  onDelete: (user: AdminRow) => void;
  onAdd: () => void;
}) {
  // 선택한 권한 소속만 볼지, 전체를 볼지
  const [onlyCurrent, setOnlyCurrent] = useState(true);

  const rows =
    onlyCurrent && currentCode
      ? admins.filter((u) =>
          currentCode === MASTER_CODE ? u.userRole === MASTER_CODE : u.groupCode === currentCode,
        )
      : admins;

  const noGroup = admins.filter((u) => u.groupCode === null && u.userRole !== MASTER_CODE).length;

  return (
    <section className="flex w-full min-w-0 flex-col overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F5] px-[22px] py-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[16px] font-extrabold">계정 목록</h2>
          <span className="text-[13px] text-[#8A91A3]">{rows.length}명</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-[#5A6275]">
            <input
              type="checkbox"
              checked={onlyCurrent}
              onChange={(e) => setOnlyCurrent(e.target.checked)}
              className="h-[16px] w-[16px] cursor-pointer accent-[#1552D6]"
            />
            선택한 권한만
          </label>
          <button
            type="button"
            onClick={onAdd}
            className="h-[38px] rounded-[10px] bg-[#1552D6] px-4 text-[12.5px] font-bold text-white hover:bg-[#0E3FAA]"
          >
            + 계정 추가
          </button>
        </div>
      </div>

      {noGroup > 0 && (
        <p className="border-b border-[#EEF0F5] bg-[#FDEBE1] px-[22px] py-2.5 text-[13px] text-[#B4461A] break-keep">
          권한 그룹이 없는 계정 {noGroup}명이 있습니다. 로그인해도 메뉴가 비어 보입니다.
        </p>
      )}

      <div className="overflow-x-auto">
        <div className="min-w-[680px]">
          <div className={`${GRID} border-b border-[#EEF0F5] bg-[#FAFBFD] px-[22px] py-2.5 text-[11.5px] font-bold text-[#7A8296]`}>
            <span>아이디</span>
            <span>권한 그룹</span>
            <span>상태</span>
            <span>마지막 로그인</span>
            <span>작업</span>
          </div>

          <div className="max-h-[560px] overflow-y-auto">
            {loading && admins.length === 0 ? (
              <p className="px-[22px] py-12 text-center text-[14px] text-[#8A91A3]">불러오는 중…</p>
            ) : rows.length === 0 ? (
              <p className="px-[22px] py-12 text-center text-[14px] text-[#8A91A3]">해당하는 계정이 없습니다.</p>
            ) : (
              rows.map((u) => {
                const active = u.userStatus === 1;
                const busy = busyIdx === u.userIdx;
                const selected = u.userRole === MASTER_CODE
                  ? groups.find((g) => g.groupCode === MASTER_CODE)?.groupIdx
                  : (u.groupIdx ?? undefined);
                return (
                  <div
                    key={u.userIdx}
                    className={`${GRID} items-center border-b border-[#F2F3F7] px-[22px] py-[11px] text-[12.5px] hover:bg-[#FAFBFD]`}
                  >
                    <span className="min-w-0 truncate font-bold text-[#151A26]" title={u.userId}>
                      {u.userId}
                      {u.userRole === MASTER_CODE && (
                        <span className="ml-1.5 rounded-[5px] bg-[#E8EFFE] px-1.5 py-[1px] text-[10.5px] font-extrabold text-[#1552D6]">
                          master
                        </span>
                      )}
                    </span>

                    <select
                      value={selected ?? ""}
                      disabled={busy}
                      onChange={(e) => onChangeGroup(u, Number(e.target.value))}
                      className="h-[32px] w-full cursor-pointer rounded-[8px] border border-[#DDE1EA] bg-white px-2 text-[12.5px] text-[#151A26] focus:border-[#1552D6] focus:outline-none disabled:opacity-50"
                      aria-label={`${u.userId} 권한 그룹`}
                    >
                      {selected === undefined && <option value="">그룹 없음</option>}
                      {groups.map((g) => (
                        <option key={g.groupIdx} value={g.groupIdx}>
                          {g.groupName}
                        </option>
                      ))}
                    </select>

                    <span
                      className="w-fit whitespace-nowrap rounded-full px-2 py-[2px] text-[12px] font-bold"
                      style={{
                        color: active ? C.okFg : C.badFg,
                        background: active ? C.okBg : C.badBg,
                      }}
                    >
                      {active ? "활성" : "비활성"}
                    </span>

                    <span className="tabular-nums text-[#5A6275]">{fmtDateTime(u.lastLogin)}</span>

                    <span className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggleStatus(u)}
                        disabled={busy}
                        className="rounded-[7px] border border-[#DDE1EA] px-2 py-[3px] text-[11.5px] font-semibold text-[#5A6275] hover:bg-[#F6F7FA] disabled:opacity-40"
                      >
                        {active ? "비활성화" : "활성화"}
                      </button>
                      <button
                        type="button"
                        onClick={() => onResetPassword(u)}
                        disabled={busy}
                        className="rounded-[7px] border border-[#DDE1EA] px-2 py-[3px] text-[11.5px] font-semibold text-[#5A6275] hover:bg-[#F6F7FA] disabled:opacity-40"
                      >
                        비밀번호
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(u)}
                        disabled={busy}
                        className="rounded-[7px] px-2 py-[3px] text-[11.5px] font-semibold text-[#C23B3B] hover:bg-[#FDECEC] disabled:opacity-40"
                      >
                        삭제
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
