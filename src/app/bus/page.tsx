import { redirect } from "next/navigation";

/**
 * Legacy /bus route — redirects to the dashboard bus tab preserving
 * query parameters so that existing bookmarks and external links
 * continue to work.
 */
export default async function BusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const url = new URL("/?tab=bus", "http://placeholder");
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, value);
  }
  redirect(`/${url.search}`);
}
