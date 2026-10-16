"use client";

/**
 * '데이터 보강' 오른쪽 상세 패널: 기본 정보 + 홈페이지/대표이사/업종 편집.
 *
 * 편집은 초안(draft)에 모았다가 '변경 저장'에서 바뀐 필드만 PUT 한다.
 * '재수집'은 recollect() 결과를 초안에 채울 뿐 바로 저장하지 않는다 —
 * 이름만 비슷한 다른 회사가 걸릴 수 있어 사람이 보고 저장하게 한다.
 *
 * 맛잘알 상세 패널과 같은 구성이지만, 회사는 메뉴·이미지가 없어 텍스트 세 칸뿐이다.
 */
import { useEffect, useMemo, useState } from "react";
import { C, SOURCE_TAG, apiSend, isBlank, type CompanyRow } from "./shared";
import { recollect, type RecollectField } from "./recollect";

export type DetailTab = "홈페이지" | "대표이사" | "업종";

const TAB_FIELD: Record<DetailTab, RecollectField> = {
  홈페이지: "url",
  대표이사: "ceo",
  업종: "industry",
};

interface Draft {
  url: string;
  ceo: string;
  industry: string;
}

function draftOf(r: CompanyRow): Draft {
  return {
    url: r.compURL || "",
    // '미정' · '기타' 는 비어 있는 것으로 보고 편집창에도 비워서 보여준다
    ceo: isBlank(r.compCEO, "미정") ? "" : String(r.compCEO),
    industry: isBlank(r.compIndustry, "기타") ? "" : String(r.compIndustry),
  };
}

function fmtDate(v?: string): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

const inputCls =
  "h-9 w-full min-w-0 rounded-lg border border-[#E3E6EE] px-2.5 text-[13px] text-[#151A26] focus:border-[#1552D6] focus:outline-none";

export function EnrichDetailPanel({
  row,
  tab,
  onTabChange,
  onClose,
  onSaved,
}: {
  row: CompanyRow;
  tab: DetailTab;
  onTabChange: (t: DetailTab) => void;
  onClose: () => void;
  /** 저장 성공 시 바뀐 필드를 목록에 반영 */
  onSaved: (patch: Partial<CompanyRow>) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(row));
  const [busy, setBusy] = useState<null | "save" | RecollectField | "all">(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // 다른 회사를 고르면 초안을 새로 만든다
  useEffect(() => {
    setDraft(draftOf(row));
    setNotice(null);
  }, [row.compIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = useMemo(() => draftOf(row), [row]);
  const urlChanged = draft.url.trim() !== base.url.trim();
  const ceoChanged = draft.ceo.trim() !== base.ceo.trim();
  const industryChanged = draft.industry.trim() !== base.industry.trim();
  const dirty = urlChanged || ceoChanged || industryChanged;

  const coord =
    row.compLateX && row.compLateY
      ? `${Number(row.compLateX).toFixed(6)}, ${Number(row.compLateY).toFixed(6)}`
      : "-";

  const runRecollect = async (fields: RecollectField[], label: RecollectField | "all") => {
    setBusy(label);
    setNotice(null);
    try {
      const res = await recollect(row, fields);
      const got: string[] = [];
      setDraft((d) => {
        const next = { ...d };
        if (res.url) { next.url = res.url; got.push("홈페이지"); }
        if (res.ceo) { next.ceo = res.ceo; got.push("대표이사"); }
        if (res.industry) { next.industry = res.industry; got.push("업종"); }
        return next;
      });
      if (got.length > 0) {
        const who = res.matched.map((m) => `${SOURCE_TAG[m.source].label} '${m.name}'`).join(", ");
        setNotice({ ok: true, text: `${who}에서 ${got.join("·")}을(를) 찾았어요. 확인 후 변경 저장을 눌러주세요.` });
      } else {
        setNotice({
          ok: false,
          text: res.errors.length ? `재수집 실패 — ${res.errors.join(" / ")}` : "이름이 맞는 회사를 찾지 못했어요. 직접 입력해 주세요.",
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    const patch: Record<string, unknown> = {};
    // 셋 다 NOT NULL 이거나 플레이스홀더를 쓰는 컬럼이라 비울 때도 문자열로 보낸다
    if (urlChanged) patch.compURL = draft.url.trim();
    if (ceoChanged) patch.compCEO = draft.ceo.trim() || "미정";
    if (industryChanged) patch.compIndustry = draft.industry.trim() || "기타";
    if (Object.keys(patch).length === 0) return;

    setBusy("save");
    setNotice(null);
    try {
      await apiSend("PUT", `/admin/comp/putCompData/${row.compIdx}`, patch);
      onSaved(patch as Partial<CompanyRow>);
      setNotice({ ok: true, text: "저장했어요." });
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message || "저장에 실패했습니다." });
    } finally {
      setBusy(null);
    }
  };

  const filled: Record<DetailTab, boolean> = {
    홈페이지: draft.url.trim() !== "",
    대표이사: draft.ceo.trim() !== "",
    업종: draft.industry.trim() !== "",
  };
  const tabs: DetailTab[] = ["홈페이지", "대표이사", "업종"];

  const btnGhost =
    "whitespace-nowrap rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#151A26] hover:bg-[#F6F7FA] disabled:opacity-50";
  const btnPrimary =
    "whitespace-nowrap rounded-lg bg-[#1552D6] px-3 py-2 text-[12.5px] font-bold text-white hover:bg-[#0E3FAA] disabled:bg-[#AEB5C6]";

  const FIELD_HINT: Record<DetailTab, string> = {
    홈페이지: "https:// 로 시작하는 회사 홈페이지 주소",
    대표이사: "대표자 이름",
    업종: "예: 소프트웨어 개발, 전자상거래",
  };

  const value = tab === "홈페이지" ? draft.url : tab === "대표이사" ? draft.ceo : draft.industry;
  const setValue = (v: string) =>
    setDraft((d) => (tab === "홈페이지" ? { ...d, url: v } : tab === "대표이사" ? { ...d, ceo: v } : { ...d, industry: v }));

  return (
    <div className="sticky top-[76px] flex max-h-[calc(100vh-96px)] min-w-[320px] max-w-full flex-[0_1_420px] flex-col overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
      <div className="flex items-start justify-between gap-2.5 border-b border-[#EEF0F5] px-[18px] py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-[7px]">
            <span className="rounded-[5px] bg-[#EEF0F5] px-1.5 py-[3px] text-[10.5px] font-extrabold text-[#5A6275]">
              {row.compType || "중소기업"}
            </span>
            <span className="text-[12px] text-[#8A91A3]">{isBlank(row.compIndustry, "기타") ? "업종 미상" : row.compIndustry}</span>
          </div>
          <div className="mt-1.5 break-keep text-[18px] font-extrabold tracking-[-0.02em]">{row.compName}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="상세 닫기"
          className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#F1F3F8] text-[12px] text-[#5A6275] hover:bg-[#E6E9F0]"
        >
          ✕
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <dl className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-2.5 gap-y-[9px] border-b border-[#EEF0F5] px-[18px] py-3.5 text-[12.5px]">
          {[
            ["지역", row.compLocate || "-"],
            ["주소", row.compAddr || "-"],
            ["설립", row.compEstablish && row.compEstablish !== "미정" ? row.compEstablish : "-"],
            ["좌표", coord],
            ["수정일", fmtDate(row.updatedAt || row.createdAt)],
            ["조회수", (row.compViewCount ?? 0).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[#8A91A3]">{k}</dt>
              <dd className="break-all tabular-nums text-[#151A26]">{v}</dd>
            </div>
          ))}
        </dl>

        <div role="tablist" aria-label="보강 필드" className="flex gap-[18px] border-b border-[#EEF0F5] px-[18px]">
          {tabs.map((t) => {
            const on = tab === t;
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onTabChange(t)}
                className="-mb-px flex items-center gap-[5px] whitespace-nowrap border-b-2 py-3 text-[13px]"
                style={{ fontWeight: on ? 800 : 500, color: on ? C.ink : C.faint, borderColor: on ? C.ink : "transparent" }}
              >
                {t}
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: filled[t] ? "transparent" : "#E05555" }}
                  aria-label={filled[t] ? undefined : "없음"}
                />
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5 px-[18px] py-3.5" role="tabpanel">
          <input
            value={value}
            aria-label={tab}
            placeholder={FIELD_HINT[tab]}
            onChange={(e) => setValue(e.target.value)}
            className={inputCls}
          />
          {tab === "홈페이지" && draft.url.trim() && (
            <a
              href={draft.url.trim()}
              target="_blank"
              rel="noreferrer noopener"
              className="self-start break-all text-[12px] font-semibold text-[#1552D6] underline"
            >
              열어보기 ↗
            </a>
          )}
          <div className="flex gap-1.5">
            <button
              type="button"
              className={btnGhost}
              disabled={busy !== null}
              onClick={() => runRecollect([TAB_FIELD[tab]], TAB_FIELD[tab])}
            >
              {busy === TAB_FIELD[tab] ? "찾는 중…" : `${tab} 재수집`}
            </button>
            <button
              type="button"
              className={btnGhost}
              disabled={busy !== null}
              onClick={() => runRecollect(["url", "ceo", "industry"], "all")}
            >
              {busy === "all" ? "찾는 중…" : "전체 재수집"}
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div
          role={notice.ok ? "status" : "alert"}
          className="mx-[18px] mb-2 rounded-[12px] px-3 py-2 text-[12.5px]"
          style={{ color: notice.ok ? C.okFg : C.badFg, background: notice.ok ? C.okBg : C.badBg }}
        >
          {notice.text}
        </div>
      )}

      <div className="flex items-center justify-between gap-2.5 border-t border-[#EEF0F5] bg-[#FAFBFD] px-[18px] py-3">
        <span className="text-[12px] text-[#8A91A3]">{dirty ? "저장하지 않은 변경이 있어요" : "변경 없음"}</span>
        <button type="button" className={btnPrimary} disabled={!dirty || busy !== null} onClick={save}>
          {busy === "save" ? "저장 중…" : "변경 저장"}
        </button>
      </div>
    </div>
  );
}
