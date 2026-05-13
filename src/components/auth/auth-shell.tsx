import { Surface } from "@/components/ui/surface";
import { BrandLogo } from "@/components/ui/brand-logo";

export function AuthShell({
  eyebrow,
  title,
  description,
  highlights,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  highlights: Array<{ title: string; description: string }>;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen overflow-hidden px-5 py-5 text-(--text-strong) sm:px-6 lg:px-8">
      <section className="relative min-h-[calc(100svh-2.5rem)] overflow-hidden rounded-[calc(var(--radius-xl)+0.5rem)] border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.88),rgba(255,255,255,0.68))]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute right-[-8%] top-[10%] h-[22rem] w-[22rem] rounded-full bg-[rgba(254,198,0,0.36)] blur-[140px]" />
          <div className="absolute left-[-8%] top-[46%] h-[20rem] w-[20rem] rounded-full bg-[rgba(56,193,255,0.24)] blur-[140px]" />
          <div className="absolute bottom-[-6%] left-[34%] h-[15rem] w-[15rem] rounded-full bg-[rgba(32,155,210,0.2)] blur-[110px]" />
        </div>

        <div className="relative z-10 flex min-h-[calc(100svh-2.5rem)] flex-col">
          <header className="flex items-center justify-between px-6 py-6 lg:px-10">
            <BrandLogo href="/" priority size="md" />
          </header>

          <div className="grid flex-1 items-center gap-14 px-6 pb-10 pt-2 lg:grid-cols-[minmax(0,1fr)_minmax(420px,540px)] lg:px-10 lg:pb-14">
            <div className="max-w-[40rem]">
              <p className="section-eyebrow">{eyebrow}</p>
              <h1 className="mt-6 text-[clamp(2.6rem,6vw,5.2rem)] font-semibold leading-[0.92] tracking-[-0.08em] text-balance">
                {title}
              </h1>
              <p className="mt-6 max-w-[36rem] text-[17px] leading-8 text-(--foreground-soft) text-pretty">
                {description}
              </p>

              <div className="mt-10 grid gap-4 md:grid-cols-2">
                {highlights.map((item) => (
                  <Surface
                    key={item.title}
                    className="px-5 py-5"
                    tone="muted"
                  >
                    <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-(--brand-primary-dark)">
                      {item.title}
                    </p>
                    <p className="mt-3 text-[14px] leading-7 text-(--text-muted)">
                      {item.description}
                    </p>
                  </Surface>
                ))}
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">{children}</div>
          </div>
        </div>
      </section>
    </main>
  );
}
