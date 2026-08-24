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
  const isOffline = network.isConnected === false || network.isInternetReachable === false;
  if (options.method === undefined && options.cacheKey && isOffline) {
    const cached = await getCache<T>(options.cacheKey);
    if (cached) return cached;
  }
  let response: Response;
  try {
    response = await fetch(`${config.apiUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...options.headers,
      },
    });
  } catch (reason) {
    if (options.method === undefined && options.cacheKey) {
      const cached = await getCache<T>(options.cacheKey);
      if (cached) return cached;
    }
    throw reason;
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.message ?? "انجام درخواست ممکن نشد.");
  if (options.cacheKey) await setCache(options.cacheKey, payload);
  return payload as T;
}
