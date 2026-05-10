export const LIVE_CLASS_ATTENDANCE_MINUTES = 30;
export const LIVE_CLASS_ATTENDANCE_MIN_SECONDS =
  LIVE_CLASS_ATTENDANCE_MINUTES * 60;

export function getLiveClassWatchTimeDeltaSeconds(
  joinedAt: Date,
  endedAt: Date,
) {
  return Math.max(
    0,
    Math.floor((endedAt.getTime() - joinedAt.getTime()) / 1000),
  );
}

export function qualifiesForLiveClassAttendance(watchTimeSecs: number) {
  return watchTimeSecs >= LIVE_CLASS_ATTENDANCE_MIN_SECONDS;
}

export function formatWatchTimeStat(seconds: number) {
  if (seconds <= 0) return "0 mins";

  if (seconds < 3600) {
    return `${Math.max(1, Math.round(seconds / 60))} mins`;
  }

  const hours = seconds / 3600;
  if (hours < 10) {
    return `${hours.toFixed(1)} hrs`;
  }

  return `${Math.round(hours)} hrs`;
}
