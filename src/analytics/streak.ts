// Streak Computation — §4.12 of the implementation plan.

// Compute streak data from submission dates.
export function computeStreak(dates: string[]): {
  current: number;
  longest: number;
  lastActiveDate: string | null;
} {
  if (dates.length === 0) {
    return { current: 0, longest: 0, lastActiveDate: null };
  }

  // Deduplicate by calendar date and sort descending
  const uniqueDates = [
    ...new Set(
      dates
        .map((d) => {
          const date = new Date(d);
          return isNaN(date.getTime()) ? null : date.toISOString().split("T")[0];
        })
        .filter((d): d is string => d !== null)
    ),
  ].sort((a, b) => b.localeCompare(a)); // Most recent first

  if (uniqueDates.length === 0) {
    return { current: 0, longest: 0, lastActiveDate: null };
  }

  const lastActiveDate = uniqueDates[0];

  // Compute current streak (must include today or yesterday)
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let currentStreak = 0;

  if (uniqueDates[0] === today || uniqueDates[0] === yesterday) {
    currentStreak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diffDays = Math.round(
        (prevDate.getTime() - currDate.getTime()) / 86400000
      );
      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  // Compute longest streak
  let longestStreak = 1;
  let currentRun = 1;

  // Sort ascending for longest streak calculation
  const ascending = [...uniqueDates].sort((a, b) => a.localeCompare(b));

  for (let i = 1; i < ascending.length; i++) {
    const prevDate = new Date(ascending[i - 1]);
    const currDate = new Date(ascending[i]);
    const diffDays = Math.round(
      (currDate.getTime() - prevDate.getTime()) / 86400000
    );

    if (diffDays === 1) {
      currentRun++;
      longestStreak = Math.max(longestStreak, currentRun);
    } else {
      currentRun = 1;
    }
  }

  return {
    current: currentStreak,
    longest: longestStreak,
    lastActiveDate,
  };
}
