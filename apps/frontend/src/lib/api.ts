import { treaty } from "@elysiajs/eden";
import type { App } from "@backend/server";

export const eden = treaty<App>("http://localhost:3001");
