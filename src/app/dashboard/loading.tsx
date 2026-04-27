export default function DashboardLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div
            className="absolute inset-0 rounded-full border-[3px] border-transparent"
            style={{
              borderTopColor: "var(--primary-blue)",
              borderRightColor: "var(--primary-light-blue)",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
        <p
          className="text-sm font-medium"
          style={{ color: "var(--foreground-muted)" }}
        >
          Loading dashboard…
        </p>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
