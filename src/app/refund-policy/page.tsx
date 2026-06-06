import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ArrowLeft, RefreshCcw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "Read the Refund & Cancellation Policy for Divergent Classes. Understand how we handle refund requests for courses and live sessions.",
};

const lastUpdated = "June 1, 2025";

const eligibleReasons = [
  "Technical issues preventing course access that our team cannot resolve within 7 business days.",
  "Course content significantly differs from what was described at the time of purchase.",
  "Duplicate payment made for the same course.",
  "Live class or session was cancelled by Divergent Classes and no rescheduling option was offered.",
];

const notEligibleReasons = [
  "You have watched more than 20% of the course content.",
  "More than 7 days have passed since the date of purchase.",
  "Refund is requested due to change of mind, lack of time, or personal reasons.",
  "You have downloaded any course resources, PDFs, or study material.",
  "The course was purchased during a sale or at a discounted price (unless technically inaccessible).",
  "Partial completion of a course or dissatisfaction with exam results.",
];

const steps = [
  {
    step: "01",
    title: "Email our support team",
    desc: "Send a refund request to support@divergentclasses.com with your registered email, order ID, and a brief reason.",
    color: "#209bd2",
    bg: "#eef8ff",
  },
  {
    step: "02",
    title: "Verification within 2 business days",
    desc: "Our team will verify your purchase and eligibility criteria within 2 business days of receiving your request.",
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
  {
    step: "03",
    title: "Decision communicated",
    desc: "You'll receive an email with our decision. Approved refunds are processed to the original payment method.",
    color: "#059669",
    bg: "#ecfdf5",
  },
  {
    step: "04",
    title: "Refund credited in 5–7 days",
    desc: "Once approved, the refund amount is credited back to your original payment method within 5–7 business days.",
    color: "#d97706",
    bg: "#fffbeb",
  },
];

const sections = [
  {
    id: "overview",
    title: "1. Overview",
    content:
      "At Divergent Classes, we want every learner to have a positive experience. We understand that sometimes a course or service may not meet your expectations. This Refund & Cancellation Policy outlines the conditions under which refunds may be granted. Please read it carefully before making a purchase.",
  },
  {
    id: "eligibility",
    title: "2. Refund Eligibility Window",
    content:
      "Refund requests must be submitted within 7 (seven) calendar days of the original purchase date. Requests submitted after this period will not be entertained, irrespective of the reason. The eligibility window begins at the time the payment is confirmed and course access is granted.",
  },
  {
    id: "emi",
    title: "3. EMI & Instalment Payments",
    content:
      "If you have purchased a course using an instalment (EMI) plan, refunds will only be considered if the request is made within 7 days of the first instalment payment and none of the eligibility exclusions apply. Subsequent instalments that have already been charged as part of the EMI schedule are non-refundable once the refund window closes. Please contact us before your next instalment is due if you wish to cancel.",
  },
  {
    id: "live",
    title: "4. Live Classes & Scheduled Sessions",
    content:
      "Live classes and scheduled mentorship sessions that you do not attend are non-refundable. If Divergent Classes cancels a live session without rescheduling, you are entitled to a refund for that specific session or a credit toward a future session at our discretion. Please contact us within 48 hours of the cancelled session.",
  },
  {
    id: "process",
    title: "5. How to Request a Refund",
    content:
      "Email support@divergentclasses.com with the subject line 'Refund Request – [Your Order ID]'. Include your registered email address, order ID (found in your dashboard or payment confirmation email), and a brief description of your reason for the request. Incomplete requests may cause delays.",
  },
  {
    id: "processing",
    title: "6. Refund Processing Time",
    content:
      "Once a refund is approved, the credit will be initiated to your original payment method within 5–7 business days. Depending on your bank or card issuer, the amount may appear on your statement within 7–10 business days. Divergent Classes is not responsible for delays caused by third-party payment processors or banks.",
  },
  {
    id: "cancellation",
    title: "7. Course Cancellation by Divergent Classes",
    content:
      "In the rare event that Divergent Classes discontinues a course that you have purchased, you will be entitled to a full refund of the purchase price paid, regardless of how much content you have accessed. We will notify affected learners via email within 7 days of the decision.",
  },
  {
    id: "changes",
    title: "8. Changes to This Policy",
    content:
      "Divergent Classes reserves the right to amend this Refund & Cancellation Policy at any time. Changes will be effective from the date of publication on this page. Purchases made prior to a policy change will continue to be governed by the policy in effect at the time of purchase.",
  },
  {
    id: "contact-section",
    title: "9. Contact for Refund Queries",
    content:
      "For all refund-related queries, please reach out to:\n\nEmail: support@divergentclasses.com\nPhone / WhatsApp: +91 98765 43210\nSupport Hours: Monday – Saturday, 10 AM – 7 PM IST\n\nWe aim to respond to all refund requests within 2 business days.",
  },
];

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-[#f7f6f6]">
      {/* Header */}
      <header className="border-b border-[#e8f4fb] bg-white">
        <div className="mx-auto flex min-h-[72px] w-full max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-8">
          <BrandLogo href="/" size="md" />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[#209bd2] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-[#064e3b] via-[#065f46] to-[#059669] px-4 py-16 text-white sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[720px] text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-white/20 backdrop-blur-sm">
            <RefreshCcw className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.04em]">
            Refund &amp; Cancellation Policy
          </h1>
          <p className="mt-4 text-[clamp(0.95rem,2vw,1.15rem)] leading-relaxed text-white/70">
            Last updated: {lastUpdated}
          </p>
          <p className="mt-3 text-[clamp(1rem,2vw,1.15rem)] leading-relaxed text-white/85">
            We want you to be completely satisfied with your learning experience. Please review our refund terms carefully before purchasing.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[900px] px-4 py-14 sm:px-8 sm:py-20">

        {/* 7-day banner */}
        <div className="mb-12 flex items-start gap-4 rounded-[20px] border border-[#fbbf24]/40 bg-[#fffbeb] px-6 py-5 shadow-sm">
          <AlertCircle className="mt-0.5 h-6 w-6 shrink-0 text-[#d97706]" />
          <div>
            <p className="text-[15px] font-semibold text-[#92400e]">7-Day Refund Window</p>
            <p className="mt-1 text-[14px] leading-relaxed text-[#78350f]">
              All refund requests must be submitted within <strong>7 calendar days</strong> of the purchase date. No refunds will be processed after this window closes.
            </p>
          </div>
        </div>

        {/* Eligible / Not eligible */}
        <div className="mb-12 grid gap-5 sm:grid-cols-2">
          <div className="rounded-[22px] border border-[#bbf7d0] bg-white px-6 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-[#059669]" />
              <p className="font-semibold text-[#065f46]">Eligible for refund</p>
            </div>
            <ul className="space-y-2.5">
              {eligibleReasons.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[#064e3b]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#059669]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[22px] border border-[#fecaca] bg-white px-6 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <XCircle className="h-5 w-5 text-[#dc2626]" />
              <p className="font-semibold text-[#7f1d1d]">Not eligible for refund</p>
            </div>
            <ul className="space-y-2.5">
              {notEligibleReasons.map((r) => (
                <li key={r} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-[#7f1d1d]">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#dc2626]" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* How to request — steps */}
        <div className="mb-14">
          <h2 className="mb-6 text-[1.25rem] font-semibold tracking-[-0.03em] text-[#0f172a]">
            How the Refund Process Works
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {steps.map((s) => (
              <div
                key={s.step}
                className="rounded-[20px] border border-[#e8eef6] bg-white px-5 py-5 shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] text-[13px] font-bold"
                    style={{ background: s.bg, color: s.color }}
                  >
                    {s.step}
                  </div>
                  <p className="text-[14.5px] font-semibold text-[#0f172a]">{s.title}</p>
                </div>
                <p className="mt-3 text-[13.5px] leading-relaxed text-[#64748b]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed sections */}
        <div className="space-y-8">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-8 rounded-[22px] border border-[#e8eef6] bg-white px-6 py-7 shadow-[0_4px_20px_rgba(0,0,0,0.04)] sm:px-8"
            >
              <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em] text-[#0f172a]">
                {section.title}
              </h2>
              <p className="mt-3 whitespace-pre-line text-[14.5px] leading-relaxed text-[#475569]">
                {section.content}
              </p>
            </section>
          ))}
        </div>

        {/* Footer links */}
        <div className="mt-14 rounded-[20px] border border-[#e8f4fb] bg-[#f0f9ff] px-6 py-6">
          <p className="text-[13px] font-semibold text-[#0369a1]">Related policy pages</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link href="/contact" className="text-[14px] font-medium text-[#209bd2] hover:underline">
              Contact Us →
            </Link>
            <Link href="/terms" className="text-[14px] font-medium text-[#209bd2] hover:underline">
              Terms &amp; Conditions →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
