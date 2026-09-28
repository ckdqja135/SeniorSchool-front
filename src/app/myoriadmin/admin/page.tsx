"use client";

/**
 * 시스템 관리 › 권한 관리.
 *
 * 권한 그룹 단위로 사이드바 메뉴 노출을 정하고, 어드민 계정을 관리한다.
 * - 권한 목록: 고른 권한이 이 화면의 유일한 교차 선택자다 (메뉴 체크 대상 + 계정 목록 필터)
 * - 메뉴 목록: 체크박스 트리 + ⠿ 드래그로 순서·상위 변경, '저장' 으로 한 번에 반영
 * - 계정 목록: 권한 그룹 변경 · 활성/비활성 · 비밀번호 재설정 · 삭제
 *
 * 화면 상태는 '모양(tree)'과 '체크값(perms)'을 분리해 들고 있다 —
 * 드래그가 체크를 건드리지 않고, 체크가 순서를 건드리지 않게 하려는 분리다.
 *
 * master 는 코드에서 최고 권한이라 그룹과 무관하게 항상 전체 메뉴를 본다.
 * 이 화면 자체도 master 전용이며, 일반 admin 이 직접 들어오면 안내만 보인다.
 *
 * 사이드바·상단 헤더는 관리자 공용 레이아웃(DashboardLayout)이 그린다.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AccountFormModal } from "@/components/feature/admin/permission/AccountFormModal";
import { AccountPanel } from "@/components/feature/admin/permission/AccountPanel";
import { GroupBar } from "@/components/feature/admin/permission/GroupBar";
import { GroupModal } from "@/components/feature/admin/permission/GroupModal";
import { MenuFormModal, type MenuFormValue } from "@/components/feature/admin/permission/MenuFormModal";
import { MenuPanel } from "@/components/feature/admin/permission/MenuPanel";
import { ConfirmModal, PasswordModal } from "@/components/feature/admin/permission/dialogs";
import {
  MASTER_CODE,
  createAdminAccount,
  createGroup,
  createMenu,
  deleteAdminAccount,
  deleteGroup,
  deleteMenu,
  fetchAdmins,
  fetchEditorData,
  patchAdminAccount,
  renameGroup,
  saveMenus,
  updateMenu,
  type AdminRow,
  type GroupRow,
  type MenuNode,
  type PermMap,
} from "@/components/feature/admin/permission/shared";
import {
  findParentIdx,
  flatten,
  flattenForSave,
  insertInto,
  isDescendant,
  recomputeAll,
  removeById,
  subtreeSize,
  togglePermission,
} from "@/components/feature/admin/permission/treeOps";

type Dialog =
  | { kind: "menu"; editing: MenuNode | null }
  | { kind: "groups" }
  | { kind: "account" }
  | { kind: "password"; user: AdminRow }
  | { kind: "confirm"; title: string; message: string; confirmLabel: string; danger: boolean; run: () => Promise<void> }
  | null;

export default function PermissionPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [tree, setTree] = useState<MenuNode[]>([]);
  const [perms, setPerms] = useState<PermMap>({});
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [currentCode, setCurrentCode] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyIdx, setBusyIdx] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const say = useCallback((ok: boolean, text: string) => setNotice({ ok, text }), []);

  /** 메뉴·그룹·계정을 다시 받아 화면 상태를 서버 기준으로 되돌린다 */
  const load = useCallback(async () => {
    const [menuRes, adminRes] = await Promise.all([
      fetchEditorData(),
      fetchAdmins().catch(() => [] as AdminRow[]),
    ]);

    setAdmins(adminRes);

    if (!menuRes.ok) {
      setForbidden(menuRes.forbidden);
      if (!menuRes.forbidden) say(false, menuRes.message);
      setLoading(false);
      return;
    }

    setForbidden(false);
    setGroups(menuRes.groups);
    setTree(menuRes.menus);

    // 체크값은 트리에서 떼어 평면 맵으로 들고 있는다
    const next: PermMap = {};
    for (const { node } of flatten(menuRes.menus)) next[node.menuIdx] = { ...(node.rolePermissions ?? {}) };
    setPerms(next);

    setCurrentCode((prev) =>
      prev && menuRes.groups.some((g) => g.groupCode === prev)
        ? prev
        : (menuRes.groups.find((g) => g.groupCode === "admin") ?? menuRes.groups[0])?.groupCode ?? null,
    );
    setDirty(false);
    setLoading(false);
  }, [say]);

  useEffect(() => {
    load();
  }, [load]);

  const group = useMemo(() => groups.find((g) => g.groupCode === currentCode) ?? null, [groups, currentCode]);
  const editableCodes = useMemo(
    () => groups.filter((g) => g.groupCode !== MASTER_CODE).map((g) => g.groupCode),
    [groups],
  );

  // ─── 메뉴 ──────────────────────────────────────────────

  const handleTogglePerm = (node: MenuNode, checked: boolean) => {
    if (!group || group.groupCode === MASTER_CODE) return;
    setPerms((prev) => togglePermission(tree, prev, node, group.groupCode, checked));
    setDirty(true);
  };

  const handleTreeChange = (next: MenuNode[]) => {
    setTree(next);
    // 구조가 바뀌면 묶음 메뉴 체크를 다시 계산한다 (상위 = 직속 자식 중 하나라도 체크)
    setPerms((prev) => recomputeAll(next, prev, editableCodes));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await saveMenus(flattenForSave(tree, perms));
      say(true, r.message);
      await load();
    } catch (e) {
      say(false, (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleMenuSubmit = async (v: MenuFormValue) => {
    const editing = dialog?.kind === "menu" ? dialog.editing : null;
    setSaving(true);
    try {
      if (!editing) {
        const r = await createMenu(v);
        say(true, r.message);
      } else {
        await updateMenu(editing.menuIdx, {
          menuName: v.menuName,
          menuPath: v.menuPath,
          menuIcon: v.menuIcon,
        });

        // 상위가 바뀌었으면 트리에서 옮긴 뒤 순서까지 같이 저장한다 (한 동작으로 끝나야 한다)
        const currentParent = findParentIdx(tree, editing.menuIdx);
        if (currentParent !== v.parentIdx) {
          if (v.parentIdx !== null && isDescendant(editing, v.parentIdx)) {
            say(false, "자기 자신의 하위로는 옮길 수 없습니다.");
            return;
          }
          const without = removeById(tree, editing.menuIdx);
          const moved =
            v.parentIdx === null
              ? [...without, { ...editing, menuName: v.menuName, menuPath: v.menuPath, menuIcon: v.menuIcon }]
              : insertInto(without, v.parentIdx, {
                  ...editing,
                  menuName: v.menuName,
                  menuPath: v.menuPath,
                  menuIcon: v.menuIcon,
                });
          await saveMenus(flattenForSave(moved, recomputeAll(moved, perms, editableCodes)));
        }
        say(true, "메뉴를 수정했습니다.");
      }
      setDialog(null);
      await load();
    } catch (e) {
      say(false, (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const askDeleteMenu = (node: MenuNode) => {
    const size = subtreeSize(node);
    setDialog({
      kind: "confirm",
      title: "메뉴 삭제",
      danger: true,
      confirmLabel: "삭제",
      message:
        size > 1
          ? `'${node.menuName}' 과 하위 메뉴 ${size - 1}개를 함께 삭제합니다.\n되돌릴 수 없습니다. 삭제할까요?`
          : `'${node.menuName}' 메뉴를 삭제할까요?`,
      run: async () => {
        const r = await deleteMenu(node.menuIdx);
        say(true, r.message);
        await load();
      },
    });
  };

  // ─── 권한 그룹 ─────────────────────────────────────────

  const handleCreateGroup = async (groupName: string) => {
    try {
      const r = await createGroup(groupName);
      say(true, r.message);
      await load();
      setCurrentCode(r.data.groupCode);
    } catch (e) {
      say(false, (e as Error).message);
    }
  };

  const handleRenameGroup = async (g: GroupRow, groupName: string) => {
    try {
      await renameGroup(g.groupIdx, groupName);
      say(true, "권한명을 변경했습니다.");
      await load();
    } catch (e) {
      say(false, (e as Error).message);
    }
  };

  const askDeleteGroup = (g: GroupRow) => {
    setDialog({
      kind: "confirm",
      title: "권한 삭제",
      danger: true,
      confirmLabel: "삭제",
      message:
        g.userCount > 0
          ? `'${g.groupName}' 을 삭제하면 소속 계정 ${g.userCount}명은 권한 그룹이 없어집니다.\n그 계정들은 로그인해도 메뉴가 비어 보입니다. 삭제할까요?`
          : `'${g.groupName}' 권한을 삭제할까요?`,
      run: async () => {
        await deleteGroup(g.groupIdx);
        say(true, "권한을 삭제했습니다.");
        if (currentCode === g.groupCode) setCurrentCode(null);
        await load();
      },
    });
  };

  // ─── 계정 ──────────────────────────────────────────────

  const runOnUser = async (user: AdminRow, fn: () => Promise<{ message: string }>) => {
    setBusyIdx(user.userIdx);
    try {
      const r = await fn();
      say(true, r.message);
      await load();
    } catch (e) {
      say(false, (e as Error).message);
    } finally {
      setBusyIdx(null);
    }
  };

  const handleChangeGroup = (user: AdminRow, groupIdx: number) => {
    const target = groups.find((g) => g.groupIdx === groupIdx);
    if (!target) return;

    // master 로 올리거나 master 에서 내리는 건 되돌리기 쉽지 않으니 한 번 묻는다
    if (target.groupCode === MASTER_CODE || user.userRole === MASTER_CODE) {
      setDialog({
        kind: "confirm",
        title: "등급 변경",
        danger: false,
        confirmLabel: "변경",
        message:
          target.groupCode === MASTER_CODE
            ? `'${user.userId}' 을 최고 관리자(master)로 올립니다.\n모든 메뉴와 권한 관리 화면을 쓸 수 있게 됩니다.`
            : `'${user.userId}' 의 최고 관리자 권한을 내리고 '${target.groupName}' 으로 바꿉니다.`,
        run: async () => {
          await patchAdminAccount({ userIdx: user.userIdx, groupIdx });
          say(true, "등급을 변경했습니다.");
          await load();
        },
      });
      return;
    }

    runOnUser(user, () => patchAdminAccount({ userIdx: user.userIdx, groupIdx }));
  };

  const handleToggleStatus = (user: AdminRow) => {
    const next = user.userStatus === 1 ? 0 : 1;
    if (next === 0) {
      setDialog({
        kind: "confirm",
        title: "계정 비활성화",
        danger: true,
        confirmLabel: "비활성화",
        message: `'${user.userId}' 계정을 비활성화합니다.\n비활성 계정은 로그인할 수 없습니다.`,
        run: async () => {
          await patchAdminAccount({ userIdx: user.userIdx, userStatus: 0 });
          say(true, "계정을 비활성화했습니다.");
          await load();
        },
      });
      return;
    }
    runOnUser(user, () => patchAdminAccount({ userIdx: user.userIdx, userStatus: 1 }));
  };

  const askDeleteAccount = (user: AdminRow) => {
    setDialog({
      kind: "confirm",
      title: "계정 삭제",
      danger: true,
      confirmLabel: "완전 삭제",
      message: `'${user.userId}' 계정을 완전히 삭제합니다.\n되돌릴 수 없습니다. 로그인만 막으려면 '비활성화'를 쓰세요.`,
      run: async () => {
        await deleteAdminAccount(user.userIdx);
        say(true, "계정을 삭제했습니다.");
        await load();
      },
    });
  };

  const handleCreateAccount = async (v: { userId: string; userPw: string; groupIdx: number }) => {
    setSaving(true);
    try {
      const r = await createAdminAccount(v);
      say(true, r.message);
      setDialog(null);
      await load();
    } catch (e) {
      say(false, (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  // ─── 렌더 ──────────────────────────────────────────────

  if (forbidden) {
    return (
      <main className="flex w-full max-w-[1480px] flex-col gap-4 px-7 pb-6 pt-6 text-[#151A26]">
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">권한 관리</h1>
        <div className="rounded-[14px] border border-[#E6E9F0] bg-white px-[22px] py-12 text-center">
          <p className="text-[14px] font-bold text-[#151A26]">최고 관리자(master) 계정만 사용할 수 있는 화면입니다.</p>
          <p className="mt-1.5 text-[13px] text-[#8A91A3] break-keep">
            권한이 필요하면 최고 관리자에게 요청해주세요.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex w-full max-w-[1480px] flex-col gap-4 px-7 pb-6 pt-6 text-[#151A26]">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em]">권한 관리</h1>
        <p className="mt-1 text-[13px] text-[#7A8296]">
          권한별로 보이는 메뉴를 정하고, 어드민 계정을 관리합니다.
        </p>
      </div>

      {notice && (
        <div
          role={notice.ok ? "status" : "alert"}
          className="flex items-start justify-between gap-3 rounded-[12px] px-3.5 py-2.5 text-[13px]"
          style={{
            color: notice.ok ? "#0E7A43" : "#C23B3B",
            background: notice.ok ? "#E4F6EC" : "#FDECEC",
          }}
        >
          <span className="break-keep">{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="알림 닫기" className="shrink-0 opacity-60">
            ✕
          </button>
        </div>
      )}

      <GroupBar
        groups={groups}
        currentCode={currentCode}
        onSelect={setCurrentCode}
        onManage={() => setDialog({ kind: "groups" })}
        loading={loading}
      />

      <div className="flex flex-col gap-4 lg:flex-row">
        <MenuPanel
          tree={tree}
          perms={perms}
          group={group}
          dirty={dirty}
          saving={saving}
          loading={loading}
          onTreeChange={handleTreeChange}
          onTogglePerm={handleTogglePerm}
          onAddMenu={() => setDialog({ kind: "menu", editing: null })}
          onEditMenu={(node) => setDialog({ kind: "menu", editing: node })}
          onDeleteMenu={askDeleteMenu}
          onSave={handleSave}
          onNotice={(m) => say(false, m)}
        />

        <AccountPanel
          admins={admins}
          groups={groups}
          currentCode={currentCode}
          loading={loading}
          busyIdx={busyIdx}
          onChangeGroup={handleChangeGroup}
          onToggleStatus={handleToggleStatus}
          onResetPassword={(user) => setDialog({ kind: "password", user })}
          onDelete={askDeleteAccount}
          onAdd={() => setDialog({ kind: "account" })}
        />
      </div>

      {dialog?.kind === "menu" && (
        <MenuFormModal
          tree={tree}
          editing={dialog.editing}
          saving={saving}
          onClose={() => setDialog(null)}
          onSubmit={handleMenuSubmit}
        />
      )}

      {dialog?.kind === "groups" && (
        <GroupModal
          groups={groups}
          busy={saving}
          onClose={() => setDialog(null)}
          onCreate={handleCreateGroup}
          onRename={handleRenameGroup}
          onDelete={askDeleteGroup}
        />
      )}

      {dialog?.kind === "account" && (
        <AccountFormModal
          groups={groups}
          saving={saving}
          onClose={() => setDialog(null)}
          onSubmit={handleCreateAccount}
        />
      )}

      {dialog?.kind === "password" && (
        <PasswordModal
          userId={dialog.user.userId}
          busy={busyIdx === dialog.user.userIdx}
          onClose={() => setDialog(null)}
          onSubmit={async (pw) => {
            const user = dialog.user;
            setDialog(null);
            await runOnUser(user, () => patchAdminAccount({ userIdx: user.userIdx, userPw: pw }));
          }}
        />
      )}

      {dialog?.kind === "confirm" && (
        <ConfirmModal
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          danger={dialog.danger}
          busy={saving}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            const run = dialog.run;
            setSaving(true);
            try {
              await run();
              setDialog(null);
            } catch (e) {
              say(false, (e as Error).message);
              setDialog(null);
            } finally {
              setSaving(false);
            }
          }}
        />
      )}
    </main>
  );
}
