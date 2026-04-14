import { authHandlers } from "./handlers/auth";

/**
 * 全 feature のハンドラを集約。
 * feature が増えたら `./handlers/<feature>.ts` を追加し、ここで spread する。
 */
export const handlers = [...authHandlers];
