"use client";

/** 권한 관리 화면 모달 공용 껍데기. 배경 클릭·Esc 로 닫힌다. */
import { useEffect } from "react";

export function Modal({
  title,
  onClose,
  children,
  footer,
  width = "w-[380px]",
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`flex max-h-[86vh] w-full max-w-full flex-col overflow-hidden rounded-[14px] bg-white shadow-2xl sm:${width}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-[#EEF0F5] px-4 py-2.5">
          <h3 className="text-[14px] font-extrabold text-[#151A26]">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-[8px] px-1.5 py-0.5 text-[13px] leading-none text-[#8A91A3] hover:bg-[#F6F7FA]"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3.5">{children}</div>

        {footer && <div className="flex justify-end gap-2 border-t border-[#EEF0F5] px-4 py-2.5">{footer}</div>}
      </div>
    </div>
  );
}

export const inputCls =
  "h-[34px] w-full rounded-[9px] border border-[#DDE1EA] px-2.5 text-[12.5px] text-[#151A26] outline-none focus:border-[#1552D6]";
export const labelCls = "mb-1 block text-[11.5px] font-bold text-[#5A6275]";
export const btnPrimary =
  "h-[34px] rounded-[9px] bg-[#1552D6] px-3.5 text-[12.5px] font-bold text-white hover:bg-[#0E3FAA] disabled:bg-[#AEB5C6]";
export const btnOutline =
  "h-[34px] rounded-[9px] border border-[#DDE1EA] bg-white px-3.5 text-[12.5px] font-semibold text-[#151A26] hover:bg-[#F6F7FA] disabled:opacity-50";
