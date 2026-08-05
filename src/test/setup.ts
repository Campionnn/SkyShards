import { readFileSync } from "node:fs";
import { PUBLIC_DIR } from "./fixtures";

/**
 * `CalculationService.parseData` fetches `${BASE_URL}fusion-data.json`, which is a
 * root-relative URL. Node's fetch only accepts absolute URLs, so serve those two
 * files off disk instead. This keeps the tests on the real load path (parseData ->
 * buildData) rather than reaching past it.
 *
 * Anything other than the two known data files is a mistake in a test, so throw
 * rather than silently returning an empty body.
 */
const SERVABLE = new Set(["fusion-data.json", "rates.json"]);

globalThis.fetch = (async (input: RequestInfo | URL) => {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  const name = url.split("/").pop() ?? "";

  if (!SERVABLE.has(name)) {
    throw new Error(`Unexpected fetch in tests: ${url}`);
  }

  return new Response(readFileSync(PUBLIC_DIR + name, "utf8"), {
    headers: { "content-type": "application/json" },
  });
}) as typeof fetch;
