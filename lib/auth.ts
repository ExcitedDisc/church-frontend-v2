import Cookies from "js-cookie";

export function getAccessToken() {
    return Cookies.get("ex-access_token");
}

export function getRefreshToken() {
    return Cookies.get("ex-refresh_token");
}

export function setAccessToken(token: string) {
    // Try to parse JWT and set expiry to match 'exp' claim
    let options: Cookies.CookieAttributes = {
        secure: true,
        sameSite: "Strict"
    };
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp) {
            // exp is in seconds since epoch
            const expires = new Date(payload.exp * 1000);
            options.expires = expires;
        }
    } catch (e) {
        // If parsing fails, fallback to session cookie
    }
    Cookies.set("ex-access_token", token, options);
}

export function setRefreshToken(token: string) {
    Cookies.set("ex-refresh_token", token, { 
        expires: 14, 
        secure: true, 
        sameSite: "Strict" 
    });
}

export function setUUID(uuid: string) {
    Cookies.set("ex-user_uuid", uuid, { 
        secure: true, 
        sameSite: "Strict" 
    });
}

export function setEmail(email: string) {
    Cookies.set("ex-admin_email", email, { 
        secure: true, 
        sameSite: "Strict" 
    });
}

export function clearTokens() {
    Cookies.remove("ex-access_token");
    Cookies.remove("ex-refresh_token");
    Cookies.remove("ex-user_uuid");
    Cookies.remove("ex-admin_email");
}
