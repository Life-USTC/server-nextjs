import { logAppEvent } from "@/lib/log/app-logger";

export const LIFE_USTC_STATIC_ORIGIN = "https://static.life-ustc.tiankaima.dev";

export function getLifeUstcStaticUrl(pathname: string) {
  const normalizedPath = pathname.replace(/^\/+/, "");
  return `${LIFE_USTC_STATIC_ORIGIN}/${normalizedPath}`;
}

async function fetchStatic(pathname: string) {
  const url = getLifeUstcStaticUrl(pathname);
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Static asset request failed: ${response.status} ${url}`);
  }
  return response;
}

export async function fetchLifeUstcStaticJson<T>(
  pathname: string,
  fallback: T,
): Promise<T> {
  try {
    const response = await fetchStatic(pathname);
    return (await response.json()) as T;
  } catch (error) {
    logAppEvent(
      "warn",
      "Failed to load Life@USTC static JSON",
      { source: "life-ustc-static", pathname },
      error,
    );
    return fallback;
  }
}

export async function fetchRequiredLifeUstcStaticJson<T>(
  pathname: string,
): Promise<T> {
  const response = await fetchStatic(pathname);
  return (await response.json()) as T;
}
