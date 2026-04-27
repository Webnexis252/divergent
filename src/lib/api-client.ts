/**
 * Typed API client for the Divergent Classes LMS frontend.
 *
 * Wraps the native fetch API with:
 * - Standard response envelope parsing ({ success, data, error })
 * - Consistent error propagation as typed ApiError instances
 * - Convenience methods: get, post, put, patch, delete
 *
 * @example
 * const stats = await apiClient.get<DashboardStats>('/api/users/me/stats');
 * const course = await apiClient.post<Course>('/api/courses', { title: 'New Course' });
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type ApiSuccessEnvelope<T> = {
  success: true;
  data: T;
  message?: string;
};

type ApiErrorEnvelope = {
  success: false;
  error: string;
  details?: unknown;
};

type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope;

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const envelope: ApiEnvelope<T> = await response.json();

  if (!response.ok || !envelope.success) {
    const message = envelope.success === false
      ? envelope.error
      : `Request failed with status ${response.status}`;
    const details = !envelope.success ? envelope.details : undefined;
    throw new ApiError(response.status, message, details);
  }

  return envelope.data;
}

/**
 * Multipart form data request (for file uploads).
 * Does not set Content-Type (browser sets it with boundary automatically).
 */
async function requestFormData<T>(
  path: string,
  body: FormData,
  method = 'POST',
): Promise<T> {
  const response = await fetch(path, { method, body });
  const envelope: ApiEnvelope<T> = await response.json();

  if (!response.ok || !envelope.success) {
    const message = envelope.success === false
      ? envelope.error
      : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }

  return envelope.data;
}

export const apiClient = {
  get<T>(path: string, init?: RequestInit): Promise<T> {
    return request<T>(path, { ...init, method: 'GET' });
  },

  post<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...init,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  put<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...init,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  patch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
    return request<T>(path, {
      ...init,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  },

  delete<T>(path: string, init?: RequestInit): Promise<T> {
    return request<T>(path, { ...init, method: 'DELETE' });
  },

  upload<T>(path: string, formData: FormData, method = 'POST'): Promise<T> {
    return requestFormData<T>(path, formData, method);
  },
};
