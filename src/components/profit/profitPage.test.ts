import { describe, expect, it } from "vitest";
import { DEFAULT_PROFIT_SETTINGS, parseProfitSettings } from "./profitSettings";
import { filterRows, formatHours, sortRows } from "./tableState";
import type { ColumnDef, TableConfig } from "./types";

describe("parseProfitSettings", () => {
  it("uses the defaults when nothing is stored", () => {
    expect(parseProfitSettings(null)).toEqual(DEFAULT_PROFIT_SETTINGS);
  });

  it("keeps valid fields and replaces invalid ones with their default", () => {
    const parsed = parseProfitSettings({
      buyMode: "order",
      sellMode: "bogus",
      taxPercent: 1,
      marketSharePercent: 500,
      minVolume: -3,
      maxSpreadPercent: 40,
      useOverrides: "yes",
      activeTab: "removed-tab",
      hiddenColumns: ["flips:spread", 4, null],
    });
    expect(parsed).toEqual({
      ...DEFAULT_PROFIT_SETTINGS,
      buyMode: "order",
      taxPercent: 1,
      maxSpreadPercent: 40,
      hiddenColumns: ["flips:spread"],
    });
  });
});

type Row = { id: string; volume: number; profit: number; spread: number };

const config = (overrides: Partial<TableConfig<Row>> = {}): TableConfig<Row> =>
  ({
    id: "flips",
    shardIdsOf: (row: Row) => [row.id],
    profitOf: (row: Row) => row.profit,
    spreadOf: (row: Row) => row.spread,
    ...overrides,
  }) as TableConfig<Row>;

const rows: Row[] = [
  { id: "a", volume: 100, profit: 10, spread: 0.5 },
  { id: "b", volume: 5, profit: 20, spread: 0.2 },
  { id: "c", volume: 100, profit: -1, spread: 0.1 },
  { id: "d", volume: 100, profit: 30, spread: 3 },
];
const names = new Map(rows.map((row) => [row.id, `shard ${row.id}`]));
const filters = { query: "", lowerNames: names, onlyProfitable: false, minVolume: 0, maxSpreadPercent: 0 };
const ids = (list: Row[]) => list.map((row) => row.id);

describe("filterRows", () => {
  it("shows everything with no filters", () => {
    expect(ids(filterRows(rows, config(), filters))).toEqual(["a", "b", "c", "d"]);
  });

  it("applies each filter", () => {
    expect(ids(filterRows(rows, config(), { ...filters, onlyProfitable: true }))).toEqual(["a", "b", "d"]);
    expect(ids(filterRows(rows, config(), { ...filters, minVolume: 10 }))).toEqual(["a", "c", "d"]);
    expect(ids(filterRows(rows, config(), { ...filters, maxSpreadPercent: 100 }))).toEqual(["a", "b", "c"]);
    expect(ids(filterRows(rows, config(), { ...filters, query: "shard b" }))).toEqual(["b"]);
  });

  it("skips the filters a tab doesn't have", () => {
    const plain = config({ profitOf: undefined, spreadOf: undefined, ignoreMinVolume: true });
    expect(ids(filterRows(rows, plain, { ...filters, onlyProfitable: true, minVolume: 10, maxSpreadPercent: 100 }))).toEqual(["a", "b", "c", "d"]);
  });
});

describe("sortRows", () => {
  const columns: ColumnDef<Row>[] = [
    { id: "profit", label: "", sortValue: (row) => row.profit, render: () => null },
    { id: "name", label: "", sortValue: (row) => row.id, render: () => null },
  ];

  it("sorts numbers and names in both directions", () => {
    expect(ids(sortRows(rows, { column: "profit", direction: "desc" }, columns))).toEqual(["d", "b", "a", "c"]);
    expect(ids(sortRows(rows, { column: "name", direction: "asc" }, columns))).toEqual(["a", "b", "c", "d"]);
  });

  it("leaves the order alone for a column it can't sort", () => {
    expect(ids(sortRows(rows, { column: "missing", direction: "desc" }, columns))).toEqual(["a", "b", "c", "d"]);
  });
});

describe("formatHours", () => {
  it("shows the most readable unit", () => {
    expect(formatHours(0)).toBe("instant");
    expect(formatHours(0.001)).toBe("<1m");
    expect(formatHours(0.5)).toBe("30m");
    expect(formatHours(5)).toBe("5.0h");
    expect(formatHours(72)).toBe("3d");
    expect(formatHours(Infinity)).toBe("–");
  });
});
