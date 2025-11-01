import type { MessageContext } from "../types";
import { isAdmin } from "../utils";

export const chatId = (ctx: MessageContext) => {
  if (isAdmin(ctx.from.id)) {
    console.log("chat id", ctx.chat.id);
  }
};
