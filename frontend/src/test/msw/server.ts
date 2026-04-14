import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Vitest 用の MSW サーバー。
 * setup.ts から listen/close される。
 */
export const server = setupServer(...handlers);
