const fs = require('fs');
const file = 'src/app/dashboard/_components/student-live-classroom-page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Improve Hero Action Buttons: Make primary button full width on mobile, secondary scrollable
content = content.replace(
  /<div className="scrollbar-none flex snap-x gap-2\.5 overflow-x-auto pb-1 sm:flex-wrap sm:items-center sm:gap-3 sm:overflow-visible sm:pb-0">\s*\{tone === "completed"/,
  `<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
                          {tone === "completed"`
);

content = content.replace(
  /className=\{actionButtonStyles\(\`shrink-0 snap-start whitespace-nowrap sm:w-auto \$\{meta\.actionClass\}\`\)\}/g,
  'className={actionButtonStyles(`w-full justify-center sm:w-auto ${meta.actionClass} py-3.5 sm:py-3 text-[15px]`)}'
);

// Group the secondary buttons into a horizontally scrolling row on mobile below the primary CTA
content = content.replace(
  /<button\s+className=\{actionButtonStyles\(\`shrink-0 snap-start whitespace-nowrap sm:w-auto \$\{attendanceMarked \? "bg-\\[#f0fdf4\\] text-\\[#15803d\\]" : meta\.secondaryActionClass\}\`\)\}/g,
  `</div>
   <div className="scrollbar-none flex snap-x gap-2.5 overflow-x-auto pb-1 sm:flex-wrap sm:items-center sm:gap-3 sm:overflow-visible sm:pb-0 mt-3 sm:mt-0">
     <button
       className={actionButtonStyles(\`shrink-0 snap-start whitespace-nowrap px-4 py-2.5 text-[13.5px] sm:w-auto \${attendanceMarked ? "bg-[#f0fdf4] text-[#15803d]" : meta.secondaryActionClass}\`)}`
);

content = content.replace(
  /className=\{actionButtonStyles\(\`shrink-0 snap-start whitespace-nowrap sm:w-auto \$\{meta\.secondaryActionClass\}\`\)\}/g,
  'className={actionButtonStyles(`shrink-0 snap-start whitespace-nowrap px-4 py-2.5 text-[13.5px] sm:w-auto ${meta.secondaryActionClass}`)}'
);

// Enhance MetricCard styling
content = content.replace(
  /className="rounded-\[22px\] bg-white px-4 py-4 shadow-\[0_4px_10px_rgba\(0,0,0,0\.08\)\] sm:px-5 sm:py-5"/g,
  'className="rounded-[20px] bg-white p-5 shadow-[0_8px_20px_rgba(15,23,42,0.04)] ring-1 ring-black/5 sm:rounded-[24px] sm:p-6 sm:shadow-[0_4px_10px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-1"'
);

content = content.replace(
  /<div className="grid h-9 w-9 place-items-center rounded-\[14px\] bg-\[#38c1ff\]\/10 text-\[#38c1ff\] sm:h-11 sm:w-11 sm:rounded-\[16px\]">/g,
  '<div className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#38c1ff]/10 text-[#38c1ff] sm:h-12 sm:w-12 sm:rounded-[14px]">'
);

fs.writeFileSync(file, content);
console.log("Hero patch applied.");
