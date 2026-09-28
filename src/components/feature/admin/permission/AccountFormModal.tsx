"use client";

/**
 * 계정 추가 모달.
 *
 * 권한 그룹 선택 한 칸이 등급까지 정한다 — master 그룹을 고르면 최고 권한으로 만들어진다.
 */
import { useState } from "react";
import { Modal, btnOutline, btnPrimary, inputCls, labelCls } from "./Modal";
import { MASTER_CODE, type GroupRow } from "./shared";

export function AccountFormModal({
  groups,
  saving,
  onClose,
  onSubmit,
}: {
  groups: GroupRow[];
  saving: boolean;
  onClose: () => void;
  onSubmit: (v: { userId: string; userPw: string; groupIdx: number }) => void;
}) {
  const defaultGroup = groups.find((g) => g.groupCode === "admin") ?? groups[0];
  const [userId, setUserId] = useState("");
  const [userPw, setUserPw] = useState("");
  const [groupIdx, setGroupIdx] = useState<number | undefined>(defaultGroup?.groupIdx);
  const [error, setError] = useState("");

  const picked = groups.find((g) => g.groupIdx === groupIdx);

  const submit = () => {
    const id = userId.trim();
    if (!id) {
      setError("아이디를 입력해주세요.");
      return;
    }
    if (userPw.length < 4) {
      setError("비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    if (groupIdx === undefined) {
      setError("권한 그룹을 선택해주세요.");
      return;
    }
    setError("");
    onSubmit({ userId: id, userPw, groupIdx });
  };

  return (
    <Modal
      title="계정 추가"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>
            취소
          </button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={saving}>
            {saving ? "추가 중…" : "추가"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3.5">
        <div>
          <label className={labelCls} htmlFor="acc-id">
            아이디
          </label>
          <input
            id="acc-id"
            className={inputCls}
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            autoComplete="off"
            autoFocus
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="acc-pw">
            비밀번호
          </label>
          <input
            id="acc-pw"
            type="password"
            className={inputCls}
            value={userPw}
            onChange={(e) => setUserPw(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="acc-group">
            권한 그룹
          </label>
          <select
            id="acc-group"
            className={`${inputCls} cursor-pointer`}
            value={groupIdx ?? ""}
            onChange={(e) => setGroupIdx(Number(e.target.value))}
          >
            {groups.map((g) => (
              <option key={g.groupIdx} value={g.groupIdx}>
                {g.groupName}
              </option>
            ))}
          </select>
          {picked?.groupCode === MASTER_CODE && (
            <p className="mt-1.5 text-[11.5px] text-[#B4461A] break-keep">
              최고 관리자로 만들어집니다. 모든 메뉴와 권한 관리 화면을 쓸 수 있습니다.
            </p>
          )}
        </div>

        {error && <p className="text-[12.5px] text-[#C23B3B]">{error}</p>}
      </div>
    </Modal>
  );
}
