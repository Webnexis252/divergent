"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

type TestItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  durationMins: number;
  passingScore: number;
  maxAttempts: number;
  availableFrom: string | null;
  availableUntil: string | null;
  chapter: { id: string; title: string } | null;
  _count: { questions: number; attempts: number };
  attempts?: Array<{
    id: string;
    score: number;
    isPassed: boolean;
    startedAt: string;
    submittedAt: string | null;
  }>;
};

export default function CourseTestsPage() {
  const params = useParams();
  const router = useRouter();
  useAuth();
  const slug = params.slug as string;

  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourseAndTests() {
      try {
        // Get course ID from slug
        const courseRes = await fetch(`/api/courses`);
        const courseData = await courseRes.json();
        if (!courseData.success) throw new Error("Failed to fetch courses");
        const course = courseData.data.find((c: { slug: string }) => c.slug === slug);
        if (!course) {
          setError("Course not found");
          setLoading(false);
          return;
        }
        // Fetch tests
        const testsRes = await fetch(`/api/courses/${course.id}/tests`);
        const testsData = await testsRes.json();
        if (!testsData.success) throw new Error(testsData.error);
        setTests(testsData.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tests");
      } finally {
        setLoading(false);
      }
    }
    fetchCourseAndTests();
  }, [slug]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "4rem 0" }}>
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="tests-error">
        <p>❌ {error}</p>
      </div>
    );
  }

  const courseExams = tests.filter((t) => t.type === "COURSE_EXAM");
  const chapterTests = tests.filter((t) => t.type === "CHAPTER_TEST");
  const mockTests = tests.filter((t) => t.type === "MOCK_TEST");
  const placementTests = tests.filter((t) => t.type === "PLACEMENT_TEST");

  return (
    <>
      <div className="tests-page">
        <div className="tests-page__header">
          <div>
            <h1 className="tests-page__title">Course Tests & Exams</h1>
            <p className="tests-page__subtitle">
              {tests.length} test{tests.length !== 1 ? "s" : ""} available
            </p>
          </div>
        </div>

        {tests.length === 0 ? (
          <div className="tests-empty">
            <div className="tests-empty__icon">📝</div>
            <h3>No tests available yet</h3>
            <p>Your instructor hasn&apos;t created any tests for this course.</p>
          </div>
        ) : (
          <div className="tests-page__sections">
            {courseExams.length > 0 && (
              <TestSection title="Course Exams" icon="🎓" tests={courseExams} slug={slug} router={router} />
            )}
            {chapterTests.length > 0 && (
              <TestSection title="Chapter Tests" icon="📖" tests={chapterTests} slug={slug} router={router} />
            )}
            {mockTests.length > 0 && (
              <TestSection title="Practice Tests" icon="🔄" tests={mockTests} slug={slug} router={router} />
            )}
            {placementTests.length > 0 && (
              <TestSection title="Placement Tests" icon="📊" tests={placementTests} slug={slug} router={router} />
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .tests-page {
          max-width: 52rem;
          margin: 0 auto;
          padding: 1rem 0;
        }
        .tests-page__header {
          margin-bottom: 2rem;
        }
        .tests-page__title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-strong, #111827);
          margin-bottom: 0.25rem;
        }
        .tests-page__subtitle {
          font-size: 0.9375rem;
          color: var(--text-muted, #6b7280);
        }
        .tests-page__sections {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }
        .tests-empty {
          text-align: center;
          padding: 4rem 2rem;
          background: var(--bg-card, #ffffff);
          border-radius: var(--radius-lg, 16px);
          border: 1px solid var(--line-soft, #e5e7eb);
        }
        .tests-empty__icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }
        .tests-empty h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-strong, #111827);
          margin-bottom: 0.5rem;
        }
        .tests-empty p {
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
        }
        .tests-error {
          text-align: center;
          padding: 3rem;
          color: var(--danger, #ff3d00);
        }
      `}</style>
    </>
  );
}

function TestSection({
  title,
  icon,
  tests,
  slug,
  router,
}: {
  title: string;
  icon: string;
  tests: TestItem[];
  slug: string;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <section className="test-section">
      <h2 className="test-section__title">
        <span>{icon}</span> {title}
      </h2>
      <div className="test-section__list">
        {tests.map((test) => (
          <TestCard key={test.id} test={test} slug={slug} router={router} />
        ))}
      </div>

      <style jsx>{`
        .test-section__title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-strong, #111827);
          margin-bottom: 1rem;
        }
        .test-section__list {
          display: flex;
          flex-direction: column;
          gap: 0.875rem;
        }
      `}</style>
    </section>
  );
}

function TestCard({
  test,
  slug,
  router,
}: {
  test: TestItem;
  slug: string;
  router: ReturnType<typeof useRouter>;
}) {
  const completedAttempts = test.attempts?.filter((a) => a.submittedAt) ?? [];
  const bestScore = completedAttempts.length > 0
    ? Math.max(...completedAttempts.map((a) => a.score))
    : null;
  const hasPassed = completedAttempts.some((a) => a.isPassed);
  const hasInProgress = test.attempts?.some((a) => !a.submittedAt);
  const canTake = test.maxAttempts === -1 || completedAttempts.length < test.maxAttempts;

  return (
    <div className="test-card">
      <div className="test-card__body">
        <div className="test-card__info">
          <div className="test-card__title-row">
            <h3 className="test-card__title">{test.title}</h3>
            {hasPassed && <Badge tone="success">Passed</Badge>}
            {!hasPassed && completedAttempts.length > 0 && <Badge tone="danger">Not Passed</Badge>}
          </div>
          {test.description && (
            <p className="test-card__desc">{test.description}</p>
          )}
          {test.chapter && (
            <p className="test-card__chapter">Chapter: {test.chapter.title}</p>
          )}
          <div className="test-card__meta">
            <span>⏱ {test.durationMins} min</span>
            <span>📝 {test._count.questions} questions</span>
            <span>🎯 Pass: {test.passingScore}%</span>
            <span>🔄 {test.maxAttempts === -1 ? "Unlimited" : `${test.maxAttempts} attempt${test.maxAttempts !== 1 ? "s" : ""}`}</span>
          </div>
        </div>

        <div className="test-card__actions">
          {bestScore !== null && (
            <div className="test-card__best-score" data-passed={hasPassed}>
              <span className="test-card__best-value">{bestScore}%</span>
              <span className="test-card__best-label">Best</span>
            </div>
          )}
          {hasInProgress ? (
            <Button
              size="sm"
              variant="soft"
              onClick={() => router.push(`/dashboard/courses/${slug}/tests/${test.id}`)}
            >
              Resume Test
            </Button>
          ) : canTake ? (
            <Button
              size="sm"
              onClick={() => router.push(`/dashboard/courses/${slug}/tests/${test.id}`)}
            >
              {completedAttempts.length > 0 ? "Retake" : "Start Test"}
            </Button>
          ) : (
            <Button size="sm" variant="ghost" disabled>
              Max attempts reached
            </Button>
          )}
          {completedAttempts.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => router.push(`/dashboard/courses/${slug}/tests/${test.id}/results`)}
            >
              View Results
            </Button>
          )}
        </div>
      </div>

      <style jsx>{`
        .test-card {
          background: var(--bg-card, #ffffff);
          border-radius: var(--radius-lg, 16px);
          border: 1px solid var(--line-soft, #e5e7eb);
          overflow: hidden;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .test-card:hover {
          border-color: rgba(56, 193, 255, 0.3);
          box-shadow: 0 4px 24px rgba(56, 193, 255, 0.06);
        }
        .test-card__body {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1.5rem;
          padding: 1.5rem;
        }
        .test-card__info { flex: 1; }
        .test-card__title-row {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          margin-bottom: 0.5rem;
        }
        .test-card__title {
          font-size: 1.0625rem;
          font-weight: 600;
          color: var(--text-strong, #111827);
        }
        .test-card__desc {
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }
        .test-card__chapter {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
          margin-bottom: 0.5rem;
        }
        .test-card__meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.875rem;
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
        }
        .test-card__actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .test-card__best-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.5rem 0.75rem;
          border-radius: 10px;
          background: rgba(76, 175, 80, 0.08);
        }
        .test-card__best-score[data-passed="false"] {
          background: rgba(255, 61, 0, 0.06);
        }
        .test-card__best-value {
          font-size: 1.25rem;
          font-weight: 800;
          color: var(--success, #4caf50);
          font-variant-numeric: tabular-nums;
        }
        .test-card__best-score[data-passed="false"] .test-card__best-value {
          color: var(--danger, #ff3d00);
        }
        .test-card__best-label {
          font-size: 0.625rem;
          color: var(--text-muted, #6b7280);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        @media (max-width: 640px) {
          .test-card__body { flex-direction: column; }
          .test-card__actions {
            flex-direction: row;
            align-items: center;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
