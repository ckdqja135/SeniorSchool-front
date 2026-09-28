"use client";

/**
 * 메뉴 아이콘(이모지) 선택기.
 *
 * 이모지를 직접 타이핑하기 번거로워서 자주 쓰는 것들을 격자로 깔아 둔다.
 * 목록에 없는 건 오른쪽 칸에 직접 붙여넣을 수 있다.
 * 아이콘은 사이드바에서 최상위 메뉴에만 보인다.
 */
import { useState } from "react";

/** 어드민에서 쓸 만한 것들. 현재 메뉴에 쓰는 아이콘을 앞쪽에 둔다 */
const PRESETS = [
  "📊", "🗂️", "🎓", "⛪", "✍️", "💼",
  "🍽️", "🛠️", "📈", "📝", "🧰", "👥",
  "⚙️", "🔐", "🏢", "🏫", "🏪", "🧭",
  "📦", "📁", "📌", "🔔", "🗓️", "🧾",
  "💬", "⭐", "🔎", "📮", "🧪", "🗺️",
  "☕", "🍜", "🛒", "🎯", "🚀", "🧩",
];

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [custom, setCustom] = useState("");

  return (
    <div className="rounded-[9px] border border-[#DDE1EA] p-2">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px] border border-[#E6E9F0] bg-[#FAFBFD] text-[15px]"
          aria-label="선택한 아이콘"
        >
          {value || "—"}
        </span>
        <input
          className="h-[30px] w-[86px] rounded-[8px] border border-[#DDE1EA] px-2 text-center text-[13px] outline-none focus:border-[#1552D6]"
          value={custom}
          onChange={(e) => {
            const v = e.target.value;
            setCustom(v);
            if (v.trim()) onChange(v.trim());
          }}
          placeholder="직접 입력"
          aria-label="아이콘 직접 입력"
        />
        <button
          type="button"
          onClick={() => {
            setCustom("");
            onChange("");
          }}
          className="ml-auto rounded-[8px] px-2 py-1 text-[11.5px] font-semibold text-[#8A91A3] hover:bg-[#F6F7FA]"
        >
          지우기
        </button>
      </div>

      <div className="grid max-h-[104px] grid-cols-9 gap-1 overflow-y-auto">
        {PRESETS.map((emoji) => {
          const on = emoji === value;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                setCustom("");
                onChange(emoji);
              }}
              aria-pressed={on}
              className="flex h-[28px] items-center justify-center rounded-[7px] border text-[14px] transition-colors hover:bg-[#F6F8FC]"
              style={{
                borderColor: on ? "#1552D6" : "transparent",
                background: on ? "#EEF4FF" : "transparent",
              }}
            >
              {emoji}
            </button>
          );
        })}
      </div>
    </div>
  );
}
