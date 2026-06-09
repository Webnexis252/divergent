import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle, Package } from "lucide-react";
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
      courses: {
        include: {
          course: {
            select: { id: true, title: true, price: true, description: true, thumbnail: true, lessonCount: true, totalHours: true },
          },
        },
      },
    },
  });

  if (!bundle || !bundle.isPublished) notFound();

  const originalPrice = bundle.courses.reduce((sum: number, bc: any) => sum + bc.course.price, 0);
  const savings = Math.max(0, originalPrice - bundle.price);

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

            <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Courses Included in this Bundle</h2>
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
            <div className="rounded-3xl bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] overflow-hidden border border-gray-100">
              {bundle.thumbnail ? (
                <div className="aspect-[16/9] w-full relative">
                  <Image src={bundle.thumbnail} alt={bundle.title} fill className="object-cover" />
                </div>
              ) : (
                <div className="aspect-[16/9] w-full bg-gradient-to-r from-purple-600 to-blue-500" />
              )}
              
              <div className="p-8">
                <div className="flex items-end gap-3 mb-2">
                  <span className="text-4xl font-bold text-gray-900">₹{bundle.price.toLocaleString("en-IN")}</span>
                  {savings > 0 && (
                    <span className="text-lg text-gray-400 line-through mb-1">₹{originalPrice.toLocaleString("en-IN")}</span>
                  )}
                </div>
                {savings > 0 && (
                  <p className="text-sm font-semibold text-emerald-600 bg-emerald-50 inline-block px-2 py-1 rounded mb-6">
                    You save ₹{savings.toLocaleString("en-IN")}
                  </p>
                )}

                <BundleCheckoutButton 
                  bundleId={bundle.id}
                  userId={user?.userId}
                />

                <div className="mt-8 space-y-4">
                  <h4 className="font-semibold text-gray-900">This bundle includes:</h4>
                  <ul className="space-y-3 text-sm text-gray-600">
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-purple-600" /> {bundle.courses.length} Comprehensive courses
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-purple-600" /> Full lifetime access
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-purple-600" /> Access on mobile and desktop
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-purple-600" /> Certificate of completion
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
