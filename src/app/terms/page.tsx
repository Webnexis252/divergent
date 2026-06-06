import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/ui/brand-logo";
import { ArrowLeft, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Read the Terms & Conditions for using Divergent Classes platform. By accessing our services, you agree to these terms.",
};

const lastUpdated = "June 1, 2025";

const sections = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: [
      "By accessing or using the Divergent Classes platform (the \"Platform\"), you confirm that you have read, understood, and agree to be bound by these Terms & Conditions (\"Terms\"). If you do not agree to these Terms, please do not use our services.",
      "Divergent Classes reserves the right to update or modify these Terms at any time without prior notice. Your continued use of the Platform following any such change constitutes your acceptance of the updated Terms.",
    ],
  },
  {
    id: "services",
    title: "2. Description of Services",
    content: [
      "Divergent Classes provides an online learning platform offering structured video courses, live classes, mock tests, mentorship sessions, and community support aimed at students preparing for design entrance examinations such as UCEED, NID, and NIFT.",
      "We reserve the right to modify, suspend, or discontinue any aspect of the Platform at any time, including the availability of any feature, database, or content.",
    ],
  },
  {
    id: "eligibility",
    title: "3. Eligibility",
    content: [
      "To use the Platform, you must be at least 13 years of age. If you are under 18, you represent that you have obtained parental or guardian consent to use the Platform and agree to these Terms.",
      "By creating an account, you represent that all information you provide is accurate, current, and complete, and that you will keep your account credentials confidential.",
    ],
  },
  {
    id: "accounts",
    title: "4. User Accounts",
    content: [
      "You are responsible for maintaining the confidentiality of your account login credentials. You agree to notify us immediately at support@divergentclasses.com of any unauthorised use of your account.",
      "Each account is for individual use only. Sharing your account, login credentials, or course access with others is strictly prohibited and may result in immediate termination of your account without refund.",
    ],
  },
  {
    id: "payments",
    title: "5. Payments & Pricing",
    content: [
      "All course fees displayed on the Platform are in Indian Rupees (INR) and are inclusive of applicable taxes unless stated otherwise. Prices are subject to change at any time.",
      "Payments are processed through Razorpay, a PCI-DSS compliant payment gateway. Divergent Classes does not store your card or payment information.",
      "Once a payment is successfully processed and course access is granted, please refer to our Refund & Cancellation Policy for details on eligibility for refunds.",
    ],
  },
  {
    id: "intellectual-property",
    title: "6. Intellectual Property",
    content: [
      "All content on the Platform — including but not limited to video lectures, PDFs, images, study materials, assessments, and software — is the exclusive intellectual property of Divergent Classes or its licensors and is protected by applicable intellectual property laws.",
      "You are granted a limited, non-exclusive, non-transferable licence to access and view purchased course content solely for your personal, non-commercial educational purposes. You may not reproduce, distribute, modify, create derivative works of, publicly display, or exploit any content without our express written consent.",
      "Unauthorised sharing, downloading, screen-recording, or redistribution of any content is strictly prohibited and may result in legal action.",
    ],
  },
  {
    id: "prohibited",
    title: "7. Prohibited Conduct",
    content: [
      "You agree not to: (a) use the Platform for any unlawful purpose or in violation of applicable laws; (b) impersonate any person or entity; (c) upload or transmit viruses, malware, or any other harmful code; (d) attempt to gain unauthorised access to any portion of the Platform; (e) scrape, crawl, or systematically extract data from the Platform; (f) post or share content that is defamatory, obscene, or infringes on the rights of others.",
    ],
  },
  {
    id: "disclaimer",
    title: "8. Disclaimer of Warranties",
    content: [
      "The Platform and all content are provided on an \"as is\" and \"as available\" basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.",
      "Divergent Classes does not warrant that the Platform will be uninterrupted, error-free, or free of viruses or other harmful components. We do not guarantee specific results, outcomes, or exam success from using our courses.",
    ],
  },
  {
    id: "limitation",
    title: "9. Limitation of Liability",
    content: [
      "To the maximum extent permitted by applicable law, Divergent Classes, its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of — or inability to use — the Platform, even if we have been advised of the possibility of such damages.",
      "Our total aggregate liability to you for any claim arising out of or in connection with these Terms shall not exceed the total amount paid by you to Divergent Classes in the three months preceding the event giving rise to the claim.",
    ],
  },
  {
    id: "governing",
    title: "10. Governing Law & Dispute Resolution",
    content: [
      "These Terms are governed by and construed in accordance with the laws of India. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts located in New Delhi, India.",
      "Before initiating any formal legal proceedings, you agree to first attempt to resolve the dispute informally by contacting us at support@divergentclasses.com.",
    ],
  },
  {
    id: "contact",
    title: "11. Contact Information",
    content: [
      "If you have any questions about these Terms & Conditions, please contact us:",
      "Email: support@divergentclasses.com\nPhone: +91 98765 43210\nAddress: New Delhi, India — 110001",
    ],
  },
];

export default function TermsPage() {
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
      <section className="bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#1e293b] px-4 py-16 text-white sm:px-8 sm:py-24">
        <div className="mx-auto max-w-[720px] text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-[22px] bg-white/10 backdrop-blur-sm">
            <Scale className="h-8 w-8 text-[#38c1ff]" />
          </div>
          <h1 className="text-[clamp(2rem,5vw,3rem)] font-semibold tracking-[-0.04em]">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-[clamp(0.95rem,2vw,1.15rem)] leading-relaxed text-white/70">
            Last updated: {lastUpdated}
          </p>
          <p className="mt-3 text-[clamp(1rem,2vw,1.15rem)] leading-relaxed text-white/80">
            Please read these Terms carefully before using the Divergent Classes platform. By using our services, you agree to be bound by these Terms.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[860px] px-4 py-14 sm:px-8 sm:py-20">
        {/* Quick nav */}
        <div className="mb-12 rounded-[22px] border border-[#e2ebf5] bg-white px-6 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#94a3b8]">Table of Contents</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {sections.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-[14px] font-medium text-[#209bd2] hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map((section) => (
            <section
              key={section.id}
              id={section.id}
              className="scroll-mt-8 rounded-[22px] border border-[#e8eef6] bg-white px-6 py-7 shadow-[0_4px_20px_rgba(0,0,0,0.04)] sm:px-8"
            >
              <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em] text-[#0f172a]">
                {section.title}
              </h2>
              <div className="mt-4 space-y-3">
                {section.content.map((para, j) => (
                  <p
                    key={j}
                    className="whitespace-pre-line text-[14.5px] leading-relaxed text-[#475569]"
                  >
                    {para}
                  </p>
                ))}
              </div>
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
            <Link href="/refund-policy" className="text-[14px] font-medium text-[#209bd2] hover:underline">
              Refund &amp; Cancellation Policy →
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
