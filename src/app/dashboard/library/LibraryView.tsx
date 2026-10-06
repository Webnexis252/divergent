import Link from "next/link";
import { cx } from "@/lib/cx";
import { PageHero } from "@/components/ui/page-hero";
import { PageTransition, RevealSection } from "../_components/motion-wrappers";
import {
  ArtCard,
  CoursePill,
  heroCard,
  pageMain,
  pageSection,
  primaryAction,
  secondaryAction,
  sectionLede,
  sectionTitle,
} from "../_components/student-ui";

const art = "/assets/dashboard/explore-library.png";

/** The library: book PDFs for the student's courses (none are uploaded anywhere yet). */
export function LibraryView({ courses }: { courses: Array<{ id: string; title: string }> }) {
  return (
    <PageTransition>
      <main className={pageMain}>
        <section className={pageSection}>
          <RevealSection>
            <PageHero
              eyebrow="Library"
              title="Your Library"
              description={<p>Book PDFs and reading for your courses, uploaded by your institute.</p>}
              aside={
                <div className={heroCard}>
                  <p className="text-[16px] font-bold">Looking for handouts?</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-black/60">
                    PDFs, question banks and notes your teachers share are in each course&apos;s modules.
                  </p>
                  <Link href="/dashboard/modules" className={cx(secondaryAction, "mt-4 w-full")}>
                    Go to Modules
                  </Link>
                </div>
              }
            />
          </RevealSection>

          <RevealSection delay={0.06} className="space-y-4">
            <div>
              <h2 className={sectionTitle}>Books</h2>
              <p className={sectionLede}>For the courses you&apos;re enrolled in.</p>
            </div>

            {courses.length === 0 ? (
              <ArtCard
                image={art}
                title="No courses yet"
                description="Enroll in a course and its books will be collected here."
                action={
                  <Link href="/dashboard/courses" className={primaryAction}>
                    Browse courses
                  </Link>
                }
              />
            ) : (
              <ArtCard
                image={art}
                title="No books yet"
                description="When your institute uploads book PDFs for your courses, they'll appear here."
                action={
                  <div className="flex max-w-[36rem] flex-wrap justify-center gap-2">
                    {courses.map((course) => (
                      <CoursePill key={course.id} title={course.title} />
                    ))}
                  </div>
                }
              />
            )}
          </RevealSection>
        </section>
      </main>
    </PageTransition>
  );
}
