import type { Message } from "telegraf/typings/core/types/typegram";

export function messageHasPhoto(msg: Message) {
  const hasPhoto =
    "photo" in msg && Array.isArray(msg.photo) && msg.photo.length > 0;

  const isImageDocument =
    "document" in msg && !!msg.document?.mime_type?.startsWith("image/");

  return hasPhoto || isImageDocument;
}
