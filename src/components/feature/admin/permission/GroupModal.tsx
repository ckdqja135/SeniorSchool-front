"use client";

/**
 * 권한 관리 모달 — 권한 추가 / 이름 변경 / 삭제.
 *
 * master·admin 은 붙박이라 이름 변경·삭제를 막는다(백엔드도 거부한다).
 * 권한을 삭제하면 소속 계정은 '그룹 없음'이 되어 메뉴가 비어 보인다 — 확인 문구로 알린다.
 */
import { useState } from "react";
import { Modal, btnOutline, btnPrimary, inputCls, labelCls } from "./Modal";
import type { GroupRow } from "./shared";

export function GroupModal({
  groups,
  busy,
  onClose,
  onCreate,
  onRename,
  onDelete,
}: {
  groups: GroupRow[];
  busy: boolean;
  onClose: () => void;
  onCreate: (groupName: string) => void;
  onRename: (group: GroupRow, groupName: string) => void;
  onDelete: (group: GroupRow) => void;
}) {
  const [newName, setNewName] = useState("");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState("");

  const create = () => {
    const name = newName.trim();
    if (!name) {
      setError("권한명을 입력해주세요.");
      return;
    }
    setError("");
    setNewName("");
    onCreate(name);
  };

  const commitRename = (g: GroupRow) => {
    const name = editName.trim();
    if (!name) {
      setError("권한명을 입력해주세요.");
      return;
    }
    setError("");
    setEditIdx(null);
    if (name !== g.groupName) onRename(g, name);
  };

  return (
    <Modal
      title="권한 관리"
      onClose={onClose}
      width="w-[440px]"
      footer={
        <button type="button" className={btnOutline} onClick={onClose}>
          닫기
        </button>
      }
    >
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelCls} htmlFor="group-name">
            권한 추가
          </label>
          <div className="flex gap-2">
            <input
              id="group-name"
              className={inputCls}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              placeholder="예: 운영팀"
            />
            <button type="button" className={`${btnPrimary} shrink-0`} onClick={create} disabled={busy}>
              추가
            </button>
          </div>
          <p className="mt-1.5 text-[11.5px] text-[#AEB5C6] break-keep">
            새 권한은 아무 메뉴도 켜지지 않은 상태로 시작합니다. 추가 후 메뉴를 골라 저장하세요.
          </p>
        </div>

        <div>
          <span className={labelCls}>권한 목록</span>
          <ul className="max-h-64 overflow-y-auto rounded-[10px] border border-[#E6E9F0]">
            {groups.map((g) => (
              <li
                key={g.groupIdx}
                className="flex items-center gap-2 border-b border-[#F2F3F7] px-3 py-2.5 last:border-b-0"
              >
                {editIdx === g.groupIdx ? (
                  <>
                    <input
                      className={`${inputCls} h-[32px] flex-1`}
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && commitRename(g)}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => commitRename(g)}
                      className="shrink-0 rounded-[7px] bg-[#1552D6] px-2.5 py-1 text-[11.5px] font-bold text-white"
                    >
                      확인
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditIdx(null)}
                      className="shrink-0 rounded-[7px] border border-[#DDE1EA] px-2.5 py-1 text-[11.5px] font-semibold text-[#5A6275]"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <span className="shrink-0 rounded-[6px] bg-[#F1F3F8] px-1.5 py-[2px] font-mono text-[11px] text-[#5A6275]">
                      {g.groupCode}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#151A26]">
                      {g.groupName}
                      <span className="ml-1.5 text-[11.5px] font-normal text-[#AEB5C6]">{g.userCount}명</span>
                    </span>
                    {g.isBuiltIn ? (
                      <span className="shrink-0 text-[11px] text-[#AEB5C6]">기본 권한</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setEditIdx(g.groupIdx);
                            setEditName(g.groupName);
                          }}
                          className="shrink-0 rounded-[7px] border border-[#DDE1EA] px-2 py-1 text-[11.5px] font-semibold text-[#5A6275] hover:bg-[#F6F7FA]"
                        >
                          이름 변경
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(g)}
                          disabled={busy}
                          className="shrink-0 rounded-[7px] px-2 py-1 text-[11.5px] font-semibold text-[#C23B3B] hover:bg-[#FDECEC] disabled:opacity-40"
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </>
                )}
              </li>
            ))}
            {groups.length === 0 && (
              <li className="px-3 py-6 text-center text-[13px] text-[#8A91A3]">등록된 권한이 없습니다.</li>
            )}
          </ul>
        </div>

        {error && <p className="text-[12.5px] text-[#C23B3B]">{error}</p>}
      </div>
    </Modal>
  );
}
