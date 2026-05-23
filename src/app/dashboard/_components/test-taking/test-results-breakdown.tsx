"use client";

/**
 * Test results breakdown — shows overall score, per-question analysis,
 * and a visual score ring.
 */
import { CategoryPerformancePanel } from "@/app/dashboard/_components/test-taking/category-performance-panel";
import { CategoryPerformanceItem } from "@/lib/test-category-performance";

export function TestResultsBreakdown({
  score,
  pointsEarned,
  totalPoints,
  isPassed,
  passingScore,
  timeSpentSecs,
  totalQuestions,
  correctCount,
  canRetake,
  attemptsRemaining,
  categoryBreakdown,
  gradingStatus,
  onRetake,
  onViewDetails,
}: {
  score: number;
  pointsEarned: number;
  totalPoints: number;
  isPassed: boolean;
  passingScore: number;
  timeSpentSecs?: number | null;
  totalQuestions: number;
  correctCount: number;
  canRetake: boolean;
  attemptsRemaining: number | string;
  categoryBreakdown?: CategoryPerformanceItem[];
  gradingStatus?: "AUTO_GRADED" | "PENDING_REVIEW" | "MANUAL_GRADED";
  onRetake?: () => void;
  onViewDetails?: () => void;
}) {
  const circumference = 2 * Math.PI * 54;
  const scoreOffset = circumference - (score / 100) * circumference;
  const timeMins = timeSpentSecs ? Math.floor(timeSpentSecs / 60) : 0;
  const timeSecs = timeSpentSecs ? timeSpentSecs % 60 : 0;

  return (
    <div className="test-results">
      {/* Score Ring */}
      <div className="test-results__hero">
        <div className="test-results__ring-wrapper">
          <svg viewBox="0 0 120 120" className="test-results__ring">
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              opacity="0.08"
            />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={scoreOffset}
              className="test-results__ring-fill"
              data-passed={isPassed}
            />
          </svg>
          <div className="test-results__score-text">
            <span className="test-results__score-value">{score}</span>
            <span className="test-results__score-unit">%</span>
          </div>
        </div>

        <div className="test-results__verdict" data-passed={gradingStatus === "PENDING_REVIEW" ? "pending" : isPassed}>
          {gradingStatus === "PENDING_REVIEW" ? "⏳ Pending Review" : isPassed ? "🎉 Passed!" : "❌ Not Passed"}
        </div>
        {gradingStatus === "PENDING_REVIEW" ? (
          <p className="test-results__passing-info text-amber-600 font-medium">
            Provisional score. Waiting for teacher review.
          </p>
        ) : (
          <p className="test-results__passing-info">
            Passing score: {passingScore}%
          </p>
        )}
      </div>

      {/* Stats Grid */}
      <div className="test-results__stats">
        <div className="test-results__stat">
          <span className="test-results__stat-value">{correctCount}</span>
          <span className="test-results__stat-label">Correct</span>
        </div>
        <div className="test-results__stat">
          <span className="test-results__stat-value">{totalQuestions - correctCount}</span>
          <span className="test-results__stat-label">Wrong</span>
        </div>
        <div className="test-results__stat">
          <span className="test-results__stat-value">{pointsEarned}/{totalPoints}</span>
          <span className="test-results__stat-label">Points</span>
        </div>
        {timeSpentSecs != null && (
          <div className="test-results__stat">
            <span className="test-results__stat-value">
              {timeMins}:{String(timeSecs).padStart(2, "0")}
            </span>
            <span className="test-results__stat-label">Time</span>
          </div>
        )}
      </div>

      {categoryBreakdown && categoryBreakdown.length > 0 && (
        <div className="test-results__categories">
          <CategoryPerformancePanel items={categoryBreakdown} />
        </div>
      )}

      {/* Actions */}
      <div className="test-results__actions">
        {onViewDetails && (
          <button className="test-results__btn test-results__btn--secondary" onClick={onViewDetails}>
            View Answers
          </button>
        )}
        {canRetake && onRetake && (
          <button className="test-results__btn test-results__btn--primary" onClick={onRetake}>
            Retake Test
            {attemptsRemaining !== "unlimited" && (
              <span className="test-results__attempts-badge">
                {attemptsRemaining} left
              </span>
            )}
          </button>
        )}
      </div>

      <style jsx>{`
        .test-results {
          text-align: center;
          padding: 2rem;
          background: var(--bg-card, #ffffff);
          border-radius: var(--radius-lg, 16px);
          border: 1px solid var(--line-soft, #e5e7eb);
        }
        .test-results__hero {
          margin-bottom: 1.75rem;
        }
        .test-results__ring-wrapper {
          position: relative;
          width: 140px;
          height: 140px;
          margin: 0 auto 1rem;
        }
        .test-results__ring {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
          color: var(--line-soft, #e5e7eb);
        }
        .test-results__ring-fill {
          stroke: var(--success, #4caf50);
          transition: stroke-dashoffset 1.5s ease-out;
        }
        .test-results__ring-fill[data-passed="false"] {
          stroke: var(--danger, #ff3d00);
        }
        .test-results__ring-fill[data-passed="pending"] {
          stroke: #f59e0b; /* amber-500 */
        }
        .test-results__score-text {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
        }
        .test-results__score-value {
          font-size: 2.5rem;
          font-weight: 800;
          color: var(--text-strong, #111827);
          font-variant-numeric: tabular-nums;
        }
        .test-results__score-unit {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-muted, #6b7280);
          margin-top: 0.75rem;
        }
        .test-results__verdict {
          font-size: 1.375rem;
          font-weight: 700;
          margin-bottom: 0.375rem;
        }
        .test-results__verdict[data-passed="true"] { color: var(--success, #4caf50); }
        .test-results__verdict[data-passed="false"] { color: var(--danger, #ff3d00); }
        .test-results__verdict[data-passed="pending"] { color: #d97706; /* amber-600 */ }
        .test-results__passing-info {
          font-size: 0.8125rem;
          color: var(--text-muted, #6b7280);
        }
        .test-results__stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.75rem;
          padding: 1.25rem;
          background: rgba(0,0,0,0.02);
          border-radius: 12px;
        }
        .test-results__stat {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .test-results__stat-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: var(--text-strong, #111827);
          font-variant-numeric: tabular-nums;
        }
        .test-results__stat-label {
          font-size: 0.6875rem;
          color: var(--text-muted, #6b7280);
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .test-results__categories {
          margin-bottom: 1.75rem;
          padding: 1.25rem;
          background: rgba(15, 23, 42, 0.02);
          border-radius: 16px;
          border: 1px solid rgba(229, 231, 235, 0.9);
        }
        .test-results__actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          justify-content: center;
        }
        .test-results__btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s ease;
        }
        .test-results__btn--primary {
          background: var(--brand-primary-strong, #38c1ff);
          color: #fff;
        }
        .test-results__btn--primary:hover { opacity: 0.9; transform: translateY(-1px); }
        .test-results__btn--secondary {
          background: transparent;
          border: 1.5px solid var(--line-soft, #e5e7eb);
          color: var(--text-strong, #111827);
        }
        .test-results__btn--secondary:hover { border-color: var(--brand-primary-strong, #38c1ff); }
        .test-results__attempts-badge {
          font-size: 0.6875rem;
          padding: 0.15rem 0.5rem;
          background: rgba(255,255,255,0.2);
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
