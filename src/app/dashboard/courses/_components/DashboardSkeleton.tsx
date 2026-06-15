export function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1160px] space-y-10 animate-pulse">
      <div className="flex flex-col gap-10">
        <div className="space-y-6">
          <div className="h-10 w-64 rounded-xl bg-[linear-gradient(135deg,rgba(15,23,42,0.08),rgba(56,193,255,0.14))]" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[320px] rounded-[20px] bg-[linear-gradient(135deg,rgba(15,23,42,0.05),rgba(56,193,255,0.1))]"
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-10 w-48 rounded-xl bg-[linear-gradient(135deg,rgba(15,23,42,0.08),rgba(56,193,255,0.14))]" />
          <div className="grid gap-3 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[179px] rounded-[20px] bg-[linear-gradient(135deg,rgba(15,23,42,0.05),rgba(56,193,255,0.1))]"
              />
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="h-10 w-72 rounded-xl bg-[linear-gradient(135deg,rgba(15,23,42,0.08),rgba(56,193,255,0.14))]" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-[360px] rounded-[20px] bg-[linear-gradient(135deg,rgba(15,23,42,0.05),rgba(56,193,255,0.1))]"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
