export function formatSecondsLabel(valueMs: number | null | undefined): string {
  if (valueMs === null || valueMs === undefined || Number.isNaN(valueMs)) {
    return "0";
  }
  return (valueMs / 1000).toFixed(2);
}
