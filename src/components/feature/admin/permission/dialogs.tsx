"use client";

/**
 * 확인 / 비밀번호 입력 작은 모달.
 * window.confirm·prompt 대신 쓴다 — 브라우저 기본 대화상자는 스타일을 맞출 수 없고 테스트를 막는다.
 */
import { useState } from "react";
import { Modal, btnOutline, btnPrimary, inputCls, labelCls } from "./Modal";

export function ConfirmModal({
  title,
  message,
  confirmLabel = "확인",
  danger,
  busy,
  onClose,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={busy}>
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={
              danger
                ? "h-[38px] rounded-[10px] bg-[#C23B3B] px-4 text-[13px] font-bold text-white hover:bg-[#A32F2F] disabled:bg-[#AEB5C6]"
                : btnPrimary
            }
          >
            {busy ? "처리 중…" : confirmLabel}
          </button>
        </>
      }
    >
      <p className="whitespace-pre-line text-[13px] leading-relaxed text-[#4A5266] break-keep">{message}</p>
    </Modal>
  );
}

export function PasswordModal({
  userId,
  busy,
  onClose,
  onSubmit,
}: {
  userId: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (pw: string) => void;
}) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    if (pw.length < 4) {
      setError("비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    setError("");
    onSubmit(pw);
  };

  return (
    <Modal
      title="비밀번호 재설정"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={busy}>
            취소
          </button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={busy}>
            {busy ? "변경 중…" : "변경"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <p className="text-[13px] text-[#4A5266]">
          <b className="text-[#151A26]">{userId}</b> 계정의 새 비밀번호를 입력하세요.
        </p>
        <div>
          <label className={labelCls} htmlFor="reset-pw">
            새 비밀번호
          </label>
          <input
            id="reset-pw"
            type="password"
            className={inputCls}
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoComplete="new-password"
            autoFocus
          />
        </div>
        {error && <p className="text-[12.5px] text-[#C23B3B]">{error}</p>}
      </div>
    </Modal>
  );
}
