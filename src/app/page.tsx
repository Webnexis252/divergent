"use client";

import { Fragment, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { cx } from "@/lib/cx";
import { BrandLogo } from "@/components/ui/brand-logo";

const assets = {
  hero: "/hero-illustration.png",
  examAccent: "https://api.dicebear.com/9.x/shapes/svg?seed=5921cf41-d4df-4bb2-b14c-36fa2a3e18f5",
  featureStructured: "/images/features/structured-courses.png",
  featureLive: "/images/features/live-classes.png",
  featureCommunity: "/images/features/community-support.png",
  featureProgress: "/images/features/progress-tracking.png",
  flowPath: "/images/flow-path.svg",
  stepEnroll: "/images/steps/enroll.png",
  stepAttend: "/images/steps/attend.png",
  stepTrack: "/images/steps/track.png",
  skillGraphic: "/images/skills/graphic-design.png",
  skillUiux: "/images/skills/uiux-design.png",
  skillMotion: "/images/skills/motion-design.png",
  skillFashion: "/images/skills/fashion-design.png",
  skillInterior: "/images/skills/interior-design.png",
  skillProduct: "/images/skills/product-design.png",
  skillIndustrial: "/images/skills/industrial-design.png",
  featureLiveClasses: "/assets/dab288baf23d157ffd4e1348d70ddff6ee5ed42d.png",
  featureDoubts: "/assets/90a4a168ef344e2d081ba47aa7d528fa4a61035b.png",
  featureCommunityLearning: "/assets/ff1bb5daa3b132ba208db6ac1de6dc5103f5b7ac.png",
  featureMockTests: "/assets/059e254a057a7f64b6ef41d88a87d5cad99b61dd.png",
  growthDashboard: "/assets/2801d8b2af769c2cf34bbc5fa8ae83cbd4cea9a2.png",
  testimonialAvatar: "https://api.dicebear.com/9.x/shapes/svg?seed=7fb76c2f-8e54-49ba-878e-5e4ff306445a",
  testimonialQuote: "https://api.dicebear.com/9.x/shapes/svg?seed=b4f800d0-a21f-4f65-8198-fc0cd748d21b",
} as const;

const navItems = [
  { label: "Courses", href: "#courses" },
  { label: "About", href: "#about" },
  { label: "Community", href: "#community" },
  { label: "Upskilling", href: "#upskilling" },
  { label: "Pricing", href: "#pricing" },
] as const;

const featureHighlights = [
  {
    title: "Structured Courses",
    image: assets.featureStructured,
    imageWidth: 2048,
    imageHeight: 1118,
  },
  {
    title: "Live Classes",
    image: assets.featureLive,
    imageWidth: 2048,
    imageHeight: 1118,
  },
  {
    title: "Community Support",
    image: assets.featureCommunity,
    imageWidth: 2048,
    imageHeight: 1118,
  },
  {
    title: "Progress Tracking",
    image: assets.featureProgress,
    imageWidth: 2048,
    imageHeight: 1118,
  },
] as const;

const examTracks = [
  {
    title: "UCEED",
    description:
      "Comprehensive prep for UCEED with concept clarity, mock tests, and design practice.",
  },
  {
    title: "NID",
    description:
      "Master creative thinking, sketching, and problem-solving for NID exams.",
  },
  {
    title: "NIFT",
    description:
      "Build strong fundamentals with targeted preparation for NIFT entrance.",
  },
] as const;

const skillRows = [
  [
    { title: "Graphic Design", image: assets.skillGraphic },
    { title: "UI/UX Design", image: assets.skillUiux },
    { title: "Motion Design", image: assets.skillMotion },
    { title: "Fashion Design", image: assets.skillFashion },
  ],
  [
    { title: "Interior Design", image: assets.skillInterior },
    { title: "Product Design", image: assets.skillProduct },
    { title: "Industrial Design", image: assets.skillIndustrial },
  ],
] as const;

const steps = [
  {
    number: "1",
    title: "Enroll in a course",
    description: "Choose your path and get started instantly.",
    image: assets.stepEnroll,
    imageWidth: 1024,
    imageHeight: 559,
    className: "bottom-[10%] left-[22%]",
  },
  {
    number: "2",
    title: "Attend classes & learn",
    description: "Join live sessions or watch anytime.",
    image: assets.stepAttend,
    imageWidth: 1024,
    imageHeight: 559,
    className: "left-[43%] top-[48%]",
  },
  {
    number: "3",
    title: "Track progress & improve",
    description: "Monitor growth and stay consistent.",
    image: assets.stepTrack,
    imageWidth: 1024,
    imageHeight: 559,
    className: "left-[58%] top-[10%]",
  },
] as const;

const testimonialCards = Array.from({ length: 3 }, () => ({
  name: "Aanya Sharma",
  meta: "Cleared NIFT in 1st attempt",
  quote:
    "The structured courses and mentorship helped me stay consistent. The dashboard kept me on track every day.",
}));

const revealViewport = { once: true, amount: 0 } as const;

function Reveal({
  children,
  className,
  delay = 0,
  y = 24,
  id,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  id?: string;
}) {
  return (
    <motion.div
      id={id}
      className={className}
      initial={{ opacity: 0, y }}
      transition={{ duration: 0.48, delay }}
      viewport={revealViewport}
      whileInView={{ opacity: 1, y: 0 }}
    >
      {children}
    </motion.div>
  );
}

function landingButtonStyles({
  variant = "primary",
  size = "default",
  className,
}: {
  variant?: "primary" | "secondary";
  size?: "default" | "header" | "explore";
  className?: string;
}) {
  const sizeClasses =
    size === "header"
      ? "h-[46px] px-6 text-[15px] sm:text-[24px]"
      : size === "explore"
        ? "h-[46px] w-[130px] text-[15px] sm:text-[22px]"
        : "min-h-[48px] px-6 text-[16px] sm:h-[56px] sm:min-w-[180px] sm:px-8 sm:text-[18px]";

  return cx(
    "inline-flex items-center justify-center rounded-[10px] font-medium transition-transform duration-150 ease-out hover:-translate-y-0.5",
    sizeClasses,
    variant === "primary"
      ? "bg-[#209bd2] text-white shadow-[0_4px_12.4px_rgba(0,0,0,0.16)]"
      : "border border-[#209bd2] bg-white/92 text-[#209bd2]",
    className,
  );
}

function SectionTitle({
  title,
  description,
  centered,
  className,
}: {
  title: string;
  description: string;
  centered?: boolean;
  className?: string;
}) {
  return (
    <div className={cx(centered && "text-center", className)}>
      <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.04em] text-black">
        {title}
      </h2>
      <p className="mt-3 text-[clamp(1rem,2.2vw,2.5rem)] leading-[1.32] text-black">
        {description}
      </p>
    </div>
  );
}

function ExamCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-[18px] bg-white px-5 pb-7 pt-11 shadow-[0_4px_12.4px_rgba(0,0,0,0.18)] sm:rounded-[10px] sm:px-7 sm:pb-10 sm:pt-14 sm:shadow-[0_4px_12.4px_rgba(0,0,0,0.25)]">
      <svg
        aria-hidden
        className="absolute right-4 top-4 h-auto w-[5.5rem] sm:right-5 sm:top-5 sm:w-[7.25rem]"
        fill="none"
        height={92}
        viewBox="0 0 117 92"
        width={117}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g opacity="0.22">
          <circle cx="78.1722" cy="38.8275" r="38.8275" fill="#FEC600" />
          <circle cx="37.2747" cy="77.655" r="13.4602" fill="#209BD2" />
          <circle cx="28.9917" cy="24.8496" r="6.2124" fill="#38C1FF" />
          <circle cx="14.4956" cy="49.6992" r="14.4956" fill="#E6B400" />
        </g>
      </svg>

      <div className="flex-1 max-w-[28.5rem]">
        <h3 className="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tracking-[-0.04em] text-black">
          {title}
        </h3>
        <p className="mt-3 text-[clamp(1rem,2vw,1.75rem)] leading-[1.4] text-black">
          {description}
        </p>
      </div>

      <Link className={landingButtonStyles({ size: "explore", className: "mt-10 ml-auto" })} href="/signup">
        Explore
      </Link>
    </div>
  );
}

function SkillCard({
  title,
  image,
}: {
  title: string;
  image: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-[10px] bg-white px-4 py-8 text-center shadow-[0_4px_14px_rgba(0,0,0,0.08)] sm:px-6 sm:py-10">
      <Image
        alt={title}
        className="h-auto w-full max-w-[100px] object-contain sm:max-w-[120px]"
        height={1024}
        src={image}
        width={1024}
      />
      <p className="text-[1.125rem] font-semibold tracking-[-0.02em] text-black sm:text-[1.35rem]">
        {title}
      </p>
    </div>
  );
}

function StepCard({
  title,
  description,
  number,
  image,
  imageWidth,
  imageHeight,
  className,
}: {
  title: string;
  description: string;
  number: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  className?: string;
}) {
  return (
    <Reveal className={className}>
      <div className="relative flex max-w-[22rem] items-center gap-3">
        {/* Faint background number behind the card */}
        <span className="pointer-events-none absolute -left-4 -top-8 z-0 select-none text-[9rem] font-black leading-none text-black/[0.06] sm:-left-6 sm:-top-12 sm:text-[13rem]">
          {number}
        </span>
        <Image
          alt={title}
          className="relative z-10 h-auto w-full max-w-[4rem] shrink-0 object-contain sm:max-w-[5.5rem]"
          height={imageHeight}
          src={image}
          width={imageWidth}
        />
        <div className="relative z-10">
          <h3 className="text-[1rem] font-bold tracking-[-0.01em] text-black sm:text-[1.15rem]">
            {title}
          </h3>
          <p className="mt-0.5 max-w-[14rem] text-[0.875rem] leading-[1.4] text-black/75 sm:text-[0.95rem]">
            {description}
          </p>
        </div>
      </div>
    </Reveal>
  );
}

function FeatureSpotlight({
  title,
  description,
  image,
  imageWidth,
  imageHeight,
  imageFirst = true,
  tone = "plain",
  textAlign = "left",
  id,
}: {
  title: string;
  description: string;
  image: string;
  imageWidth: number;
  imageHeight: number;
  imageFirst?: boolean;
  tone?: "plain" | "yellow" | "blue";
  textAlign?: "left" | "right";
  id?: string;
}) {
  const isPanel = tone !== "plain";
  const content = (
    <div
      className={cx(
        textAlign === "right" ? "text-left lg:text-right" : "text-left",
        tone === "yellow" ? "text-white" : "text-black",
      )}
    >
      <h3 className="text-[clamp(2rem,3.5vw,2.5rem)] font-semibold tracking-[-0.04em]">
        {title}
      </h3>
      <p
        className={cx(
          "mt-3 text-[clamp(1.1rem,2.8vw,2rem)] leading-[1.34]",
          tone === "yellow" ? "text-white/95" : "text-black",
        )}
      >
        {description}
      </p>
    </div>
  );

  const artwork = (
    <div className="flex justify-center">
      <Image
        alt={title}
        className="h-auto w-full max-w-[37rem] object-contain"
        height={imageHeight}
        src={image}
        width={imageWidth}
      />
    </div>
  );

  return (
    <Reveal id={id} className="w-full">
      <div
        className={cx(
          "grid items-center gap-10 lg:grid-cols-2",
          isPanel && "rounded-[22px] px-5 py-8 shadow-[0_4px_11.3px_rgba(0,0,0,0.12)] sm:px-8 sm:py-10 lg:min-h-[37rem] lg:px-16",
          tone === "yellow" && "bg-[#ffc107]",
          tone === "blue" && "bg-[#38d6ff]",
          !isPanel && "py-4 lg:min-h-[36rem]",
        )}
      >
        {imageFirst ? artwork : content}
        {imageFirst ? content : artwork}
      </div>
    </Reveal>
  );
}

function TestimonialCard({
  name,
  meta,
  quote,
}: {
  name: string;
  meta: string;
  quote: string;
}) {
  return (
    <div className="relative rounded-[18px] bg-white px-5 pb-7 pt-6 shadow-[0_4px_10px_rgba(0,0,0,0.16)] sm:rounded-[10px] sm:px-9 sm:pb-9 sm:pt-8 sm:shadow-[0_4px_10px_rgba(0,0,0,0.25)]">
      <Image
        alt=""
        aria-hidden
        className="absolute right-7 top-5 h-auto w-[4.75rem] rotate-180 object-contain opacity-15 sm:w-[6.5rem]"
        height={78}
        src={assets.testimonialQuote}
        width={105}
      />

      <div className="flex items-center gap-5">
        <Image
          alt={name}
          className="h-[4.25rem] w-[4.25rem] rounded-full object-cover sm:h-[5.0625rem] sm:w-[5.0625rem]"
          height={81}
          src={assets.testimonialAvatar}
          width={81}
        />

        <div>
          <p className="text-[clamp(1.25rem,2vw,1.5rem)] font-semibold tracking-[-0.03em] text-black">
            {name}
          </p>
          <p className="mt-1 text-[clamp(1rem,1.8vw,1.25rem)] text-black">{meta}</p>
        </div>
      </div>

      <p className="mt-8 text-[clamp(1rem,1.8vw,1.25rem)] leading-[1.45] text-black">{quote}</p>
      <p className="mt-7 text-[1.15rem] tracking-[0.12em] text-[#ffbf00]">★★★★★</p>
    </div>
  );
}



export default function HomePage() {
  return (
    <main className="overflow-x-hidden bg-[#f7f6f6] text-black">
      <header className="bg-white">
        <div className="mx-auto flex min-h-[76px] w-full max-w-[1920px] items-center justify-between gap-3 px-4 py-2 sm:min-h-[84px] sm:gap-6 sm:px-8 lg:px-12 xl:px-[95px]">
          <BrandLogo href="/" priority size="md" />

          <nav className="hidden items-center gap-14 lg:flex">
            {navItems.map((item) => (
              <Link
                key={item.label}
                className="text-[24px] font-normal text-black transition-colors duration-150 hover:text-[#209bd2]"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link className={landingButtonStyles({ size: "header" })} href="/login">
            Login
          </Link>
        </div>
      </header>

      <section className="px-4 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10 lg:px-12 xl:px-[92px] xl:pb-20 xl:pt-[101px]">
        <div className="mx-auto grid max-w-[1653px] items-center gap-9 sm:gap-12 xl:grid-cols-[minmax(0,776px)_minmax(0,701px)] xl:gap-[156px]">
          <Reveal className="max-w-[48.5rem]" y={28}>
            <h1 className="text-[clamp(2.7rem,6vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.05em] text-black">
              Learn Smarter, Not Harder.
            </h1>
            <p className="mt-4 max-w-[36.8125rem] text-[clamp(1.1rem,2.4vw,2rem)] leading-[1.35] text-black">
              Live classes, structured courses, real mentorship, and a powerful community — all in
              one place.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link className={landingButtonStyles({ className: "justify-center" })} href="/signup">
                Start Learning
              </Link>
              <Link
                className={landingButtonStyles({
                  variant: "secondary",
                  className: "justify-center",
                })}
                href="#courses"
              >
                Explore Courses
              </Link>
            </div>
          </Reveal>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            className="relative mx-auto w-full max-w-[44rem]"
            initial={{ opacity: 0, x: 28 }}
            transition={{
              opacity: { duration: 0.55 },
              x: { duration: 0.55 },
              y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
            }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={revealViewport}
          >
            <div className="absolute right-0 top-0 h-[16rem] w-[16rem] rounded-full bg-[#38c1ff]/45 blur-[70px] sm:h-[23rem] sm:w-[23rem]" />
            <div className="absolute bottom-[6%] left-0 h-[15rem] w-[15rem] rounded-full bg-[#ffc107]/45 blur-[68px] sm:h-[22rem] sm:w-[22rem]" />
            <Image
              alt="Divergent LMS illustration"
              className="relative z-10 h-auto w-full object-contain"
              height={572}
              priority
              src={assets.hero}
              width={701}
            />
          </motion.div>
        </div>
      </section>

      <section className="px-4 py-7 sm:px-8 sm:py-8 lg:px-12 xl:px-[218px]" id="about">
        <div className="mx-auto max-w-[1485px]">
          <Reveal>
            <p className="text-center text-[clamp(1rem,1.9vw,1.75rem)] font-semibold text-black">
              Everything you need to crack design exams — without switching platforms.
            </p>

            <div className="mt-8 rounded-[20px] bg-white px-4 py-5 shadow-[0_4px_10.9px_rgba(0,0,0,0.16)] sm:mt-10 sm:rounded-[10px] sm:px-8 sm:py-10 sm:shadow-[0_4px_10.9px_rgba(0,0,0,0.25)] md:px-12 md:py-12 lg:px-[100px] lg:py-[48px]">
              <div className="grid grid-cols-2 gap-4 md:flex md:items-center md:gap-0">
                {featureHighlights.map((feature, index) => (
                  <Fragment key={feature.title}>
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[16px] bg-[#f7f6f6] px-3 py-5 text-center md:gap-7 md:bg-transparent md:px-6 md:py-0">
                      <Image
                        alt={feature.title}
                        className="h-auto w-full max-w-[16rem] object-contain md:max-w-[20rem] lg:max-w-[26rem] scale-110 md:scale-125 lg:scale-[1.4]"
                        height={feature.imageHeight}
                        src={feature.image}
                        width={feature.imageWidth}
                      />
                      <p className="text-[1.25rem] font-medium text-[#1e1e1e]">{feature.title}</p>
                    </div>

                    {index < featureHighlights.length - 1 ? (
                      <div className="hidden h-[204px] w-px bg-black/12 md:block" />
                    ) : null}
                  </Fragment>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 sm:py-18 lg:px-12 xl:px-[151px]" id="courses">
        <div className="mx-auto max-w-[1618px]">
          <Reveal>
            <SectionTitle
              centered
              description="Structured courses tailored for every major design entrance."
              title="Prepare for Top Design Exams"
            />
          </Reveal>

          <div className="mt-12 grid items-stretch gap-5 xl:grid-cols-3">
            {examTracks.map((track, index) => (
              <Reveal key={track.title} className="h-full" delay={index * 0.06}>
                <ExamCard description={track.description} title={track.title} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 sm:py-18 lg:px-12 xl:px-[108px]" id="upskilling">
        <div className="mx-auto max-w-[1704px]">
          <Reveal>
            <SectionTitle
              centered
              description="Learn skills that go beyond exams and shape your creative career."
              title="Build In-Demand Design Skills"
            />
          </Reveal>

          <div className="mt-10 space-y-6 sm:mt-14 sm:space-y-8">
            {skillRows.map((row, rowIndex) => (
              <div
                key={`skill-row-${rowIndex}`}
                className={cx(
                  "grid gap-6 sm:gap-8",
                  rowIndex === 0 ? "xl:grid-cols-4" : "mx-auto max-w-[1264px] xl:grid-cols-3",
                  "sm:grid-cols-2",
                )}
              >
                {row.map((skill, skillIndex) => (
                  <Reveal key={skill.title} delay={(rowIndex * 4 + skillIndex) * 0.05}>
                    <SkillCard image={skill.image} title={skill.title} />
                  </Reveal>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        className="relative overflow-hidden px-4 pb-0 pt-14 sm:px-8 sm:pt-20 lg:px-12 xl:px-[194px]"
        id="how-it-works"
      >
        {/* Yellow circle — bleeds off left, sits behind step 1 */}
        <div className="pointer-events-none absolute left-[-6rem] top-[36%] h-[24rem] w-[24rem] rounded-full bg-[#ffc107] lg:left-[-5rem] lg:top-[38%] lg:h-[30rem] lg:w-[30rem]" />

        {/* Blue circle — bleeds off right, top-right */}
        <div className="pointer-events-none absolute right-[-6rem] top-[-1rem] h-[20rem] w-[20rem] rounded-full bg-[#38c1ff] lg:right-[-4rem] lg:h-[26rem] lg:w-[26rem]" />

        {/* "3" watermark inside blue circle */}
        <span className="pointer-events-none absolute right-[0.5rem] top-[1rem] z-10 hidden select-none text-[13rem] font-black leading-none text-white/[0.22] lg:block">
          3
        </span>


        <div className="relative mx-auto max-w-[1618px]">
          <Reveal className="max-w-[44.375rem]">
            <SectionTitle
              description="Start learning in three simple steps."
              title="How it works"
            />
          </Reveal>

          {/* ── Desktop layout ── */}
          <div className="relative mt-6 hidden min-h-[34rem] lg:block">

            {/* Inline SVG: smooth S-curve bezier path */}
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 1000 540"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <filter id="pathGlow" x="-5%" y="-30%" width="110%" height="160%">
                  <feDropShadow dx="0" dy="3" stdDeviation="7" floodColor="#209bd2" floodOpacity="0.25" />
                </filter>
              </defs>
              <path
                d="M 205 455 C 310 455 365 290 490 278 C 615 266 645 148 740 132 C 820 118 880 108 960 105"
                filter="url(#pathGlow)"
                stroke="#38b6d6"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
            </svg>

            {/* Dot 1 — WHITE with teal border (sits on yellow circle) */}
            <div
              className="absolute z-10 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#38b6d6] bg-white shadow-md"
              style={{ left: "20.5%", top: "84.3%" }}
            />
            {/* Dot 2 — GOLD */}
            <div
              className="absolute z-10 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#ffc107] shadow-md"
              style={{ left: "49%", top: "51.5%" }}
            />
            {/* Dot 3 — GOLD, at curve end inside the blue circle */}
            <div
              className="absolute z-10 h-[18px] w-[18px] -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-white bg-[#ffc107] shadow-md"
              style={{ left: "96%", top: "19.4%" }}
            />

            {/* Step 1 card — bottom-left, just right of dot 1 */}
            <div className="absolute z-10" style={{ left: "12%", top: "84%" }}>
              <Reveal>
                <div className="relative flex max-w-[22rem] items-center gap-3">
                  <span className="pointer-events-none absolute -left-3 -top-8 z-0 select-none text-[9rem] font-black leading-none text-black/[0.06]">
                    1
                  </span>
                  <Image
                    alt="Enroll in a course"
                    className="relative z-10 h-auto w-[4.5rem] shrink-0 object-contain"
                    height={559}
                    src={assets.stepEnroll}
                    width={1024}
                  />
                  <div className="relative z-10">
                    <h3 className="text-[1rem] font-bold tracking-[-0.01em] text-black">Enroll in a course</h3>
                    <p className="mt-0.5 max-w-[14rem] text-[0.875rem] leading-[1.4] text-black/75">
                      Choose your path and get started instantly.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>

            {/* Step 2 card — middle, just below/right of dot 2 */}
            <div className="absolute z-10" style={{ left: "40%", top: "52%" }}>
              <Reveal>
                <div className="relative flex max-w-[22rem] items-center gap-3">
                  <span className="pointer-events-none absolute -left-3 -top-8 z-0 select-none text-[9rem] font-black leading-none text-black/[0.06]">
                    2
                  </span>
                  <Image
                    alt="Attend classes & learn"
                    className="relative z-10 h-auto w-[4.5rem] shrink-0 object-contain"
                    height={559}
                    src={assets.stepAttend}
                    width={1024}
                  />
                  <div className="relative z-10">
                    <h3 className="text-[1rem] font-bold tracking-[-0.01em] text-black">Attend classes &amp; learn</h3>
                    <p className="mt-0.5 max-w-[14rem] text-[0.875rem] leading-[1.4] text-black/75">
                      Join live sessions or watch anytime.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
            {/* Step 3 card — to the left of dot 3, near the blue circle */}
            <div className="absolute z-20" style={{ left: "68%", top: "17%" }}>
              <Reveal>
                <div className="relative flex max-w-[22rem] items-center gap-3">
                  <span className="pointer-events-none absolute -left-3 -top-8 z-0 select-none text-[9rem] font-black leading-none text-black/[0.06]">
                    3
                  </span>
                  <Image
                    alt="Track progress & improve"
                    className="relative z-10 h-auto w-[4.5rem] shrink-0 object-contain"
                    height={559}
                    src={assets.stepTrack}
                    width={1024}
                  />
                  <div className="relative z-10">
                    <h3 className="text-[1rem] font-bold tracking-[-0.01em] text-black">Track progress &amp; improve</h3>
                    <p className="mt-0.5 max-w-[13rem] text-[0.875rem] leading-[1.4] text-black/75">
                      Monitor growth and stay consistent.
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>

          {/* ── Mobile fallback ── */}
          <div className="mt-12 grid gap-10 pb-14 lg:hidden">
            {steps.map((step, index) => (
              <StepCard
                key={step.number}
                className={
                  index === 1 ? "sm:mx-auto" : index === 2 ? "sm:ml-auto" : undefined
                }
                description={step.description}
                image={step.image}
                imageHeight={step.imageHeight}
                imageWidth={step.imageWidth}
                number={step.number}
                title={step.title}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 sm:py-18 lg:px-12 xl:px-[160px]">
        <div className="mx-auto max-w-[1549px]">
          <Reveal className="mx-auto max-w-[83.4375rem] text-center">
            <SectionTitle
              centered
              description="Everything you need to learn, practice, and grow — all in one place."
              title="Powerful Features for Smarter Learning"
            />
          </Reveal>

          <div className="mt-10 space-y-6 sm:mt-16 sm:space-y-10">
            <FeatureSpotlight
              description="Attend live sessions or learn anytime with recorded lectures."
              image={assets.featureLiveClasses}
              imageHeight={620}
              imageWidth={477}
              textAlign="right"
              title="Live + Recorded Classes"
              tone="yellow"
            />

            <FeatureSpotlight
              description="Learn together through discussions and peer support."
              id="community"
              image={assets.featureCommunityLearning}
              imageFirst={false}
              imageHeight={601}
              imageWidth={575}
              title="Community Learning"
            />

            <FeatureSpotlight
              description="Get your doubts resolved quickly by expert mentors."
              image={assets.featureDoubts}
              imageHeight={631}
              imageWidth={599}
              textAlign="right"
              title="Doubt Solving System"
              tone="blue"
            />

            <FeatureSpotlight
              description="Practice with tests and track your performance with insights."
              image={assets.featureMockTests}
              imageFirst={false}
              imageHeight={635}
              imageWidth={523}
              title="Mock Tests & Analytics"
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-12 sm:px-8 sm:py-18 lg:px-12" id="pricing">
        <div className="mx-auto max-w-[1223px]">
          <Reveal className="text-center">
            <h2 className="text-[clamp(2rem,4vw,3rem)] font-semibold tracking-[-0.04em] text-black">
              Track your growth like a pro.
            </h2>
          </Reveal>

          <Reveal className="relative mt-8 rounded-[20px] bg-white p-3 shadow-[0_4px_11.3px_rgba(0,0,0,0.16)] sm:mt-12 sm:p-7 sm:shadow-[0_4px_11.3px_5px_rgba(0,0,0,0.25)]">
            <div className="absolute bottom-[6%] left-0 top-[6%] hidden w-[6rem] rounded-r-[20px] bg-[#ffc107] lg:block" />
            <Image
              alt="Divergent analytics dashboard"
              className="relative z-10 h-auto w-full rounded-[20px] object-cover"
              height={792}
              src={assets.growthDashboard}
              width={1223}
            />
          </Reveal>
        </div>
      </section>

      <section className="px-4 pb-20 pt-12 sm:px-8 sm:pb-24 sm:pt-18 lg:px-12 xl:px-[153px]" id="testimonials">
        <div className="mx-auto max-w-[1579px]">
          <Reveal className="mx-auto max-w-[45rem] text-center">
            <SectionTitle
              centered
              description="Real stories. Real results."
              title="Trusted by Students Like You"
            />
          </Reveal>

          <div className="mt-12 grid gap-5 xl:grid-cols-3">
            {testimonialCards.map((item, index) => (
              <Reveal key={`${item.name}-${index}`} delay={index * 0.06}>
                <TestimonialCard meta={item.meta} name={item.name} quote={item.quote} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
