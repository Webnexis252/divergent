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
  parts?: Array<{ id: string; title: string; durationMins: number | null; order: number }>;
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
  const [visitedSet, setVisitedSet] = useState<Set<number>>(new Set([0]));
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    body: string;
    flaggedNums: number[];
    confirmLabel: string;
    cancelLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
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

  // Track which questions have been visited so they show red (not gray) when unanswered
  useEffect(() => {
    setVisitedSet((prev) => {
      if (prev.has(currentIndex)) return prev;
      const next = new Set(prev);
      next.add(currentIndex);
      return next;
    });
  }, [currentIndex]);

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
      
      const parts = data.data.test.parts || [];
      const partA = parts.find((p: any) => p.order === 0) || parts[0];
      const partB = parts.find((p: any) => p.order === 1) || parts[1];

      let partATotal = 0;
      let partBTotal = 0;

      if (partA && partA.durationMins) {
        partATotal = partA.durationMins * 60;
        partBTotal = Math.max(0, durationTotalSecs - partATotal);
      } else if (partB && partB.durationMins) {
        partBTotal = partB.durationMins * 60;
        partATotal = Math.max(0, durationTotalSecs - partBTotal);
      } else {
        partBTotal = Math.floor(durationTotalSecs / 3);
        partATotal = Math.max(0, durationTotalSecs - partBTotal);
      }
      
      const hasPartB = fetchedQuestions.some((q: QuestionData) => q.type === "SKETCH");
      const spentSecs = durationTotalSecs - totalSecs;
      
      if (hasPartB) {
        if (spentSecs < partATotal) {
          setCurrentPart("A");
          setPartATimeLeft(partATotal - spentSecs);
          setPartBTimeLeft(partBTotal);
        } else {
          setCurrentPart("B");
          setPartATimeLeft(0);
          setPartBTimeLeft(durationTotalSecs - spentSecs);
          const firstBIndex = fetchedQuestions.findIndex((q: QuestionData) => q.type === "SKETCH");
          if (firstBIndex !== -1) setCurrentIndex(firstBIndex);
        }
      } else {
        setCurrentPart("A");
        const effectivePartATotal = partA && partA.durationMins ? partA.durationMins * 60 : durationTotalSecs;
        setPartATimeLeft(Math.max(0, effectivePartATotal - spentSecs));
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

  // Helper: flagged question numbers in the current section (1-based)
  const getFlaggedInSection = (sectionType: string): number[] =>
    questions
      .map((q, i) => ({ q, i }))
      .filter(({ q, i }) => q.type === sectionType && flagged.has(i))
      .map(({ i }) => i + 1);

  // Helper: all flagged question numbers (1-based)
  const getAllFlaggedNums = (): number[] =>
    [...flagged].map((i) => i + 1).sort((a, b) => a - b);

  // Show section-switch warning if there are flagged questions in current section
  const handleSectionSwitch = (targetType: string, targetIndex: number) => {
    if (targetType === currentQuestion?.type) return; // same section, no warning
    const flaggedInSection = getFlaggedInSection(currentQuestion?.type ?? "");
    if (flaggedInSection.length === 0) {
      setCurrentIndex(targetIndex);
      return;
    }
    setConfirmDialog({
      title: "Flagged Questions in This Section",
      body: `You have ${flaggedInSection.length} question${flaggedInSection.length > 1 ? "s" : ""} marked for review in the current section. Have you attempted them?`,
      flaggedNums: flaggedInSection,
      confirmLabel: "Leave Anyway",
      cancelLabel: "Stay & Review",
      onConfirm: () => { setConfirmDialog(null); setCurrentIndex(targetIndex); },
      onCancel: () => setConfirmDialog(null),
    });
  };

  // Show submit warning if there are any flagged questions
  const handleSubmitWithWarning = () => {
    const allFlagged = getAllFlaggedNums();
    if (allFlagged.length === 0) {
      void handleSubmit();
      return;
    }
    setConfirmDialog({
      title: "You Have Marked Questions",
      body: `${allFlagged.length} question${allFlagged.length > 1 ? "s are" : " is"} still marked for review. Have you attempted all of them before submitting?`,
      flaggedNums: allFlagged,
      confirmLabel: "Submit Anyway",
      cancelLabel: "Go Back & Review",
      onConfirm: () => { setConfirmDialog(null); void handleSubmit(); },
      onCancel: () => setConfirmDialog(null),
    });
  };

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
            <aside className="take-test__panel">
              <h2 className="take-test__panel-title">General Instructions</h2>

              <div className="take-test__instructions-content">
                <p>1. The clock has been set on the server and countdown timer at top right corner of your screen will display the remaining time for you to complete the exam. When the clock runs out the exams ends by default- you are not required to end or submit your exam.</p>
                <p>2. The questions palette at the right of screen shows one of the following status of each of the questions numbered:</p>
                
                <ul className="take-test__status-list">
                  <li><span className="status-badge status-not-visited">15</span> You have <strong>not visited</strong> the question yet.</li>
                  <li><span className="status-badge status-not-answered">15</span> You have <strong>not answered</strong> the question.</li>
                  <li><span className="status-badge status-answered">15</span> You have <strong>answered</strong> the question.</li>
                  <li><span className="status-badge status-marked">15</span> You have <strong>NOT answered</strong> the question but have <strong>marked the question for review</strong>.</li>
                  <li><span className="status-badge status-answered-marked">15</span> You have <strong>answered</strong> the question but <strong>marked it for review</strong>.</li>
                </ul>

                <p>The Marked for Review status simply acts as a reminder that you have set to look at the question again. If an answer is selected for a question that is Marked for Review, the answer will be considered in the final evaluation.</p>

                <h3>Navigation to a question</h3>
                <p>3. To select a question to answer, you can do one of the following:</p>
                <ul className="take-test__bullet-list">
                  <li>Click on the <strong>question</strong> number on the question palette at the right of your screen to go to that numbered question directly. Note that using this option does NOT save your answer to the current question.</li>
                  <li>Click on Save and Next to save answer to current question, <strong>mark it for review</strong>, and to go to the next question in sequence.</li>
                  <li>Click on Mark for Review and <strong>Next to save answer</strong> to current question.</li>
                </ul>
                <p>4. You can view the entire paper by clicking on the <strong>All Questions</strong> button.</p>

                <h3>Answering questions</h3>
                <p>5. For multiple choice type question</p>
                <ul className="take-test__bullet-list take-test__bullet-list--alpha">
                  <li><strong>To select your answer</strong>, click on one of the option buttons</li>
                  <li><strong>To change your answer</strong>, click the another desired option button</li>
                  <li><strong>To save your answer</strong>, you MUST click on save</li>
                  <li><strong>To deselect a chosen answer</strong>, click on the Clear Response button</li>
                  <li><strong>To mark a question for review</strong> click on Mark for Review & Next. If an answer is selected for a question that is Marked for Review, the answer will be considered in the final evaluation</li>
                </ul>
                <p>6. To change an answer to a question, first select the question and then click on the new answer option followed by a click on the save button.</p>
                <p>7. Questions that are saved or marked for review after answering will ONLY be considered for evaluation.</p>
                <p>8. If quiz is paused, quiz can be continued from where left off within scheduled time.</p>

                <h3>Navigation through sections</h3>
                <p>9. Sections in this question paper are displayed on the top bar of the screen. Questions in a section can be viewed by clicking on the section name. The section you are currently viewing is highlighted.</p>
                <p>10. After clicking the save button on the last question for a section, you will automatically be taken to the first question of the next section.</p>
                <p>11. You can move the mouse cursor over the section names to view the status of the questions for that section.</p>
                <p>12. You can shuffle between sections and questions anytime during the examination as per your convenience.</p>
              </div>

              <div className="take-test__cta-wrapper">
                <Button className="take-test__panel-cta" size="lg" onClick={handleStart}>
                  START TEST
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
          .take-test__stage-shell {
            position: relative;
            display: flex;
            flex-direction: column;
            height: calc(100vh - 8rem);
            max-height: 900px;
            max-width: 86rem;
            margin: 0 auto;
            border-radius: 36px;
            overflow: hidden;
            background: white;
            box-shadow: 0 34px 80px rgba(15, 23, 42, 0.18);
          }
          .take-test__panel {
            position: relative;
            z-index: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            justify-content: flex-start;
            gap: 1.25rem;
            padding: clamp(2rem, 5vw, 4rem);
            background: white;
            flex: 1;
          }
          .take-test__panel-title {
            margin: 0;
            font-size: clamp(1.4rem, 2vw, 1.8rem);
            line-height: 1.2;
            font-weight: 700;
            color: #2563eb;
          }
          .take-test__instructions-content {
            font-size: 0.9rem;
            line-height: 1.6;
            color: #374151;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .take-test__instructions-content h3 {
            font-size: 1.05rem;
            font-weight: 700;
            color: #2563eb;
            margin: 1rem 0 0.25rem 0;
          }
          .take-test__instructions-content p {
            margin: 0;
          }
          .take-test__status-list {
            list-style: none;
            padding: 0;
            margin: 0.5rem 0;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
          }
          .take-test__status-list li {
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .status-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border-radius: 999px;
            color: white;
            font-size: 0.75rem;
            font-weight: 600;
            flex-shrink: 0;
          }
          .status-not-visited { background-color: #d1d5db; color: #4b5563; }
          .status-not-answered { background-color: #ef4444; }
          .status-answered { background-color: #22c55e; }
          .status-marked { background-color: #8b5cf6; }
          .status-answered-marked { background-color: #8b5cf6; position: relative; }
          .status-answered-marked::after {
            content: "";
            position: absolute;
            bottom: -2px;
            right: -2px;
            width: 10px;
            height: 10px;
            background-color: #22c55e;
            border-radius: 50%;
            border: 2px solid white;
          }
          .take-test__bullet-list {
            padding-left: 1.5rem;
            margin: 0.25rem 0;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
            list-style-type: disc;
          }
          .take-test__bullet-list--alpha {
            list-style-type: lower-alpha;
          }
          .take-test__cta-wrapper {
            margin-top: 1rem;
            position: sticky;
            bottom: 0;
            background: linear-gradient(180deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 1) 40%);
            padding-top: 2rem;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .take-test__panel-cta {
            width: 100%;
            max-width: 32rem;
            font-size: 1.05rem;
            padding: 1.75rem;
            font-weight: 700;
            letter-spacing: 0.05em;
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
                <Button size="lg" onClick={handleSubmitWithWarning} loading={submitting}>
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
      <div className="cbt-app">
        <header className="cbt-header">
          <div className="cbt-header-tabs">
            <button className="cbt-tab-close" onClick={() => setPhase("reviewing")}>
              <span className="cbt-icon-x">✕</span>
            </button>
            {Array.from(new Set(questions.map((q) => q.type))).map((type) => (
              <button
                key={type}
                className={`cbt-tab ${currentQuestion.type === type ? "cbt-tab--active" : ""}`}
                onClick={() => {
                  const idx = questions.findIndex((q) => q.type === type);
                  if (idx !== -1) handleSectionSwitch(type, idx);
                }}
              >
                {type === "SKETCH" ? "+2 SECTIONS" : type.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="cbt-header-user">
            <div className="cbt-avatar">{user?.email?.charAt(0).toUpperCase() || "S"}</div>
            <span className="cbt-username">{user?.email?.split("@")[0] || "Student"}</span>
          </div>
        </header>

        <div className="cbt-subheader">
          <div className="cbt-sub-left">
            <span className="cbt-qnum">
              Q. {currentIndex + 1} of {questions.length}
            </span>
            <span className="cbt-marks">Marks: {currentQuestion.points ?? 4.0}</span>
            <button
              className={`cbt-flag-btn ${flagged.has(currentIndex) ? "cbt-flag-btn--active" : ""}`}
              onClick={() => toggleFlag(currentIndex)}
              title="Mark for Review"
            >
              ⚑
            </button>
          </div>
          <div className="cbt-sub-right">
            {testInfo && activeInitialSeconds !== null && (
              <div className="cbt-timer">
                <span className="cbt-timer-label">YOUR TIME</span>
                <TestTimer key={currentPart} initialSeconds={activeInitialSeconds} onTimeUp={activeTimeUpHandler} />
              </div>
            )}
          </div>
        </div>

        <div className="cbt-layout">
          <div className="cbt-main">
            <div className="cbt-question-area">
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
            </div>

            <div className="cbt-footer">
              <div className="cbt-footer-left">
                <button className="cbt-footer-btn cbt-footer-btn--outline" onClick={() => setPhase("reviewing")}>
                  ASK QUESTION
                </button>
                <button
                  className={`cbt-footer-btn cbt-footer-btn--mark ${flagged.has(currentIndex) ? "cbt-footer-btn--mark-active" : ""}`}
                  onClick={() => toggleFlag(currentIndex)}
                >
                  {flagged.has(currentIndex) ? "✓ MARKED" : "MARK FOR REVIEW"}
                </button>
              </div>

              <div className="cbt-footer-nav">
                <button className="cbt-nav-arrow" onClick={goPrev} disabled={currentIndex === 0}>
                  ◀
                </button>
                <span>
                  {currentIndex + 1} of {questions.length}
                </span>
                <button className="cbt-nav-arrow" onClick={goNext} disabled={currentIndex === questions.length - 1}>
                  ▶
                </button>
              </div>

              <div className="cbt-footer-right">
                {currentIndex < questions.length - 1 ? (
                  <button className="cbt-footer-btn cbt-footer-btn--primary" onClick={goNext}>
                    NEXT →
                  </button>
                ) : (
                  <button className="cbt-footer-btn cbt-footer-btn--primary" onClick={() => {
                    const allFlagged = getAllFlaggedNums();
                    if (allFlagged.length === 0) { setPhase("reviewing"); return; }
                    setConfirmDialog({
                      title: "You Have Marked Questions",
                      body: `${allFlagged.length} question${allFlagged.length > 1 ? "s are" : " is"} still marked for review. Have you attempted all of them?`,
                      flaggedNums: allFlagged,
                      confirmLabel: "Go to Submit",
                      cancelLabel: "Stay & Review",
                      onConfirm: () => { setConfirmDialog(null); setPhase("reviewing"); },
                      onCancel: () => setConfirmDialog(null),
                    });
                  }}>
                    SUBMIT →
                  </button>
                )}
              </div>
            </div>
          </div>

          <aside className="cbt-sidebar">
            <QuestionNavigator
              questions={questions}
              currentIndex={currentIndex}
              answeredSet={answeredSet}
              flaggedSet={flagged}
              visitedSet={visitedSet}
              onNavigate={setCurrentIndex}
            />
          </aside>
        </div>
      </div>

      {/* Review Warning Dialog */}
      {confirmDialog && (
        <div className="cbt-dialog-overlay">
          <div className="cbt-dialog">
            <div className="cbt-dialog-icon">⚑</div>
            <h2 className="cbt-dialog-title">{confirmDialog.title}</h2>
            <p className="cbt-dialog-body">{confirmDialog.body}</p>
            <div className="cbt-dialog-chips">
              {confirmDialog.flaggedNums.map((n) => (
                <span key={n} className="cbt-dialog-chip">Q{n}</span>
              ))}
            </div>
            <div className="cbt-dialog-actions">
              <button className="cbt-dialog-btn cbt-dialog-btn--cancel" onClick={confirmDialog.onCancel}>
                {confirmDialog.cancelLabel}
              </button>
              <button className="cbt-dialog-btn cbt-dialog-btn--confirm" onClick={confirmDialog.onConfirm}>
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .cbt-app {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          background: #ffffff;
          font-family: system-ui, -apple-system, sans-serif;
          position: fixed;
          top: 0;
          left: 0;
          z-index: 100;
        }

        .cbt-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 3.5rem;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          padding: 0 1rem;
        }
        .cbt-header-tabs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          height: 100%;
        }
        .cbt-tab-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          border: 1px solid #d1d5db;
          background: #f3f4f6;
          margin-right: 0.5rem;
          cursor: pointer;
        }
        .cbt-tab {
          height: 100%;
          padding: 0 1rem;
          border: none;
          background: transparent;
          font-size: 0.85rem;
          font-weight: 600;
          color: #6b7280;
          cursor: pointer;
          border-bottom: 2px solid transparent;
        }
        .cbt-tab--active {
          color: #3b82f6;
          border-bottom-color: #3b82f6;
        }

        .cbt-header-user {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .cbt-avatar {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          background: #3b82f6;
          color: white;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .cbt-username {
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }

        .cbt-subheader {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1.5rem;
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
        }
        .cbt-sub-left {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .cbt-qnum {
          font-size: 0.95rem;
          font-weight: 600;
          color: #374151;
        }
        .cbt-marks {
          font-size: 0.85rem;
          font-weight: 500;
          color: #10b981;
        }
        .cbt-flag-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #d1d5db;
          font-size: 1.25rem;
          padding: 0;
          line-height: 1;
        }
        .cbt-flag-btn--active {
          color: #8b5cf6;
        }

        .cbt-sub-right {
          display: flex;
          align-items: center;
        }
        .cbt-timer {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }
        .cbt-timer-label {
          font-size: 0.65rem;
          font-weight: 600;
          color: #6b7280;
          text-transform: uppercase;
        }

        .cbt-layout {
          display: flex;
          flex: 1;
          overflow: hidden;
        }

        .cbt-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          background: #f9fafb;
        }
        .cbt-question-area {
          flex: 1;
          overflow-y: auto;
          padding: 2rem;
          background: #ffffff;
        }

        .cbt-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #ffffff;
          border-top: 1px solid #e5e7eb;
        }
        .cbt-footer-btn {
          padding: 0.6rem 1.25rem;
          font-size: 0.85rem;
          font-weight: 600;
          border-radius: 4px;
          cursor: pointer;
          text-transform: uppercase;
        }
        .cbt-footer-btn--outline {
          background: #ffffff;
          border: 1px solid #d1d5db;
          color: #4b5563;
        }
        .cbt-footer-btn--mark {
          background: #ffffff;
          border: 1px solid #8b5cf6;
          color: #8b5cf6;
        }
        .cbt-footer-btn--mark-active {
          background: #8b5cf6;
          border: 1px solid #8b5cf6;
          color: #ffffff;
        }
        .cbt-footer-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .cbt-footer-btn--primary {
          background: #3b82f6;
          border: 1px solid #3b82f6;
          color: #ffffff;
        }
        
        .cbt-footer-nav {
          display: flex;
          align-items: center;
          gap: 1rem;
          font-size: 0.9rem;
          font-weight: 500;
          color: #374151;
        }
        .cbt-nav-arrow {
          background: transparent;
          border: none;
          cursor: pointer;
          color: #374151;
          font-size: 0.9rem;
        }
        .cbt-nav-arrow:disabled {
          color: #d1d5db;
          cursor: not-allowed;
        }

        .cbt-sidebar {
          width: 320px;
          border-left: 1px solid #e5e7eb;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
        }

        @media (max-width: 1024px) {
          .cbt-sidebar {
            display: none;
          }
        }

        /* ---- Review Warning Dialog ---- */
        .cbt-dialog-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(15, 23, 42, 0.55);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
        }
        .cbt-dialog {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
          padding: 2rem 2rem 1.75rem;
          max-width: 420px;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 0.75rem;
        }
        .cbt-dialog-icon {
          font-size: 2rem;
          color: #8b5cf6;
          line-height: 1;
        }
        .cbt-dialog-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 700;
          color: #111827;
        }
        .cbt-dialog-body {
          margin: 0;
          font-size: 0.9rem;
          color: #4b5563;
          line-height: 1.6;
        }
        .cbt-dialog-chips {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 0.4rem;
          margin-top: 0.25rem;
        }
        .cbt-dialog-chip {
          padding: 0.2rem 0.6rem;
          border-radius: 999px;
          background: #ede9fe;
          color: #6d28d9;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .cbt-dialog-actions {
          display: flex;
          gap: 0.75rem;
          width: 100%;
          margin-top: 0.5rem;
        }
        .cbt-dialog-btn {
          flex: 1;
          padding: 0.7rem 1rem;
          border-radius: 10px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: opacity 0.15s;
        }
        .cbt-dialog-btn:hover { opacity: 0.88; }
        .cbt-dialog-btn--cancel {
          background: #f3f4f6;
          color: #374151;
        }
        .cbt-dialog-btn--confirm {
          background: #8b5cf6;
          color: #ffffff;
        }
      `}</style>
    </>
  );
}
