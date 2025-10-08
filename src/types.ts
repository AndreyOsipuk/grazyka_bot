export type UserRequest = {
  username?: string;
  first_name?: string;
  last_name?: string;
  agreed?: boolean;
  approved?: boolean;
  join_time?: Date | null;
  request_count?: number;
  extra_answer?: string | null;
  status?: "pending" | "approved" | "rejected";
  adminMsg?: { chatId: number; messageId: number; text: string };
};
