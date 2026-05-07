const fs = require('fs');
const file = 'src/app/dashboard/_components/student-live-classroom-page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add break-words to MetricCard and make it stunning on mobile
const newMetricCard = `function MetricCard({
  hint,
  icon: Icon,
  label,
  value,
}: {
  hint: string;
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <AnimCard>
      <article className="rounded-[24px] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-black/5 transition-transform hover:-translate-y-1 sm:p-6 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">
        <div className="flex items-start justify-between gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-[#38c1ff]/10 text-[#38c1ff] sm:h-12 sm:w-12 sm:rounded-[16px]">
            <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
          </div>
          <p className="text-right text-[11px] font-semibold uppercase tracking-[0.14em] text-black/42 sm:text-[12px]">
            {label}
          </p>
        </div>
        <p className="mt-4 break-words text-[1.1rem] font-bold leading-[1.25] text-black sm:mt-5 sm:text-[1.2rem]">{value}</p>
        <p className="mt-1.5 break-words text-[13px] leading-5 text-black/52 sm:mt-2 sm:text-[14px] sm:leading-6">{hint}</p>
      </article>
    </AnimCard>
  );
}`;
content = content.replace(/function MetricCard[\s\S]+?<\/AnimCard>\s*\n\s*\}/, newMetricCard);

// 2. Add break-words to RightRailLink
content = content.replace(
  /<p className="text-\[14px\] font-semibold text-black sm:text-\[15px\]">\{title\}<\/p>/g,
  '<p className="break-words text-[14px] font-semibold text-black sm:text-[15px]">{title}</p>'
);
content = content.replace(
  /<p className="text-\[12px\] leading-5 text-black\/54 sm:text-\[13px\] sm:leading-6">\{description\}<\/p>/g,
  '<p className="break-words text-[12px] leading-5 text-black/54 sm:text-[13px] sm:leading-6">{description}</p>'
);

// 3. Update main padding to accommodate mobile floating bar
content = content.replace(
  /<main className="min-h-screen overflow-x-hidden bg-\[#f7f5f4\]">/,
  '<main className="min-h-screen overflow-x-hidden bg-[#f7f5f4] pb-28 sm:pb-0">'
);

// 4. Update the Hero to be edge-to-edge on mobile
content = content.replace(
  /className=\{cx\(\n\s*"relative overflow-hidden rounded-\[30px\] px-5 py-6 shadow-\[0_18px_44px_rgba\(15,23,42,0\.16\)\] sm:rounded-\[24px\] sm:px-8 sm:py-10 sm:shadow-\[0_4px_10px_rgba\(0,0,0,0\.16\)\]",\n\s*meta\.accentClass,\n\s*\)\}/,
  'className={cx("relative overflow-hidden -mx-3 -mt-4 rounded-b-[36px] px-5 py-8 shadow-[0_12px_40px_rgba(15,23,42,0.12)] sm:mx-0 sm:mt-0 sm:rounded-[24px] sm:px-8 sm:py-10 sm:shadow-[0_4px_10px_rgba(0,0,0,0.16)]", meta.accentClass)}'
);

// 5. Enhance typography wrapping in hero
content = content.replace(
  /<h1 className="max-w-\[12ch\] text-\[2\.25rem\] font-semibold leading-\[1\.02\] tracking-\[-0\.05em\] sm:max-w-\[18ch\] sm:text-\[clamp\(2rem,4vw,2\.85rem\)\] sm:leading-\[1\.06\] sm:tracking-\[-0\.04em\]">/g,
  '<h1 className="max-w-[14ch] text-balance text-[2.25rem] font-bold leading-[1.05] tracking-[-0.04em] sm:max-w-[18ch] sm:text-[clamp(2rem,4vw,2.85rem)] sm:leading-[1.06] sm:tracking-[-0.04em]">'
);

content = content.replace(
  /<p className="mt-3 max-w-\[32rem\] text-\[14px\] leading-6 text-current\/86 sm:max-w-\[45rem\] sm:text-\[16px\] sm:leading-7 sm:text-current\/88">/g,
  '<p className="mt-3 max-w-[32rem] text-pretty text-[14px] leading-6 text-current/90 sm:max-w-[45rem] sm:text-[16px] sm:leading-7 sm:text-current/88">'
);

// 6. Action Buttons: Move to a floating bottom bar on mobile
const actionButtonsOriginal = \`<div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
                          {tone === "completed" ? (
                            <Link
                              className={actionButtonStyles(\\\`col-span-2 w-full sm:w-auto \${meta.actionClass}\\\`)}
                              href={primaryHref}
                              target={focusClass?.recordingUrl ? "_blank" : undefined}
                            >
                              <PlayCircle className="h-4 w-4" />
                              {primaryLabel}
                            </Link>
                          ) : (
                            <button
                              className={actionButtonStyles(\\\`col-span-2 w-full sm:w-auto \${meta.actionClass}\\\`)}
                              onClick={meetStarted ? endMeeting : startMeeting}
                              type="button"
                            >
                              {meetStarted ? (
                                <PhoneOff className="h-4 w-4" />
                              ) : (
                                <LogIn className="h-4 w-4" />
                              )}
                              {primaryLabel}
                            </button>
                          )}

                          <button
                            className={actionButtonStyles(\\\`w-full sm:w-auto \${attendanceMarked ? "bg-[#f0fdf4] text-[#15803d]" : meta.secondaryActionClass}\\\`)}
                            onClick={() => markAttendance("JOIN")}
                            disabled={attendanceMarked || tone !== "live"}
                            type="button"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            {attendanceMarked ? "Attendance Marked" : "Attendance"}
                          </button>

                          <Link
                            className={actionButtonStyles(\\\`w-full sm:w-auto \${meta.secondaryActionClass}\\\`)}
                            href={courseHref}
                          >
                            <BookOpen className="h-4 w-4" />
                            Open Course
                          </Link>

                          <button
                            className={actionButtonStyles(\\\`w-full sm:w-auto \${meta.secondaryActionClass}\\\`)}
                            onClick={() => handleMessagesOpenChange(!messagesOpen)}
                            type="button"
                          >
                            <MessageCircleMore className="h-4 w-4" />
                            {messagesOpen ? "Hide Thread" : "Show Thread"}
                          </button>
                        </div>\`;

const newActionButtons = \`<div className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2 border-t border-black/5 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] backdrop-blur-xl sm:static sm:z-auto sm:grid sm:grid-cols-2 sm:gap-3 sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-none md:flex md:flex-wrap">
                          {tone === "completed" ? (
                            <Link
                              className={actionButtonStyles(\\\`flex-1 justify-center py-3.5 sm:col-span-2 sm:w-auto sm:py-2.5 \${meta.actionClass}\\\`)}
                              href={primaryHref}
                              target={focusClass?.recordingUrl ? "_blank" : undefined}
                            >
                              <PlayCircle className="h-5 w-5 sm:h-4 sm:w-4" />
                              {primaryLabel}
                            </Link>
                          ) : (
                            <button
                              className={actionButtonStyles(\\\`flex-1 justify-center py-3.5 sm:col-span-2 sm:w-auto sm:py-2.5 \${meta.actionClass}\\\`)}
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
                            className={actionButtonStyles(\\\`shrink-0 justify-center px-4 py-3.5 sm:w-auto sm:px-4 sm:py-2.5 \${attendanceMarked ? "bg-[#f0fdf4] text-[#15803d]" : meta.secondaryActionClass}\\\`)}
                            onClick={() => markAttendance("JOIN")}
                            disabled={attendanceMarked || tone !== "live"}
                            type="button"
                          >
                            <CheckCircle2 className="h-5 w-5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">{attendanceMarked ? "Attendance Marked" : "Attendance"}</span>
                          </button>

                          <Link
                            className={actionButtonStyles(\\\`hidden sm:inline-flex sm:w-auto \${meta.secondaryActionClass}\\\`)}
                            href={courseHref}
                          >
                            <BookOpen className="h-4 w-4" />
                            Open Course
                          </Link>

                          <button
                            className={actionButtonStyles(\\\`shrink-0 justify-center px-4 py-3.5 sm:w-auto sm:px-4 sm:py-2.5 \${meta.secondaryActionClass}\\\`)}
                            onClick={() => handleMessagesOpenChange(!messagesOpen)}
                            type="button"
                          >
                            <MessageCircleMore className="h-5 w-5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">{messagesOpen ? "Hide Thread" : "Show Thread"}</span>
                          </button>
                        </div>\`;

content = content.replace(actionButtonsOriginal, newActionButtons);

// 7. Make MetricCards 1 col on ultra-narrow, 2 col on small, gracefully expanding
content = content.replace(
  /<StaggerGrid className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">/,
  '<StaggerGrid className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">'
);

// 8. Classroom stage wrap text and look better on mobile
content = content.replace(
  /<h2 className="mt-1\.5 text-\[1\.25rem\] font-semibold leading-\[1\.3\] tracking-\[-0\.03em\] text-black sm:mt-2 sm:text-\[1\.65rem\] sm:tracking-\[-0\.04em\]">/g,
  '<h2 className="mt-1.5 text-balance text-[1.25rem] font-bold leading-[1.3] tracking-[-0.03em] text-black sm:mt-2 sm:text-[1.65rem] sm:tracking-[-0.04em]">'
);

content = content.replace(
  /<section className="overflow-hidden rounded-\[28px\] bg-white p-4 shadow-\[0_14px_34px_rgba\(15,23,42,0\.08\)\] sm:rounded-\[24px\] sm:p-6 sm:shadow-\[0_4px_10px_rgba\(0,0,0,0\.08\)\]">/g,
  '<section className="overflow-hidden rounded-[24px] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.05)] sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)]">'
);

// 9. About This Class (Right Rail) Wrap text
content = content.replace(
  /className="rounded-\[18px\] bg-\[#f7f5f4\] px-4 py-4 text-\[13\.5px\] leading-6 text-black\/60 shadow-\[0_4px_10px_rgba\(0,0,0,0\.04\)\] sm:text-\[14px\] sm:leading-7"/g,
  'className="break-words rounded-[18px] bg-[#f7f5f4] px-4 py-4 text-[13.5px] leading-6 text-black/60 shadow-[0_4px_10px_rgba(0,0,0,0.04)] sm:text-[14px] sm:leading-7"'
);

content = content.replace(
  /<div className="rounded-\[18px\] bg-white px-4 py-4 text-\[14px\] leading-7 text-black\/68 shadow-\[0_4px_10px_rgba\(0,0,0,0\.04\)\]">/g,
  '<div className="break-words rounded-[18px] bg-white px-4 py-4 text-[14px] leading-7 text-black/68 shadow-[0_4px_10px_rgba(0,0,0,0.04)]">'
);

fs.writeFileSync(file, content);
console.log("Patch successfully applied!");
