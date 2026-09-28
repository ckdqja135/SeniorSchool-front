/**
 * 메뉴 트리 불변 조작 도우미.
 *
 * 화면은 '모양(tree)'과 '체크값(PermMap)'을 따로 들고 있다 — 드래그가 체크 상태를 건드리지 않고,
 * 체크가 순서를 건드리지 않게 하려는 분리다. 저장할 때만 flattenForSave 로 합친다.
 */
import type { MenuNode, PermMap, SaveMenuItem } from "./shared";
import { MAX_DEPTH } from "./shared";

/** 트리를 평면으로 (자신 + 하위, 깊이·상위 포함) */
export function flatten(nodes: MenuNode[], parentIdx: number | null = null, depth = 1): Array<{ node: MenuNode; parentIdx: number | null; depth: number }> {
  const out: Array<{ node: MenuNode; parentIdx: number | null; depth: number }> = [];
  for (const n of nodes) {
    out.push({ node: n, parentIdx, depth });
    out.push(...flatten(n.children, n.menuIdx, depth + 1));
  }
  return out;
}

export function findNode(nodes: MenuNode[], menuIdx: number): MenuNode | null {
  for (const n of nodes) {
    if (n.menuIdx === menuIdx) return n;
    const hit = findNode(n.children, menuIdx);
    if (hit) return hit;
  }
  return null;
}

export function findParentIdx(nodes: MenuNode[], menuIdx: number): number | null {
  for (const e of flatten(nodes)) {
    if (e.node.menuIdx === menuIdx) return e.parentIdx;
  }
  return null;
}

/** node 의 하위(자기 자신 제외)에 menuIdx 가 있는지 — 순환 방지용 */
export function isDescendant(node: MenuNode, menuIdx: number): boolean {
  return node.children.some((c) => c.menuIdx === menuIdx || isDescendant(c, menuIdx));
}

/** 자기 자신 + 하위 개수 (삭제 확인 문구에 쓴다) */
export function subtreeSize(node: MenuNode): number {
  return 1 + node.children.reduce((sum, c) => sum + subtreeSize(c), 0);
}

/** node 를 뿌리로 본 하위 깊이 (자기 자신 = 1) */
export function heightOf(node: MenuNode): number {
  return node.children.length === 0 ? 1 : 1 + Math.max(...node.children.map(heightOf));
}

export function removeById(nodes: MenuNode[], menuIdx: number): MenuNode[] {
  return nodes
    .filter((n) => n.menuIdx !== menuIdx)
    .map((n) => ({ ...n, children: removeById(n.children, menuIdx) }));
}

/** target 의 앞/뒤(형제)로 넣는다 */
export function insertBeside(nodes: MenuNode[], targetIdx: number, node: MenuNode, after: boolean): MenuNode[] {
  const at = nodes.findIndex((n) => n.menuIdx === targetIdx);
  if (at >= 0) {
    const next = [...nodes];
    next.splice(after ? at + 1 : at, 0, node);
    return next;
  }
  return nodes.map((n) => ({ ...n, children: insertBeside(n.children, targetIdx, node, after) }));
}

/** target 의 마지막 하위로 넣는다 */
export function insertInto(nodes: MenuNode[], targetIdx: number, node: MenuNode): MenuNode[] {
  return nodes.map((n) =>
    n.menuIdx === targetIdx
      ? { ...n, children: [...n.children, node] }
      : { ...n, children: insertInto(n.children, targetIdx, node) },
  );
}

export function updateNode(nodes: MenuNode[], menuIdx: number, patch: Partial<MenuNode>): MenuNode[] {
  return nodes.map((n) =>
    n.menuIdx === menuIdx
      ? { ...n, ...patch }
      : { ...n, children: updateNode(n.children, menuIdx, patch) },
  );
}

/** 드롭했을 때 3단을 넘는지 — 옮길 노드의 높이 + 목표 깊이 */
export function wouldExceedDepth(nodes: MenuNode[], moving: MenuNode, targetDepth: number): boolean {
  return targetDepth + heightOf(moving) - 1 > MAX_DEPTH;
}

/**
 * 저장 payload. 현재 트리 순서를 sortOrder(0..n) 로 확정하고, 체크값을 노드마다 붙인다.
 * 트리에 있는 모든 노드를 보내되 삭제는 하지 않으므로(백엔드가 받은 것만 갱신) 유실 위험이 없다.
 */
export function flattenForSave(nodes: MenuNode[], perms: PermMap): SaveMenuItem[] {
  const out: SaveMenuItem[] = [];
  const walk = (list: MenuNode[], parentIdx: number | null) => {
    list.forEach((n, i) => {
      out.push({
        menuIdx: n.menuIdx,
        parentIdx,
        sortOrder: i,
        rolePermissions: perms[n.menuIdx] ?? {},
      });
      walk(n.children, n.menuIdx);
    });
  };
  walk(nodes, null);
  return out;
}

/**
 * 체크 전파 — 참조 구현과 같은 양방향 규칙.
 *  ① 누른 노드와 모든 하위에 같은 값을 내린다
 *  ② 전체 트리를 bottom-up 으로 돌며 묶음 메뉴는 '직속 자식 중 하나라도 체크'가 된다
 *
 * 백엔드 필터가 행 단위라 상위가 꺼지면 하위가 트리에서 사라진다. 그래서 ②가 필수다.
 * 결과적으로 묶음 노드의 체크는 독립적이지 않고 항상 파생값이며, 중간 상태는 없다.
 */
export function togglePermission(tree: MenuNode[], perms: PermMap, node: MenuNode, code: string, checked: boolean): PermMap {
  const next: PermMap = {};
  for (const k of Object.keys(perms)) next[Number(k)] = { ...perms[Number(k)] };

  // master 전용 메뉴는 이 그룹에 켤 수 없으므로 전파에서 빼 둔다 —
  // 그러지 않으면 '하위가 master 전용뿐인 묶음'이 편집 화면에서는 체크된 것처럼 보이는데
  // 실제 사이드바에서는 보일 게 없어 사라진다.
  const applyDown = (n: MenuNode) => {
    if (n.masterOnly) return;
    next[n.menuIdx] = { ...(next[n.menuIdx] ?? {}), [code]: checked };
    n.children.forEach(applyDown);
  };
  applyDown(node);

  tree.forEach((n) => recomputeBranch(n, next, code));

  return next;
}

/** 묶음 메뉴 = 직속 자식 중 하나라도 체크 (master 전용 자식은 세지 않는다) */
function recomputeBranch(n: MenuNode, acc: PermMap, code: string): boolean {
  if (n.masterOnly) return false;
  if (n.children.length === 0) return acc[n.menuIdx]?.[code] === true;
  const anyChild = n.children.map((c) => recomputeBranch(c, acc, code)).some(Boolean);
  acc[n.menuIdx] = { ...(acc[n.menuIdx] ?? {}), [code]: anyChild };
  return anyChild;
}

/** 트리 구조가 바뀐 뒤(드래그) 묶음 메뉴 체크를 다시 계산한다 */
export function recomputeAll(tree: MenuNode[], perms: PermMap, codes: string[]): PermMap {
  let next = perms;
  for (const code of codes) {
    const merged: PermMap = {};
    for (const k of Object.keys(next)) merged[Number(k)] = { ...next[Number(k)] };
    tree.forEach((n) => recomputeBranch(n, merged, code));
    next = merged;
  }
  return next;
}
