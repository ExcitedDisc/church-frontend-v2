import { jwtDecode } from "jwt-decode";

export interface JWTPayload {
  exp: number; // expiration time in seconds
  [key: string]: any;
}

export function isTokenExpired(token: string, bufferSeconds = 0): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const now = Date.now() / 1000;
    // bufferSeconds: default 0 for exact check
    return decoded.exp < now + bufferSeconds;
  } catch (err) {
    return true; // invalid token considered expired
  }
}
