"use client";

/**
 * 메뉴 아이콘(SVG) 선택기.
 *
 * 아이콘 목록(menuIcons.tsx)을 격자로 보여주고, 이름·키워드로 걸러 볼 수 있다.
 * 메뉴명에 들어간 단어로 어울리는 아이콘을 먼저 추천한다 (검색 중에는 숨김).
 * 고른 아이콘의 키가 메뉴 아이콘 값(AdminMenu.menuIcon)이 된다.
 */
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { MENU_ICONS, resolveMenuIcon, type MenuIconDef } from "../menuIcons";

const P = "#1552D6";

export function IconPicker({
  value,
  onChange,
  menuName = "",
}: {
  value: string;
  onChange: (next: string) => void;
  /** 추천에 쓰는 메뉴명 */
  menuName?: string;
}) {
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<MenuIconDef | null>(null);
  const selected = resolveMenuIcon(value);
  const q = query.trim().toLowerCase();

  const list = useMemo(() => {
    if (!q) return MENU_ICONS;
    return MENU_ICONS.filter((d) => `${d.label} ${d.keywords} ${d.key}`.toLowerCase().includes(q));
  }, [q]);

  // '관리' 는 거의 모든 메뉴명에 붙어서 추천 단어에서 뺀다. 붙여 쓴 '식당관리' 도 '식당' 으로 본다
  const words = menuName.replace(/관리/g, " ").trim().toLowerCase().split(/\s+/).filter(Boolean);
  // 메뉴명 단어가 아이콘 키워드를 품거나(맛집리뷰 ⊃ 맛집) 키워드가 단어를 품으면(식당 ⊂ 식당) 추천
  const suggest = words.length
    ? MENU_ICONS.filter((d) =>
        `${d.label} ${d.keywords}`
          .toLowerCase()
          .split(/\s+/)
          .some((k) => words.some((w) => k.includes(w) || (k.length >= 2 && w.includes(k)))),
      ).slice(0, 5)
    : [];

  const peek = hover ?? selected;

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#DDE1EA]">
      <div className="border-b border-[#EEF0F5] p-2.5">
        <div className="flex h-[40px] items-center gap-2 rounded-[9px] border border-[#E3E6EE] bg-[#FAFBFD] px-2.5 focus-within:border-[#1552D6] focus-within:shadow-[0_0_0_3px_rgba(21,82,214,.12)]">
          <Search size={16} strokeWidth={2} className="shrink-0 text-[#9AA1B2]" aria-hidden="true" />
          <input
            className="min-w-0 flex-1 border-none bg-transparent text-[13.5px] text-[#151A26] outline-none"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="검색 (예: 식당, 통계, 사람)"
            aria-label="아이콘 검색"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="검색어 지우기"
              className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#E3E6EE] text-[10px] text-[#5A6275]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {words.length > 0 && !q && (
        <div className="flex flex-wrap items-center gap-2 border-b border-[#EEF0F5] bg-[#F7F9FF] px-3 py-2.5">
          <span className="whitespace-nowrap text-[12px] font-bold text-[#1552D6]">&apos;{menuName.trim()}&apos; 추천</span>
          {suggest.length === 0 ? (
            <span className="text-[12px] text-[#8A91A3]">맞는 아이콘이 없습니다. 아래에서 골라 주세요.</span>
          ) : (
            suggest.map((d) => {
              const on = selected?.key === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  onClick={() => onChange(d.key)}
                  className="flex h-[32px] items-center gap-1.5 whitespace-nowrap rounded-[8px] border px-2.5 text-[12px] font-semibold"
                  style={{ borderColor: on ? P : "#DCE4F7", background: on ? P : "#fff", color: on ? "#fff" : "#151A26" }}
                >
                  <d.Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  {d.label}
                </button>
              );
            })
          )}
        </div>
      )}

      <div className="h-[232px] overflow-y-auto p-2.5">
        {list.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-1.5 text-[13px] text-[#8A91A3]">
            &apos;{query.trim()}&apos;에 맞는 아이콘이 없습니다.
          </div>
        ) : (
          <div
            className="grid gap-1 [grid-template-columns:repeat(auto-fill,minmax(52px,1fr))]"
            role="radiogroup"
            aria-label="메뉴 아이콘"
          >
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
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                  className="relative flex h-[52px] items-center justify-center rounded-[10px] border-[1.5px] p-0 transition-colors hover:bg-[#F1F4FA]"
                  style={{
                    borderColor: on ? P : "transparent",
                    background: on ? "#EEF3FF" : undefined,
                    color: on ? P : "#3A4256",
                  }}
                >
                  <d.Icon size={24} strokeWidth={1.7} aria-hidden="true" />
                  {on && (
                    <span className="absolute right-[3px] top-[3px] flex h-[14px] w-[14px] items-center justify-center rounded-full bg-[#1552D6] text-[9px] font-extrabold text-white">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex min-h-[38px] items-center justify-between gap-2.5 border-t border-[#EEF0F5] bg-[#FAFBFD] px-3 py-2 text-[12px] text-[#8A91A3]">
        <span className="flex min-w-0 items-center gap-1.5 overflow-hidden text-ellipsis whitespace-nowrap">
          {peek ? (
            <>
              <peek.Icon size={16} strokeWidth={1.8} className="shrink-0 text-[#151A26]" aria-hidden="true" />
              <b className="text-[#151A26]">{peek.label}</b>
              {!hover && <span>선택됨</span>}
              {!hover && (
                <button type="button" onClick={() => onChange("")} className="ml-1 font-semibold text-[#8A91A3] underline-offset-2 hover:text-[#151A26] hover:underline">
                  선택 해제
                </button>
              )}
            </>
          ) : value ? (
            <span>
              현재 값 <b className="text-[#151A26]">{value}</b> (SVG 대응 없음)
            </span>
          ) : (
            <b className="text-[#151A26]">선택 안 함</b>
          )}
        </span>
        <span className="whitespace-nowrap">{q ? `검색 결과 ${list.length}개` : `${list.length}개`}</span>
      </div>
    </div>
  );
}

