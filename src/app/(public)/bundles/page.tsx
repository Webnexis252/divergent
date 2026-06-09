import prisma from "@/lib/prisma";
import Link from "next/link";
import { Package } from "lucide-react";
import Image from "next/image";

export const metadata = { title: "Course Bundles - Divergent" };

export default async function PublicBundlesPage() {
  const bundles = await (prisma as any).bundle.findMany({
    where: { isPublished: true },
    include: {
      courses: {
        include: {
          course: { select: { id: true, title: true, price: true, thumbnail: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">Course Bundles</h1>
          <p className="mx-auto mt-4 max-w-2xl text-xl text-gray-500">
            Get more value by enrolling in carefully curated course bundles. Master complete skill paths at a discount.
          </p>
        </div>

        {bundles.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
            <Package className="mx-auto h-16 w-16 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">No bundles available</h3>
            <p className="mt-2 text-gray-500">Check back later for new course packages!</p>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {bundles.map((bundle: any) => {
              const originalPrice = bundle.courses.reduce((sum: number, bc: any) => sum + bc.course.price, 0);
              const savings = Math.max(0, originalPrice - bundle.price);
              
              return (
                <div key={bundle.id} className="flex flex-col bg-white rounded-3xl shadow-sm hover:shadow-md transition-shadow overflow-hidden border border-gray-100">
                  {bundle.thumbnail ? (
                    <div className="aspect-[2/1] relative w-full overflow-hidden bg-gray-100">
                      <Image src={bundle.thumbnail} alt={bundle.title} fill className="object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[4/1] w-full bg-gradient-to-r from-purple-500 to-blue-500" />
                  )}
                  
                  <div className="flex flex-1 flex-col p-8">
                    <h3 className="text-2xl font-bold text-gray-900">{bundle.title}</h3>
                    {bundle.description && (
                      <p className="mt-3 text-base text-gray-500 flex-1">{bundle.description}</p>
                    )}
                    
                    <div className="mt-6">
                      <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-900 mb-3">Includes {bundle.courses.length} courses:</h4>
                      <ul className="space-y-2">
                        {bundle.courses.map((bc: any) => (
                          <li key={bc.course.id} className="flex items-start gap-2">
                            <CheckIcon className="h-5 w-5 text-emerald-500 shrink-0" />
                            <span className="text-gray-600 text-sm">{bc.course.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                      <div>
                        <p className="text-3xl font-bold text-gray-900">₹{bundle.price.toLocaleString("en-IN")}</p>
                        {savings > 0 && (
                          <p className="text-sm font-medium text-emerald-600">Save ₹{savings.toLocaleString("en-IN")}</p>
                        )}
                      </div>
                      <Link
                        href={`/bundles/${bundle.slug}`}
                        className="rounded-full bg-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-purple-500 transition"
                      >
                        View Bundle details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
