"use client";

/**
 * '메뉴 목록' 패널 — 체크박스 트리 + 드래그 재배치 + 저장.
 *
 * 펼침 상태(openIdx)와 끌고 있는 노드는 이 패널이 들고 있다.
 * 행마다 두면 재배치할 때 상태가 날아가므로 부모가 소유한다.
 */
import { useRef, useState } from "react";
import { MenuTreeRow, type DropZone } from "./MenuTreeRow";
import { MASTER_CODE, MAX_DEPTH, type GroupRow, type MenuNode, type PermMap } from "./shared";
import { findNode, insertBeside, insertInto, isDescendant, removeById, wouldExceedDepth } from "./treeOps";

export function MenuPanel({
  tree,
  perms,
  group,
  dirty,
  saving,
  onTreeChange,
  onTogglePerm,
  onAddMenu,
  onEditMenu,
  onDeleteMenu,
  onSave,
  onNotice,
  loading,
}: {
  tree: MenuNode[];
  perms: PermMap;
  group: GroupRow | null;
  dirty: boolean;
  saving: boolean;
  onTreeChange: (next: MenuNode[]) => void;
  onTogglePerm: (node: MenuNode, checked: boolean) => void;
  onAddMenu: () => void;
  onEditMenu: (node: MenuNode) => void;
  onDeleteMenu: (node: MenuNode) => void;
  onSave: () => void;
  onNotice: (message: string) => void;
  loading: boolean;
}) {
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set());
  const [dropTarget, setDropTarget] = useState<{ menuIdx: number; zone: DropZone } | null>(null);
  const dragRef = useRef<MenuNode | null>(null);

  const readOnly = group?.groupCode === MASTER_CODE;

  const toggleOpen = (menuIdx: number) =>
    setOpenIdx((prev) => {
      const next = new Set(prev);
      if (next.has(menuIdx)) next.delete(menuIdx);
      else next.add(menuIdx);
      return next;
    });

  const handleDrop = (target: MenuNode, targetParentIdx: number | null, targetDepth: number, zone: DropZone) => {
    const dragged = dragRef.current;
    setDropTarget(null);
    dragRef.current = null;
    if (!dragged || dragged.menuIdx === target.menuIdx) return;

    const moving = findNode(tree, dragged.menuIdx);
    if (!moving) return;

    // 자기 하위로는 옮길 수 없다 (순환)
    if (isDescendant(moving, target.menuIdx)) {
      onNotice("자기 자신의 하위로는 옮길 수 없습니다.");
      return;
    }

    const landingDepth = zone === "inside" ? targetDepth + 1 : targetDepth;
    if (wouldExceedDepth(tree, moving, landingDepth)) {
      onNotice(`메뉴는 ${MAX_DEPTH}단까지만 만들 수 있습니다.`);
      return;
    }

    const without = removeById(tree, dragged.menuIdx);
    const next =
      zone === "inside"
        ? insertInto(without, target.menuIdx, moving)
        : insertBeside(without, target.menuIdx, moving, zone === "after");

    onTreeChange(next);
    // 하위로 편입했으면 바로 보이게 펼친다
    if (zone === "inside") setOpenIdx((prev) => new Set(prev).add(target.menuIdx));
  };

  const expandAll = () => {
    const all = new Set<number>();
    const walk = (ns: MenuNode[]) => ns.forEach((n) => { if (n.children.length) { all.add(n.menuIdx); walk(n.children); } });
    walk(tree);
    setOpenIdx(all);
  };

  return (
    <section className="flex w-full flex-col overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white lg:w-[520px] lg:shrink-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF0F5] px-[22px] py-4">
        <h2 className="text-[16px] font-extrabold">메뉴 목록</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openIdx.size > 0 ? () => setOpenIdx(new Set()) : expandAll}
            className="h-[38px] rounded-[10px] border border-[#DDE1EA] bg-white px-3 text-[12.5px] font-semibold text-[#5A6275] hover:bg-[#F6F7FA]"
          >
            {openIdx.size > 0 ? "모두 접기" : "모두 펼치기"}
          </button>
          <button
            type="button"
            onClick={onAddMenu}
            className="h-[38px] rounded-[10px] border border-[#DDE1EA] bg-white px-3 text-[12.5px] font-semibold text-[#151A26] hover:bg-[#F6F7FA]"
          >
            + 메뉴 추가
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !dirty}
            className="h-[38px] rounded-[10px] bg-[#1552D6] px-4 text-[12.5px] font-bold text-white hover:bg-[#0E3FAA] disabled:bg-[#AEB5C6]"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>

      {readOnly && (
        <p className="border-b border-[#EEF0F5] bg-[#F5F8FF] px-[22px] py-2.5 text-[13px] leading-relaxed text-[#1552D6] break-keep">
          최고 관리자(master)는 항상 모든 메뉴를 봅니다. 체크를 바꿀 필요가 없습니다.
        </p>
      )}

      <div className="max-h-[640px] flex-1 overflow-y-auto p-2.5">
        {loading && tree.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-[#8A91A3]">불러오는 중…</p>
        ) : tree.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-[#8A91A3]">등록된 메뉴가 없습니다.</p>
        ) : !group ? (
          <p className="py-10 text-center text-[14px] text-[#8A91A3]">위에서 권한을 먼저 고르세요.</p>
        ) : (
          tree.map((node) => (
            <MenuTreeRow
              key={node.menuIdx}
              node={node}
              depth={1}
              parentIdx={null}
              perms={perms}
              code={group.groupCode}
              readOnly={readOnly}
              openIdx={openIdx}
              dropTarget={dropTarget}
              onToggleOpen={toggleOpen}
              onTogglePerm={onTogglePerm}
              onEdit={onEditMenu}
              onDelete={onDeleteMenu}
              onDragStart={(n) => {
                dragRef.current = n;
              }}
              onDragOver={(menuIdx, zone) => setDropTarget(menuIdx !== null && zone ? { menuIdx, zone } : null)}
              onDragEnd={() => {
                dragRef.current = null;
                setDropTarget(null);
              }}
              onDrop={handleDrop}
            />
          ))
        )}
      </div>

      <p className="border-t border-[#EEF0F5] px-[22px] py-2.5 text-[11.5px] leading-relaxed text-[#AEB5C6] break-keep">
        ⠿ 를 끌어 순서를 바꾸고, 행 가운데에 놓으면 그 메뉴의 하위로 들어갑니다. 상위를 끄면 하위도 함께 꺼집니다.
      </p>
    </section>
  );
}
