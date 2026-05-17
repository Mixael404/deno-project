import { pageController }  from "../controllers/pageController.js";
import { authController }  from "../controllers/authController.js";
import { adminController } from "../controllers/adminController.js";
import { serveStatic }     from "../utils/serveStatic.js";

const STATIC_PREFIXES = ["/css/", "/js/", "/uploads/", "/fonts/"];

const GET_ROUTES = {
  "/":        pageController.home,
  "/about":   pageController.about,
  "/profile": pageController.profile,
  "/admin":   pageController.admin,
};

const GET_API_ROUTES = {
  "/api/admin/users": adminController.getUsers,
};

const POST_ROUTES = {
  "/api/auth/register": authController.register,
  "/api/auth/login":    authController.login,
  "/api/auth/refresh":  authController.refresh,
  "/api/auth/logout":   authController.logout,
};

export async function router(req) {
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
      return serveStatic(url.pathname);
    }
    const apiHandler = GET_API_ROUTES[url.pathname];
    if (apiHandler) return apiHandler(req);

    const handler = GET_ROUTES[url.pathname];
    return handler
      ? handler(req)
      : new Response("404 — Page Not Found", { status: 404 });
  }

  if (req.method === "POST") {
    const handler = POST_ROUTES[url.pathname];
    return handler
      ? handler(req)
      : Response.json({ error: "Not Found" }, { status: 404 });
  }

  return new Response("Method Not Allowed", { status: 405 });
}
