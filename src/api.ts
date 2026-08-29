export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: options?.body instanceof FormData ? options.headers : { 'Content-Type': 'application/json', ...options?.headers },
  });
  const contentType = response.headers.get('content-type') ?? '';
  const body = contentType.includes('json') ? await response.json() : await response.text();
  if (!response.ok) throw new Error(typeof body === 'object' && body?.error ? body.error : `Request failed (${response.status})`);
  return body as T;
}

export const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const dateTime = (value: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
export const compactHash = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;

