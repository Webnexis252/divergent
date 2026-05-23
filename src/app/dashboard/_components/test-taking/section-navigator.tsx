"use client";

import { ChevronLeft, ChevronRight, Lock } from "lucide-react";

/**
 * Horizontal tab bar for navigating between question-type sections
 * during an exam. Shows arrow buttons on each end.
 *
 * Used inside Part A (SCQ → MCQ → NUMERIC) and Part B (SKETCH).
 */

export type SectionTab = {
  type: string;
  label: string;
  count: number;
  answeredCount: number;
  locked?: boolean;
};

export function SectionNavigator({
  sections,
  activeType,
  onChangeSection,
  partLabel,
  timeDisplay,
  isUrgent,
}: {
  sections: SectionTab[];
  activeType: string;
  onChangeSection: (type: string) => void;
  partLabel: string;
  timeDisplay: string;
  isUrgent?: boolean;
}) {
  const activeIdx = sections.findIndex((s) => s.type === activeType);

  const goPrev = () => {
    if (activeIdx > 0 && !sections[activeIdx - 1].locked) {
      onChangeSection(sections[activeIdx - 1].type);
    }
  };

  const goNext = () => {
    if (activeIdx < sections.length - 1 && !sections[activeIdx + 1].locked) {
      onChangeSection(sections[activeIdx + 1].type);
    }
  };

  const TYPE_ICONS: Record<string, string> = {
    SCQ: "🔘",
    MCQ: "☑️",
    NUMERIC: "🔢",
    SKETCH: "🎨",
  };

  return (
    <div className="section-nav">
      <div className="section-nav__header">
        <span className="section-nav__part-label">{partLabel}</span>
        <span className={`section-nav__timer ${isUrgent ? "section-nav__timer--urgent" : ""}`}>
          ⏱ {timeDisplay}
        </span>
      </div>

      <div className="section-nav__tabs">
        <button
          onClick={goPrev}
          disabled={activeIdx <= 0}
          className="section-nav__arrow"
          aria-label="Previous section"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="section-nav__tab-list">
          {sections.map((sec) => {
            const isActive = sec.type === activeType;
            return (
              <button
                key={sec.type}
                onClick={() => !sec.locked && onChangeSection(sec.type)}
                disabled={sec.locked}
                className={`section-nav__tab ${isActive ? "section-nav__tab--active" : ""} ${sec.locked ? "section-nav__tab--locked" : ""}`}
                title={sec.locked ? `${sec.label} is locked` : sec.label}
              >
                <span className="section-nav__tab-icon">{TYPE_ICONS[sec.type] ?? "📝"}</span>
                <span className="section-nav__tab-label">{sec.label}</span>
                <span className="section-nav__tab-count">
                  {sec.answeredCount}/{sec.count}
                </span>
                {sec.locked && <Lock className="section-nav__tab-lock" />}
              </button>
            );
          })}
        </div>

        <button
          onClick={goNext}
          disabled={activeIdx >= sections.length - 1}
          className="section-nav__arrow"
          aria-label="Next section"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <style jsx>{`
        .section-nav {
          padding: 0.75rem 1rem;
          background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.98));
          border-radius: 18px;
          border: 1px solid rgba(226, 232, 240, 0.9);
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.06);
        }
        .section-nav__header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.6rem;
        }
        .section-nav__part-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          color: #6b7280;
        }
        .section-nav__timer {
          font-size: 0.8rem;
          font-weight: 700;
          color: #38c1ff;
          font-variant-numeric: tabular-nums;
        }
        .section-nav__timer--urgent {
          color: #ff3d00;
          animation: pulse-timer 1s ease-in-out infinite;
        }
        .section-nav__tabs {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .section-nav__arrow {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          border: 1.5px solid #e5e7eb;
          background: white;
          color: #374151;
          cursor: pointer;
          flex-shrink: 0;
          transition: all 0.15s ease;
        }
        .section-nav__arrow:hover:not(:disabled) {
          border-color: #38c1ff;
          color: #38c1ff;
          transform: scale(1.05);
        }
        .section-nav__arrow:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }
        .section-nav__tab-list {
          display: flex;
          gap: 0.375rem;
          flex: 1;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .section-nav__tab-list::-webkit-scrollbar {
          display: none;
        }
        .section-nav__tab {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.45rem 0.75rem;
          border-radius: 12px;
          border: 1.5px solid #e5e7eb;
          background: white;
          font-size: 0.75rem;
          font-weight: 600;
          color: #6b7280;
          white-space: nowrap;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
        }
        .section-nav__tab:hover:not(:disabled) {
          border-color: #38c1ff;
          color: #38c1ff;
        }
        .section-nav__tab--active {
          border-color: #38c1ff;
          background: linear-gradient(135deg, #38c1ff, #0ea5e9);
          color: white;
          box-shadow: 0 4px 12px rgba(56, 193, 255, 0.3);
        }
        .section-nav__tab--active:hover {
          color: white;
        }
        .section-nav__tab--locked {
          opacity: 0.45;
          cursor: not-allowed;
          background: #f3f4f6;
        }
        .section-nav__tab-icon {
          font-size: 0.85rem;
        }
        .section-nav__tab-label {
          display: none;
        }
        @media (min-width: 768px) {
          .section-nav__tab-label {
            display: inline;
          }
        }
        .section-nav__tab-count {
          font-size: 0.65rem;
          font-weight: 700;
          opacity: 0.75;
        }
        .section-nav__tab-lock {
          width: 12px;
          height: 12px;
          opacity: 0.6;
        }
        @keyframes pulse-timer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}
