export type BookingIndexRow = {
  id: string;
  status: string;
  created_at: string;
  slots: { start_at: string } | { start_at: string }[] | null;
};

function slotStart(row: BookingIndexRow) {
  const slots = Array.isArray(row.slots) ? row.slots[0] : row.slots;
  return slots?.start_at ?? null;
}

export function paginateBookingHistory(
  rows: BookingIndexRow[],
  now: string,
  requestedPage: number,
  pageSize: number,
) {
  const upcomingIds = rows
    .filter((row) => row.status === "CONFIRMED" && Boolean(slotStart(row)) && slotStart(row)! > now)
    .sort((first, second) => slotStart(first)!.localeCompare(slotStart(second)!))
    .map((row) => row.id);
  const upcomingIdSet = new Set(upcomingIds);
  const orderedHistoryIds = rows
    .filter((row) => !upcomingIdSet.has(row.id))
    .sort((first, second) => {
      const firstDate = slotStart(first) ?? first.created_at;
      const secondDate = slotStart(second) ?? second.created_at;
      return secondDate.localeCompare(firstDate);
    })
    .map((row) => row.id);
  const total = orderedHistoryIds.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const from = (page - 1) * pageSize;

  return {
    upcomingIds,
    orderedHistoryIds,
    historyIds: orderedHistoryIds.slice(from, from + pageSize),
    total,
    totalPages,
    page,
  };
}

export function selectHistoryPageRows<T extends { id: string }>(
  rows: T[],
  historyIds: string[],
) {
  const rowsById = new Map(rows.map((row) => [row.id, row]));

  return historyIds.flatMap((id) => {
    const row = rowsById.get(id);
    return row ? [row] : [];
  });
}
