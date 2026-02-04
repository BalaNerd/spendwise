const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

async function getAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return {};
  try {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      return { Authorization: `Bearer ${session.access_token}` };
    }
  } catch {
    // ignore
  }
  return {};
}

export async function fetchApi(path: string, options?: RequestInit) {
  const auth = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...auth,
      ...(options?.headers as Record<string, string>),
    },
    ...options,
  });

  if (!res.ok) {
    const errBody = await res.json().catch(() => ({}));
    throw new Error((errBody as { error?: string; message?: string }).message || (errBody as { error?: string }).error || 'API error');
  }

  const contentType = res.headers.get('content-type');
  if (contentType?.includes('application/json')) return res.json();
  return res;
}

const api = {
  async get<T>(path: string): Promise<T> {
    return fetchApi(path, { method: 'GET' }) as Promise<T>;
  },
  async post(path: string, body?: unknown): Promise<unknown> {
    return fetchApi(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
  },
  async patch(path: string, body?: unknown): Promise<unknown> {
    return fetchApi(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined });
  },
  async put(path: string, body?: unknown): Promise<unknown> {
    return fetchApi(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined });
  },
  async delete(path: string): Promise<unknown> {
    return fetchApi(path, { method: 'DELETE' });
  },
};

export { api };
