"use client";

/**
 * 메뉴 추가 / 메뉴 수정 공용 모달.
 *
 * 경로는 자유 입력이다 — 실제 페이지가 있는지 확인하지 않는다(확정 사항).
 * 비워 두면 클릭 이동이 없는 '묶음 메뉴'가 된다.
 * 상위 메뉴는 트리에서 고른다. 자기 자신과 자기 하위는 빼고, 3단을 넘게 되는 자리도 뺀다.
 * 아이콘은 사이드바에서 최상위 메뉴에만 보이므로 최상위일 때만 선택기를 보여준다.
 */
import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { IconPicker } from "./IconPicker";
import { MenuIcon, resolveMenuIcon } from "../menuIcons";
import { MAX_DEPTH, type MenuNode } from "./shared";
import { flatten, heightOf, isDescendant } from "./treeOps";

export interface MenuFormValue {
  menuName: string;
  menuPath: string | null;
  menuIcon: string | null;
  parentIdx: number | null;
}

const inputCls =
  "h-[42px] w-full rounded-[10px] border border-[#DDE1EA] px-3 text-[14px] text-[#151A26] outline-none focus:border-[#1552D6] focus:shadow-[0_0_0_3px_rgba(21,82,214,.12)]";
const labelCls = "text-[13px] font-bold text-[#151A26]";

export function MenuFormModal({
  tree,
  editing,
  saving,
  onClose,
  onSubmit,
}: {
  tree: MenuNode[];
  /** null 이면 추가 모드 */
  editing: MenuNode | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (v: MenuFormValue) => void;
}) {
  const flat = useMemo(() => flatten(tree), [tree]);
  const initialParent = useMemo(() => {
    if (!editing) return null;
    return flat.find((e) => e.node.menuIdx === editing.menuIdx)?.parentIdx ?? null;
  }, [flat, editing]);

  const [menuName, setMenuName] = useState(editing?.menuName ?? "");
  const [menuPath, setMenuPath] = useState(editing?.menuPath ?? "");
  // 예전에 저장된 이모지는 대응하는 SVG 키로 바꿔서 열어, 저장하면 키로 정리되게 한다
  const [menuIcon, setMenuIcon] = useState(() => {
    const v = editing?.menuIcon ?? "";
    return resolveMenuIcon(v)?.key ?? v;
  });
  const [parentIdx, setParentIdx] = useState<number | null>(initialParent);
  const [error, setError] = useState("");

  // 처음엔 고른 상위 메뉴가 보이도록 그 조상들을 펼쳐 둔다
  const [open, setOpen] = useState<Set<number>>(() => {
    const s = new Set<number>();
    let cur = initialParent;
    while (cur !== null) {
      const hit = flat.find((e) => e.node.menuIdx === cur);
      if (!hit) break;
      if (hit.parentIdx !== null) s.add(hit.parentIdx);
      cur = hit.parentIdx;
    }
    return s;
  });

  // 상위로 고를 수 있는 후보. 자기 자신·자기 하위 제외, 3단 초과가 되는 자리 제외
  const allowed = useMemo(() => {
    const movingHeight = editing ? heightOf(editing) : 1;
    return new Set(
      flat
        .filter(({ node, depth }) => {
          if (editing && (node.menuIdx === editing.menuIdx || isDescendant(editing, node.menuIdx))) return false;
          return depth + movingHeight <= MAX_DEPTH;
        })
        .map((e) => e.node.menuIdx),
    );
  }, [flat, editing]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const isTop = parentIdx === null;
  const parentLabel = useMemo(() => {
    const names: string[] = [];
    let cur = parentIdx;
    while (cur !== null) {
      const hit = flat.find((e) => e.node.menuIdx === cur);
      if (!hit) break;
      names.unshift(hit.node.menuName);
      cur = hit.parentIdx;
    }
    return names.join(" › ");
  }, [flat, parentIdx]);

  const nameOk = menuName.trim().length > 0;

  const submit = () => {
    const name = menuName.trim();
    if (!name) {
      setError("메뉴명을 입력해주세요.");
      return;
    }
    const path = menuPath.trim();
    if (path && !path.startsWith("/")) {
      setError("경로는 '/' 로 시작해야 합니다.");
      return;
    }
    setError("");
    onSubmit({
      menuName: name,
      menuPath: path || null,
      // 새 하위 메뉴는 아이콘이 안 보이므로, 최상위일 때 골라 둔 값이 딸려 가지 않게 한다
      menuIcon: (!editing && !isTop ? "" : menuIcon.trim()) || null,
      parentIdx,
    });
  };

  const toggleOpen = (idx: number) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });

  const renderRows = (nodes: MenuNode[], depth: number): React.ReactNode[] =>
    nodes
      .filter((n) => allowed.has(n.menuIdx))
      .flatMap((n) => {
        const kids = n.children.filter((c) => allowed.has(c.menuIdx));
        const expanded = open.has(n.menuIdx);
        return [
          <TreeRow
            key={n.menuIdx}
            label={n.menuName}
            depth={depth}
            selected={parentIdx === n.menuIdx}
            caret={kids.length ? (expanded ? "▾" : "▸") : ""}
            onToggle={() => toggleOpen(n.menuIdx)}
            onSelect={() => setParentIdx(n.menuIdx)}
          />,
          ...(kids.length && expanded ? renderRows(kids, depth + 1) : []),
        ];
      });

  const showPvIcon = isTop && !!menuIcon;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[rgba(20,24,36,.55)] px-4 py-8" onClick={onClose} role="presentation">
      <div
        className="flex max-h-full w-full max-w-[720px] flex-col overflow-hidden rounded-[16px] bg-white shadow-[0_30px_80px_-20px_rgba(0,0,0,.45)]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={editing ? "메뉴 수정" : "메뉴 추가"}
      >
        <div className="flex items-center justify-between border-b border-[#EEF0F5] px-[22px] py-[18px]">
          <h3 className="text-[17px] font-extrabold tracking-[-0.01em] text-[#151A26]">{editing ? "메뉴 수정" : "메뉴 추가"}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex h-8 w-8 items-center justify-center rounded-[8px] text-[18px] text-[#8A91A3] hover:bg-[#F1F3F8]"
          >
            ✕
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-[22px] py-5">
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            <label className="flex flex-col gap-[7px]">
              <span className={labelCls}>메뉴명</span>
              <input
                className={inputCls}
                value={menuName}
                onChange={(e) => setMenuName(e.target.value)}
                placeholder="예: 식당 관리"
                autoFocus
              />
            </label>
            <label className="flex flex-col gap-[7px]">
              <span className={labelCls}>
                경로 <span className="font-medium text-[#9AA1B2]">선택</span>
              </span>
              <input className={inputCls} value={menuPath} onChange={(e) => setMenuPath(e.target.value)} placeholder="/path/to/menu" />
              <span className="text-[11.5px] text-[#9AA1B2]">비워두면 클릭 이동 없는 묶음 메뉴가 됩니다.</span>
            </label>
          </div>

          <div className="flex flex-col gap-[7px]">
            <span className={labelCls}>상위 메뉴</span>
            <div className="h-[196px] overflow-y-auto rounded-[12px] border border-[#DDE1EA] p-1.5" role="radiogroup" aria-label="상위 메뉴">
              <TreeRow label="없음 (최상위 메뉴)" depth={0} selected={isTop} caret="" onSelect={() => setParentIdx(null)} plain />
              {renderRows(tree, 0)}
            </div>
          </div>

          {isTop ? (
            <div className="flex flex-col gap-[7px]">
              <span className={labelCls}>아이콘</span>
              <IconPicker value={menuIcon} onChange={setMenuIcon} menuName={menuName} />
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-[10px] bg-[#F6F7FA] px-3.5 py-3 text-[12.5px] text-[#6B7389]">
              <Info size={16} className="shrink-0 text-[#9AA1B2]" aria-hidden="true" />
              &apos;{parentLabel}&apos; 아래에 {editing ? "둡니다" : "추가됩니다"}. 하위 메뉴는 아이콘이 표시되지 않습니다.
            </div>
          )}

          {error && <p className="text-[12.5px] text-[#C23B3B]">{error}</p>}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EEF0F5] bg-[#FAFBFD] px-[22px] py-3.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="text-[11.5px] font-semibold text-[#8A91A3]">미리보기</span>
            <div
              className="flex h-10 min-w-[180px] max-w-[260px] items-center gap-2.5 rounded-[10px] bg-[#141B2D] pr-3.5 text-white"
              style={{ paddingLeft: showPvIcon ? 12 : 14 }}
            >
              {showPvIcon && <MenuIcon value={menuIcon} size={18} />}
              <span className="truncate text-[13.5px] font-semibold" style={{ color: nameOk ? "#fff" : "#6B7389" }}>
                {menuName.trim() || "메뉴명"}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 rounded-[10px] border border-[#DDE1EA] bg-white px-4 text-[13.5px] font-semibold text-[#4A5266] hover:bg-[#F6F7FA] disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving || !nameOk}
              className="h-10 rounded-[10px] bg-[#1552D6] px-5 text-[13.5px] font-bold text-white hover:bg-[#0E3FAA] disabled:cursor-not-allowed disabled:bg-[#A9BCE8]"
            >
              {saving ? "저장 중…" : editing ? "수정" : "추가"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TreeRow({
  label,
  depth,
  selected,
  caret,
  onSelect,
  onToggle,
  plain,
}: {
  label: string;
  depth: number;
  selected: boolean;
  caret: string;
  onSelect: () => void;
  onToggle?: () => void;
  /** '없음' 행: 굵게 하지 않는다 */
  plain?: boolean;
}) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`flex h-8 cursor-pointer items-center gap-1.5 rounded-[8px] pr-2.5 text-[13.5px] ${selected ? "bg-[#2E3A4F] text-white" : "hover:bg-[#F3F5F9]"}`}
      style={{
        paddingLeft: 10 + depth * 22,
        color: selected ? "#fff" : depth ? "#4A5266" : "#151A26",
        fontWeight: selected || (!depth && !plain) ? 700 : 500,
      }}
    >
      <span
        onClick={(e) => {
          if (!caret || !onToggle) return;
          e.stopPropagation();
          onToggle();
        }}
        aria-hidden="true"
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border text-[9px]"
        style={{
          color: selected ? "#fff" : "#8A91A3",
          borderColor: caret ? (selected ? "rgba(255,255,255,.5)" : "#DDE1EA") : "transparent",
        }}
      >
        {caret}
      </span>
      <span className="truncate">{label}</span>
    </div>
  );
}
