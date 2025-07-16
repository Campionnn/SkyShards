import { DataService } from "../services";

/**
 * Checks if a shard name is valid (case-insensitive, trims whitespace).
 * Returns true if the name matches a known shard.
 */
export async function isValidShardName(name: string): Promise<boolean> {
  if (!name || typeof name !== "string") return false;
  const map = await DataService.getInstance().getShardNameToKeyMap();
  return !!map[name.trim().toLowerCase()];
}
