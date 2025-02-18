export function roundToNearestHour(date: Date): Date {
  const roundedDate = new Date(date);
  roundedDate.setMinutes(0);
  roundedDate.setSeconds(0);
  roundedDate.setMilliseconds(0);
  return roundedDate;
}

export function formatTimeWithDots(date: Date): string {
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes();

  if (minutes === 0) {
    return `${hours}:00`;
  } else if (minutes === 15) {
    return `${hours}:·`;
  } else if (minutes === 30) {
    return `${hours}:··`;
  } else if (minutes === 45) {
    return `${hours}:···`;
  }

  return `${hours}:${minutes.toString().padStart(2, "0")}`;
}
