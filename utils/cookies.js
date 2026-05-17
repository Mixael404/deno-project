const ACCESS_MAX_AGE  = 15 * 60;
const REFRESH_MAX_AGE = 30 * 24 * 3600;

export function getCookie(req, name) {
  const header = req.headers.get("Cookie") ?? "";
  const match  = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function cookieHeader(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

export function setAuthCookies(headers, accessToken, refreshToken) {
  headers.append("Set-Cookie", cookieHeader("access_token",  accessToken,  ACCESS_MAX_AGE));
  headers.append("Set-Cookie", cookieHeader("refresh_token", refreshToken, REFRESH_MAX_AGE));
}

export function clearAuthCookies(headers) {
  headers.append("Set-Cookie", cookieHeader("access_token",  "", 0));
  headers.append("Set-Cookie", cookieHeader("refresh_token", "", 0));
}
