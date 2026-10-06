"use client";

/**
 * '데이터 보강' 오른쪽 상세 패널: 기본 정보 + 메뉴/이미지/URL 탭 편집.
 *
 * 편집은 초안(draft)에 모았다가 '변경 저장'에서 바뀐 필드만 PUT 한다.
 * '재수집'(메뉴·이미지·전체)은 recollect() 결과를 초안에 채울 뿐 바로 저장하지 않는다 —
 * 이름만 비슷한 다른 가게가 걸릴 수 있어 사람이 보고 저장하게 한다.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { C, SOURCE_TAG, apiSend, imageSrc, parseMenu, sourceFromUrl, type MenuItem, type RestaurantRow } from "./shared";
import { recollect, type RecollectField } from "./recollect";

export type DetailTab = "메뉴" | "이미지" | "URL";

interface Draft {
  menu: Array<{ name: string; price: string }>;
  image: string;
  url: string;
}

function draftOf(r: RestaurantRow): Draft {
  return {
    menu: parseMenu(r.restaurantMenu).map((m) => ({ name: m.name || "", price: m.price == null ? "" : String(m.price) })),
    image: r.restaurantImage || "",
    url: r.restaurantURL || "",
  };
}

function cleanMenu(menu: Draft["menu"]): MenuItem[] {
  return menu.map((m) => ({ name: m.name.trim(), price: m.price.trim() })).filter((m) => m.name !== "");
}

function fmtDate(v?: string): string {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

const inputCls =
  "h-9 min-w-0 rounded-lg border border-[#E3E6EE] px-2.5 text-[13px] text-[#151A26] focus:border-[#1552D6] focus:outline-none";

export function EnrichDetailPanel({
  row,
  tab,
  onTabChange,
  onClose,
  onSaved,
}: {
  row: RestaurantRow;
  tab: DetailTab;
  onTabChange: (t: DetailTab) => void;
  onClose: () => void;
  /** 저장 성공 시 바뀐 필드를 목록에 반영 */
  onSaved: (patch: Partial<RestaurantRow>) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(row));
  const [busy, setBusy] = useState<null | "save" | RecollectField | "all">(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  // 다른 식당을 고르면 초안을 새로 만든다
  useEffect(() => {
    setDraft(draftOf(row));
    setNotice(null);
  }, [row.restaurantIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  const base = useMemo(() => draftOf(row), [row]);
  const menuChanged = JSON.stringify(cleanMenu(draft.menu)) !== JSON.stringify(cleanMenu(base.menu));
  const imageChanged = draft.image.trim() !== base.image.trim();
  const urlChanged = draft.url.trim() !== base.url.trim();
  const dirty = menuChanged || imageChanged || urlChanged;

  const menuN = cleanMenu(draft.menu).length;
  const imgN = draft.image.trim() ? 1 : 0;
  const urlN = draft.url.trim() ? 1 : 0;
  const src = sourceFromUrl(row.restaurantURL);
  const coord =
    row.restaurantLatX && row.restaurantLatY
      ? `${Number(row.restaurantLatX).toFixed(6)}, ${Number(row.restaurantLatY).toFixed(6)}`
      : "-";

  const runRecollect = async (fields: RecollectField[], label: RecollectField | "all") => {
    setBusy(label);
    setNotice(null);
    try {
      const res = await recollect(row, fields);
      const got: string[] = [];
      setDraft((d) => {
        const next = { ...d };
        if (res.menu) {
          next.menu = res.menu.map((m) => ({ name: m.name || "", price: m.price == null ? "" : String(m.price) }));
          got.push(`메뉴 ${res.menu.length}개`);
        }
        if (res.image) {
          next.image = res.image;
          got.push("이미지");
        }
        if (res.url) {
          next.url = res.url;
          got.push("URL");
        }
        return next;
      });
      if (got.length > 0) {
        const who = res.matched.map((m) => `${SOURCE_TAG[m.source].label} '${m.name}'`).join(", ");
        setNotice({ ok: true, text: `${who}에서 ${got.join("·")}을(를) 찾았어요. 확인 후 변경 저장을 눌러주세요.` });
      } else {
        setNotice({
          ok: false,
          text: res.errors.length ? `재수집 실패 — ${res.errors.join(" / ")}` : "이름이 맞는 가게를 찾지 못했어요. 직접 입력해 주세요.",
        });
      }
    } finally {
      setBusy(null);
    }
  };

  const save = async () => {
    const patch: Record<string, unknown> = {};
    if (menuChanged) {
      const m = cleanMenu(draft.menu);
      patch.restaurantMenu = m.length ? m : null;
    }
    if (imageChanged) patch.restaurantImage = draft.image.trim() || null;
    // restaurantURL 은 NOT NULL 컬럼이라 비울 때도 빈 문자열로 보낸다
    if (urlChanged) patch.restaurantURL = draft.url.trim();
    if (Object.keys(patch).length === 0) return;

    setBusy("save");
    setNotice(null);
    try {
      const res = await apiSend<{ data?: { restaurantImage?: string } }>("PUT", `/admin/restaurant/${row.restaurantIdx}`, patch);
      // base64 로 올린 이미지는 서버가 저장 경로로 바꿔 돌려준다
      const saved = { ...patch } as Partial<RestaurantRow>;
      if (imageChanged && draft.image.startsWith("data:") && res?.data?.restaurantImage) saved.restaurantImage = res.data.restaurantImage;
      onSaved(saved);
      setNotice({ ok: true, text: "저장했어요." });
    } catch (e) {
      setNotice({ ok: false, text: (e as Error).message || "저장에 실패했습니다." });
    } finally {
      setBusy(null);
    }
  };

  const onPickFile = (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setNotice({ ok: false, text: "5MB 이하 이미지만 올릴 수 있어요." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraft((d) => ({ ...d, image: String(reader.result || "") }));
    reader.readAsDataURL(file);
  };

  const tabs: Array<{ key: DetailTab; n: number }> = [
    { key: "메뉴", n: menuN },
    { key: "이미지", n: imgN },
    { key: "URL", n: urlN },
  ];

  const btnGhost =
    "whitespace-nowrap rounded-lg border border-[#DDE1EA] bg-white px-3 py-2 text-[12.5px] font-semibold text-[#151A26] hover:bg-[#F6F7FA] disabled:opacity-50";
  const btnPrimary =
    "whitespace-nowrap rounded-lg bg-[#1552D6] px-3 py-2 text-[12.5px] font-bold text-white hover:bg-[#0E3FAA] disabled:bg-[#AEB5C6]";

  return (
    <div className="sticky top-[76px] flex max-h-[calc(100vh-96px)] min-w-[320px] max-w-full flex-[0_1_420px] flex-col overflow-hidden rounded-[14px] border border-[#E6E9F0] bg-white">
      <div className="flex items-start justify-between gap-2.5 border-b border-[#EEF0F5] px-[18px] py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-[7px]">
            {src ? (
              <span className="rounded-[5px] px-1.5 py-[3px] text-[10.5px] font-extrabold" style={{ color: SOURCE_TAG[src].fg, background: SOURCE_TAG[src].bg }}>
                {SOURCE_TAG[src].label}
              </span>
            ) : (
              <span className="rounded-[5px] bg-[#EEF0F5] px-1.5 py-[3px] text-[10.5px] font-extrabold text-[#5A6275]">출처 미상</span>
            )}
            <span className="text-[12px] text-[#8A91A3]">{row.restaurantType || "-"}</span>
          </div>
          <div className="mt-1.5 break-keep text-[18px] font-extrabold tracking-[-0.02em]">{row.restaurantName}</div>
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
            ["지역", row.restaurantLocation || "-"],
            ["주소", row.restaurantAddr || "-"],
            ["좌표", coord],
            ["수정일", fmtDate(row.updatedAt || row.createdAt)],
            ["조회수", (row.restaurantViewCount ?? 0).toLocaleString()],
          ].map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-[#8A91A3]">{k}</dt>
              <dd className="break-all tabular-nums text-[#151A26]">{v}</dd>
            </div>
          ))}
        </dl>

        <div role="tablist" aria-label="보강 필드" className="flex gap-[18px] border-b border-[#EEF0F5] px-[18px]">
          {tabs.map((t) => {
            const on = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => onTabChange(t.key)}
                className="-mb-px flex items-center gap-[5px] whitespace-nowrap border-b-2 py-3 text-[13px]"
                style={{ fontWeight: on ? 800 : 500, color: on ? C.ink : C.faint, borderColor: on ? C.ink : "transparent" }}
              >
                {t.key} {t.n}
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: t.n ? "transparent" : "#E05555" }} aria-label={t.n ? undefined : "없음"} />
              </button>
            );
          })}
        </div>

        <div className="px-[18px] py-3.5" role="tabpanel">
          {tab === "메뉴" &&
            (draft.menu.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {draft.menu.map((m, i) => (
                  <div key={i} className="flex gap-1.5">
                    <input
                      value={m.name}
                      aria-label={`메뉴 ${i + 1} 이름`}
                      placeholder="메뉴명"
                      onChange={(e) => setDraft((d) => ({ ...d, menu: d.menu.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) }))}
                      className={`${inputCls} flex-1`}
                    />
                    <input
                      value={m.price}
                      aria-label={`메뉴 ${i + 1} 가격`}
                      placeholder="가격"
                      onChange={(e) => setDraft((d) => ({ ...d, menu: d.menu.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)) }))}
                      className={`${inputCls} w-[92px] text-right tabular-nums`}
                    />
                    <button
                      type="button"
                      aria-label={`메뉴 ${i + 1} 삭제`}
                      onClick={() => setDraft((d) => ({ ...d, menu: d.menu.filter((_, j) => j !== i) }))}
                      className="flex h-9 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] text-[#8A91A3] hover:bg-[#FDECEC] hover:text-[#C23B3B]"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, menu: [...d.menu, { name: "", price: "" }] }))}
                  className="mt-0.5 h-9 rounded-lg border border-dashed border-[#CBD2E0] bg-white text-[12.5px] font-semibold text-[#5A6275] hover:border-[#1552D6] hover:text-[#1552D6]"
                >
                  + 메뉴 추가
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2.5 py-[22px] text-center">
                <div className="text-[13px] text-[#7A8296]">수집된 메뉴가 없습니다.</div>
                <div className="flex gap-1.5">
                  <button type="button" className={btnGhost} onClick={() => setDraft((d) => ({ ...d, menu: [{ name: "", price: "" }] }))}>
                    직접 입력
                  </button>
                  <button type="button" className={btnPrimary} disabled={busy !== null} onClick={() => runRecollect(["menu"], "menu")}>
                    {busy === "menu" ? "찾는 중…" : "메뉴 재수집"}
                  </button>
                </div>
              </div>
            ))}

          {tab === "이미지" && (
            <div className="flex flex-col items-center gap-2.5 py-[22px] text-center">
              {draft.image.trim() ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageSrc(draft.image.trim()) || ""}
                  alt={`${row.restaurantName} 대표 이미지`}
                  className="h-[168px] w-full max-w-[300px] rounded-lg border border-[#E6E9F0] object-cover"
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.opacity = "0.3")}
                />
              ) : (
                <div className="grid grid-cols-[repeat(3,56px)] gap-1.5" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-14 rounded-lg border-[1.5px] border-dashed border-[#D5D9E2]" />
                  ))}
                </div>
              )}
              <div className="text-[13px] text-[#7A8296]">{draft.image.trim() ? "대표 이미지 1장" : "수집된 이미지가 없습니다."}</div>
              <div className="flex gap-1.5">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => onPickFile(e.target.files?.[0])} />
                <button type="button" className={btnGhost} onClick={() => fileRef.current?.click()}>
                  업로드
                </button>
                {draft.image.trim() && (
                  <button type="button" className={btnGhost} onClick={() => setDraft((d) => ({ ...d, image: "" }))}>
                    비우기
                  </button>
                )}
                <button type="button" className={btnPrimary} disabled={busy !== null} onClick={() => runRecollect(["image"], "image")}>
                  {busy === "image" ? "찾는 중…" : "이미지 재수집"}
                </button>
              </div>
            </div>
          )}

          {tab === "URL" && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                {(() => {
                  const s = sourceFromUrl(draft.url);
                  return (
                    <span
                      className="w-[52px] shrink-0 rounded-[5px] px-1.5 py-[3px] text-center text-[10.5px] font-extrabold"
                      style={s ? { color: SOURCE_TAG[s].fg, background: SOURCE_TAG[s].bg } : { color: C.neutralFg, background: C.neutralBg }}
                    >
                      {s ? SOURCE_TAG[s].label : "기타"}
                    </span>
                  );
                })()}
                <input
                  value={draft.url}
                  aria-label="URL"
                  placeholder="https://place.map.kakao.com/…"
                  onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))}
                  className={`${inputCls} flex-1 text-[12.5px]`}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                {draft.url.trim() ? (
                  <a href={draft.url.trim()} target="_blank" rel="noopener noreferrer" className="text-[12px] font-semibold text-[#1552D6] hover:underline">
                    새 창에서 열기 ↗
                  </a>
                ) : (
                  <span className="text-[12px] text-[#8A91A3]">URL 이 없습니다.</span>
                )}
                <button type="button" className={btnGhost} disabled={busy !== null} onClick={() => runRecollect(["url"], "url")}>
                  {busy === "url" ? "찾는 중…" : "URL 재수집"}
                </button>
              </div>
            </div>
          )}

          {notice && (
            <p role="status" className="mt-3 rounded-lg px-3 py-2 text-[12px] font-semibold" style={{ color: notice.ok ? C.okFg : C.badFg, background: notice.ok ? C.okBg : C.badBg }}>
              {notice.text}
            </p>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-t border-[#EEF0F5] bg-[#FAFBFD] px-[18px] py-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => runRecollect(["menu", "image", "url"], "all")}
          className="h-10 flex-1 whitespace-nowrap rounded-[10px] border border-[#CBD2E0] bg-white text-[13px] font-bold text-[#151A26] hover:bg-[#F6F7FA] disabled:opacity-50"
        >
          {busy === "all" ? "재수집 중…" : "전체 재수집"}
        </button>
        <button
          type="button"
          disabled={!dirty || busy !== null}
          onClick={save}
          className="h-10 flex-1 whitespace-nowrap rounded-[10px] bg-[#1552D6] text-[13px] font-bold text-white hover:bg-[#0E3FAA] disabled:cursor-not-allowed disabled:bg-[#AEB5C6]"
        >
          {busy === "save" ? "저장 중…" : "변경 저장"}
        </button>
      </div>
    </div>
  );
}
