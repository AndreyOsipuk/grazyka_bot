export function clearSilenceTimer(
  userId: number,
  silenceTimers: Map<number, NodeJS.Timeout>,
) {
  const t = silenceTimers.get(userId);
  if (t) {
    clearTimeout(t);
    silenceTimers.delete(userId);
  }
}
