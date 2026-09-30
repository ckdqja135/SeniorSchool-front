"use client";

/**
 * 메뉴 아이콘(SVG) 선택기.
 *
 * 아이콘 목록(menuIcons.tsx)을 격자로 보여주고, 이름·키워드로 걸러 볼 수 있다.
 * 고른 아이콘의 키가 메뉴 아이콘 값(AdminMenu.menuIcon)이 된다.
 * 아이콘은 사이드바에서 최상위 메뉴에만 보인다.
 */
import { useMemo, useState } from "react";
import { MENU_ICONS, MenuIcon, resolveMenuIcon } from "../menuIcons";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = resolveMenuIcon(value);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MENU_ICONS;
    return MENU_ICONS.filter((d) => `${d.label} ${d.keywords} ${d.key}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="rounded-[9px] border border-[#DDE1EA] p-2">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[8px] border border-[#E6E9F0] bg-[#FAFBFD] text-[#151A26]"
          aria-label={selected ? `선택한 아이콘: ${selected.label}` : "선택한 아이콘 없음"}
        >
          {value ? <MenuIcon value={value} size={18} /> : <span className="text-[13px] text-[#AEB5C6]">—</span>}
        </span>
        <input
          className="h-[34px] min-w-0 flex-1 rounded-[8px] border border-[#DDE1EA] px-2.5 text-[13px] outline-none focus:border-[#1552D6]"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="아이콘 검색 (예: 교회, 통계)"
          aria-label="아이콘 검색"
        />
        <button
          type="button"
          onClick={() => onChange("")}
          disabled={!value}
          className="shrink-0 rounded-[8px] px-2 py-1 text-[12px] font-semibold text-[#8A91A3] hover:bg-[#F6F7FA] disabled:opacity-40"
        >
          지우기
        </button>
      </div>

      {selected && (
        <p className="mb-1.5 px-0.5 text-[12px] text-[#7A8296]">
          선택: <b className="font-semibold text-[#151A26]">{selected.label}</b>
        </p>
      )}

      {list.length === 0 ? (
        <p className="py-6 text-center text-[12.5px] text-[#8A91A3]">&apos;{query}&apos; 에 맞는 아이콘이 없습니다.</p>
      ) : (
        <div className="grid max-h-[196px] grid-cols-8 gap-1 overflow-y-auto" role="radiogroup" aria-label="메뉴 아이콘">
          {list.map((d) => {
            const on = selected?.key === d.key;
            return (
              <button
                key={d.key}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={d.label}
                title={d.label}
                onClick={() => onChange(d.key)}
                className="flex h-[36px] items-center justify-center rounded-[8px] border text-[#4A5266] transition-colors hover:bg-[#F6F8FC] hover:text-[#151A26]"
                style={{
                  borderColor: on ? "#1552D6" : "transparent",
                  background: on ? "#EEF4FF" : undefined,
                  color: on ? "#1552D6" : undefined,
                }}
              >
                <d.Icon size={18} strokeWidth={1.8} aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
