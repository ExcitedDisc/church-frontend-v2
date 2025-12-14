import { ensureAccessToken, refreshAccessToken } from "./refreshtoken"; // Adjust import if your auth logic is in 'refreshtoken.ts'
import { BACKEND_URL } from "./config";

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>;
}

// Custom Error to carry status codes
export class HttpError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

// 1. Base Request (Handles Fetching & JSON Parsing)
export async function request<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;

  let res: Response;

  try {
    res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });
  } catch (error: any) {
    // CATCH NETWORK ERRORS HERE (e.g., Server Down, CORS, DNS issues)
    // "Failed to fetch" is the standard TypeError message for connection failure
    console.error("Network request failed:", error);
    
    // Throw a custom HttpError with status 0 to signal a total connection failure
    throw new HttpError("Network Error: Unable to reach server.", 0);
  }

  // Handle HTTP Errors (Non-2xx responses)
  if (!res.ok) {
    const text = await res.text();
    let msg = `Request failed: ${res.status}`;

    try {
      const jsonError = JSON.parse(text);
      // Try to find the error message in common API patterns
      msg = jsonError.error?.message || jsonError.message || msg;
    } catch (e) {
      // If JSON parse fails, use raw text if it exists
      if (text) msg = text;
    }

    throw new HttpError(msg, res.status);
  }

  // Handle 204 No Content
  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

// 2. Authenticated HTTP Wrapper
export async function http<T>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  // Ensure we have a token before starting
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
    // Handle HttpErrors (Status Codes)
    if (error instanceof HttpError) {
      
      // --- CRITICAL SERVER ERRORS ---
      // Status 0   = Network Error (Fetch failed entirely)
      // Status 502 = Bad Gateway
      // Status 503 = Service Unavailable
      // Status 504 = Gateway Timeout
      if (
        error.status === 0 || 
        error.status === 502 || 
        error.status === 503 || 
        error.status === 504
      ) {
        // Redirect to Server Error Page
        if (typeof window !== "undefined") {
          window.location.href = "/server-error";
        }
        // Stop execution by re-throwing (components will catch this but the redirect happens fast)
        throw error;
      }

      // --- HANDLE 401 (Token Expired) ---
      if (error.status === 401 || error.message === "Unauthorized") {
        try {
          const newToken = await refreshAccessToken();
          
          // Retry Request
          return await request<T>(path, {
            ...options,
            headers: {
              ...options.headers,
              Authorization: `Bearer ${newToken}`,
            },
          });
        } catch (refreshError) {
          // If refresh fails, redirect to login
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          throw new Error("Session expired");
        }
      }
    }

    // Rethrow any other errors (400, 403, 404, 500) to be handled by the UI (Toasts/Alerts)
    throw error;
  }
}