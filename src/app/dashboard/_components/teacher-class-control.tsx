"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { formatShortDate } from "@/lib/date-format";
import { TeacherScheduleData, TeacherScheduleItem } from "@/lib/live-class-types";
import { ClassControlIcon } from "./teacher-icons";
import { TeacherSidebar } from "./teacher-sidebar";

import { PageTransition, RevealSection, StaggerGrid } from "./motion-wrappers";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

function formatScheduleTime(startTime: string, duration: number) {
  const start = new Date(startTime);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  return `${start.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })} - ${end.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

function statusTone(status: TeacherScheduleItem["status"]) {
  if (status === "live") {
    return "bg-[#ffe7e4] text-[#e43d30]";
  }

  if (status === "completed") {
    return "bg-[#ecfdf3] text-[#039855]";
  }

  return "bg-[#e8f4ff] text-[#1570ef]";
}

function statusLabel(status: TeacherScheduleItem["status"]) {
  if (status === "live") return "Live";
  if (status === "completed") return "Completed";
  return "Upcoming";
}

function assignmentTone(state: TeacherScheduleItem["assignmentState"]) {
  if (state === "assigned") {
    return "bg-[#fff4d6] text-[#9a6700]";
  }

  return "bg-[#f2f4f7] text-[#475467]";
}

function ScheduleStatCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note: string;
}) {
  return (
    <motion.article
      className="rounded-[22px] border border-[#ededed] bg-white px-5 py-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]"
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.45, ease }}
      whileHover={{ y: -4, boxShadow: "0 16px 34px rgba(15,23,42,0.08)" }}
    >
      <p className="text-[13px] font-medium uppercase tracking-[0.12em] text-[#667085]">
        {label}
      </p>
      <p className="mt-4 text-[38px] font-semibold leading-none tracking-[-0.04em] text-[#101828]">
        {value}
      </p>
      <p className="mt-3 text-[13px] text-[#667085]">{note}</p>
    </motion.article>
  );
}

function ScheduleGroup({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: TeacherScheduleItem[];
}) {
  return (
    <RevealSection>
      <section className="overflow-hidden rounded-[28px] border border-[#e8eaef] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <div className="flex items-start justify-between gap-4 border-b border-[#eef0f3] px-6 py-5 sm:px-7">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-[14px] bg-[#eef4ff]">
              <ClassControlIcon className="h-5 w-5 text-[#5b7fff]" />
            </div>
            <div>
              <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#101828]">
                {title}
              </h2>
              <p className="mt-1 text-[13px] text-[#667085]">{subtitle}</p>
            </div>
          </div>
          <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[#fff1e8] px-2 text-[12px] font-semibold text-[#f97316]">
            {items.length}
          </span>
        </div>

        <div className="grid gap-4 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-2">
          {items.length > 0 ? (
            items.map((item, index) => (
              <Link
                key={item.id}
                href={`/dashboard/teacher/class-control/${item.id}`}
                className="block"
              >
                <motion.article
                  className="group h-full rounded-[22px] border border-[#eceef2] bg-[#fcfcfd] px-5 py-5 transition"
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.4, ease, delay: index * 0.04 }}
                  whileHover={{
                    y: -6,
                    boxShadow: "0 18px 34px rgba(15,23,42,0.08)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium uppercase tracking-[0.12em] text-[#1570ef]">
                        {item.courseTitle}
                      </p>
                      <h3 className="mt-2 text-[22px] font-semibold leading-tight tracking-[-0.03em] text-[#101828]">
                        {item.title}
                      </h3>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${statusTone(item.status)}`}
                    >
                      {statusLabel(item.status)}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-[14px] text-[#475467]">
                    <p>{formatShortDate(item.startTime)}</p>
                    <p>{formatScheduleTime(item.startTime, item.duration)}</p>
                    <p>{item.attendeeCount} students expected</p>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-3">
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] ${assignmentTone(item.assignmentState)}`}
                    >
                      {item.assignmentState === "assigned" ? "Assigned" : "Shared"}
                    </span>
                    <span className="text-[13px] font-semibold text-[#111827] transition group-hover:text-[#1570ef]">
                      Open classroom
                    </span>
                  </div>
                </motion.article>
              </Link>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-[#d7dbe2] bg-[#fafafa] px-5 py-10 text-center text-[14px] text-[#667085] xl:col-span-2">
              No classes in this window yet.
            </div>
          )}
        </div>
      </section>
    </RevealSection>
  );
}

export function TeacherClassControl() {
  const [data, setData] = useState<TeacherScheduleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch("/api/teacher/live-classes")
      .then((response) => response.json())
      .then((json) => {
        if (active && json.success) {
          setData(json.data);
        }
      })
      .catch((error) => console.error("Failed to load teacher classes", error))
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const windowLabel = data
    ? `${formatShortDate(data.windowStart)} to ${formatShortDate(data.windowEnd)}`
    : "Loading schedule window…";

  return (
    <PageTransition>
        <div className="mx-auto grid max-w-[1920px] gap-6 px-3 pb-14 pt-4 sm:px-6 sm:pt-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-8 lg:px-0 lg:pt-8">
          <TeacherSidebar />

          <main className="space-y-8 lg:pr-[160px]">
            <RevealSection>
              <section className="relative overflow-hidden rounded-[30px] bg-gradient-to-r from-[#38c1ff] to-[#0077ff] px-6 py-10 text-white shadow-[0_24px_48px_rgba(56,193,255,0.25)] sm:px-8 lg:px-12 lg:py-12">
                <motion.div
                  className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/12 blur-3xl"
                  animate={{ scale: [1, 1.22, 1], opacity: [0.35, 0.6, 0.35] }}
                  transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                />
                <motion.div
                  className="pointer-events-none absolute bottom-[-48px] left-[38%] h-36 w-36 rounded-full bg-[#fec600]/25 blur-3xl"
                  animate={{ y: [0, -12, 0], scale: [1, 1.18, 1] }}
                  transition={{ duration: 4.6, repeat: Infinity, ease: "easeInOut" }}
                />

                <div className="relative z-10 max-w-[720px]">
                  <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-white/72">
                    Teacher schedule
                  </p>
                  <h1 className="mt-4 text-[clamp(2.25rem,4vw,3.6rem)] font-semibold leading-[0.95] tracking-[-0.05em]">
                    Class control for today and the next 7 days
                  </h1>
                  <p className="mt-4 max-w-[560px] text-[15px] leading-7 text-white/88 sm:text-[16px]">
                    Open any assigned class straight into the live classroom view,
                    with the same in-class layout and messaging panel students see.
                  </p>
                  <p className="mt-5 text-[13px] font-medium uppercase tracking-[0.12em] text-white/72">
                    {windowLabel}
                  </p>
                </div>
              </section>
            </RevealSection>

            <StaggerGrid className="grid gap-4 md:grid-cols-3">
              <ScheduleStatCard
                label="Today"
                value={loading ? "…" : String(data?.counts.today ?? 0)}
                note="Classes scheduled for the current day"
              />
              <ScheduleStatCard
                label="Next 7 Days"
                value={loading ? "…" : String(data?.counts.nextWeek ?? 0)}
                note="Upcoming sessions through the next week"
              />
              <ScheduleStatCard
                label="Live Right Now"
                value={loading ? "…" : String(data?.counts.live ?? 0)}
                note="Classrooms that can be opened immediately"
              />
            </StaggerGrid>

            {loading ? (
              <RevealSection>
                <div className="flex min-h-[220px] items-center justify-center rounded-[28px] border border-[#e8eaef] bg-white text-[14px] text-[#667085] shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    className="mr-3 h-5 w-5 rounded-full border-2 border-[#38c1ff] border-t-transparent"
                  />
                  Loading class control…
                </div>
              </RevealSection>
            ) : (
              <>
                <ScheduleGroup
                  title="Today"
                  subtitle="Assigned classes scheduled for today"
                  items={data?.today ?? []}
                />
                <ScheduleGroup
                  title="Next 7 Days"
                  subtitle="Everything lined up after today through the next week"
                  items={data?.nextWeek ?? []}
                />
              </>
            )}
          </main>
        </div>
    </PageTransition>
  );
}
