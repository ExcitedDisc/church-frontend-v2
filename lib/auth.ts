import Cookies from "js-cookie";

export function getAccessToken() {
    return Cookies.get("ex-access_token");
}

export function getRefreshToken() {
    return Cookies.get("ex-refresh_token");
}

export function setAccessToken(token: string) {
    // Access token generally has short life, but we'll let it session-cookie or match JWT exp if we parsed it. 
    // For now, simpler to just set it. 
    // The user didn't explicitly ask for access token cookie expiry, just "check the jwt for exact time".
    // Usually access token is short lived. We can leave it as session cookie or set a default.
    // Let's set it as session for now, or maybe 1 hour if not specified.
    // Given the prompt "access token check the jwt for exact time that it will become invalid", 
    // that refers to VALIDATION.
    Cookies.set("ex-access_token", token);
}

export function setRefreshToken(token: string) {
    // "refresh token is only valid for 14 days"
    Cookies.set("ex-refresh_token", token, { expires: 14 });
}

export function setUUID(uuid: string) {
    Cookies.set("ex-user_uuid", uuid);
}

export function getUUID() {
    return Cookies.get("ex-user_uuid");
}

export function setEmail(email: string) {
    Cookies.set("ex-admin_email", email);
}
export function getEmail() {
    return Cookies.get("ex-admin_email");
}

export function clearTokens() {
    Cookies.remove("ex-access_token");
    Cookies.remove("ex-refresh_token");
    Cookies.remove("ex-user_uuid");
    Cookies.remove("ex-admin_email");
}
