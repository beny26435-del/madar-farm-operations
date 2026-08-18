import Storage from "expo-sqlite/kv-store";

const prefix = "mineplus-cache:";

export async function setCache<T>(key: string, value: T) {
  await Storage.setItem(`${prefix}${key}`, JSON.stringify({ value, savedAt: Date.now() }));
}

export async function getCache<T>(key: string): Promise<T | null> {
  const raw = await Storage.getItem(`${prefix}${key}`);
  if (!raw) return null;
  try { return (JSON.parse(raw) as { value: T }).value; } catch { return null; }
}

export async function removeCache(key: string) {
  await Storage.removeItem(`${prefix}${key}`);
}
