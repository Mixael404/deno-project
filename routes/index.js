import { pageController } from "../controllers/pageController.js";
import { serveStatic } from "../utils/serveStatic.js";

const routes = {
  "/": pageController.home,
  "/about": pageController.about,
};

export async function router(req) {
  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const url = new URL(req.url);

  const STATIC = ["/css/", "/js/", "/uploads/", "/fonts/"];
  if (STATIC.some(p => url.pathname.startsWith(p))) {
    return serveStatic(url.pathname);
  }

  const handler = routes[url.pathname];

  if (!handler) {
    return new Response("404 — Page Not Found", { status: 404 });
  }

  return await handler(req);
}
