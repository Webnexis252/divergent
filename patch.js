const fs = require('fs');
const file = 'src/app/dashboard/_components/student-live-classroom-page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix MetricCard styling to ensure it wraps correctly
content = content.replace(
  /<p className="mt-3 text-\[1rem\] font-semibold leading-\[1\.25\] text-black sm:mt-5 sm:text-\[1\.15rem\]">\{value\}<\/p>/g,
  '<p className="mt-3 break-words text-[1rem] font-semibold leading-[1.25] text-black sm:mt-5 sm:text-[1.15rem]">{value}</p>'
);
content = content.replace(
  /<p className="mt-1\.5 text-\[12px\] leading-5 text-black\/52 sm:mt-2 sm:text-\[13px\] sm:leading-6">\{hint\}<\/p>/g,
  '<p className="mt-1.5 break-words text-[12px] leading-5 text-black/52 sm:mt-2 sm:text-[13px] sm:leading-6">{hint}</p>'
);

// Fix RightRailLink overflow
content = content.replace(
  /<p className="text-\[14px\] font-semibold text-black sm:text-\[15px\]">\{title\}<\/p>/g,
  '<p className="break-words text-[14px] font-semibold text-black sm:text-[15px]">{title}</p>'
);
content = content.replace(
  /<p className="text-\[12px\] leading-5 text-black\/54 sm:text-\[13px\] sm:leading-6">\{description\}<\/p>/g,
  '<p className="break-words text-[12px] leading-5 text-black/54 sm:text-[13px] sm:leading-6">{description}</p>'
);

// Fix Classroom Stage title wrapping
content = content.replace(
  /<h2 className="mt-1\.5 text-\[1\.25rem\] font-semibold leading-\[1\.3\] tracking-\[-0\.03em\] text-black sm:mt-2 sm:text-\[1\.65rem\] sm:tracking-\[-0\.04em\]">/g,
  '<h2 className="mt-1.5 text-balance text-[1.25rem] font-semibold leading-[1.3] tracking-[-0.03em] text-black sm:mt-2 sm:text-[1.65rem] sm:tracking-[-0.04em]">'
);

// Fix RightRail info box text wrapping
content = content.replace(
  /className="rounded-\[18px\] bg-\[#f7f5f4\] px-4 py-4 text-\[13\.5px\] leading-6 text-black\/60 shadow-\[0_4px_10px_rgba\(0,0,0,0\.04\)\] sm:text-\[14px\] sm:leading-7"/g,
  'className="break-words rounded-[18px] bg-[#f7f5f4] px-4 py-4 text-[13.5px] leading-6 text-black/60 shadow-[0_4px_10px_rgba(0,0,0,0.04)] sm:text-[14px] sm:leading-7"'
);

// Make MetricCards stack on VERY small screens (< 350px) but grid-cols-2 normally
content = content.replace(
  /<StaggerGrid className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">/g,
  '<StaggerGrid className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:gap-5 md:grid-cols-2 xl:grid-cols-4">'
);

fs.writeFileSync(file, content);
console.log("Patch applied.");
