import { ensureAccessToken, refreshAccessToken } from "./refreshtoken";
import { BACKEND_URL } from "./config";

// Generic request options
interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

// 1. Base request function (Handles JSON parsing & basic errors, NO Auth)
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BACKEND_URL}${path}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  // Handle errors
  if (!res.ok) {
    const text = await res.text();
    try {
      const jsonError = JSON.parse(text);
      const msg = jsonError.error?.message || jsonError.message || `Request failed: ${res.status}`;
      throw new Error(msg);
    } catch (e: any) {
      // If JSON parse fails, throw the text or a generic error
      // But preserve the original error message if it was already an Error
      if (e.message && e.message !== "Unexpected end of JSON input") {
        throw new Error(text || `Request failed: ${res.status}`);
      }
      throw new Error(text || `Request failed: ${res.status}`);
    }
  }

  // Handle empty responses (e.g. 204 No Content)
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

// 2. Authenticated HTTP function (Uses request + Token Management)
export async function http<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const accessToken = await ensureAccessToken();

  try {
    return await request<T>(path, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch (error: any) {
    // Handle 401 Unauthorized (Token Expiration)
    if (error.message.includes("401") || error.message === "Unauthorized") {
      try {
        // 1. Refresh the token
        const newToken = await refreshAccessToken();

        // 2. Retry the original request with the new token
        return await request<T>(path, {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${newToken}`,
          },
        });
      } catch (refreshError) {
        // If refresh fails, redirect to login is usually handled by the app state or router
        // But here we just throw to let the caller handle it (e.g. redirect to /login)
        window.location.href = "/login";
        throw new Error("Unauthorized");
      }
    }
    throw error;
  }
}