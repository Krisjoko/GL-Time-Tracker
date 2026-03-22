/**
 * Format an hour/minute pair into HH:MM string (UK time display).
 */
export const formatTime = (hour, minute) => {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};

/**
 * Format a duration in seconds into "Xh YYm" string.
 */
export const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '0h 00m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
};
