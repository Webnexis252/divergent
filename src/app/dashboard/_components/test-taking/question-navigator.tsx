"use client";

/**
 * Grid of question numbers for quick navigation during a test.
 * Shows answered vs. unanswered vs. flagged vs. current state.
 */
import type { QuestionData } from "@/app/dashboard/_components/test-taking/question-card";

export function QuestionNavigator({
  questions,
  currentIndex,
  answeredSet,
  flaggedSet,
  visitedSet,
  onNavigate,
}: {
  questions: QuestionData[];
  currentIndex: number;
  answeredSet: Set<number>;
  flaggedSet: Set<number>;
  visitedSet: Set<number>;
  onNavigate: (index: number) => void;
}) {
  const currentType = questions[currentIndex]?.type;
  
  const sectionIndices = questions
    .map((q, i) => ({ type: q.type, originalIndex: i }))
    .filter(q => q.type === currentType)
    .map(q => q.originalIndex);

  const answeredCount = sectionIndices.filter(i => answeredSet.has(i)).length;
  const flaggedCount = sectionIndices.filter(i => flaggedSet.has(i)).length;
  const sectionTotal = sectionIndices.length;
  const completionPercent = sectionTotal > 0 ? Math.round((answeredCount / sectionTotal) * 100) : 0;

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
        <span>{answeredCount}/{sectionTotal} answered</span>
        <span>{sectionTotal - answeredCount} left</span>
      </div>

      <div className="question-nav__grid">
        {sectionIndices.map((originalIndex, visualIndex) => {
          const isCurrent = originalIndex === currentIndex;
          const isAnswered = answeredSet.has(originalIndex);
          const isFlagged = flaggedSet.has(originalIndex);

          let state = "not_visited";
          if (isAnswered) state = "answered";
          else if (isCurrent || visitedSet.has(originalIndex)) state = "not_answered"; // Red if visited or current but unanswered

          return (
            <button
              key={originalIndex}
              className="question-nav__btn"
              data-state={state}
              data-flagged={isFlagged || undefined}
              data-current={isCurrent || undefined}
              onClick={() => onNavigate(originalIndex)}
              title={`Question ${visualIndex + 1}${isFlagged ? " (flagged)" : ""}${isAnswered ? " (answered)" : ""}`}
            >
              {visualIndex + 1}
              {isFlagged && <span className="question-nav__flag-badge" />}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="question-nav__legend">
        <div className="question-nav__legend-row">
          <div className="question-nav__legend-item">
            <span className="question-nav__legend-dot" data-type="answered" />
            <span>Answered</span>
          </div>
          <div className="question-nav__legend-item">
            <span className="question-nav__legend-dot" data-type="not_answered" />
            <span>Not Answered</span>
          </div>
        </div>
        <div className="question-nav__legend-row">
          <div className="question-nav__legend-item">
            <span className="question-nav__legend-dot" data-type="not_visited" />
            <span>Not Visited</span>
          </div>
          <div className="question-nav__legend-item">
            <span className="question-nav__legend-dot" data-type="flagged" />
            <span>Marked for Review</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .question-nav {
          padding: 1.25rem;
          background: white;
          height: 100%;
        }
        .question-nav__header,
        .question-nav__progress,
        .question-nav__meta {
          display: none;
        }
        .question-nav__grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.75rem;
          margin-top: 0;
        }
        .question-nav__btn {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          aspect-ratio: 1;
          border: 1px solid #e5e7eb;
          border-radius: 50%;
          background: #f3f4f6;
          font-size: 0.85rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .question-nav__btn:hover {
          border-color: #9ca3af;
        }
        .question-nav__btn[data-current="true"] {
          border: 2px solid #3b82f6;
        }
        .question-nav__btn[data-state="answered"] {
          background: #22c55e;
          color: white;
          border-color: #22c55e;
        }
        .question-nav__btn[data-state="not_answered"] {
          background: #ef4444;
          color: white;
          border-color: #ef4444;
        }
        .question-nav__btn[data-state="not_visited"] {
          background: #f3f4f6;
          color: #374151;
          border-color: #e5e7eb;
        }
        .question-nav__btn[data-flagged="true"] {
          background: #8b5cf6;
          color: white;
          border-color: #8b5cf6;
        }
        .question-nav__flag-badge {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22c55e;
          border: 1.5px solid white;
        }
        .question-nav__legend {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }
        .question-nav__legend-row {
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
        }
        .question-nav__legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.7rem;
          font-weight: 600;
          color: #4b5563;
          flex: 1;
        }
        .question-nav__legend-dot {
          width: 14px;
          height: 14px;
          border-radius: 50%;
        }
        .question-nav__legend-dot[data-type="answered"] {
          background: #22c55e;
        }
        .question-nav__legend-dot[data-type="not_answered"] {
          background: #ef4444;
        }
        .question-nav__legend-dot[data-type="not_visited"] {
          background: #f3f4f6;
          border: 1px solid #e5e7eb;
        }
        .question-nav__legend-dot[data-type="flagged"] {
          background: #8b5cf6;
        }
      `}</style>
    </div>
  );
}
