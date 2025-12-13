export function getAccessToken() {
    return localStorage.getItem("ex-access_token");
}

export function getRefreshToken() {
    return localStorage.getItem("ex-refresh_token");
}

export function setAccessToken(token: string) {
    localStorage.setItem("ex-access_token", token);
}

export function setRefreshToken(token: string) {
    localStorage.setItem("ex-refresh_token", token);
}

export function setUUID(uuid: string) {
    localStorage.setItem("ex-user_uuid", uuid);
}

export function getUUID() {
    return localStorage.getItem("ex-user_uuid");
}

export function setEmail(email: string) {
    localStorage.setItem("ex-admin_email", email);
}
export function getEmail() {
    return localStorage.getItem("ex-admin_email");
}

export function clearTokens() {
    localStorage.removeItem("ex-access_token");
    localStorage.removeItem("ex-refresh_token");
    localStorage.removeItem("ex-user_uuid");
    localStorage.removeItem("ex-admin_email");
}
