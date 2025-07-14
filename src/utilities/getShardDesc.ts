import desc from "../desc.json";

export function getShardDesc(key: string): { title: string; description: string; family: string; type: string } | null {
  const entry = (desc as Record<string, { title: string; description: string; family: string; type: string }>)[key];
  if (!entry) return null;
  return { title: entry.title, description: entry.description, family: entry.family, type: entry.type };
}
