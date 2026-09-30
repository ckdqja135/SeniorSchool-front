"use client";

/**
 * 메뉴 아이콘(SVG) 선택기.
 *
 * 위쪽 탭에서 아이콘 팩(Phosphor / Tabler / Remix / Bootstrap / Material)을 고르고,
 * 그 팩의 아이콘을 격자로 보여준다. 이름·키워드로 걸러 볼 수 있다.
 * 메뉴명에 들어간 단어로 어울리는 아이콘을 먼저 추천한다 (검색 중에는 숨김).
 * 고른 아이콘의 값("팩:아이디")이 메뉴 아이콘 값(AdminMenu.menuIcon)이 된다.
 */
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ICON_PACKS, PACK_CONCEPTS, type PackKey } from "../iconPacks";
import { packIcon, packLabel, resolveMenuIcon, type MenuIconDef } from "../menuIcons";

const P = "#1552D6";
const HOME = PACK_CONCEPTS.find((c) => c.id === "house")!;

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
  const selected = resolveMenuIcon(value);
  const [pack, setPack] = useState<PackKey>(selected?.pack ?? "ph");
  const [query, setQuery] = useState("");
  const [hover, setHover] = useState<MenuIconDef | null>(null);
  const q = query.trim().toLowerCase();

  const packIcons = useMemo(
    () => PACK_CONCEPTS.map((c) => packIcon(pack, c)).filter((d): d is MenuIconDef => d !== null),
    [pack],
  );
  const list = useMemo(() => {
    if (!q) return packIcons;
    return packIcons.filter((d) => `${d.label} ${d.keywords} ${d.key}`.toLowerCase().includes(q));
  }, [packIcons, q]);

  // '관리' 는 거의 모든 메뉴명에 붙어서 추천 단어에서 뺀다. 붙여 쓴 '식당관리' 도 '식당' 으로 본다
  const words = menuName.replace(/관리/g, " ").trim().toLowerCase().split(/\s+/).filter(Boolean);
  // 메뉴명 단어가 아이콘 키워드를 품거나(맛집리뷰 ⊃ 맛집) 키워드가 단어를 품으면(식당 ⊂ 식당) 추천
  const suggest = words.length
    ? packIcons
        .filter((d) =>
          `${d.label} ${d.keywords}`
            .toLowerCase()
            .split(/\s+/)
            .some((k) => words.some((w) => k.includes(w) || (k.length >= 2 && w.includes(k)))),
        )
        .slice(0, 5)
    : [];

  return (
    <div className="overflow-hidden rounded-[12px] border border-[#DDE1EA]">
      {/* 탭 줄과 검색창을 따로 두어, 탭을 바꿔도 검색창 위치·폭이 그대로이게 한다 */}
      <div className="flex flex-col gap-2.5 border-b border-[#EEF0F5] p-2.5">
        <div className="flex max-w-full gap-0.5 self-start overflow-x-auto rounded-[10px] bg-[#F1F3F8] p-[3px]" role="tablist" aria-label="아이콘 팩">
          {ICON_PACKS.map((p) => {
            const on = pack === p.key;
            const Home = HOME.icons[ICON_PACKS.indexOf(p)];
            return (
              <button
                key={p.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setPack(p.key);
                  setHover(null);
                }}
                className="flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[8px] px-[11px] text-[12.5px]"
                style={{
                  background: on ? "#fff" : "transparent",
                  color: on ? "#151A26" : "#6B7389",
                  fontWeight: on ? 700 : 500,
                  boxShadow: on ? "0 1px 3px rgba(20,26,40,.12)" : "none",
                }}
              >
                {Home && <Home size={16} aria-hidden="true" />}
                {/* 굵게 바뀌어도 탭 폭이 변하지 않도록 굵은 글자 폭을 미리 잡아 둔다 */}
                <span className="grid">
                  <span className="invisible col-start-1 row-start-1 font-bold" aria-hidden="true">
                    {p.label}
                  </span>
                  <span className="col-start-1 row-start-1">{p.label}</span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex h-[40px] w-full items-center gap-2 rounded-[9px] border border-[#E3E6EE] bg-[#FAFBFD] px-2.5 focus-within:border-[#1552D6] focus-within:shadow-[0_0_0_3px_rgba(21,82,214,.12)]">
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
            <span className="text-[12px] text-[#8A91A3]">이 팩에는 맞는 아이콘이 없습니다. 다른 팩을 선택해 보세요.</span>
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
                  <d.Icon size={17} aria-hidden="true" />
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
                  <d.Icon size={24} aria-hidden="true" />
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
          {hover ? (
            <>
              <hover.Icon size={16} className="shrink-0 text-[#151A26]" aria-hidden="true" />
              <b className="text-[#151A26]">{hover.label}</b>
              <span>{packLabel(pack)}</span>
            </>
          ) : selected ? (
            <>
              <selected.Icon size={16} className="shrink-0 text-[#151A26]" aria-hidden="true" />
              <b className="text-[#151A26]">{selected.label}</b>
              <span>선택됨 · {selected.pack ? packLabel(selected.pack) : "기존 아이콘"}</span>
              <button type="button" onClick={() => onChange("")} className="ml-1 font-semibold text-[#8A91A3] underline-offset-2 hover:text-[#151A26] hover:underline">
                선택 해제
              </button>
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
