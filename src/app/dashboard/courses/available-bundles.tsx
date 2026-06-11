"use client";

import { AnimCard, StaggerGrid } from "@/app/dashboard/_components/motion-wrappers";
import { BundleCheckoutButton } from "@/app/(public)/bundles/[slug]/_components/BundleCheckoutButton";
import { cx } from "@/lib/cx";
import { Package } from "lucide-react";

export function AvailableBundles({ bundles, userId }: { bundles: any[]; userId: string }) {
  if (bundles.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Package className="h-6 w-6 text-[#7c3aed]" />
        <h2 className="text-[clamp(1.5rem,2.5vw,1.8rem)] font-medium text-black">Available Bundles</h2>
      </div>

      <StaggerGrid className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {bundles.map((bundle) => (
          <AnimCard key={bundle.id}>
            <article className="flex h-full flex-col overflow-hidden rounded-[20px] border border-purple-100 bg-white p-[10px] shadow-[0_4px_10px_rgba(124,58,237,0.1)] transition hover:shadow-[0_8px_20px_rgba(124,58,237,0.15)]">
              <div className="overflow-hidden rounded-[16px] bg-[#d0d0d0]">
                <div
                  aria-hidden="true"
                  className="h-[184px] w-full bg-cover bg-center"
                  style={{
                    backgroundImage: bundle.thumbnail
                      ? `linear-gradient(180deg, rgba(8, 16, 24, 0.04), rgba(8, 16, 24, 0.18)), url("${bundle.thumbnail}")`
                      : `linear-gradient(135deg, #e9d5ff, #c084fc)`,
                  }}
                />
              </div>

              <div className="flex flex-1 flex-col px-1 pb-1 pt-4">
                <div className="space-y-1 mb-4">
                  <h3 className="text-[16px] font-bold leading-[1.15] text-[#101828]">
                    {bundle.title}
                  </h3>
                  {bundle.description && (
                    <p className="line-clamp-2 text-[13px] text-gray-500">
                      {bundle.description}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {bundle.courses.map((bc: any) => (
                      <span key={bc.course.title} className="inline-block rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-700">
                        {bc.course.title}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-auto pt-4 border-t border-gray-100">
                  <div className="flex items-end justify-between gap-4 mb-3">
                    <p className="text-[18px] font-bold text-[#7c3aed]">
                      ₹{bundle.price.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <BundleCheckoutButton bundleId={bundle.id} userId={userId} />
                </div>
              </div>
            </article>
          </AnimCard>
        ))}
      </StaggerGrid>
    </div>
  );
}
