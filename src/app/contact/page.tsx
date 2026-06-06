import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { Mail, Phone, MapPin, Clock, ArrowLeft, MessageSquare } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with the Divergent Classes team. We're here to help with your questions about courses, payments, and enrollment.",
};

const contactDetails = [
  {
    icon: Mail,
    label: "Email",
    value: "support@divergentclasses.com",
    href: "mailto:support@divergentclasses.com",
    color: "#209bd2",
    bg: "#eef8ff",
  },
  {
    icon: Phone,
    label: "Phone / WhatsApp",
    value: "+91 98765 43210",
    href: "tel:+919876543210",
    color: "#059669",
    bg: "#ecfdf5",
  },
  {
    icon: MapPin,
    label: "Address",
    value: "New Delhi, India — 110001",
    href: null,
    color: "#d97706",
    bg: "#fffbeb",
  },
  {
    icon: Clock,
    label: "Support Hours",
    value: "Mon – Sat, 10 AM – 7 PM IST",
    href: null,
    color: "#7c3aed",
    bg: "#f5f3ff",
  },
];

const faqs = [
  {
    q: "How do I enroll in a course?",
    a: "Browse the Courses section, click on any course, and hit 'Enroll Now'. Follow the payment steps to complete your enrollment.",
  },
  {
    q: "I made a payment but didn't get access — what do I do?",
    a: "Email us at support@divergentclasses.com with your order ID and payment screenshot. We'll resolve it within 24 hours.",
  },
  {
    q: "Are live classes recorded?",
    a: "Yes. All live sessions are recorded and available in your dashboard within a few hours of the class ending.",
  },
  {
    q: "Can I switch courses after enrollment?",
    a: "Course switches are handled on a case-by-case basis. Please reach out to our support team with your details.",
  },
];

export default function ContactPage() {
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
      <section className="bg-gradient-to-br from-[#0369a1] via-[#0284c7] to-[#38c1ff] px-4 py-16 text-white sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[720px] text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-white/20 backdrop-blur-sm">
            <MessageSquare className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.04em]">
            Contact Us
          </h1>
          <p className="mt-4 text-[clamp(1rem,2vw,1.25rem)] leading-relaxed text-white/85">
            Have a question or need help? Our support team is happy to assist you with anything related to courses, payments, or your account.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1080px] px-4 py-14 sm:px-8 sm:py-20">
        {/* Contact cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {contactDetails.map((item) => (
            <div
              key={item.label}
              className="rounded-[22px] border border-[#e8eef6] bg-white p-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]"
            >
              <div
                className="mb-4 grid h-12 w-12 place-items-center rounded-[16px]"
                style={{ background: item.bg }}
              >
                <item.icon className="h-6 w-6" style={{ color: item.color }} />
              </div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#94a3b8]">
                {item.label}
              </p>
              {item.href ? (
                <a
                  href={item.href}
                  className="mt-1.5 block text-[15px] font-semibold text-[#0f172a] hover:text-[#209bd2] hover:underline"
                >
                  {item.value}
                </a>
              ) : (
                <p className="mt-1.5 text-[15px] font-semibold text-[#0f172a]">{item.value}</p>
              )}
            </div>
          ))}
        </div>

        {/* Write to us */}
        <div className="mt-12 rounded-[28px] border border-[#e2ebf5] bg-white p-8 shadow-[0_8px_40px_rgba(2,132,199,0.08)] sm:p-10">
          <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-[#0f172a]">
            Send us a message
          </h2>
          <p className="mt-1.5 text-[14px] text-[#64748b]">
            Fill in the form and we'll get back to you within 24 hours on working days.
          </p>

          <form className="mt-8 grid gap-5 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#334155]">Full Name</label>
              <input
                type="text"
                placeholder="Aanya Sharma"
                className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[14px] text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20 transition"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[#334155]">Email Address</label>
              <input
                type="email"
                placeholder="you@example.com"
                className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[14px] text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20 transition"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[13px] font-semibold text-[#334155]">Subject</label>
              <input
                type="text"
                placeholder="e.g. Payment issue for UCEED course"
                className="rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[14px] text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20 transition"
              />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-[13px] font-semibold text-[#334155]">Message</label>
              <textarea
                rows={5}
                placeholder="Describe your issue or question in detail..."
                className="resize-y rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-4 py-3 text-[14px] text-[#0f172a] outline-none placeholder:text-[#cbd5e1] focus:border-[#38c1ff] focus:ring-2 focus:ring-[#38c1ff]/20 transition"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="inline-flex h-12 items-center gap-2 rounded-[14px] bg-[#209bd2] px-8 text-[15px] font-semibold text-white shadow-[0_4px_16px_rgba(32,155,210,0.32)] transition hover:-translate-y-0.5 hover:bg-[#0284c7]"
              >
                Send Message
              </button>
            </div>
          </form>
        </div>

        {/* FAQ */}
        <div className="mt-14">
          <h2 className="text-[1.5rem] font-semibold tracking-[-0.03em] text-[#0f172a]">
            Frequently Asked Questions
          </h2>
          <div className="mt-6 grid gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.q}
                className="rounded-[18px] border border-[#e8eef6] bg-white px-6 py-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
              >
                <p className="text-[15px] font-semibold text-[#0f172a]">{faq.q}</p>
                <p className="mt-2 text-[14px] leading-relaxed text-[#475569]">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Policy links */}
        <div className="mt-14 rounded-[20px] border border-[#e8f4fb] bg-[#f0f9ff] px-6 py-6">
          <p className="text-[13px] font-semibold text-[#0369a1]">Related policy pages</p>
          <div className="mt-3 flex flex-wrap gap-4">
            <Link href="/terms" className="text-[14px] font-medium text-[#209bd2] hover:underline">
              Terms &amp; Conditions →
            </Link>
            <Link href="/refund-policy" className="text-[14px] font-medium text-[#209bd2] hover:underline">
              Refund &amp; Cancellation Policy →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
