"use client";

import React, { useState, useEffect } from "react";

/**
 * Countdown timer for timed tests.
 * Shows MM:SS format, turns red when < 60s, auto-calls onTimeUp when done.
 */
export function TestTimer({
  initialSeconds,
  onTimeUp,
  isPaused = false,
}: {
  initialSeconds: number;
  onTimeUp: () => void;
  isPaused?: boolean;
}) {
  const [remaining, setRemaining] = useState(initialSeconds);

  useEffect(() => {
    if (isPaused || remaining <= 0) return;

    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, remaining]);

  // We use a ref to hold the latest onTimeUp to avoid unnecessary re-renders or effect re-triggers.
  const onTimeUpRef = React.useRef(onTimeUp);
  useEffect(() => {
    onTimeUpRef.current = onTimeUp;
  }, [onTimeUp]);

  useEffect(() => {
    if (remaining === 0) {
      onTimeUpRef.current();
    }
  }, [remaining]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isUrgent = remaining <= 60;
  const isWarning = remaining <= 300 && !isUrgent;

  const progressPercent = initialSeconds > 0
    ? ((initialSeconds - remaining) / initialSeconds) * 100
    : 100;

  return (
    <div className="test-timer" data-urgent={isUrgent} data-warning={isWarning}>
      {/* Circular progress ring */}
      <div className="test-timer__ring">
        <svg viewBox="0 0 48 48" className="test-timer__svg">
          <circle
            cx="24" cy="24" r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            opacity="0.12"
          />
          <circle
            cx="24" cy="24" r="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 20}`}
            strokeDashoffset={`${2 * Math.PI * 20 * (progressPercent / 100)}`}
            className="test-timer__progress"
          />
        </svg>
        <div className="test-timer__icon">
          {isUrgent ? "⚠️" : "⏱️"}
        </div>
      </div>

      <div className="test-timer__display">
        <span className="test-timer__digits">
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </span>
        <span className="test-timer__label">
          {isUrgent ? "Hurry!" : isWarning ? "5 min left" : "remaining"}
        </span>
      </div>

      <style jsx>{`
        .test-timer {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.625rem 1rem;
          border-radius: var(--radius-pill, 9999px);
          background: rgba(56, 193, 255, 0.08);
          border: 1px solid rgba(56, 193, 255, 0.15);
          transition: all 0.3s ease;
        }
        .test-timer[data-warning="true"] {
          background: rgba(245, 158, 11, 0.08);
          border-color: rgba(245, 158, 11, 0.2);
        }
        .test-timer[data-urgent="true"] {
          background: rgba(255, 61, 0, 0.08);
          border-color: rgba(255, 61, 0, 0.25);
          animation: pulse-urgent 1s ease-in-out infinite;
        }
        .test-timer__ring {
          position: relative;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
        }
        .test-timer__svg {
          width: 100%;
          height: 100%;
          transform: rotate(-90deg);
          color: #38c1ff;
        }
        .test-timer[data-warning="true"] .test-timer__svg { color: #f59e0b; }
        .test-timer[data-urgent="true"] .test-timer__svg { color: #ff3d00; }
        .test-timer__progress {
          transition: stroke-dashoffset 1s linear;
        }
        .test-timer__icon {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }
        .test-timer__display {
          display: flex;
          flex-direction: column;
        }
        .test-timer__digits {
          font-size: 1.25rem;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.05em;
          color: var(--text-strong, #111827);
        }
        .test-timer[data-urgent="true"] .test-timer__digits {
          color: #ff3d00;
        }
        .test-timer__label {
          font-size: 0.6875rem;
          color: var(--text-muted, #6b7280);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        @keyframes pulse-urgent {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}
