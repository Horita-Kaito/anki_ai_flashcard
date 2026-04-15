import { aiCandidateHandlers } from "./handlers/ai-candidate";
import { authHandlers } from "./handlers/auth";
import { cardHandlers } from "./handlers/card";
import { dashboardHandlers } from "./handlers/dashboard";
import { deckHandlers } from "./handlers/deck";
import { domainTemplateHandlers } from "./handlers/domain-template";
import { noteSeedHandlers } from "./handlers/note-seed";
import { reviewHandlers } from "./handlers/review";
import { userSettingHandlers } from "./handlers/user-setting";

/**
 * 全 feature のハンドラを集約。
 * feature が増えたら `./handlers/<feature>.ts` を追加し、ここで spread する。
 */
export const handlers = [
  ...authHandlers,
  ...deckHandlers,
  ...domainTemplateHandlers,
  ...noteSeedHandlers,
  ...cardHandlers,
  ...dashboardHandlers,
  ...userSettingHandlers,
  ...aiCandidateHandlers,
  ...reviewHandlers,
];
