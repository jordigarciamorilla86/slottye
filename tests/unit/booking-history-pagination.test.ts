import { describe, expect, it } from "vitest";

import {
  paginateBookingHistory,
  selectHistoryPageRows,
  type BookingIndexRow,
} from "@/app/account/bookings/historyPagination";

const now = "2026-08-24T12:00:00.000Z";

function row(id: string, status: string, start: string): BookingIndexRow {
  return { id, status, created_at: start, slots: [{ start_at: start }] };
}

describe("paginateBookingHistory", () => {
  it("excluye próximas confirmadas antes de paginar y llena cada página", () => {
    const rows = [
      row("future", "CONFIRMED", "2026-08-25T12:00:00.000Z"),
      ...Array.from({ length: 7 }, (_, index) =>
        row(`history-${index}`, "COMPLETED", `2026-08-${String(20 - index).padStart(2, "0")}T12:00:00.000Z`)),
    ];

    const first = paginateBookingHistory(rows, now, 1, 6);
    const second = paginateBookingHistory(rows, now, 2, 6);

    expect(first.upcomingIds).toEqual(["future"]);
    expect(first.historyIds).toHaveLength(6);
    expect(second.historyIds).toEqual(["history-6"]);
    expect(first.total).toBe(7);
  });

  it("ajusta una página fuera de rango a la última página con datos", () => {
    const rows = Array.from({ length: 7 }, (_, index) =>
      row(`history-${index}`, "CANCELLED_BY_USER", `2026-08-${String(20 - index).padStart(2, "0")}T12:00:00.000Z`));

    const result = paginateBookingHistory(rows, now, 99, 6);

    expect(result.page).toBe(2);
    expect(result.totalPages).toBe(2);
    expect(result.historyIds).toEqual(["history-6"]);
  });
  it("materializa 19 resultados en paginas densas de 6, 6, 6 y 1", () => {
    const rows = Array.from({ length: 19 }, (_, index) =>
      row(`history-${index}`, "COMPLETED", `2026-08-${String(20 - index).padStart(2, "0")}T12:00:00.000Z`));

    const pageLengths = [1, 2, 3, 4].map((page) => {
      const pagination = paginateBookingHistory(rows, now, page, 6);
      return selectHistoryPageRows(rows, pagination.historyIds).length;
    });

    expect(pageLengths).toEqual([6, 6, 6, 1]);
  });
});
