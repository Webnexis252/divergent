const fs = require('fs');
const file = 'src/app/dashboard/_components/student-live-classroom-page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Rewrite MetricCard
const newMetricCard = `function MetricCard({
  hint,
  icon: Icon,
  label,
  value,
}: {
  hint: string;
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <AnimCard>
      <article className="flex items-center gap-3 rounded-[20px] bg-white p-3 shadow-sm ring-1 ring-black/5 sm:hidden">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-[#38c1ff]/10 text-[#38c1ff]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-black/42">{label}</p>
          <p className="truncate text-[14px] font-semibold text-black">{value}</p>
        </div>
      </article>
      <article className="hidden flex-col rounded-[24px] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-black/5 transition-transform hover:-translate-y-1 sm:flex sm:p-6 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-[14px] bg-[#38c1ff]/10 text-[#38c1ff]">
            <Icon className="h-5 w-5" />
          </div>
          <p className="text-right text-[12px] font-semibold uppercase tracking-[0.14em] text-black/42">
            {label}
          </p>
        </div>
        <p className="mt-5 break-words text-[1.15rem] font-semibold leading-[1.25] text-black">{value}</p>
        <p className="mt-2 break-words text-[13px] leading-6 text-black/52">{hint}</p>
      </article>
    </AnimCard>
  );
}`;
content = content.replace(/function MetricCard\(\{[^}]+\}[^}]+\}[^]+?<\/AnimCard>\s*\n\s*\}/m, newMetricCard);

// 2. Add padding to main for the fixed bottom bar
content = content.replace(
  /<main className="min-h-screen overflow-x-hidden bg-\[#f7f5f4\]">/,
  '<main className="min-h-screen overflow-x-hidden bg-[#f7f5f4] pb-28 sm:pb-0">'
);

// 3. Make Hero edge-to-edge on mobile
content = content.replace(
  /className=\{cx\(\n\s*"relative overflow-hidden rounded-\[30px\] px-5 py-6 shadow-\[0_18px_44px_rgba\(15,23,42,0\.16\)\] sm:rounded-\[24px\] sm:px-8 sm:py-10 sm:shadow-\[0_4px_10px_rgba\(0,0,0,0\.16\)\]",\n\s*meta\.accentClass,\n\s*\)\}/,
  'className={cx("relative overflow-hidden -mx-3 -mt-4 px-5 py-8 sm:mx-0 sm:mt-0 rounded-b-[36px] shadow-[0_10px_30px_rgba(15,23,42,0.12)] sm:rounded-[24px] sm:px-8 sm:py-10 sm:shadow-[0_4px_10px_rgba(0,0,0,0.16)]", meta.accentClass)}'
);

// 4. Hero action buttons: extract to fixed bottom bar on mobile
const actionButtonsSectionRegex = /<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">[^]*?<\/div>\s*<\/div>\s*<\/div>/m;
const match = content.match(actionButtonsSectionRegex);

if (match) {
  const newActionButtons = `
<div className="fixed bottom-0 left-0 right-0 z-50 border-t border-black/5 bg-white/90 p-4 pb-safe backdrop-blur-xl sm:static sm:z-auto sm:mt-8 sm:border-none sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
  <div className="mx-auto flex w-full max-w-md items-center gap-3 sm:max-w-none sm:flex-row">
    {tone === "completed" ? (
      <Link
        className={actionButtonStyles(\`flex-1 justify-center whitespace-nowrap \${meta.actionClass} py-3.5 sm:w-auto sm:py-3 text-[15px]\`)}
        href={primaryHref}
        target={focusClass?.recordingUrl ? "_blank" : undefined}
      >
        <PlayCircle className="h-5 w-5 sm:h-4 sm:w-4" />
        {primaryLabel}
      </Link>
    ) : (
      <button
        className={actionButtonStyles(\`flex-1 justify-center whitespace-nowrap \${meta.actionClass} py-3.5 sm:w-auto sm:py-3 text-[15px]\`)}
        onClick={meetStarted ? endMeeting : startMeeting}
        type="button"
      >
        {meetStarted ? (
          <PhoneOff className="h-5 w-5 sm:h-4 sm:w-4" />
        ) : (
          <LogIn className="h-5 w-5 sm:h-4 sm:w-4" />
        )}
        {primaryLabel}
      </button>
    )}
    <button
      className={actionButtonStyles(\`shrink-0 justify-center px-4 py-3.5 text-[14px] sm:w-auto sm:py-2.5 sm:text-[13.5px] \${attendanceMarked ? "bg-[#f0fdf4] text-[#15803d]" : meta.secondaryActionClass}\`)}
      onClick={() => markAttendance("JOIN")}
      disabled={attendanceMarked || tone !== "live"}
      type="button"
    >
      <CheckCircle2 className="h-5 w-5 sm:h-4 sm:w-4" />
      <span className="hidden sm:inline">{attendanceMarked ? "Attendance Marked" : "Attendance"}</span>
    </button>
    <button
      className={actionButtonStyles(\`shrink-0 justify-center px-4 py-3.5 text-[14px] sm:w-auto sm:py-2.5 sm:text-[13.5px] \${meta.secondaryActionClass}\`)}
      onClick={() => handleMessagesOpenChange(!messagesOpen)}
      type="button"
    >
      <MessageCircleMore className="h-5 w-5 sm:h-4 sm:w-4" />
      <span className="hidden sm:inline">{messagesOpen ? "Hide Thread" : "Show Thread"}</span>
    </button>
  </div>
</div>
</div>
</div>`;
  content = content.replace(actionButtonsSectionRegex, newActionButtons);
}

// 5. Change MetricCards StaggerGrid to 1 column on mobile (since they are horizontal pills now)
content = content.replace(
  /<StaggerGrid className="grid grid-cols-1 gap-3 min-\[380px\]:grid-cols-2 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">/,
  '<StaggerGrid className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">'
);

// 6. Fix "Classroom Stage" container to be edge-to-edge on mobile, giving it an app feel
content = content.replace(
  /<section className="overflow-hidden rounded-\[28px\] bg-white p-4 shadow-\[0_14px_34px_rgba\(15,23,42,0\.08\)\] sm:rounded-\[24px\] sm:p-6 sm:shadow-\[0_4px_10px_rgba\(0,0,0,0\.08\)\]">/g,
  '<section className="overflow-hidden bg-white px-5 py-6 shadow-sm -mx-3 sm:mx-0 sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">'
);

// 7. Make the "What Happens Here" blocks horizontal scroll on mobile, wrap on desktop
content = content.replace(
  /<div className="mt-4 space-y-3">/,
  '<div className="scrollbar-none mt-4 flex snap-x gap-3 overflow-x-auto pb-2 sm:block sm:space-y-3 sm:overflow-visible sm:pb-0">'
);
content = content.replace(
  /className="rounded-\[18px\] bg-white px-4 py-4 text-\[14px\] leading-7 text-black\/68 shadow-\[0_4px_10px_rgba\(0,0,0,0\.04\)\]"/g,
  'className="min-w-[240px] shrink-0 snap-start rounded-[18px] bg-white px-4 py-4 text-[14px] leading-7 text-black/68 shadow-[0_4px_10px_rgba(0,0,0,0.04)] sm:min-w-0"'
);

// 8. Fix pb-safe css class
if (!content.includes('pb-safe')) {
  // We can just use pb-[calc(1rem+env(safe-area-inset-bottom))] instead of tailwind pb-safe if it's not configured
  content = content.replace(/pb-safe/g, 'pb-[calc(1rem+env(safe-area-inset-bottom))]');
}

fs.writeFileSync(file, content);
console.log("Mobile layout replaced.");
