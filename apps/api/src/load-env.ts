import { config as loadEnv } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Must be imported before any module that reads process.env at init time. */
const dir = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(dir, "../../../.env") });
loadEnv({ path: path.resolve(dir, "../../.env") });
