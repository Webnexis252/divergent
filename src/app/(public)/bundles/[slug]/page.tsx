import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Package, CheckCircle2, BookOpen, Clock, BarChart3, Globe, Play, Star } from "lucide-react";
import { BundleCheckoutButton } from "./_components/BundleCheckoutButton";
import { cookies } from "next/headers";
import { verifyTokenValue, AUTH_COOKIE_NAME } from "@/lib/auth";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const bundle = await (prisma as any).bundle.findUnique({ where: { slug } });
  if (!bundle) return { title: "Bundle Not Found" };
  return { title: `${bundle.title} - Course Bundle` };
}

export default async function BundleDetailsPage({ params }: Params) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const user = await verifyTokenValue(token);

  const bundle = await (prisma as any).bundle.findUnique({
    where: { slug },
    include: {
      enrollments: {
        where: { userId: user?.userId || "" },
      },
      courses: {
        include: {
          course: {
            select: { 
              id: true, title: true, price: true, description: true, thumbnail: true, lessonCount: true, totalHours: true,
              teachers: { select: { name: true, image: true } }
            },
          },
        },
      },
    },
  });

  if (!bundle || !bundle.isPublished) notFound();

  const originalPrice = bundle.courses.reduce((sum: number, bc: any) => sum + bc.course.price, 0);
  const discountPercent =
    bundle.price > 0 && originalPrice > bundle.price
      ? Math.max(1, Math.round((1 - bundle.price / originalPrice) * 100))
      : 0;
  
  const totalModules = bundle.courses.length;
  const totalHours = bundle.courses.reduce((sum: number, bc: any) => sum + (bc.course.totalHours || 0), 0);
  const totalLessons = bundle.courses.reduce((sum: number, bc: any) => sum + (bc.course.lessonCount || 0), 0);

  const learningItems = [
    `Access ${bundle.courses.length} complete courses in one combined bundle.`,
    "Learn through guided lessons.",
    "Practice with checkpoints.",
    "Return to recordings, resources, and practice blocks at your own pace.",
    "Work through a structured path.",
    "Catch live support sessions whenever scheduled.",
    "Reinforce concepts through applied work.",
  ];

  const durationStr = totalHours > 0 ? `${totalHours} hours` : `${totalModules} modules`;
  const overviewItems = [
    `Duration: ${durationStr}`,
    `Includes: ${bundle.courses.length} courses`,
    `Level: Beginner to Advanced`,
    `Format: Recorded + Self-paced`,
  ];

  const allTeachers = bundle.courses.flatMap((bc: any) => bc.course.teachers || []);
  const uniqueTeachers = Array.from(new Map(allTeachers.map((t: any) => [t.name, t])).values()) as any[];
  const teacherName = uniqueTeachers[0]?.name || "Expert Mentors";

  const mentorCards = uniqueTeachers.map(t => ({
    name: t.name,
    subtitle: "Mentor",
    image: t.image || "https://api.dicebear.com/9.x/avataaars/svg?seed=" + t.name,
  }));
  if (mentorCards.length === 0) {
    mentorCards.push({
      name: "Expert Mentors",
      subtitle: "Lead mentors",
      image: "https://api.dicebear.com/9.x/avataaars/svg?seed=ExpertMentors",
    });
  }

  const enrollment = bundle.enrollments?.[0];
  const hasAccess = !!enrollment;
  let isExpiredInstallment = false;
  if (hasAccess && enrollment.isInstallmentBased && enrollment.validUntil) {
    if (new Date() > new Date(enrollment.validUntil)) {
      isExpiredInstallment = true;
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen py-10 sm:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_400px]">
          
          {/* Main Content */}
          <div className="space-y-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-purple-700 mb-4">
                <Package className="h-4 w-4" /> Course Bundle
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {bundle.title}
              </h1>
              {bundle.description && (
                <p className="mt-6 text-xl leading-8 text-gray-600">{bundle.description}</p>
              )}
            </div>

            {/* What you'll get */}
            <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] border border-gray-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#38c1ff]/10">
                  <CheckCircle2 className="h-[18px] w-[18px] text-[#38c1ff]" />
                </div>
                <h2 className="text-[24px] font-bold text-black">What you&rsquo;ll get</h2>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {learningItems.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-[12px] bg-[#f7fdf9] px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#4caf50]" />
                    <span className="text-[14.5px] leading-[1.6] text-[#444]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Overview & Mentors */}
            <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
              {/* Bundle Overview */}
              <section className="rounded-[24px] bg-white px-7 py-8 shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] border border-gray-50 xl:min-h-[247px]">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#38c1ff]/10">
                    <BookOpen className="h-[18px] w-[18px] text-[#38c1ff]" />
                  </div>
                  <h2 className="text-[22px] font-bold text-black">Bundle Overview</h2>
                </div>
                <div className="mt-8 grid gap-3">
                  {overviewItems.map((item, idx) => {
                    const icons = [Clock, Package, BarChart3, Play];
                    const Icon = icons[idx] || Clock;
                    return (
                      <div key={item} className="flex items-center gap-3 rounded-[10px] bg-[#f8f9fa] px-4 py-3">
                        <Icon className="h-[16px] w-[16px] shrink-0 text-[#38c1ff]" />
                        <span className="text-[15px] text-[#555]">{item}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Mentor Cards */}
              <div className="grid gap-4 sm:grid-cols-2">
                {mentorCards.map((mentor) => (
                  <section key={mentor.name} className="relative overflow-hidden rounded-[24px] bg-white px-4 py-8 text-center shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] border border-gray-50 transition-shadow duration-300 hover:shadow-[0_8px_30px_rgba(0,0,0,0.09)] xl:min-h-[247px]">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#38c1ff,#ffc107)]" />
                    <div className="mx-auto h-[82px] w-[82px] overflow-hidden rounded-full bg-[#f0f0f0] ring-3 ring-[#38c1ff]/10 ring-offset-2">
                      <div
                        aria-hidden="true"
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url("${mentor.image}")` }}
                      />
                    </div>
                    <div className="mt-4 space-y-1">
                      <p className="text-[16px] font-semibold text-black">{mentor.name}</p>
                      <p className="text-[12px] font-medium text-[#38c1ff]">{mentor.subtitle}</p>
                    </div>
                  </section>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[24px] p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.04)] border border-gray-50">
              <h2 className="text-[24px] font-bold text-gray-900 mb-6">Courses Included in this Bundle</h2>
              <div className="space-y-6">
                {bundle.courses.map((bc: any, index: number) => (
                  <div key={bc.course.id} className="flex flex-col sm:flex-row gap-6 items-start pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-purple-100 text-purple-700 font-bold shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{bc.course.title}</h3>
                      {bc.course.description && (
                        <p className="mt-2 text-gray-500 line-clamp-2">{bc.course.description}</p>
                      )}
                      <div className="mt-4 flex gap-4 text-sm text-gray-500">
                        {bc.course.totalHours && <span>{bc.course.totalHours} Hours</span>}
                        {bc.course.lessonCount && <span>{bc.course.lessonCount} Lessons</span>}
                        <span className="font-medium text-gray-900 line-through">₹{bc.course.price.toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar / Checkout */}
          <div className="lg:sticky lg:top-8 self-start">
            <aside className="rounded-[24px] bg-white px-[24px] pb-[24px] pt-[20px] shadow-[0_12px_40px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.03]">
              <div className="space-y-5">
                <div className="overflow-hidden rounded-[16px] bg-[#d9d9d9] shadow-inner">
                  <div
                    aria-hidden="true"
                    className="h-[184px] w-full bg-cover bg-center transition-transform duration-700 hover:scale-105"
                    style={{
                      backgroundImage: bundle.thumbnail
                        ? `linear-gradient(180deg, rgba(8, 16, 24, 0.02), rgba(8, 16, 24, 0.12)), url("${bundle.thumbnail}")`
                        : `linear-gradient(180deg, rgba(8, 16, 24, 0.02), rgba(8, 16, 24, 0.12)), url("https://api.dicebear.com/9.x/shapes/svg?seed=cf170519-6960-44d6-913f-b1df537a439e")`,
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <h2 className="text-[18px] font-bold leading-[1.3] text-black">
                    {bundle.title}
                  </h2>
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-gray-500 font-medium">by <span className="text-black">{teacherName}</span></p>
                    <div className="flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded-full">
                      <Star className="h-3 w-3 fill-[#ffc107] text-[#ffc107]" />
                      <p className="text-[12px] font-bold text-yellow-700">4.7</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[16px] border border-gray-100 bg-gray-50/50 p-4">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#38c1ff]/10">
                      <Package className="h-3.5 w-3.5 text-[#38c1ff]" />
                    </div>
                    <p className="text-[13px] font-semibold text-gray-600">
                      {bundle.price > 0 ? "Full Access" : "Open Access"}
                    </p>
                  </div>

                  <div className="mt-3 flex items-end gap-2.5">
                    <p className="text-[28px] font-extrabold leading-none tracking-tight text-black">
                      {bundle.price > 0 ? `₹${bundle.price.toLocaleString("en-IN")}` : "Free"}
                    </p>
                    {bundle.price > 0 && originalPrice > bundle.price ? (
                      <p className="mb-1 text-[13px] font-semibold text-gray-400 line-through">
                        ₹{originalPrice.toLocaleString("en-IN")}
                      </p>
                    ) : null}
                  </div>

                  {bundle.price > 0 && discountPercent > 0 && (
                    <div className="mt-2 inline-flex rounded-full bg-green-100 px-2 py-0.5">
                      <p className="text-[11px] font-bold text-green-700">
                        {discountPercent}% OFF APPLIED
                      </p>
                    </div>
                  )}
                </div>

                {bundle.price > 0 && Array.isArray(bundle.emiPlans) && bundle.emiPlans.length > 0 ? (
                  <div className="rounded-[16px] border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-50">
                          <CheckCircle className="h-3.5 w-3.5 text-purple-500" />
                        </div>
                        <p className="text-[13px] font-semibold text-black">Pay in Instalments</p>
                        <span className="ml-auto rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">
                          CUSTOM EMI
                        </span>
                      </div>
                      <table className="w-full text-[12px]">
                        <thead>
                          <tr className="border-b border-gray-100">
                            <th className="pb-1.5 pt-1 text-left font-semibold text-[#94a3b8]">#</th>
                            <th className="pb-1.5 pt-1 text-left font-semibold text-[#94a3b8]">Amount</th>
                            <th className="pb-1.5 pt-1 text-left font-semibold text-[#94a3b8]">Due</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(bundle.emiPlans as any[]).map((plan, i) => (
                            <tr key={i} className="border-b border-gray-50 last:border-0">
                              <td className="py-1.5 pr-2 font-medium text-[#475569]">{plan.label || `${i + 1}.`}</td>
                              <td className="py-1.5 pr-2 font-bold text-black">₹{plan.amount.toLocaleString("en-IN")}</td>
                              <td className="py-1.5 text-[#64748b]">{plan.dueDays === 0 ? 'On enrollment' : `${plan.dueDays} days`}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p className="text-[11px] text-[#94a3b8]">
                        Total: ₹{(bundle.emiPlans as any[]).reduce((s, p) => s + p.amount, 0).toLocaleString("en-IN")} over {bundle.emiPlans.length} instalment{bundle.emiPlans.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ) : null}

                {hasAccess && !isExpiredInstallment ? (
                  <Link
                    className="inline-flex h-[44px] w-full items-center justify-center rounded-[12px] bg-[#38c1ff] px-4 text-[14px] font-bold tracking-wide text-white shadow-[0_6px_20px_rgba(56,193,255,0.3)] transition-all duration-300 ease-out hover:-translate-y-1 hover:bg-[#2db4f0] hover:shadow-[0_10px_24px_rgba(56,193,255,0.4)]"
                    href={`/dashboard/bundles/${bundle.id}`}
                  >
                    Continue Course
                  </Link>
                ) : (
                  <div className="pt-2">
                    <BundleCheckoutButton 
                      bundleId={bundle.id}
                      userId={user?.userId}
                      price={bundle.price}
                      emiPlans={bundle.emiPlans as any[]}
                      expiredInstallment={isExpiredInstallment ? { currentInstallment: enrollment.currentInstallment } : null}
                    />
                  </div>
                )}

                <div className="mt-6 space-y-3 pt-4 border-t border-gray-100">
                  <h4 className="text-[13px] font-semibold text-gray-900">This bundle includes:</h4>
                  <ul className="space-y-2.5 text-[13px] text-gray-600">
                    <li className="flex items-center gap-2.5">
                      <CheckCircle className="h-4 w-4 text-purple-600" /> {bundle.courses.length} Comprehensive courses
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle className="h-4 w-4 text-purple-600" /> Full lifetime access
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle className="h-4 w-4 text-purple-600" /> Access on mobile and desktop
                    </li>
                    <li className="flex items-center gap-2.5">
                      <CheckCircle className="h-4 w-4 text-purple-600" /> Certificate of completion
                    </li>
                  </ul>
                </div>
              </div>
            </aside>
          </div>

        </div>
      </div>
    </div>
  );
}
