import { getAccessToken, setAccessToken, getRefreshToken, clearTokens } from "./auth";
import { isTokenExpired } from "./jwt";
import { BACKEND_URL } from "./config";

let isRefreshing = false;
let subscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  subscribers.forEach((cb) => cb(token));
  subscribers = [];
}

export async function ensureAccessToken(): Promise<string> {
  let token = getAccessToken();

  if (!token || isTokenExpired(token!)) {
    if (isRefreshing) {
      return new Promise((resolve) => subscribers.push(resolve));
    }

    isRefreshing = true;

    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new Error("No refresh token available");

      const res = await fetch(`${BACKEND_URL}/api/auth/access_token`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${refreshToken}`,
        },
      });

      if (!res.ok) throw new Error("Failed to refresh token");

      const json = await res.json();
      token = json.data.access_token as string;
      console.log("Saving access token:", token); // Debug line
      setAccessToken(token);

      onRefreshed(token);
      return token;
    } catch (err) {
      clearTokens();
      throw err;
    } finally {
      isRefreshing = false;
    }
  }

  return token;
}

export async function refreshAccessToken(): Promise<string> {
  if (isRefreshing) {
    return new Promise((resolve) => {
      subscribers.push(resolve);
    });
  }

  isRefreshing = true;

  try {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new Error("No refresh token");

    const res = await fetch(`${BACKEND_URL}/api/auth/access_token`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${refreshToken}`,
      },
    });

    if (!res.ok) throw new Error("Refresh token invalid");

    const json = await res.json();
    const newAccessToken = json.data.access_token;

    setAccessToken(newAccessToken);
    onRefreshed(newAccessToken);

    return newAccessToken;
  } catch (err) {
    clearTokens();
    window.location.href = "/login";
    throw err;
  } finally {
    isRefreshing = false;
  }
}