"use client";

/**
 * Grid of question numbers for quick navigation during a test.
 * Shows answered vs. unanswered vs. flagged vs. current state.
 */
export function QuestionNavigator({
  totalQuestions,
  currentIndex,
  answeredSet,
  flaggedSet,
  onNavigate,
}: {
  totalQuestions: number;
  currentIndex: number;
  answeredSet: Set<number>;
  flaggedSet: Set<number>;
  onNavigate: (index: number) => void;
}) {
  const answeredCount = answeredSet.size;
  const flaggedCount = flaggedSet.size;
  const completionPercent = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className="question-nav">
      <div className="question-nav__header">
        <div>
          <span className="question-nav__title">Question Map</span>
          <p className="question-nav__subtitle">Jump cleanly, answer steadily, review late.</p>
        </div>
        <span className="question-nav__count">{completionPercent}%</span>
      </div>

      <div className="question-nav__progress">
        <span className="question-nav__progress-fill" style={{ width: `${completionPercent}%` }} />
      </div>

      <div className="question-nav__meta">
        <span>{answeredCount}/{totalQuestions} answered</span>
        <span>{totalQuestions - answeredCount} left</span>
      </div>

      <div className="question-nav__grid">
        {Array.from({ length: totalQuestions }, (_, i) => {
          const isCurrent = i === currentIndex;
          const isAnswered = answeredSet.has(i);
          const isFlagged = flaggedSet.has(i);

          let state = "default";
          if (isCurrent) state = "current";
          else if (isAnswered) state = "answered";

          return (
            <button
              key={i}
              className="question-nav__btn"
              data-state={state}
              data-flagged={isFlagged || undefined}
              onClick={() => onNavigate(i)}
              title={`Question ${i + 1}${isFlagged ? " (flagged)" : ""}${isAnswered ? " (answered)" : ""}`}
            >
              {i + 1}
              {isFlagged && <span className="question-nav__flag-dot" />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="question-nav__legend">
        <div className="question-nav__legend-item">
          <span className="question-nav__legend-dot" data-type="current" />
          <span>Current</span>
        </div>
        <div className="question-nav__legend-item">
          <span className="question-nav__legend-dot" data-type="answered" />
          <span>Answered</span>
        </div>
        <div className="question-nav__legend-item">
          <span className="question-nav__legend-dot" data-type="default" />
          <span>Unanswered</span>
        </div>
        {flaggedCount > 0 && (
          <div className="question-nav__legend-item">
            <span className="question-nav__legend-dot" data-type="flagged" />
            <span>Flagged ({flaggedCount})</span>
          </div>
        )}
      </div>

      <style jsx>{`
        .question-nav {
          padding: 1.2rem;
          background:
            linear-gradient(180deg, rgba(255,255,255,0.96), rgba(248,250,252,0.96));
          border-radius: 24px;
          border: 1px solid rgba(226, 232, 240, 0.92);
          box-shadow: 0 20px 44px rgba(15, 23, 42, 0.08);
        }
        .question-nav__header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
        }
        .question-nav__title {
          display: block;
          font-size: 0.78rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--text-muted, #6b7280);
        }
        .question-nav__subtitle {
          margin: 0.35rem 0 0;
          font-size: 0.78rem;
          line-height: 1.45;
          color: #94a3b8;
        }
        .question-nav__count {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 3.4rem;
          height: 2.2rem;
          border-radius: 999px;
          background: rgba(56, 193, 255, 0.1);
          font-size: 0.9rem;
          font-weight: 800;
          color: var(--brand-primary-strong, #38c1ff);
        }
        .question-nav__progress {
          margin-top: 0.95rem;
          height: 0.5rem;
          border-radius: 999px;
          background: rgba(226, 232, 240, 0.9);
          overflow: hidden;
        }
        .question-nav__progress-fill {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: linear-gradient(90deg, #38c1ff 0%, #7dd3fc 100%);
        }
        .question-nav__meta {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          margin-top: 0.75rem;
          font-size: 0.78rem;
          color: #64748b;
        }
        .question-nav__grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.5rem;
          margin-top: 1rem;
        }
        .question-nav__btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          aspect-ratio: 1;
          border: 1.5px solid var(--line-soft, #e5e7eb);
          border-radius: 14px;
          background: rgba(255, 255, 255, 0.9);
          font-size: 0.8125rem;
          font-weight: 700;
          color: var(--text-muted, #6b7280);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .question-nav__btn:hover {
          border-color: var(--brand-primary-strong, #38c1ff);
          color: var(--brand-primary-strong, #38c1ff);
          transform: translateY(-1px);
        }
        .question-nav__btn[data-state="current"] {
          border-color: var(--brand-primary-strong, #38c1ff);
          background: linear-gradient(135deg, #38c1ff, #0ea5e9);
          color: #fff;
          box-shadow: 0 16px 28px rgba(56, 193, 255, 0.24);
        }
        .question-nav__btn[data-state="answered"] {
          border-color: rgba(34, 197, 94, 0.3);
          background: rgba(34, 197, 94, 0.12);
          color: #15803d;
        }
        .question-nav__btn[data-flagged="true"] {
          box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.32);
        }
        .question-nav__flag-dot {
          position: absolute;
          top: 5px;
          right: 5px;
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #f59e0b;
        }
        .question-nav__legend {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          margin-top: 1rem;
          padding-top: 0.9rem;
          border-top: 1px solid rgba(226, 232, 240, 0.95);
        }
        .question-nav__legend-item {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          font-size: 0.6875rem;
          color: var(--text-muted, #6b7280);
        }
        .question-nav__legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          border: 1.5px solid var(--line-soft, #e5e7eb);
        }
        .question-nav__legend-dot[data-type="current"] {
          background: var(--brand-primary-strong, #38c1ff);
          border-color: var(--brand-primary-strong, #38c1ff);
        }
        .question-nav__legend-dot[data-type="answered"] {
          background: rgba(34, 197, 94, 0.15);
          border-color: rgba(34, 197, 94, 0.4);
        }
        .question-nav__legend-dot[data-type="flagged"] {
          background: rgba(245, 158, 11, 0.15);
          border-color: #f59e0b;
        }
      `}</style>
    </div>
  );
}
