import { CategoryPerformanceItem } from "@/lib/test-category-performance";

function toPolarPoint(center: number, radius: number, angle: number) {
  const normalizedAngle = angle - Math.PI / 2;
  return {
    x: center + radius * Math.cos(normalizedAngle),
    y: center + radius * Math.sin(normalizedAngle),
  };
}

function describeSectorPath(
  center: number,
  radius: number,
  startAngle: number,
  endAngle: number
) {
  const start = toPolarPoint(center, radius, startAngle);
  const end = toPolarPoint(center, radius, endAngle);
  return `M ${center} ${center} L ${start.x} ${start.y} A ${radius} ${radius} 0 0 1 ${end.x} ${end.y} Z`;
}

export function CategoryPerformancePanel({
  items,
  title = "Category Performance",
  description = "How this result breaks down across your question tags.",
}: {
  items: CategoryPerformanceItem[];
  title?: string;
  description?: string;
}) {
  if (items.length === 0) return null;

  const pendingCount = items.reduce((sum, item) => sum + item.pendingCount, 0);
  const totalQuestions = items.reduce((sum, item) => sum + item.questionCount, 0);
  const chartSize = 268;
  const center = chartSize / 2;
  const outerRadius = 96;
  const ringCount = 5;
  const angleStep = (Math.PI * 2) / items.length;

  return (
    <section className="flex flex-col gap-5 text-left">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="m-0 text-base font-bold text-(--text-strong)">{title}</h3>
          <p className="mt-1.5 text-sm leading-6 text-(--text-muted)">
            {description}
          </p>
        </div>
      </div>

      <div className="grid items-center gap-6 md:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
        <div className="flex flex-col items-center gap-3">
          <div className="flex w-full items-center justify-center p-2">
            <svg
              className="h-[268px] w-[268px] overflow-visible"
              viewBox={`0 0 ${chartSize} ${chartSize}`}
              role="img"
              aria-label={title}
            >
              {items.map((item, index) => {
                const startAngle = index * angleStep;
                const endAngle = startAngle + angleStep;
                const radius = Math.max(outerRadius * (item.score / 100), 1);

                return (
                  <path
                    key={item.category}
                    d={describeSectorPath(center, radius, startAngle, endAngle)}
                    fill={item.color}
                    fillOpacity="0.8"
                    stroke="none"
                  />
                );
              })}

              {Array.from({ length: ringCount }).map((_, index) => {
                const radius = (outerRadius / ringCount) * (index + 1);
                return (
                  <circle
                    key={`ring-${radius}`}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke="#d9dde5"
                    strokeWidth="1"
                  />
                );
              })}

              {items.map((item, index) => {
                const angle = index * angleStep;
                const point = toPolarPoint(center, outerRadius, angle);
                return (
                  <line
                    key={`axis-${item.category}`}
                    x1={center}
                    y1={center}
                    x2={point.x}
                    y2={point.y}
                    stroke="#d9dde5"
                    strokeWidth="1"
                  />
                );
              })}

              <circle
                cx={center}
                cy={center}
                r={outerRadius}
                fill="none"
                stroke="#d9dde5"
                strokeWidth="1"
              />
            </svg>
          </div>

          <div className="text-xs text-(--text-muted)">
            {totalQuestions} tagged question{totalQuestions === 1 ? "" : "s"}
          </div>

          {pendingCount > 0 && (
            <div className="rounded-full bg-[rgba(245,158,11,0.12)] px-3 py-2 text-xs font-bold text-[#b45309]">
              {pendingCount} pending review
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <div
              key={item.category}
              className="flex items-center justify-between gap-4 rounded-[18px] bg-[rgba(248,250,252,0.96)] px-4 py-3 max-md:flex-col max-md:items-start"
            >
              <div className="flex min-w-0 items-center gap-3.5">
                <span
                  className="h-8 w-8 shrink-0 rounded-[0.85rem]"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />

                <div className="flex min-w-0 flex-col gap-1">
                  <span className="text-sm font-semibold text-(--text-strong)">
                    {item.label}
                  </span>
                  {item.pendingCount > 0 && (
                    <span className="text-xs text-(--text-muted)">
                      {item.pendingCount} pending review
                    </span>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-sm font-semibold tabular-nums text-(--text-strong)">
                {item.score}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
