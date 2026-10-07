export function formatKes(value: number): string {
  return `KES ${Math.round(value).toLocaleString()}`;
}
