export function CourseDetailSkeleton() {
  return (
    <div className="mx-auto max-w-[1368px] space-y-8 animate-pulse">
      <div className="h-[320px] sm:h-[400px] w-full rounded-[28px] bg-[linear-gradient(135deg,rgba(15,23,42,0.08),rgba(56,193,255,0.14))]" />
      
      <div className="grid gap-8 xl:grid-cols-[minmax(0,876px)_391px] xl:items-start">
        <div className="space-y-8">
          <div className="h-[200px] rounded-[16px] bg-[linear-gradient(135deg,rgba(15,23,42,0.05),rgba(56,193,255,0.1))]" />
          <div className="h-[300px] rounded-[16px] bg-[linear-gradient(135deg,rgba(15,23,42,0.05),rgba(56,193,255,0.1))]" />
          <div className="h-[400px] rounded-[16px] bg-[linear-gradient(135deg,rgba(15,23,42,0.05),rgba(56,193,255,0.1))]" />
        </div>
        
        <div className="space-y-6">
          <div className="h-[320px] rounded-[16px] bg-[linear-gradient(135deg,rgba(15,23,42,0.05),rgba(56,193,255,0.1))]" />
          <div className="h-[200px] rounded-[16px] bg-[linear-gradient(135deg,rgba(15,23,42,0.05),rgba(56,193,255,0.1))]" />
        </div>
      </div>
    </div>
  );
}
