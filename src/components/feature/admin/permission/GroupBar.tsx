"use client";

/**
 * '권한 목록' — 화면 맨 위 전체 너비. 카드 하나를 고르면 그게 이 화면의 유일한 교차 선택자가 된다.
 * 메뉴 트리 체크박스가 가리키는 그룹이자, 계정 목록을 좁히는 기준이다.
 */
import { C, type GroupRow } from "./shared";

export function GroupBar({
  groups,
  currentCode,
  onSelect,
  onManage,
  loading,
}: {
  groups: GroupRow[];
  currentCode: string | null;
  onSelect: (code: string) => void;
  onManage: () => void;
  loading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F5] px-[22px] py-4">
        <div className="flex items-baseline gap-2">
          <h2 className="text-[16px] font-extrabold">권한 목록</h2>
          <span className="text-[13px] text-[#8A91A3]">권한을 고르면 아래에서 메뉴와 계정을 설정합니다</span>
        </div>
        <button
          type="button"
          onClick={onManage}
          className="h-[38px] whitespace-nowrap rounded-[10px] border border-[#DDE1EA] bg-white px-3.5 text-[14px] font-semibold text-[#151A26] hover:bg-[#F6F7FA]"
        >
          권한 관리
        </button>
      </div>

      <div className="flex flex-wrap gap-2.5 p-[22px]">
        {loading && groups.length === 0 ? (
          <span className="py-2 text-[14px] text-[#8A91A3]">불러오는 중…</span>
        ) : groups.length === 0 ? (
          <span className="py-2 text-[14px] text-[#8A91A3]">등록된 권한이 없습니다.</span>
        ) : (
          groups.map((g) => {
            const on = g.groupCode === currentCode;
            return (
              <button
                key={g.groupIdx}
                type="button"
                onClick={() => onSelect(g.groupCode)}
                aria-pressed={on}
                className="flex min-w-[184px] items-center gap-2.5 rounded-[12px] border px-4 py-2.5 text-left transition-colors"
                style={{
                  borderColor: on ? C.primary : "#E3E6EE",
                  background: on ? C.primary : "#F8F9FC",
                }}
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[14px] font-bold"
                  style={{
                    background: on ? "rgba(255,255,255,0.22)" : "#E3E8F2",
                    color: on ? "#fff" : "#5A6275",
                  }}
                >
                  {(g.groupName[0] ?? g.groupCode[0] ?? "?").toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span
                    className="block break-keep text-[13.5px] font-bold"
                    style={{ color: on ? "#fff" : C.ink }}
                  >
                    {g.groupName}
                  </span>
                  <span className="block text-[12px]" style={{ color: on ? "rgba(255,255,255,0.82)" : "#AEB5C6" }}>
                    {g.groupCode} · {g.userCount}명
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
