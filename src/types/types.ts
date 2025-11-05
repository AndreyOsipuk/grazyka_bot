import type { Context, NarrowedContext } from "telegraf";
import type { CallbackQuery, Message, Update } from "telegraf/types";

export type UserRequest = {
  username?: string;
  first_name?: string;
  last_name?: string;
  agreed?: boolean;
  approved?: boolean;
  join_time?: Date | null;
  request_count?: number;
  extra_answer?: string | null;
  status?: "pending" | "approved" | "rejected" | "created";
  adminMsg?: { chatId: number; messageId: number; text: string };
};

// любое сообщение
export type MessageContext = NarrowedContext<
  Context<Update>,
  Update.MessageUpdate<Message.TextMessage>
>;

// новые участники
export type NewMembersContext = NarrowedContext<
  Context<Update>,
  Update.MessageUpdate<Message.NewChatMembersMessage>
>;

// колбэки
export type CallbackContext = NarrowedContext<
  Context<Update>,
  Update.CallbackQueryUpdate
>;

export type ActionContext = NarrowedContext<
  Context<Update>,
  Update.CallbackQueryUpdate<CallbackQuery>
> & {
  match: RegExpExecArray;
};

export type CommandContext = NarrowedContext<
  Context<Update>,
  Update.MessageUpdate<Message.TextMessage>
>;

export enum AppTypes {
  gryzuka = "gryzuka",
  alco = "alco",
}
