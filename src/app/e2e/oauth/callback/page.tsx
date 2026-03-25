export const dynamic = "force-dynamic";

export default async function OAuthE2ECallbackPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  const state = typeof params.state === "string" ? params.state : null;
  const error = typeof params.error === "string" ? params.error : null;

  return (
    <main className="page-main">
      <h1 className="text-title">OAuth E2E Callback</h1>
      <pre className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm">
        {JSON.stringify({ code, state, error }, null, 2)}
      </pre>
    </main>
  );
}
