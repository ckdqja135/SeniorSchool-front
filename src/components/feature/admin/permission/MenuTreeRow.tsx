"use client";

/**
 * 메뉴 트리의 한 행 (재귀).
 *
 * 드래그는 새 의존성 없이 브라우저 기본 HTML5 DnD 로 한다.
 * `⠿` 만 draggable 이고 행 전체가 드롭 대상이며, 커서 Y 위치로 세 구역을 가른다
 * (위 30% = 앞, 아래 30% = 뒤, 가운데 = 하위로 편입).
 */
import React from "react";
import { C, type MenuNode, type PermMap } from "./shared";
import { MenuIcon } from "../menuIcons";

export type DropZone = "before" | "after" | "inside";

/** Tailwind 가 동적 임의값을 JIT 하지 못해 깊이별 들여쓰기를 정적 맵으로 둔다 */
const PAD_BY_DEPTH: Record<number, string> = {
  1: "pl-2",
  2: "pl-8",
  3: "pl-14",
};

function zoneFromEvent(e: React.DragEvent): DropZone {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  const ratio = rect.height ? (e.clientY - rect.top) / rect.height : 0.5;
  if (ratio < 0.3) return "before";
  if (ratio > 0.7) return "after";
  return "inside";
}

function indicator(zone: DropZone | null): string {
  switch (zone) {
    case "before":
      return "shadow-[inset_0_2px_0_0_#1552D6]";
    case "after":
      return "shadow-[inset_0_-2px_0_0_#1552D6]";
    case "inside":
      return "ring-2 ring-inset ring-[#1552D6]";
    default:
      return "";
  }
}

export interface MenuTreeRowProps {
  node: MenuNode;
  depth: number;
  parentIdx: number | null;
  perms: PermMap;
  code: string;
  /** master 그룹은 항상 전체라 체크를 만질 수 없다 */
  readOnly: boolean;
  openIdx: Set<number>;
  dropTarget: { menuIdx: number; zone: DropZone } | null;
  onToggleOpen: (menuIdx: number) => void;
  onTogglePerm: (node: MenuNode, checked: boolean) => void;
  onEdit: (node: MenuNode) => void;
  onDelete: (node: MenuNode) => void;
  onDragStart: (node: MenuNode) => void;
  onDragOver: (menuIdx: number | null, zone: DropZone | null) => void;
  onDragEnd: () => void;
  onDrop: (target: MenuNode, targetParentIdx: number | null, targetDepth: number, zone: DropZone) => void;
}

export function MenuTreeRow(props: MenuTreeRowProps) {
  const { node, depth, parentIdx, perms, code, readOnly, openIdx, dropTarget } = props;
  const hasChildren = node.children.length > 0;
  const open = openIdx.has(node.menuIdx);
  const checked = readOnly ? true : perms[node.menuIdx]?.[code] === true;
  const zone = dropTarget?.menuIdx === node.menuIdx ? dropTarget.zone : null;

  return (
    <>
      <div
        className={`flex items-center gap-1.5 rounded-[8px] py-[7px] pr-2 transition-colors hover:bg-[#F6F8FC] ${PAD_BY_DEPTH[depth] ?? "pl-14"} ${indicator(zone)}`}
        onDragOver={(e) => {
          e.preventDefault();
          props.onDragOver(node.menuIdx, zoneFromEvent(e));
        }}
        onDragLeave={() => props.onDragOver(null, null)}
        onDrop={(e) => {
          e.preventDefault();
          props.onDrop(node, parentIdx, depth, zoneFromEvent(e));
        }}
      >
        <span
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            props.onDragStart(node);
          }}
          onDragEnd={props.onDragEnd}
          title="드래그하여 순서·위치 변경"
          className="cursor-grab select-none px-1 text-[14px] text-[#C3C8D4] active:cursor-grabbing"
        >
          ⠿
        </span>

        <button
          type="button"
          onClick={() => hasChildren && props.onToggleOpen(node.menuIdx)}
          className="w-4 shrink-0 text-[11px] text-[#8A91A3]"
          aria-label={hasChildren ? (open ? "접기" : "펼치기") : undefined}
          tabIndex={hasChildren ? 0 : -1}
        >
          {hasChildren ? (open ? "▼" : "▶") : ""}
        </button>

        {/* master 전용 메뉴는 다른 그룹에 켤 수 없으니 체크박스를 아예 두지 않는다 */}
        {node.masterOnly ? (
          <span
            className="flex h-[17px] w-[17px] shrink-0 items-center justify-center text-[12px] text-[#C3C8D4]"
            title="master 전용 화면이라 다른 권한에는 노출되지 않습니다"
            aria-label={`${node.menuName}은 master 전용`}
          >
            🔒
          </span>
        ) : (
          <input
            type="checkbox"
            checked={checked}
            disabled={readOnly}
            onChange={(e) => props.onTogglePerm(node, e.target.checked)}
            className="h-[17px] w-[17px] shrink-0 cursor-pointer accent-[#1552D6] disabled:cursor-not-allowed"
            aria-label={`${node.menuName} 노출`}
          />
        )}

        <button
          type="button"
          onClick={() => props.onEdit(node)}
          title="클릭하여 메뉴 수정"
          className="min-w-0 flex-1 truncate text-left text-[14px] hover:underline"
          style={{ color: depth === 1 ? C.ink : "#4A5266", fontWeight: depth === 1 ? 700 : 500 }}
        >
          {node.menuIcon && <MenuIcon value={node.menuIcon} size={15} className="mr-1.5 inline-block align-[-2px] text-[#4A5266]" />}
          {node.menuName}
          {node.menuPath ? (
            <span className="ml-1.5 text-[12px] font-normal text-[#AEB5C6]">{node.menuPath}</span>
          ) : (
            <span className="ml-1.5 text-[12px] font-normal text-[#C3C8D4]">묶음</span>
          )}
          {node.masterOnly && (
            <span className="ml-1.5 rounded-[5px] bg-[#EEF0F5] px-1.5 py-[1px] text-[10.5px] font-bold text-[#5A6275]">
              master 전용
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => props.onDelete(node)}
          className="shrink-0 px-1 text-[13px] text-[#C3C8D4] hover:text-[#C23B3B]"
          title="메뉴 삭제"
          aria-label={`${node.menuName} 삭제`}
        >
          ✕
        </button>
      </div>

      {hasChildren &&
        open &&
        node.children.map((child) => (
          <MenuTreeRow key={child.menuIdx} {...props} node={child} depth={depth + 1} parentIdx={node.menuIdx} />
        ))}
    </>
  );
}
