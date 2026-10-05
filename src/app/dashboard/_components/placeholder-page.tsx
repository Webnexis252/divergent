import { BrandLogo } from "@/components/ui/brand-logo";
/* eslint-disable @next/next/no-img-element */

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
          <BrandLogo size="lg" />
        </div>
      </header>

      {/* Sidebar column matches all other student panel pages */}
      <div className="mx-auto grid max-w-[1920px] lg:gap-0">

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
