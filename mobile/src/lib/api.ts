import * as Network from "expo-network";
import { config } from "./config";
import { getCache, setCache } from "./cache";
import { supabase } from "./supabase";

type ApiOptions = RequestInit & { cacheKey?: string };

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("نشست ورود معتبر نیست.");
  const network = await Network.getNetworkStateAsync();
  if (options.method === undefined && options.cacheKey && !network.isInternetReachable) {
    const cached = await getCache<T>(options.cacheKey);
    if (cached) return cached;
  }
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...options.headers,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "انجام درخواست ممکن نشد.");
  if (options.cacheKey) await setCache(options.cacheKey, payload);
  return payload as T;
}
