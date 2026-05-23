"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  PenTool,
  Sparkles,
  Target,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { TestTimer } from "@/app/dashboard/_components/test-taking/test-timer";
import { QuestionCard } from "@/app/dashboard/_components/test-taking/question-card";
import type { QuestionData, QuestionWatermark } from "@/app/dashboard/_components/test-taking/question-card";
import { QuestionNavigator } from "@/app/dashboard/_components/test-taking/question-navigator";
import { TestResultsBreakdown } from "@/app/dashboard/_components/test-taking/test-results-breakdown";
import { buildCategoryPerformanceBreakdown } from "@/lib/test-category-performance";
import { useAuth } from "@/context/auth-context";

type TestInfo = {
  id: string;
  title: string;
  description: string | null;
  durationMins: number;
  remainingSecs: number;
  totalQuestions: number;
};

type TestPreview = {
  title: string;
  description: string | null;
  durationMins: number;
  totalQuestions: number;
  passingScore: number;
  maxAttempts: number;
  attemptsTaken: number;
};

type SubmitResult = {
  attemptId: string;
  score: number;
  pointsEarned: number;
  totalPoints: number;
  isPassed: boolean;
  passingScore: number;
  timeSpentSecs: number;
  gradingStatus?: "AUTO_GRADED" | "PENDING_REVIEW" | "MANUAL_GRADED";
  questionResults?: Record<
    string,
    { type: string; isCorrect: boolean | null; pointsAwarded: number; correctAnswer?: unknown; explanation?: string | null }
  >;
};

type Phase = "loading" | "pre-start" | "in-progress" | "reviewing" | "submitted" | "error";

function formatAttemptStatus(maxAttempts: number, attemptsTaken: number) {
  if (maxAttempts === -1) return "Unlimited attempts";
  const remaining = Math.max(maxAttempts - attemptsTaken, 0);
  return `${remaining} attempt${remaining === 1 ? "" : "s"} left`;
}

export default function TakeTestPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const slug = params.slug as string;
  const testId = params.testId as string;

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState<string>("");
  const [testPreview, setTestPreview] = useState<TestPreview | null>(null);
  const [testInfo, setTestInfo] = useState<TestInfo | null>(null);
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [flagged, setFlagged] = useState<Set<number>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [startTime] = useState<number>(Date.now());

  const [currentPart, setCurrentPart] = useState<"A" | "B">("A");
  const [partATimeLeft, setPartATimeLeft] = useState<number | null>(null);
  const [partBTimeLeft, setPartBTimeLeft] = useState<number | null>(null);


  useEffect(() => {
    async function resolve() {
      try {
        const courseRes = await fetch("/api/courses");
        const courseData = await courseRes.json();
        if (!courseData.success) throw new Error("Failed to fetch courses");

        const course = courseData.data.find((item: { id: string; slug: string; title: string }) => item.slug === slug);
        if (!course) {
          setError("Course not found");
          setPhase("error");
          return;
        }

        setCourseId(course.id);
        setCourseTitle(course.title);

        const testRes = await fetch(`/api/courses/${course.id}/tests/${testId}`);
        const testData = await testRes.json();
        if (!testData.success || !testData.data) {
          throw new Error(testData.error || "Failed to load test details");
        }

        setTestPreview({
          title: testData.data.title,
          description: testData.data.description,
          durationMins: testData.data.durationMins,
          totalQuestions: testData.data._count?.questions ?? 0,
          passingScore: testData.data.passingScore,
          maxAttempts: testData.data.maxAttempts,
          attemptsTaken: Array.isArray(testData.data.attempts) ? testData.data.attempts.length : 0,
        });

        setPhase("pre-start");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load");
        setPhase("error");
      }
    }

    resolve();
  }, [slug, testId]);

  const handleStart = useCallback(async () => {
    if (!courseId) return;
    setPhase("loading");
    try {
      const res = await fetch(`/api/courses/${courseId}/tests/${testId}/start`, { method: "POST" });
      const data = await res.json();
      if (!data.success) {
        setError(data.error);
        setPhase("error");
        return;
      }
      const fetchedQuestions = data.data.questions;
      setTestInfo(data.data.test);
      setQuestions(fetchedQuestions);

      const totalSecs = data.data.test.remainingSecs; 
      const durationTotalSecs = data.data.test.durationMins * 60;
      const partBTotal = Math.floor(durationTotalSecs / 3);
      
      const hasPartB = fetchedQuestions.some((q: QuestionData) => q.type === "SKETCH");
      if (hasPartB) {
        if (totalSecs > partBTotal) {
          setCurrentPart("A");
          setPartATimeLeft(totalSecs - partBTotal);
          setPartBTimeLeft(partBTotal);
        } else {
          setCurrentPart("B");
          setPartATimeLeft(0);
          setPartBTimeLeft(totalSecs);
          const firstBIndex = fetchedQuestions.findIndex((q: QuestionData) => q.type === "SKETCH");
          if (firstBIndex !== -1) setCurrentIndex(firstBIndex);
        }
      } else {
        setCurrentPart("A");
        setPartATimeLeft(totalSecs);
        setPartBTimeLeft(null);
      }
      setPhase("in-progress");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start test");
      setPhase("error");
    }
  }, [courseId, testId]);

  const handleSubmit = useCallback(async () => {
    if (!courseId || submitting) return;
    setSubmitting(true);
    try {
      const timeSpentSecs = Math.floor((Date.now() - startTime) / 1000);
      const res = await fetch(`/api/courses/${courseId}/tests/${testId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, timeSpentSecs }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error);
        setPhase("error");
        return;
      }
      setResult(data.data);
      setPhase("submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }, [answers, courseId, startTime, submitting, testId]);

  const handleTimeUp = useCallback(() => {
    void handleSubmit();
  }, [handleSubmit]);

  const handlePartATimeUp = useCallback(() => {
    const hasPartB = questions.some(q => q.type === "SKETCH");
    if (hasPartB && currentPart === "A") {
      setCurrentPart("B");
      const firstBIndex = questions.findIndex(q => q.type === "SKETCH");
      if (firstBIndex !== -1) setCurrentIndex(firstBIndex);
    } else {
      void handleSubmit();
    }
  }, [questions, currentPart, handleSubmit]);

  const activeTimeUpHandler = currentPart === "A" ? handlePartATimeUp : handleTimeUp;
  const activeInitialSeconds = currentPart === "A" ? partATimeLeft : partBTimeLeft;

  const isPartAQuestion = useCallback((index: number) => questions[index]?.type !== "SKETCH", [questions]);
  const isPartBQuestion = useCallback((index: number) => questions[index]?.type === "SKETCH", [questions]);


  const handleAnswer = (questionId: string, answer: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const toggleFlag = (index: number) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const goNext = () => setCurrentIndex((index) => {
    const next = Math.min(index + 1, questions.length - 1);
    if (currentPart === "A" && isPartBQuestion(next)) return index;
    if (currentPart === "B" && isPartAQuestion(next)) return index;
    return next;
  });

  const goPrev = () => setCurrentIndex((index) => {
    const prev = Math.max(index - 1, 0);
    if (currentPart === "A" && isPartBQuestion(prev)) return index;
    if (currentPart === "B" && isPartAQuestion(prev)) return index;
    return prev;
  });

  const currentType = questions[currentIndex]?.type;
  
  let nextSectionIndex = -1;
  for (let i = currentIndex + 1; i < questions.length; i++) {
    if (questions[i].type !== currentType) {
      if ((currentPart === "A" && isPartAQuestion(i)) || (currentPart === "B" && isPartBQuestion(i))) {
        nextSectionIndex = i;
        break;
      }
    }
  }

  let prevSectionIndex = -1;
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (questions[i].type !== currentType) {
      if ((currentPart === "A" && isPartAQuestion(i)) || (currentPart === "B" && isPartBQuestion(i))) {
        const type = questions[i].type;
        let start = i;
        while (start > 0 && questions[start - 1].type === type) {
          start--;
        }
        prevSectionIndex = start;
        break;
      }
    }
  }

  const goNextSection = () => { if (nextSectionIndex !== -1) setCurrentIndex(nextSectionIndex); };
  const goPrevSection = () => { if (prevSectionIndex !== -1) setCurrentIndex(prevSectionIndex); };


  const answeredSet = new Set(
    questions.map((question, index) => (answers[question.id] !== undefined ? index : -1)).filter((index) => index >= 0)
  );
  const unansweredCount = questions.length - answeredSet.size;
  const previewTitle = testPreview?.title ?? testInfo?.title ?? "Assessment Workspace";
  const previewDescription =
    testPreview?.description ??
    testInfo?.description ??
    "This assessment is timed, structured, and designed to reward calm, complete work.";
  const durationMins = testInfo?.durationMins ?? testPreview?.durationMins ?? 0;
  const totalQuestions = testInfo?.totalQuestions ?? testPreview?.totalQuestions ?? questions.length;
  const passingScore = testPreview?.passingScore ?? result?.passingScore ?? 0;
  const attemptsLabel = testPreview
    ? formatAttemptStatus(testPreview.maxAttempts, testPreview.attemptsTaken)
    : "Attempt tracking active";
  const completionPercent =
    questions.length > 0 ? Math.round((answeredSet.size / questions.length) * 100) : 0;

  // Security watermark — shows student name & email on every question card
  const watermark: QuestionWatermark | undefined = user
    ? { name: user.name ?? "Student", email: user.email ?? "", phone: "" }
    : undefined;

  if (phase === "loading") {
    return (
      <div className="take-test__state-shell">
        <div className="take-test__state-card">
          <div className="take-test__state-spinner">
            <Spinner className="h-8 w-8" />
          </div>
          <h1 className="take-test__state-title">Preparing your test space</h1>
          <p className="take-test__state-copy">
            Fetching your latest attempt, timer state, and question order so everything starts cleanly.
          </p>
        </div>

        <style jsx>{`
          .take-test__state-shell {
            display: flex;
            min-height: calc(100vh - 6rem);
            align-items: center;
            justify-content: center;
            padding: 2.5rem 1.25rem;
          }
          .take-test__state-card {
            width: min(100%, 42rem);
            padding: 3rem;
            border-radius: 32px;
            border: 1px solid rgba(255, 255, 255, 0.75);
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 255, 0.9)),
              linear-gradient(120deg, rgba(56, 189, 248, 0.08), rgba(250, 204, 21, 0.06));
            box-shadow: 0 28px 64px rgba(15, 23, 42, 0.1);
            text-align: center;
          }
          .take-test__state-spinner {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            height: 4.5rem;
            width: 4.5rem;
            border-radius: 999px;
            background: rgba(56, 189, 248, 0.12);
            color: #0f172a;
          }
          .take-test__state-title {
            margin: 1.5rem 0 0;
            font-size: clamp(1.75rem, 2vw, 2.25rem);
            font-weight: 800;
            color: #111827;
          }
          .take-test__state-copy {
            margin: 0.9rem auto 0;
            max-width: 34rem;
            font-size: 1rem;
            line-height: 1.75;
            color: #5b6474;
          }
        `}</style>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="take-test__state-shell">
        <div className="take-test__state-card take-test__state-card--error">
          <div className="take-test__state-badge">
            <AlertTriangle className="h-4 w-4" />
            Assessment issue
          </div>
          <h1 className="take-test__state-title">We couldn&apos;t open this test</h1>
          <p className="take-test__state-copy">{error}</p>
          <div className="take-test__state-actions">
            <Button variant="secondary" size="lg" onClick={() => router.back()}>
              Back to Tests
            </Button>
          </div>
        </div>

        <style jsx>{`
          .take-test__state-shell {
            display: flex;
            min-height: calc(100vh - 6rem);
            align-items: center;
            justify-content: center;
            padding: 2.5rem 1.25rem;
          }
          .take-test__state-card {
            width: min(100%, 42rem);
            padding: 3rem;
            border-radius: 32px;
            border: 1px solid rgba(255, 255, 255, 0.75);
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(247, 250, 255, 0.9)),
              linear-gradient(120deg, rgba(56, 189, 248, 0.08), rgba(250, 204, 21, 0.06));
            box-shadow: 0 28px 64px rgba(15, 23, 42, 0.1);
            text-align: center;
          }
          .take-test__state-card--error {
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.98), rgba(255, 246, 244, 0.96)),
              linear-gradient(120deg, rgba(239, 68, 68, 0.08), rgba(245, 158, 11, 0.06));
          }
          .take-test__state-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            border-radius: 999px;
            background: rgba(239, 68, 68, 0.1);
            color: #b91c1c;
            padding: 0.55rem 0.9rem;
            font-size: 0.76rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .take-test__state-title {
            margin: 1.5rem 0 0;
            font-size: clamp(1.75rem, 2vw, 2.25rem);
            font-weight: 800;
            color: #111827;
          }
          .take-test__state-copy {
            margin: 0.9rem auto 0;
            max-width: 34rem;
            font-size: 1rem;
            line-height: 1.75;
            color: #5b6474;
          }
          .take-test__state-actions {
            margin-top: 1.75rem;
          }
        `}</style>
      </div>
    );
  }

  if (phase === "pre-start") {
    return (
      <>
        <div className="take-test__stage">
          <div className="take-test__stage-shell">
            <section className="take-test__hero">
              <div className="take-test__eyebrow">
                <Sparkles className="h-4 w-4" />
                Assessment Workspace
              </div>
              <p className="take-test__kicker">{courseTitle || "Course assessment"}</p>
              <h1 className="take-test__headline">{previewTitle}</h1>
              <p className="take-test__copy">{previewDescription}</p>

              <div className="take-test__metrics">
                <div className="take-test__metric-card">
                  <div className="take-test__metric-icon">
                    <Clock3 className="h-4 w-4" />
                  </div>
                  <span className="take-test__metric-label">Duration</span>
                  <strong className="take-test__metric-value">{durationMins} min</strong>
                </div>
                <div className="take-test__metric-card">
                  <div className="take-test__metric-icon">
                    <LayoutGrid className="h-4 w-4" />
                  </div>
                  <span className="take-test__metric-label">Questions</span>
                  <strong className="take-test__metric-value">{totalQuestions}</strong>
                </div>
                <div className="take-test__metric-card">
                  <div className="take-test__metric-icon">
                    <Target className="h-4 w-4" />
                  </div>
                  <span className="take-test__metric-label">Pass Target</span>
                  <strong className="take-test__metric-value">{passingScore}%</strong>
                </div>
                <div className="take-test__metric-card">
                  <div className="take-test__metric-icon">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <span className="take-test__metric-label">Attempts</span>
                  <strong className="take-test__metric-value">{attemptsLabel}</strong>
                </div>
              </div>

              <div className="take-test__chip-row">
                <span className="take-test__chip">
                  <Clock3 className="h-3.5 w-3.5" />
                  Timed flow
                </span>
                <span className="take-test__chip">
                  <PenTool className="h-3.5 w-3.5" />
                  Structured responses
                </span>
                <span className="take-test__chip">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Best-score grading
                </span>
              </div>
            </section>

            <aside className="take-test__panel">
              <div className="take-test__panel-tag">Before you start</div>
              <h2 className="take-test__panel-title">Set yourself up for one calm, complete run.</h2>

              <div className="take-test__checklist">
                <div className="take-test__checklist-item">
                  <span className="take-test__checklist-mark">01</span>
                  <div>
                    <strong>Timer starts immediately</strong>
                    <p>Once you begin, the countdown continues until you submit or time runs out.</p>
                  </div>
                </div>
                <div className="take-test__checklist-item">
                  <span className="take-test__checklist-mark">02</span>
                  <div>
                    <strong>Use the navigator as you go</strong>
                    <p>Jump between questions, flag the uncertain ones, and come back before you submit.</p>
                  </div>
                </div>
                <div className="take-test__checklist-item">
                  <span className="take-test__checklist-mark">03</span>
                  <div>
                    <strong>Stay on a stable connection</strong>
                    <p>Your attempt is tracked continuously, but the smoothest run is still the safest run.</p>
                  </div>
                </div>
              </div>

              <div className="take-test__callout">
                This paper is built for focused work: answer steadily, review deliberately, and finish cleanly.
              </div>

              <Button className="take-test__panel-cta" size="lg" onClick={handleStart}>
                Start Test
              </Button>
            </aside>
          </div>
        </div>

        <style jsx>{`
          .take-test__stage {
            min-height: calc(100vh - 6rem);
            padding: 2rem 1.25rem 3rem;
          }
          .take-test__stage-shell {
            position: relative;
            display: grid;
            grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.95fr);
            gap: 1.5rem;
            min-height: calc(100vh - 10rem);
            max-width: 86rem;
            margin: 0 auto;
            border-radius: 36px;
            overflow: hidden;
            background:
              linear-gradient(135deg, #101727 0%, #14253f 52%, #0f3a6d 100%);
            box-shadow: 0 34px 80px rgba(15, 23, 42, 0.18);
          }
          .take-test__stage-shell::before {
            content: "";
            position: absolute;
            inset: 0;
            background:
              radial-gradient(circle at top right, rgba(250, 204, 21, 0.18), transparent 28%),
              linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
            background-size: auto, 36px 36px, 36px 36px;
            pointer-events: none;
          }
          .take-test__hero,
          .take-test__panel {
            position: relative;
            z-index: 1;
          }
          .take-test__hero {
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: clamp(2rem, 5vw, 4rem);
            color: white;
          }
          .take-test__eyebrow {
            display: inline-flex;
            width: fit-content;
            align-items: center;
            gap: 0.55rem;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.1);
            padding: 0.7rem 1rem;
            font-size: 0.76rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }
          .take-test__kicker {
            margin: 1.25rem 0 0;
            font-size: 0.92rem;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.68);
          }
          .take-test__headline {
            margin: 1rem 0 0;
            max-width: 13ch;
            font-size: clamp(2.6rem, 5vw, 4.7rem);
            line-height: 0.96;
            font-weight: 800;
          }
          .take-test__copy {
            margin: 1.35rem 0 0;
            max-width: 42rem;
            font-size: 1.04rem;
            line-height: 1.9;
            color: rgba(255, 255, 255, 0.78);
          }
          .take-test__metrics {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 1rem;
            margin-top: 2rem;
            max-width: 44rem;
          }
          .take-test__metric-card {
            display: grid;
            gap: 0.45rem;
            border-radius: 24px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.08);
            padding: 1rem 1.1rem 1.15rem;
            backdrop-filter: blur(16px);
          }
          .take-test__metric-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 2rem;
            height: 2rem;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.12);
            color: #fde68a;
          }
          .take-test__metric-label {
            font-size: 0.76rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.62);
          }
          .take-test__metric-value {
            font-size: 1.05rem;
            color: white;
          }
          .take-test__chip-row {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            margin-top: 1.35rem;
          }
          .take-test__chip {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.1);
            padding: 0.68rem 0.95rem;
            font-size: 0.82rem;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.92);
          }
          .take-test__panel {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 1.25rem;
            padding: clamp(2rem, 4vw, 3rem);
            background: linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(246, 248, 252, 0.93));
          }
          .take-test__panel-tag {
            width: fit-content;
            border-radius: 999px;
            background: rgba(56, 189, 248, 0.1);
            color: #0369a1;
            padding: 0.55rem 0.9rem;
            font-size: 0.74rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .take-test__panel-title {
            margin: 0;
            font-size: clamp(1.55rem, 2.2vw, 2.1rem);
            line-height: 1.1;
            font-weight: 800;
            color: #111827;
          }
          .take-test__checklist {
            display: grid;
            gap: 0.95rem;
          }
          .take-test__checklist-item {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 0.9rem;
            align-items: start;
            padding: 1rem 1rem 1.05rem;
            border-radius: 22px;
            background: white;
            border: 1px solid rgba(226, 232, 240, 0.88);
          }
          .take-test__checklist-mark {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 2.25rem;
            height: 2.25rem;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.06);
            font-size: 0.72rem;
            font-weight: 800;
            color: #0f172a;
          }
          .take-test__checklist-item strong {
            display: block;
            font-size: 0.96rem;
            color: #111827;
          }
          .take-test__checklist-item p {
            margin: 0.35rem 0 0;
            font-size: 0.88rem;
            line-height: 1.6;
            color: #667085;
          }
          .take-test__callout {
            border-radius: 22px;
            background: linear-gradient(135deg, rgba(56, 189, 248, 0.12), rgba(250, 204, 21, 0.14));
            padding: 1rem 1.1rem;
            font-size: 0.9rem;
            line-height: 1.65;
            color: #1f2937;
          }
          .take-test__panel-cta {
            width: 100%;
          }
          @media (max-width: 1024px) {
            .take-test__stage-shell {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 640px) {
            .take-test__stage {
              padding: 1rem 0.75rem 2rem;
            }
            .take-test__stage-shell {
              border-radius: 28px;
              min-height: auto;
            }
            .take-test__headline {
              max-width: none;
            }
            .take-test__metrics {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </>
    );
  }

  if (phase === "submitted" && result) {
    const questionResults = result.questionResults || {};
    const correctCount = Object.values(questionResults).filter((item) => item.isCorrect === true).length;
    const categoryBreakdown = buildCategoryPerformanceBreakdown(
      questions.map((question) => ({
        category: question.category,
        points: question.points,
        pointsAwarded: questionResults[question.id]?.pointsAwarded,
        isCorrect: questionResults[question.id]?.isCorrect,
      }))
    );

    return (
      <>
        <div className="take-test__submitted-shell">
          <div className="take-test__submitted-wrap">
            <TestResultsBreakdown
              score={result.score}
              pointsEarned={result.pointsEarned}
              totalPoints={result.totalPoints}
              isPassed={result.isPassed}
              passingScore={result.passingScore}
              timeSpentSecs={result.timeSpentSecs}
              totalQuestions={questions.length}
              correctCount={correctCount}
              canRetake={false}
              attemptsRemaining={0}
              categoryBreakdown={categoryBreakdown}
              gradingStatus={result.gradingStatus}
              onViewDetails={() => router.push(`/dashboard/courses/${slug}/tests/${testId}/results`)}
            />
          </div>
        </div>

        <style jsx>{`
          .take-test__submitted-shell {
            min-height: calc(100vh - 6rem);
            padding: 2rem 1.25rem 3rem;
            background:
              linear-gradient(180deg, rgba(230, 244, 255, 0.72), rgba(248, 250, 252, 0.94));
          }
          .take-test__submitted-wrap {
            max-width: 58rem;
            margin: 0 auto;
          }
        `}</style>
      </>
    );
  }

  if (phase === "reviewing") {
    return (
      <>
        <div className="take-test__stage take-test__stage--review">
          <div className="take-test__stage-shell take-test__stage-shell--review">
            <section className="take-test__hero take-test__hero--review">
              <div className="take-test__eyebrow take-test__eyebrow--warning">
                <AlertTriangle className="h-4 w-4" />
                Final Review
              </div>
              <p className="take-test__kicker">{previewTitle}</p>
              <h1 className="take-test__headline take-test__headline--review">Review before you submit</h1>
              <p className="take-test__copy take-test__copy--review">
                {unansweredCount > 0
                  ? `You still have ${unansweredCount} unanswered question${unansweredCount === 1 ? "" : "s"}. Clean those up now and submit with confidence.`
                  : "Everything is answered. This is your final chance to scan flagged questions and tighten anything uncertain."}
              </p>

              <div className="take-test__metrics take-test__metrics--review">
                <div className="take-test__metric-card take-test__metric-card--light">
                  <span className="take-test__metric-label take-test__metric-label--dark">Answered</span>
                  <strong className="take-test__metric-value take-test__metric-value--dark">
                    {answeredSet.size}/{questions.length}
                  </strong>
                </div>
                <div className="take-test__metric-card take-test__metric-card--light">
                  <span className="take-test__metric-label take-test__metric-label--dark">Remaining</span>
                  <strong className="take-test__metric-value take-test__metric-value--dark">{unansweredCount}</strong>
                </div>
                <div className="take-test__metric-card take-test__metric-card--light">
                  <span className="take-test__metric-label take-test__metric-label--dark">Flagged</span>
                  <strong className="take-test__metric-value take-test__metric-value--dark">{flagged.size}</strong>
                </div>
              </div>

              <div className="take-test__coverage">
                <div className="take-test__coverage-header">
                  <span>Question coverage</span>
                  <span>{completionPercent}% complete</span>
                </div>
                <div className="take-test__coverage-grid">
                  {questions.map((question, index) => {
                    const isAnswered = answeredSet.has(index);
                    const isFlagged = flagged.has(index);
                    return (
                      <button
                        key={question.id}
                        className="take-test__coverage-pill"
                        data-answered={isAnswered || undefined}
                        data-flagged={isFlagged || undefined}
                        onClick={() => {
                          setCurrentIndex(index);
                          setPhase("in-progress");
                        }}
                        type="button"
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className="take-test__panel take-test__panel--review">
              <div className="take-test__panel-tag take-test__panel-tag--warning">Submission checkpoint</div>
              <h2 className="take-test__panel-title">Use the last minute well.</h2>

              <div className="take-test__checklist">
                <div className="take-test__checklist-item">
                  <span className="take-test__checklist-mark">A</span>
                  <div>
                    <strong>Return to the uncertain ones</strong>
                    <p>Flagged items are usually where the score swings happen. Scan those first.</p>
                  </div>
                </div>
                <div className="take-test__checklist-item">
                  <span className="take-test__checklist-mark">B</span>
                  <div>
                    <strong>Submit once you are satisfied</strong>
                    <p>After submission the paper locks and grading begins immediately.</p>
                  </div>
                </div>
              </div>

              <div className="take-test__callout take-test__callout--warning">
                {unansweredCount > 0
                  ? "Right now the fastest win is answering every blank before polishing anything else."
                  : "You are in a strong position. One final scan, then submit cleanly."}
              </div>

              <div className="take-test__review-actions">
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => setPhase("in-progress")}
                >
                  Back to Questions
                </Button>
                <Button size="lg" onClick={handleSubmit} loading={submitting}>
                  Submit Test
                </Button>
              </div>
            </aside>
          </div>
        </div>

        <style jsx>{`
          .take-test__stage {
            min-height: calc(100vh - 6rem);
            padding: 2rem 1.25rem 3rem;
          }
          .take-test__stage--review {
            background:
              linear-gradient(180deg, rgba(255, 249, 235, 0.72), rgba(248, 250, 252, 0.92));
          }
          .take-test__stage-shell {
            position: relative;
            display: grid;
            grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.95fr);
            gap: 1.5rem;
            min-height: calc(100vh - 10rem);
            max-width: 86rem;
            margin: 0 auto;
            border-radius: 36px;
            overflow: hidden;
            box-shadow: 0 34px 80px rgba(15, 23, 42, 0.14);
          }
          .take-test__stage-shell--review {
            background:
              linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(255, 251, 235, 0.98));
          }
          .take-test__hero,
          .take-test__panel {
            position: relative;
            z-index: 1;
          }
          .take-test__hero--review {
            display: flex;
            flex-direction: column;
            justify-content: center;
            padding: clamp(2rem, 5vw, 4rem);
            color: #111827;
          }
          .take-test__eyebrow {
            display: inline-flex;
            width: fit-content;
            align-items: center;
            gap: 0.55rem;
            border-radius: 999px;
            padding: 0.7rem 1rem;
            font-size: 0.76rem;
            font-weight: 700;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            background: rgba(15, 23, 42, 0.06);
            color: #0f172a;
          }
          .take-test__eyebrow--warning {
            background: rgba(245, 158, 11, 0.12);
            color: #b45309;
          }
          .take-test__kicker {
            margin: 1.25rem 0 0;
            font-size: 0.92rem;
            letter-spacing: 0.18em;
            text-transform: uppercase;
            color: #8a6240;
          }
          .take-test__headline {
            margin: 1rem 0 0;
            max-width: 13ch;
            font-size: clamp(2.6rem, 5vw, 4.7rem);
            line-height: 0.96;
            font-weight: 800;
          }
          .take-test__headline--review {
            max-width: 12ch;
          }
          .take-test__copy {
            margin: 1.35rem 0 0;
            max-width: 42rem;
            font-size: 1.04rem;
            line-height: 1.9;
            color: #5b6474;
          }
          .take-test__copy--review {
            max-width: 44rem;
          }
          .take-test__metrics {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 1rem;
            margin-top: 2rem;
            max-width: 44rem;
          }
          .take-test__metric-card {
            display: grid;
            gap: 0.45rem;
            border-radius: 24px;
            padding: 1rem 1.1rem 1.15rem;
          }
          .take-test__metric-card--light {
            background: rgba(255, 255, 255, 0.92);
            border: 1px solid rgba(226, 232, 240, 0.86);
            box-shadow: 0 20px 38px rgba(15, 23, 42, 0.06);
          }
          .take-test__metric-label {
            font-size: 0.76rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.62);
          }
          .take-test__metric-label--dark {
            color: #667085;
          }
          .take-test__metric-value {
            font-size: 1.05rem;
            color: white;
          }
          .take-test__metric-value--dark {
            color: #111827;
          }
          .take-test__coverage {
            margin-top: 1.65rem;
            border-radius: 28px;
            background: rgba(255, 255, 255, 0.9);
            border: 1px solid rgba(226, 232, 240, 0.88);
            padding: 1rem;
          }
          .take-test__coverage-header {
            display: flex;
            justify-content: space-between;
            gap: 1rem;
            font-size: 0.82rem;
            font-weight: 700;
            letter-spacing: 0.06em;
            text-transform: uppercase;
            color: #667085;
          }
          .take-test__coverage-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(3rem, 1fr));
            gap: 0.65rem;
            margin-top: 0.95rem;
          }
          .take-test__coverage-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 3rem;
            border-radius: 16px;
            border: 1px solid rgba(203, 213, 225, 0.92);
            background: white;
            font-size: 0.92rem;
            font-weight: 700;
            color: #64748b;
            transition: transform 0.16s ease, border-color 0.16s ease, background 0.16s ease;
          }
          .take-test__coverage-pill:hover {
            transform: translateY(-1px);
            border-color: #38bdf8;
          }
          .take-test__coverage-pill[data-answered="true"] {
            background: rgba(34, 197, 94, 0.12);
            border-color: rgba(34, 197, 94, 0.3);
            color: #15803d;
          }
          .take-test__coverage-pill[data-flagged="true"] {
            box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.4);
          }
          .take-test__panel {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 1.25rem;
            padding: clamp(2rem, 4vw, 3rem);
          }
          .take-test__panel--review {
            background: linear-gradient(180deg, rgba(19, 30, 46, 0.98), rgba(24, 38, 59, 0.96));
            color: white;
          }
          .take-test__panel-tag {
            width: fit-content;
            border-radius: 999px;
            padding: 0.55rem 0.9rem;
            font-size: 0.74rem;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .take-test__panel-tag--warning {
            background: rgba(250, 204, 21, 0.14);
            color: #fde68a;
          }
          .take-test__panel-title {
            margin: 0;
            font-size: clamp(1.55rem, 2.2vw, 2.1rem);
            line-height: 1.1;
            font-weight: 800;
          }
          .take-test__checklist {
            display: grid;
            gap: 0.95rem;
          }
          .take-test__checklist-item {
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 0.9rem;
            align-items: start;
            padding: 1rem 1rem 1.05rem;
            border-radius: 22px;
            background: rgba(255, 255, 255, 0.06);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          .take-test__checklist-mark {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 2.25rem;
            height: 2.25rem;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.12);
            font-size: 0.78rem;
            font-weight: 800;
            color: white;
          }
          .take-test__checklist-item strong {
            display: block;
            font-size: 0.96rem;
          }
          .take-test__checklist-item p {
            margin: 0.35rem 0 0;
            font-size: 0.88rem;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.72);
          }
          .take-test__callout {
            border-radius: 22px;
            padding: 1rem 1.1rem;
            font-size: 0.9rem;
            line-height: 1.65;
          }
          .take-test__callout--warning {
            background: rgba(250, 204, 21, 0.12);
            color: #fef3c7;
          }
          .take-test__review-actions {
            display: grid;
            gap: 0.85rem;
          }
          @media (max-width: 1024px) {
            .take-test__stage-shell {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 640px) {
            .take-test__stage {
              padding: 1rem 0.75rem 2rem;
            }
            .take-test__stage-shell {
              border-radius: 28px;
              min-height: auto;
            }
            .take-test__headline {
              max-width: none;
            }
            .take-test__metrics {
              grid-template-columns: 1fr;
            }
            .take-test__coverage-grid {
              grid-template-columns: repeat(4, minmax(0, 1fr));
            }
          }
        `}</style>
      </>
    );
  }

  const currentQuestion = questions[currentIndex];
  if (!currentQuestion) return null;

  return (
    <>
      <div className="take-test">
        <section className="take-test__command">
          <div className="take-test__command-copy">
            <div className="take-test__eyebrow">
              <PenTool className="h-4 w-4" />
              Live Assessment
            </div>
            <p className="take-test__command-kicker">{courseTitle}</p>
            <h1 className="take-test__command-title">{testInfo?.title ?? previewTitle} <span className="text-sm font-normal text-blue-600 bg-blue-50 px-2 py-1 rounded ml-2">Part {currentPart}</span></h1>
            <p className="take-test__command-description">
              {previewDescription}
            </p>
          </div>

          <div className="take-test__command-side">
            <div className="take-test__command-stat">
              <span>Answered</span>
              <strong>{answeredSet.size}/{questions.length}</strong>
            </div>
            <div className="take-test__command-stat">
              <span>Flagged</span>
              <strong>{flagged.size}</strong>
            </div>
            {testInfo && activeInitialSeconds !== null ? (
              <div className="take-test__timer-wrap">
                <TestTimer key={currentPart} initialSeconds={activeInitialSeconds} onTimeUp={activeTimeUpHandler} />
              </div>
            ) : null}
          </div>
        </section>

        <div className="take-test__layout">
          <div className="take-test__main">
            <QuestionCard
              question={currentQuestion}
              questionNumber={currentIndex + 1}
              totalQuestions={questions.length}
              selectedAnswer={answers[currentQuestion.id]}
              onAnswer={handleAnswer}
              isFlagged={flagged.has(currentIndex)}
              onToggleFlag={() => toggleFlag(currentIndex)}
              watermark={watermark}
            />

            <div className="take-test__bottom-nav">
              <div className="take-test__bottom-copy">
                <span className="take-test__bottom-kicker">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <p className="take-test__bottom-note">
                  {flagged.has(currentIndex)
                    ? "Flagged for review. You can come back before submitting."
                    : answeredSet.has(currentIndex)
                      ? "Response saved in this session."
                      : "Answer now or move ahead and return later from the navigator."}
                </p>
              </div>

              <div className="take-test__bottom-actions">
                <Button variant="secondary" size="sm" onClick={goPrevSection} disabled={prevSectionIndex === -1}>
                  &lt;&lt; Prev Type
                </Button>
                <Button variant="secondary" size="sm" onClick={goPrev} disabled={currentIndex === 0 || (currentPart === "B" && isPartAQuestion(currentIndex - 1))}>
                  Previous
                </Button>

                {(currentIndex < questions.length - 1 && !isPartBQuestion(currentIndex + 1) && currentPart === "A") || (currentIndex < questions.length - 1 && currentPart === "B") ? (
                  <Button size="sm" onClick={goNext}>
                    Next
                  </Button>
                ) : (
                  <Button size="sm" disabled={currentPart === "A" && questions.some(q => q.type === "SKETCH")} onClick={() => {
                    if (currentPart === "B" || !questions.some(q => q.type === "SKETCH")) {
                      setPhase("reviewing");
                    }
                  }}>
                    {currentPart === "A" && questions.some(q => q.type === "SKETCH") ? "End of Part A (Wait for Timer)" : "Review & Submit"}
                  </Button>
                )}
                <Button variant="secondary" size="sm" onClick={goNextSection} disabled={nextSectionIndex === -1}>
                  Next Type &gt;&gt;
                </Button>
              </div>
            </div>
          </div>

          <aside className="take-test__sidebar">
            <QuestionNavigator
              questions={questions}
              currentIndex={currentIndex}
              answeredSet={answeredSet}
              flaggedSet={flagged}
              onNavigate={setCurrentIndex}
            />

            {(currentPart === "B" || !questions.some(q => q.type === "SKETCH")) && (
              <button
                className="take-test__review-cta"
                onClick={() => setPhase("reviewing")}
                type="button"
              >
                <span className="take-test__review-cta-copy">
                  <strong>Open final review</strong>
                  <span>{unansweredCount} unanswered · {flagged.size} flagged</span>
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </aside>
        </div>
      </div>

      <style jsx>{`
        .take-test {
          max-width: 90rem;
          margin: 0 auto;
          padding: 1.4rem 1.25rem 2.6rem;
        }
        .take-test__command {
          display: grid;
          grid-template-columns: minmax(0, 1.2fr) auto;
          gap: 1.5rem;
          align-items: end;
          padding: 1.5rem 1.5rem 1.6rem;
          border-radius: 32px;
          background:
            linear-gradient(135deg, rgba(16, 23, 39, 0.98), rgba(20, 37, 63, 0.96));
          box-shadow: 0 28px 70px rgba(15, 23, 42, 0.16);
          color: white;
        }
        .take-test__eyebrow {
          display: inline-flex;
          width: fit-content;
          align-items: center;
          gap: 0.55rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          padding: 0.7rem 1rem;
          font-size: 0.76rem;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
        }
        .take-test__command-kicker {
          margin: 1rem 0 0;
          font-size: 0.82rem;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.66);
        }
        .take-test__command-title {
          margin: 0.85rem 0 0;
          font-size: clamp(2rem, 3.2vw, 3rem);
          line-height: 1.02;
          font-weight: 800;
        }
        .take-test__command-description {
          margin: 0.9rem 0 0;
          max-width: 42rem;
          font-size: 0.98rem;
          line-height: 1.75;
          color: rgba(255, 255, 255, 0.76);
        }
        .take-test__command-side {
          display: grid;
          gap: 0.8rem;
          justify-items: end;
        }
        .take-test__command-stat {
          display: inline-flex;
          min-width: 10rem;
          align-items: center;
          justify-content: space-between;
          gap: 0.9rem;
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.08);
          padding: 0.85rem 1rem;
          font-size: 0.88rem;
        }
        .take-test__command-stat span {
          color: rgba(255, 255, 255, 0.7);
        }
        .take-test__command-stat strong {
          font-size: 1rem;
          color: white;
        }
        .take-test__timer-wrap {
          margin-top: 0.25rem;
        }
        .take-test__layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 19rem;
          gap: 1.5rem;
          align-items: start;
          margin-top: 1.5rem;
        }
        .take-test__main {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
        }
        .take-test__bottom-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          padding: 1rem 1.1rem;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 18px 38px rgba(15, 23, 42, 0.06);
        }
        .take-test__bottom-copy {
          min-width: 0;
        }
        .take-test__bottom-kicker {
          display: inline-block;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }
        .take-test__bottom-note {
          margin: 0.4rem 0 0;
          font-size: 0.92rem;
          line-height: 1.6;
          color: #5b6474;
        }
        .take-test__bottom-actions {
          display: flex;
          gap: 0.75rem;
          flex-shrink: 0;
        }
        .take-test__sidebar {
          position: sticky;
          top: 1rem;
          display: grid;
          gap: 1rem;
        }
        .take-test__review-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 1rem;
          border: none;
          border-radius: 22px;
          background: linear-gradient(135deg, #0f172a, #18263b);
          color: white;
          padding: 1rem 1.1rem;
          box-shadow: 0 20px 46px rgba(15, 23, 42, 0.14);
        }
        .take-test__review-cta-copy {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          text-align: left;
        }
        .take-test__review-cta-copy strong {
          font-size: 0.95rem;
        }
        .take-test__review-cta-copy span {
          font-size: 0.78rem;
          color: rgba(255, 255, 255, 0.68);
        }
        @media (max-width: 1080px) {
          .take-test__command {
            grid-template-columns: 1fr;
          }
          .take-test__command-side {
            justify-items: start;
            grid-template-columns: repeat(3, minmax(0, max-content));
            align-items: start;
          }
          .take-test__layout {
            grid-template-columns: 1fr;
          }
          .take-test__sidebar {
            position: static;
          }
        }
        @media (max-width: 720px) {
          .take-test {
            padding: 1rem 0.75rem 6rem;
          }
          .take-test__command {
            border-radius: 26px;
            padding: 1.2rem;
          }
          .take-test__command-side {
            grid-template-columns: 1fr;
            width: 100%;
          }
          .take-test__command-stat {
            width: 100%;
          }
          .take-test__bottom-nav {
            flex-direction: column;
            align-items: stretch;
          }
          .take-test__bottom-actions {
            justify-content: space-between;
          }
        }
      `}</style>
    </>
  );
}
