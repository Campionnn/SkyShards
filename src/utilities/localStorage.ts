import { calculationSchema, type CalculationFormData } from "../schemas";

/**
 * One persisted value. Every slot needs the same three things — a key, a way in and
 * out of a string, and something to return when the entry is missing or unreadable —
 * and the same `try/catch`, because `localStorage` throws on quota exhaustion and in
 * private-mode Safari, and `JSON.parse` throws on anything hand-edited.
 *
 * Slots stay declared at module scope so the key strings have exactly one definition.
 */
interface SlotConfig<T> {
  /** Human-readable name for the console warning when access fails. */
  label: string;
  fallback: () => T;
  /** Defaults to `JSON.stringify`. */
  serialize?: (value: T) => string;
  /** Defaults to `JSON.parse`. Only called with a non-null raw string. */
  deserialize?: (raw: string) => T;
}

interface StorageSlot<T> {
  read: () => T;
  write: (value: T) => void;
  clear: () => void;
  /** True when nothing has ever been written — distinct from "holds a default". */
  isUnset: () => boolean;
}

const createStorageSlot = <T>(key: string, { label, fallback, serialize = JSON.stringify, deserialize = JSON.parse }: SlotConfig<T>): StorageSlot<T> => ({
  read: () => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback() : deserialize(raw);
    } catch (error) {
      console.warn(`Failed to load ${label} from localStorage:`, error);
      return fallback();
    }
  },

  write: (value: T) => {
    try {
      localStorage.setItem(key, serialize(value));
    } catch (error) {
      console.warn(`Failed to save ${label} to localStorage:`, error);
    }
  },

  clear: () => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to clear ${label} from localStorage:`, error);
    }
  },

  isUnset: () => {
    try {
      return localStorage.getItem(key) === null;
    } catch {
      return true;
    }
  },
});

const isPlainObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * `Map<string, number>` <-> plain object, for the two count-keyed slots.
 *
 * Entries that don't parse to a finite number are dropped rather than stored as
 * `NaN` — `Number("")` is 0 and `Number("abc")` is `NaN`, and a `NaN` count
 * propagates silently through every cost calculation downstream.
 */
const countMapSlot = (key: string, label: string): StorageSlot<Map<string, number>> =>
  createStorageSlot(key, {
    label,
    fallback: () => new Map(),
    serialize: (map) => JSON.stringify(Object.fromEntries(map)),
    deserialize: (raw) => {
      const parsed: unknown = JSON.parse(raw);
      if (!isPlainObject(parsed)) return new Map();
      const entries: [string, number][] = [];
      for (const [shardId, count] of Object.entries(parsed)) {
        const amount = Number(count);
        if (Number.isFinite(amount)) entries.push([shardId, amount]);
      }
      return new Map(entries);
    },
  });

// ─── Form data ───

const EXCLUDED_FIELDS = ["shard", "quantity"] as const;

/** The target shard and its quantity are per-session, not settings — don't persist them. */
const filterFormDataForSave = (data: CalculationFormData): Partial<CalculationFormData> => {
  const result: Partial<CalculationFormData> = {};

  for (const [key, value] of Object.entries(data)) {
    if (!EXCLUDED_FIELDS.includes(key as (typeof EXCLUDED_FIELDS)[number])) {
      (result as Record<string, unknown>)[key] = value;
    }
  }

  return result;
};

/**
 * Validate a saved form field-by-field rather than all-or-nothing.
 *
 * The consumer spreads this over the defaults (`{...defaultForm, ...savedData}`), so a
 * dropped field simply falls back to its default. That makes per-field validation the
 * natural fit: one corrupted entry costs you one setting, not every setting.
 *
 * A whole-object `calculationSchema.parse` will not work here: `filterFormDataForSave`
 * strips `shard` and `quantity`, both of which the schema requires.
 */
const formFields = calculationSchema.shape;

const sanitizeFormData = (raw: unknown): Partial<CalculationFormData> | null => {
  if (!isPlainObject(raw)) return null;

  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const field = formFields[key as keyof typeof formFields];
    // Unknown keys are dropped: they're either from an older build or hand-added.
    if (!field) continue;
    const result = field.safeParse(value);
    if (result.success) clean[key] = result.data;
  }
  return clean as Partial<CalculationFormData>;
};

const formDataSlot = createStorageSlot<CalculationFormData | null>("calculator_data", {
  label: "form data",
  fallback: () => null,
  serialize: (data) => JSON.stringify(data === null ? null : filterFormDataForSave(data)),
  deserialize: (raw) => sanitizeFormData(JSON.parse(raw)) as CalculationFormData | null,
});

export const saveFormData = (data: CalculationFormData): void => formDataSlot.write(data);
export const loadFormData = (): CalculationFormData | null => formDataSlot.read();
export const clearFormData = (): void => formDataSlot.clear();

// ─── Auto-save toggle ───

/** Stored as a bare "true"/"false", not JSON, and defaults to enabled when absent. */
const saveEnabledSlot = createStorageSlot<boolean>("calculator_save_enabled", {
  label: "save enabled state",
  fallback: () => true,
  serialize: (enabled) => (enabled ? "true" : "false"),
  deserialize: (raw) => raw === "true",
});

export const getSaveEnabled = (): boolean => saveEnabledSlot.read();
export const setSaveEnabled = (enabled: boolean): void => saveEnabledSlot.write(enabled);

/** Nothing has written the auto-save preference yet, so this is a brand-new visitor. */
export const isFirstVisit = (): boolean => saveEnabledSlot.isUnset();

// ─── Inventory and attributes ───

const inventorySlot = countMapSlot("inventory", "inventory");
const ownedAttributesSlot = countMapSlot("owned_attributes", "owned attributes");

export const saveInventory = (inventory: Map<string, number>): void => inventorySlot.write(inventory);
export const loadInventory = (): Map<string, number> => inventorySlot.read();

export const saveOwnedAttributes = (attributes: Map<string, number>): void => ownedAttributesSlot.write(attributes);
export const loadOwnedAttributes = (): Map<string, number> => ownedAttributesSlot.read();

// ─── Hypixel profile metadata ───

export interface HypixelProfileMeta {
  username: string;
  profileName: string;
  lastImportTime: number;
}

const profileMetaSlot = createStorageSlot<HypixelProfileMeta | null>("hypixel_profile_meta", {
  label: "Hypixel profile meta",
  fallback: () => null,
  deserialize: (raw) => {
    const parsed: unknown = JSON.parse(raw);
    if (!isPlainObject(parsed)) return null;
    const { username, profileName, lastImportTime } = parsed;
    // All three are rendered directly in the inventory modal's header; a partial
    // record would show "undefined" and an Invalid Date.
    if (typeof username !== "string" || typeof profileName !== "string" || typeof lastImportTime !== "number" || !Number.isFinite(lastImportTime)) {
      return null;
    }
    return { username, profileName, lastImportTime };
  },
});

export const saveHypixelProfileMeta = (meta: HypixelProfileMeta): void => profileMetaSlot.write(meta);
export const loadHypixelProfileMeta = (): HypixelProfileMeta | null => profileMetaSlot.read();
export const clearHypixelProfileMeta = (): void => profileMetaSlot.clear();

// ─── Disabled shards ───

const disabledShardsSlot = createStorageSlot<Set<string>>("inventory_disabled_shards", {
  label: "disabled shards",
  fallback: () => new Set(),
  serialize: (disabled) => JSON.stringify([...disabled]),
  deserialize: (raw) => {
    const parsed: unknown = JSON.parse(raw);
    // Non-strings would silently never match a shard id, which looks like the
    // disable simply not working.
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : []);
  },
});

export const saveDisabledShards = (disabled: Set<string>): void => disabledShardsSlot.write(disabled);
export const loadDisabledShards = (): Set<string> => disabledShardsSlot.read();
export const clearDisabledShards = (): void => disabledShardsSlot.clear();
