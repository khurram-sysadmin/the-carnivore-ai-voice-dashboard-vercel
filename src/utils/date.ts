/**
 * Formats a date string in a timezone-safe manner to prevent browser parsing shifts or "Invalid Date" outputs.
 */
export function formatReservationDate(dateStr: string | undefined | null): string {
  if (!dateStr) return 'N/A';
  
  // Clean up date string if it has prefix / quotes / whitespace
  const trimmed = dateStr.trim();
  
  // Match standard YYYY-MM-DD
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed month
    const day = parseInt(parts[2], 10);
    
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    }
  }

  // Fallback to parsing as standard Date
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) {
    return 'Invalid Date';
  }
  
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
