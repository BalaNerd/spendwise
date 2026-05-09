const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api').replace(/\/+$/, '');

function buildApiUrl(path: string) {
  // Support callers passing either "users/me" or "/users/me"
  const clean = String(path || '').replace(/^\/+/, '');
  return clean ? `${API_BASE}/${clean}` : API_BASE;
}

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
  const fullUrl = buildApiUrl(path);

  try {
    const auth = await getAuthHeaders();

    const res = await fetch(fullUrl, {
      headers: {
        'Content-Type': 'application/json',
        ...auth,
        ...(options?.headers as Record<string, string>),
      },
      ...options,
    });

    if (!res.ok) {
      let errBody;
      try {
        errBody = await res.json();
      } catch {
        errBody = {};
      }
      const errorMessage = 
        (errBody as { error?: string; message?: string }).message || 
        (errBody as { error?: string }).error || 
        `API Error: ${res.status} ${res.statusText}`;
      throw new Error(errorMessage);
    }

    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      try {
        return await res.json();
      } catch (error) {
        throw new Error('Invalid JSON response from server');
      }
    }
    return res;
  } catch (error) {
    // Provide specific troubleshooting based on error type
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      const isLocal = fullUrl.includes('localhost');
      throw new Error(
        `Network connection failed. ${
          isLocal 
            ? 'Please ensure your local backend is running on port 4000.' 
            : 'The server could not be reached. Please check your internet connection or try again later.'
        }`
      );
    }
    
    throw error instanceof Error ? error : new Error('An unexpected network error occurred');
  }
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
