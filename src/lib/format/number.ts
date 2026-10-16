/**
 * 숫자 표시 공용 포맷.
 *
 * 조회수·좋아요·접속 집계처럼 자릿수를 예측할 수 없는 값은 좁은 칸에서 줄바꿈되거나
 * 잘리기 쉬워서 K/M 으로 줄여 보여준다. 정확한 값은 title 로 붙여 마우스를 올리면 보이게 한다.
 *
 *   847      → 847
 *   1,240    → 1.2K
 *   502,491  → 502.5K
 *   1,250,000→ 1.3M
 */

/** 천 단위 구분 (정확한 값) */
export const fmtFull = (n: number | null | undefined): string => {
  const v = Number(n);
  return Number.isFinite(v) ? v.toLocaleString("ko-KR") : "0";
};

const UNITS: ReadonlyArray<readonly [number, string]> = [
  [1e9, "B"],
  [1e6, "M"],
  [1e3, "K"],
];

/** K/M 축약. 1,000 미만은 그대로 둔다 */
export const fmtCompact = (n: number | null | undefined): string => {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";

  const abs = Math.abs(v);
  if (abs < 999.5) return String(Math.round(v));

  for (const [div, unit] of UNITS) {
    // 경계를 0.05% 낮춰 잡는다 — 반올림하면 1000이 되는 값(999,999)을
    // 1000K 가 아니라 한 단계 위 단위인 1M 으로 올리기 위해서다
    if (abs >= div * 0.9995) {
      // 소수 한 자리까지, 딱 떨어지면 소수점을 뗀다 (1.0K → 1K)
      return (v / div).toFixed(1).replace(/\.0$/, "") + unit;
    }
  }
  return String(v);
};
