/**
 * Time-of-day context detection for work recommendation.
 *
 * Categorizes current time into work modes (deep/admin/meeting/after-hours)
 * to help match work items to appropriate cognitive resources.
 */

import { getHours, isWeekend, getDay } from 'date-fns';

/**
 * Work mode categories based on time of day and cognitive load patterns.
 */
export type WorkMode = 'deep' | 'admin' | 'meeting' | 'after-hours';

/**
 * Time context with mode, reasoning, and suggested duration.
 */
export interface TimeContext {
  mode: WorkMode;
  reasoning: string;
  suggestedDuration: string;
}

/**
 * Get time-of-day context for current time.
 *
 * Categorizes time into work modes based on cognitive load research:
 * - Early morning (8-11am): Peak focus hours for deep work
 * - Late morning to early afternoon (11am-2pm): Common meeting hours
 * - Afternoon (2-5pm): Lower cognitive load, good for admin tasks
 * - After 6pm or weekends: After-hours
 *
 * @param now - Current date/time (defaults to new Date())
 * @returns Time context with mode, reasoning, and suggested duration
 */
export function getTimeContext(now: Date = new Date()): TimeContext {
  // Weekend or after-hours
  if (isWeekend(now) || getHours(now) < 8 || getHours(now) >= 18) {
    return {
      mode: 'after-hours',
      reasoning: 'Outside normal work hours',
      suggestedDuration: 'flexible',
    };
  }

  const hour = getHours(now);

  // Deep work: Early morning (8-11am) - peak cognitive hours
  if (hour >= 8 && hour < 11) {
    return {
      mode: 'deep',
      reasoning: 'Peak focus hours (8-11am) - best for complex work',
      suggestedDuration: '2-3 hours',
    };
  }

  // Meeting time: Late morning to early afternoon (11am-2pm)
  if (hour >= 11 && hour < 14) {
    return {
      mode: 'meeting',
      reasoning: 'Common meeting hours - good for collaboration',
      suggestedDuration: '30-60 minutes',
    };
  }

  // Admin time: Afternoon (2-5pm) - lower cognitive load
  if (hour >= 14 && hour < 17) {
    return {
      mode: 'admin',
      reasoning: 'Afternoon hours - good for admin tasks and quick wins',
      suggestedDuration: '30 minutes',
    };
  }

  // Late afternoon (5-6pm) - wrap-up
  return {
    mode: 'admin',
    reasoning: 'End of day - good for quick admin tasks',
    suggestedDuration: '30 minutes',
  };
}
