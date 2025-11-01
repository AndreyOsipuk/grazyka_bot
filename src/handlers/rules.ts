import type { Context } from "telegraf";

import { getRulesText } from "../utils/getRulesText";

const rulesText = getRulesText();

export const rules = async (ctx: Context) => {
  await ctx.reply(rulesText, { parse_mode: "HTML" });
};
