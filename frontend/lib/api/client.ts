// lib/api/client.ts
const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://10.10.207.123:4999";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

async function request<T>(
  path: string,
  method: HttpMethod,
  body?: unknown,
  extraHeaders?: Record<string, string>
): Promise<T> {
  const fullUrl = `${BASE_URL}${path}`;
  console.log(`API Call: ${method} ${fullUrl}`);
  if (body) {
    console.log('Request Body:', body);
  }
  
  const res = await fetch(fullUrl, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(extraHeaders ?? {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`API Error: ${res.status} ${fullUrl}`, text);
    throw new Error(`HTTP ${res.status} ${path}: ${text}`);
  }

  const data = await res.json();
  console.log(`API Response: ${method} ${fullUrl}`, data);
  return data as Promise<T>;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>, headers?: Record<string, string>) => {
    let url = path;
    if (params) {
      const searchParams = new URLSearchParams(params);
      url += `?${searchParams.toString()}`;
    }
    return request<T>(url, "GET", undefined, headers);
  },

  post: <T>(path: string, body: unknown, headers?: Record<string, string>) =>
    request<T>(path, "POST", body, headers),
};
