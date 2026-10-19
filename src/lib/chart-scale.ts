/**
 * Axis ticks on whole, round steps (0/2/4/6, 0/50/100…) for count or money
 * series. An all-zero series still gets a 0–4 axis so the chart has a frame.
 */
export function niceTicks(max: number, target = 4): number[] {
  if (max <= 0) return [0, 1, 2, 3, 4];
  const rough = max / target;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) ?? 10 * magnitude);
  const top = Math.max(Math.ceil(max / step) * step, 2 * step);
  return Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
}
