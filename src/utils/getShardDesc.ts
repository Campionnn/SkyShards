import desc from "../../public/desc.json";

export function getShardDesc(key: string): { title: string; description: string } | null {
  const entry = (desc as Record<string, string[]>)[key];
  if (!entry || entry.length < 2) return null;
  return { title: entry[0], description: entry[1] };
}
