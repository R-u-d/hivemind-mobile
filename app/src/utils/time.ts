// Round a time up to the next interval boundary, e.g. 10:13 → 10:15 at step 5.
// Epoch-aligned, so boundaries land on clock marks (:00, :05, …). All real-world
// UTC offsets are whole multiples of 5 minutes, so local marks always align.
export function roundUpToInterval(date: Date, interval: number): Date {
  const ms = interval * 60 * 1000;
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}
