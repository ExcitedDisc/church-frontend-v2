import { jwtDecode } from "jwt-decode";

export interface JWTPayload {
  exp: number; // expiration time in seconds
  [key: string]: any;
}

export function isTokenExpired(token: string, bufferSeconds = 30): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const now = Date.now() / 1000;
    // bufferSeconds: refresh slightly before expiry
    return decoded.exp < now + bufferSeconds;
  } catch (err) {
    return true; // invalid token considered expired
  }
}
