"use client";

/**
 * 메뉴 추가 / 메뉴 수정 공용 모달.
 *
 * 경로는 자유 입력이다 — 실제 페이지가 있는지 확인하지 않는다(확정 사항).
 * 비워 두면 클릭 이동이 없는 '묶음 메뉴'가 된다.
 * 상위 메뉴 선택 목록에서는 자기 자신과 자기 하위를 빼고, 3단을 넘게 되는 후보도 뺀다.
 */
import { useMemo, useState } from "react";
import { IconPicker } from "./IconPicker";
import { resolveMenuIcon } from "../menuIcons";
import { Modal, btnOutline, btnPrimary, inputCls, labelCls } from "./Modal";
import { MAX_DEPTH, type MenuNode } from "./shared";
import { flatten, heightOf, isDescendant } from "./treeOps";

export interface MenuFormValue {
  menuName: string;
  menuPath: string | null;
  menuIcon: string | null;
  parentIdx: number | null;
}

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
  const initialParent = useMemo(() => {
    if (!editing) return null;
    return flatten(tree).find((e) => e.node.menuIdx === editing.menuIdx)?.parentIdx ?? null;
  }, [tree, editing]);

  const [menuName, setMenuName] = useState(editing?.menuName ?? "");
  const [menuPath, setMenuPath] = useState(editing?.menuPath ?? "");
  // 예전에 저장된 이모지는 대응하는 SVG 키로 바꿔서 열어, 저장하면 키로 정리되게 한다
  const [menuIcon, setMenuIcon] = useState(() => {
    const v = editing?.menuIcon ?? "";
    return resolveMenuIcon(v)?.key ?? v;
  });
  const [parentIdx, setParentIdx] = useState<number | null>(initialParent);
  const [error, setError] = useState("");

  // 상위로 고를 수 있는 후보. 자기 자신·자기 하위 제외, 3단 초과가 되는 자리 제외
  const candidates = useMemo(() => {
    const movingHeight = editing ? heightOf(editing) : 1;
    return flatten(tree).filter(({ node, depth }) => {
      if (editing && (node.menuIdx === editing.menuIdx || isDescendant(editing, node.menuIdx))) return false;
      return depth + 1 + movingHeight - 1 <= MAX_DEPTH;
    });
  }, [tree, editing]);

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
      menuIcon: menuIcon.trim() || null,
      parentIdx,
    });
  };

  return (
    <Modal
      title={editing ? "메뉴 수정" : "메뉴 추가"}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={btnOutline} onClick={onClose} disabled={saving}>
            취소
          </button>
          <button type="button" className={btnPrimary} onClick={submit} disabled={saving}>
            {saving ? "저장 중…" : editing ? "수정" : "추가"}
          </button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <label className={labelCls} htmlFor="menu-name">
            메뉴명
          </label>
          <input
            id="menu-name"
            className={inputCls}
            value={menuName}
            onChange={(e) => setMenuName(e.target.value)}
            placeholder="예: 식당 관리"
            autoFocus
          />
        </div>

        <div>
          <label className={labelCls} htmlFor="menu-path">
            경로 <span className="font-normal text-[#AEB5C6]">(비우면 클릭 이동 없는 묶음 메뉴)</span>
          </label>
          <input
            id="menu-path"
            className={inputCls}
            value={menuPath}
            onChange={(e) => setMenuPath(e.target.value)}
            placeholder="/path/to/menu"
          />
        </div>

        <div>
          <span className={labelCls}>
            아이콘 <span className="font-normal text-[#AEB5C6]">(최상위 메뉴에만 표시)</span>
          </span>
          <IconPicker value={menuIcon} onChange={setMenuIcon} />
        </div>

        <div>
          <label className={labelCls} htmlFor="menu-parent">
            상위 메뉴
          </label>
          <select
            id="menu-parent"
            className={`${inputCls} cursor-pointer`}
            value={parentIdx ?? ""}
            onChange={(e) => setParentIdx(e.target.value === "" ? null : Number(e.target.value))}
          >
            <option value="">없음 (최상위 메뉴)</option>
            {candidates.map(({ node, depth }) => (
              <option key={node.menuIdx} value={node.menuIdx}>
                {" ".repeat((depth - 1) * 4)}
                {depth > 1 ? "└ " : ""}
                {node.menuName}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-[12.5px] text-[#C23B3B]">{error}</p>}
      </div>
    </Modal>
  );
}
