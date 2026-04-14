import { authHandlers } from "./handlers/auth";
import { deckHandlers } from "./handlers/deck";
import { domainTemplateHandlers } from "./handlers/domain-template";
import { noteSeedHandlers } from "./handlers/note-seed";

/**
 * 全 feature のハンドラを集約。
 * feature が増えたら `./handlers/<feature>.ts` を追加し、ここで spread する。
 */
export const handlers = [
  ...authHandlers,
  ...deckHandlers,
  ...domainTemplateHandlers,
  ...noteSeedHandlers,
];
