import { pageController } from "../controllers/pageController.js";
import { authController } from "../controllers/authController.js";
import { adminController } from "../controllers/adminController.js";
import { publicController } from "../controllers/publicController.js";
import { subscriptionController } from "../controllers/subscriptionController.js";
import { contactController } from "../controllers/contactController.js";
import { serveStatic } from "../utils/serveStatic.js";

const STATIC_PREFIXES = ["/css/", "/js/", "/uploads/", "/fonts/"];

const GET_ROUTES = {
  "/": pageController.home,
  "/about": pageController.about,
  "/profile": pageController.profile,
  "/admin": pageController.admin,
};

const GET_API_ROUTES = {
  "/api/programmes": publicController.listProgrammes,
  "/api/subscriptions": subscriptionController.list,
  "/api/admin/users": adminController.getUsers,
  "/api/admin/staff": adminController.listStaff,
  "/api/admin/modules": adminController.listModules,
  "/api/admin/programmes": adminController.listProgrammes,
};

const POST_ROUTES = {
  "/api/auth/register": authController.register,
  "/api/auth/login": authController.login,
  "/api/auth/refresh": authController.refresh,
  "/api/auth/logout": authController.logout,
  "/api/subscriptions": subscriptionController.subscribe,
  "/api/contact": contactController.submit,
  "/api/admin/upload": adminController.uploadImage,
  "/api/admin/staff": adminController.createStaff,
  "/api/admin/modules": adminController.createModule,
  "/api/admin/programmes": adminController.createProgramme,
};

const STAFF_ID_RE = /^\/api\/admin\/staff\/(\d+)$/;
const MODULE_ID_RE = /^\/api\/admin\/modules\/(\d+)$/;
const PROGRAMME_ID_RE = /^\/api\/admin\/programmes\/(\d+)$/;
const PROG_SUBS_EXPORT_RE = /^\/api\/admin\/programmes\/(\d+)\/subscribers\/export$/;
const PROG_SUBS_RE = /^\/api\/admin\/programmes\/(\d+)\/subscribers$/;
const PROG_ENQUIRIES_RE = /^\/api\/admin\/programmes\/(\d+)\/enquiries$/;
const PROG_SUB_USER_RE = /^\/api\/admin\/programmes\/(\d+)\/subscribers\/(\d+)$/;
const ENQUIRY_ID_RE = /^\/api\/admin\/enquiries\/(\d+)$/;
const SUBSCRIPTION_ID_RE = /^\/api\/subscriptions\/(\d+)$/;

export async function router(req) {
  const url = new URL(req.url);

  if (req.method === "GET") {
    if (STATIC_PREFIXES.some((p) => url.pathname.startsWith(p))) {
      return serveStatic(url.pathname);
    }
    let m;
    if ((m = url.pathname.match(PROG_SUBS_EXPORT_RE))) return adminController.exportProgrammeSubscribers(req, +m[1]);
    if ((m = url.pathname.match(PROG_SUBS_RE))) return adminController.listProgrammeSubscribers(req, +m[1]);
    if ((m = url.pathname.match(PROG_ENQUIRIES_RE))) return adminController.listEnquiries(req, +m[1]);

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

  if (req.method === "PUT") {
    let m;
    if ((m = url.pathname.match(STAFF_ID_RE))) return adminController.updateStaff(req, +m[1]);
    if ((m = url.pathname.match(MODULE_ID_RE))) return adminController.updateModule(req, +m[1]);
    if ((m = url.pathname.match(PROGRAMME_ID_RE))) return adminController.updateProgramme(req, +m[1]);
    return Response.json({ error: "Not Found" }, { status: 404 });
  }

  if (req.method === "DELETE") {
    let m;
    if ((m = url.pathname.match(PROG_SUB_USER_RE))) return adminController.removeSubscriber(req, +m[1], +m[2]);
    if ((m = url.pathname.match(ENQUIRY_ID_RE))) return adminController.removeEnquiry(req, +m[1]);
    if ((m = url.pathname.match(SUBSCRIPTION_ID_RE))) return subscriptionController.unsubscribe(req, +m[1]);
    if ((m = url.pathname.match(STAFF_ID_RE))) return adminController.deleteStaff(req, +m[1]);
    if ((m = url.pathname.match(MODULE_ID_RE))) return adminController.deleteModule(req, +m[1]);
    if ((m = url.pathname.match(PROGRAMME_ID_RE))) return adminController.deleteProgramme(req, +m[1]);
    return Response.json({ error: "Not Found" }, { status: 404 });
  }

  return new Response("Method Not Allowed", { status: 405 });
}
