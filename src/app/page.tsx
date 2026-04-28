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
  featureStructured: "https://api.dicebear.com/9.x/shapes/svg?seed=edb95ceb-2f9e-4cbc-b065-04b6cfdb1273",
  featureLive: "https://api.dicebear.com/9.x/shapes/svg?seed=970ac95d-dc3f-4e97-b822-47f7efbb130f",
  featureCommunity: "https://api.dicebear.com/9.x/shapes/svg?seed=f737be70-1421-46c3-8e7e-97e4e0cab9c6",
  featureProgress: "https://api.dicebear.com/9.x/shapes/svg?seed=e8c21301-fb25-40a6-985b-8a671feaf0e2",
  flowPath: "https://api.dicebear.com/9.x/shapes/svg?seed=10ccb168-7609-4b49-bb6a-19f9d4a4fb49",
  stepEnroll: "https://api.dicebear.com/9.x/shapes/svg?seed=3252f9bf-34d1-4165-8fc3-bc22db1f765f",
  stepAttend: "https://api.dicebear.com/9.x/shapes/svg?seed=72fded02-6507-4cb4-b8fc-07a5a182ade7",
  stepTrack: "https://api.dicebear.com/9.x/shapes/svg?seed=329a0ba6-baf2-48c7-a985-dab69e9c3d3e",
  skillGraphic: "https://api.dicebear.com/9.x/shapes/svg?seed=e295b04c-eaed-4b95-9311-6e47fae623e1",
  skillUiux: "https://api.dicebear.com/9.x/shapes/svg?seed=c1cf0120-4b9c-4cf2-bb70-7c07e77ca40e",
  skillMotion: "https://api.dicebear.com/9.x/shapes/svg?seed=faa702f0-5c93-4e8c-8a8f-eb48fb86fe21",
  skillFashion: "https://api.dicebear.com/9.x/shapes/svg?seed=18bf7c89-d7c7-477c-84b9-3504be4c05be",
  skillInterior: "https://api.dicebear.com/9.x/shapes/svg?seed=43a1f338-c9ea-455f-82d2-28e6555d22e3",
  skillProduct: "https://api.dicebear.com/9.x/shapes/svg?seed=18490e76-24e5-4053-84f5-2adb4eb01970",
  skillIndustrial: "https://api.dicebear.com/9.x/shapes/svg?seed=aa4fde26-72cb-44b3-a0ba-2076c03b09d8",
  featureLiveClasses: "https://api.dicebear.com/9.x/shapes/svg?seed=125ed25f-dc3d-4ee0-a9f4-2dae5b98ec90",
  featureDoubts: "https://api.dicebear.com/9.x/shapes/svg?seed=d71398bd-ac43-437c-b559-a501c9cf8d02",
  featureCommunityLearning: "https://api.dicebear.com/9.x/shapes/svg?seed=403d205f-106f-4172-80f9-35bd92eaaa37",
  featureMockTests: "https://api.dicebear.com/9.x/shapes/svg?seed=2f3632cf-583a-4e89-9cb2-0a58c84c8470",
  growthDashboard: "https://api.dicebear.com/9.x/shapes/svg?seed=73e91ff3-885b-44db-bc1c-127e1a76bad7",
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
    imageWidth: 141,
    imageHeight: 149,
  },
  {
    title: "Live Classes",
    image: assets.featureLive,
    imageWidth: 270,
    imageHeight: 146,
  },
  {
    title: "Community Support",
    image: assets.featureCommunity,
    imageWidth: 195,
    imageHeight: 148,
  },
  {
    title: "Progress Tracking",
    image: assets.featureProgress,
    imageWidth: 148,
    imageHeight: 149,
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
    imageWidth: 143,
    imageHeight: 146,
    className: "left-[4%] top-[58%]",
  },
  {
    number: "2",
    title: "Attend classes & learn",
    description: "Join live sessions or watch anytime.",
    image: assets.stepAttend,
    imageWidth: 111,
    imageHeight: 91,
    className: "left-[49%] top-[40%] -translate-x-1/2",
  },
  {
    number: "3",
    title: "Track progress & improve",
    description: "Monitor growth and stay consistent.",
    image: assets.stepTrack,
    imageWidth: 108,
    imageHeight: 86,
    className: "right-[0%] top-[5%]",
  },
] as const;

const testimonialCards = Array.from({ length: 3 }, () => ({
  name: "Aanya Sharma",
  meta: "Cleared NIFT in 1st attempt",
  quote:
    "The structured courses and mentorship helped me stay consistent. The dashboard kept me on track every day.",
}));

const revealViewport = { once: true, margin: "-80px" } as const;

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
    "inline-flex items-center justify-center rounded-[10px] font-medium transition-transform duration-[var(--transition-fast)] ease-[var(--ease-standard)] hover:-translate-y-0.5",
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
    <div className="relative overflow-hidden rounded-[18px] bg-white px-5 pb-7 pt-11 shadow-[0_4px_12.4px_rgba(0,0,0,0.18)] sm:rounded-[10px] sm:px-7 sm:pb-10 sm:pt-14 sm:shadow-[0_4px_12.4px_rgba(0,0,0,0.25)]">
      <div className="absolute right-5 top-5 h-12 w-12 rounded-full bg-[#ffe36f]" />
      <Image
        alt=""
        aria-hidden
        className="absolute right-6 top-7 h-auto w-[5.25rem] object-contain sm:w-[7.25rem]"
        height={91}
        src={assets.examAccent}
        width={117}
      />

      <div className="max-w-[28.5rem]">
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
    <div className="flex min-h-[210px] flex-col items-center justify-center gap-6 rounded-[18px] bg-white px-6 py-8 text-center shadow-[0_4px_10px_rgba(0,0,0,0.16)] sm:min-h-[250px] sm:rounded-[10px] sm:px-10 sm:py-12 sm:shadow-[0_4px_10px_rgba(0,0,0,0.25)]">
      <Image
        alt={title}
        className="h-auto w-full max-w-[146px] object-contain"
        height={164}
        src={image}
        width={146}
      />
      <p className="text-[clamp(1.5rem,2.8vw,2.25rem)] font-semibold tracking-[-0.04em] text-black">
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
      <div className="relative flex max-w-[27rem] items-end gap-4 sm:gap-5">
        <Image
          alt={title}
          className="h-auto w-[4.75rem] object-contain sm:w-auto"
          height={imageHeight}
          src={image}
          width={imageWidth}
        />

        <div className="relative pb-2">
          <span className="pointer-events-none absolute right-0 top-[-3.9rem] text-[6rem] font-semibold leading-none text-black/10 sm:top-[-5.75rem] sm:text-[12.5rem]">
            {number}
          </span>
          <h3 className="relative z-10 text-[clamp(1.6rem,2.4vw,2rem)] font-semibold tracking-[-0.03em] text-black">
            {title}
          </h3>
          <p className="relative z-10 mt-3 max-w-[19rem] text-[clamp(1rem,2vw,1.75rem)] leading-[1.35] text-black">
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
                className="text-[24px] font-normal text-black transition-colors duration-[var(--transition-fast)] hover:text-[#209bd2]"
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
                        className="h-auto max-h-[9.5rem] w-auto object-contain"
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

          <div className="mt-12 grid gap-5 xl:grid-cols-3">
            {examTracks.map((track, index) => (
              <Reveal key={track.title} delay={index * 0.06}>
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

          <div className="mt-10 space-y-5 sm:mt-14 sm:space-y-[4.6875rem]">
            {skillRows.map((row, rowIndex) => (
              <div
                key={`skill-row-${rowIndex}`}
                className={cx(
                  "grid gap-5",
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

      <section className="relative overflow-hidden px-4 py-14 sm:px-8 sm:py-20 lg:px-12 xl:px-[194px]">
        <div className="absolute left-[-10rem] top-[14rem] h-[24rem] w-[24rem] rounded-full bg-[#ffc107] sm:h-[33rem] sm:w-[33rem]" />
        <div className="absolute right-[-7rem] top-[4rem] h-[20rem] w-[20rem] rounded-full bg-[#38c1ff] sm:h-[28rem] sm:w-[28rem]" />

        <div className="relative mx-auto max-w-[1618px]">
          <Reveal className="max-w-[44.375rem]">
            <SectionTitle
              description="Start learning in three simple steps."
              title="How it works"
            />
          </Reveal>

          <div className="relative mt-10 hidden min-h-[46rem] lg:block">
            <Image
              alt=""
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[5.75rem] h-auto w-full max-w-[88.125rem] -translate-x-1/2 object-contain"
              height={619}
              src={assets.flowPath}
              width={1410}
            />

            {steps.map((step) => (
              <StepCard
                key={step.number}
                className={cx("absolute", step.className)}
                description={step.description}
                image={step.image}
                imageHeight={step.imageHeight}
                imageWidth={step.imageWidth}
                number={step.number}
                title={step.title}
              />
            ))}
          </div>

          <div className="mt-12 grid gap-10 lg:hidden">
            {steps.map((step, index) => (
              <StepCard
                key={step.number}
                className={index === 1 ? "sm:mx-auto" : index === 2 ? "sm:ml-auto" : undefined}
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
