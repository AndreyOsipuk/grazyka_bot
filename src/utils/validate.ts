import { ADMIN_GROUP_ID, BOT_TOKEN, GROUP_ID } from "./index";

export const validate = () => {
  if (!ADMIN_GROUP_ID) throw new Error("ADMIN_GROUP_ID is required in .env");
  if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required in .env");
  if (!GROUP_ID) throw new Error("GROUP_ID is required in .env");
};
