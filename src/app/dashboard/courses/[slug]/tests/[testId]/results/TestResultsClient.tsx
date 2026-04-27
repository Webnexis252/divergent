"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TestResultsBreakdown } from "@/app/dashboard/_components/test-taking/test-results-breakdown";
import { QuestionCard, QuestionData, type QuestionWatermark } from "@/app/dashboard/_components/test-taking/question-card";
import { buildCategoryPerformanceBreakdown } from "@/lib/test-category-performance";
import { useAuth } from "@/context/auth-context";

export type QuestionBreakdown = {
  id: string;
  prompt: string;
  type: string;
  category: QuestionData["category"] | null;
  options: string[];
  correctAnswer: unknown;
  userAnswer: unknown;
  isCorrect: boolean | null;
  explanation: string | null;
  points: number;
  pointsAwarded: number;
  difficulty: string | null;
};

export type Attempt = {
  id: string;
  score: number;
  pointsEarned: number;
  totalPoints: number;
  isPassed: boolean;
  startedAt: string;
  submittedAt: string | null;
  timeSpentSecs: number | null;
  questionBreakdown: QuestionBreakdown[] | null;
};

export type TestResultData = {
  test: {
    id: string;
    title: string;
    description: string | null;
    type: string;
    durationMins: number;
    totalQuestions: number;
    passingScore: number;
    maxAttempts: number;
  };
  stats: {
    totalAttempts: number;
    bestScore: number;
    avgScore: number;
    canRetake: boolean;
    attemptsRemaining: number | string;
  };
  attempts: Attempt[];
};

export function TestResultsClient({ data, slug, testId }: { data: TestResultData | null; slug: string; testId: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [selectedAttemptIndex, setSelectedAttemptIndex] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);

  // Security watermark — shows student name & email on every question card
  const watermark: QuestionWatermark | undefined = user
    ? { name: user.name ?? "Student", email: user.email ?? "", phone: "" }
    : undefined;

  if (!data) {
    return (
      <div style={{ textAlign: "center", padding: "4rem" }}>
        <p>❌ No data found</p>
        <Button variant="secondary" onClick={() => router.back()}>Go Back</Button>
      </div>
    );
  }

  const selectedAttempt = data.attempts[selectedAttemptIndex];
  const correctCount = selectedAttempt?.questionBreakdown
    ? selectedAttempt.questionBreakdown.filter((q) => q.isCorrect === true).length
    : 0;
  const categoryBreakdown = selectedAttempt?.questionBreakdown
    ? buildCategoryPerformanceBreakdown(
        selectedAttempt.questionBreakdown.map((question) => ({
          category: question.category,
          points: question.points,
          pointsAwarded: question.pointsAwarded,
          isCorrect: question.isCorrect,
        }))
      )
    : [];
  const canShowQuestionDetails = Boolean(
    selectedAttempt?.questionBreakdown?.some(
      (question) => question.correctAnswer !== undefined || question.explanation !== null
    )
  );

  return (
    <>
      <div className="results-page">
        {/* Header */}
        <div className="results-page__header">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/courses/${slug}/tests`)}>
            ← Back to Tests
          </Button>
          <h1 className="results-page__title">{data.test.title}</h1>
          <p className="results-page__subtitle">
            {data.test.type.replace("_", " ")} · {data.test.totalQuestions} questions · {data.test.durationMins} min
          </p>
        </div>

        {data.attempts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <p>You haven&apos;t attempted this test yet.</p>
            <Button onClick={() => router.push(`/dashboard/courses/${slug}/tests/${testId}`)}>
              Take Test
            </Button>
          </div>
        ) : (
          <>
            {/* Score Card */}
            {selectedAttempt?.submittedAt && (
              <TestResultsBreakdown
                score={selectedAttempt.score}
                pointsEarned={selectedAttempt.pointsEarned}
                totalPoints={selectedAttempt.totalPoints}
                isPassed={selectedAttempt.isPassed}
                passingScore={data.test.passingScore}
                timeSpentSecs={selectedAttempt.timeSpentSecs}
                totalQuestions={data.test.totalQuestions}
                correctCount={correctCount}
                canRetake={data.stats.canRetake}
                attemptsRemaining={data.stats.attemptsRemaining}
                categoryBreakdown={categoryBreakdown}
                onRetake={() => router.push(`/dashboard/courses/${slug}/tests/${testId}`)}
                onViewDetails={canShowQuestionDetails ? () => setShowQuestions(!showQuestions) : undefined}
              />
            )}

            {/* Attempt Selector */}
            {data.attempts.length > 1 && (
              <div className="results-page__attempts">
                <h3 className="results-page__attempts-title">All Attempts</h3>
                <div className="results-page__attempts-list">
                  {data.attempts.map((attempt, i) => (
                    <button
                      key={attempt.id}
                      className="results-page__attempt-btn"
                      data-active={i === selectedAttemptIndex}
                      onClick={() => { setSelectedAttemptIndex(i); setShowQuestions(false); }}
                    >
                      <span className="results-page__attempt-num">#{data.attempts.length - i}</span>
                      <span className="results-page__attempt-score" data-passed={attempt.isPassed}>
                        {attempt.score}%
                      </span>
                      <Badge tone={attempt.isPassed ? "success" : "danger"}>
                        {attempt.isPassed ? "Pass" : "Fail"}
                      </Badge>
                      <span className="results-page__attempt-date">
                        {attempt.submittedAt
                          ? new Date(attempt.submittedAt).toLocaleDateString()
                          : "In Progress"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Question Breakdown */}
            {showQuestions && canShowQuestionDetails && selectedAttempt?.questionBreakdown && (
              <div className="results-page__questions">
                <h3 className="results-page__questions-title">
                  Question-by-Question Review
                </h3>
                <div className="results-page__questions-list">
                  {selectedAttempt.questionBreakdown.map((q, i) => (
                    <QuestionCard
                      key={q.id}
                      question={{
                        id: q.id,
                        type: q.type as QuestionData["type"],
                        category: q.category,
                        prompt: q.prompt,
                        options: q.options,
                        points: q.points,
                      }}
                      questionNumber={i + 1}
                      totalQuestions={selectedAttempt.questionBreakdown!.length}
                      selectedAnswer={q.userAnswer}
                      onAnswer={() => {}}
                      showResult={true}
                      correctAnswer={q.correctAnswer}
                      explanation={q.explanation}
                      watermark={watermark}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .results-page {
          max-width: 52rem;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          padding-bottom: 2rem;
        }
        .results-page__header {
          margin-bottom: 0.5rem;
        }
        .results-page__title {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-strong, #111827);
          margin: 0.75rem 0 0.25rem;
        }
        .results-page__subtitle {
          font-size: 0.875rem;
          color: var(--text-muted, #6b7280);
          text-transform: capitalize;
        }
        .results-page__attempts {
          background: var(--bg-card, #ffffff);
          border-radius: var(--radius-lg, 16px);
          border: 1px solid var(--line-soft, #e5e7eb);
          padding: 1.25rem;
        }
        .results-page__attempts-title {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted, #6b7280);
          margin-bottom: 0.75rem;
        }
        .results-page__attempts-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .results-page__attempt-btn {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1rem;
          border: 1.5px solid var(--line-soft, #e5e7eb);
          border-radius: 10px;
          background: transparent;
          cursor: pointer;
          width: 100%;
          text-align: left;
          transition: all 0.15s ease;
        }
        .results-page__attempt-btn:hover {
          border-color: var(--brand-primary-strong, #38c1ff);
        }
        .results-page__attempt-btn[data-active="true"] {
          border-color: var(--brand-primary-strong, #38c1ff);
          background: rgba(56, 193, 255, 0.04);
        }
        .results-page__attempt-num {
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--text-muted, #6b7280);
        }
        .results-page__attempt-score {
          font-size: 1.125rem;
          font-weight: 800;
          font-variant-numeric: tabular-nums;
        }
        .results-page__attempt-score[data-passed="true"] { color: var(--success, #4caf50); }
        .results-page__attempt-score[data-passed="false"] { color: var(--danger, #ff3d00); }
        .results-page__attempt-date {
          font-size: 0.75rem;
          color: var(--text-muted, #6b7280);
          margin-left: auto;
        }
        .results-page__questions {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .results-page__questions-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-strong, #111827);
        }
        .results-page__questions-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
      `}</style>
    </>
  );
}
