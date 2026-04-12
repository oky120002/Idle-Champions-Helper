export function findSeatConflicts(seats: number[]): number[] {
  const counter = new Map<number, number>()

  seats.forEach((seat) => {
    counter.set(seat, (counter.get(seat) ?? 0) + 1)
  })

  return Array.from(counter.entries())
    .filter(([, count]) => count > 1)
    .map(([seat]) => seat)
    .sort((left, right) => left - right)
}
