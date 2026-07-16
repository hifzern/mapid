export class BackendError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function callRpc<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new BackendError(503, "Supabase belum dikonfigurasi untuk ruang kerja ini.");
  }

  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new BackendError(
      response.status === 400 ? 422 : response.status,
      result.message || "Analisis spasial gagal dijalankan.",
    );
  }
  return result as T;
}
