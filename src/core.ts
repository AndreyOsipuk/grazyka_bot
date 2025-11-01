import type { UserRequest } from "./types";

export const welcomeMsgs = new Map<
  number,
  { chatId: number; messageId: number }
>();
export const userRequests = new Map<number, UserRequest>();
export const userJoinTimes = new Map<number, Date>();
export const userFirstMessages = new Map<number, boolean>();
export const userInviteLinks = new Map<
  number,
  { link: string; created_at: Date; used: boolean; used_at?: Date }
>();
export const silenceTimers = new Map<number, ReturnType<typeof setTimeout>>();
