/* eslint-disable @next/next/no-img-element */
import { DashboardSidebar } from "./sidebar-nav";

const imgLogo =
  "https://api.dicebear.com/9.x/shapes/svg?seed=04cf30cc-4d94-4821-9048-97d9158381d2";

export function DashboardPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-[#f7f5f4] text-black">
      <header className="bg-white">
        <div className="mx-auto flex max-w-[1920px] items-center px-6 py-2 lg:px-[104px]">
          <img
            alt="Divergent Classes"
            className="h-[74px] w-auto object-contain"
            src={imgLogo}
          />
        </div>
      </header>

      {/* Reduced sidebar column width to 280px down from 426px to fix oversized layout */}
      <div className="mx-auto grid max-w-[1920px] gap-8 px-0 pb-16 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-0">
        <DashboardSidebar />

        <section className="flex items-center px-6 py-12 lg:px-14">
          <div className="max-w-3xl rounded-[24px] bg-white px-10 py-12 shadow-[0px_4px_14px_rgba(0,0,0,0.12)]">
            <h1 className="text-[40px] font-semibold text-black">{title}</h1>
            <p className="mt-4 text-xl leading-8 text-black/70">{description}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
