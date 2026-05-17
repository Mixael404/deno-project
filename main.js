import "./db/migrate.js";
import { router } from "./routes/index.js";

Deno.serve({ port: 8000 }, router);
