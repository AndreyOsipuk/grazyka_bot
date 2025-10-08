import type { Message } from "telegraf/typings/core/types/typegram";

export function messageHasPhoto(msg: Message) {
  const hasPhoto =
    "photo" in msg && Array.isArray(msg.photo) && msg.photo.length > 0;
  const isImageDoc =
    "document" in msg && !!msg.document?.mime_type?.startsWith("image/");
  const isAnimation = "animation" in msg && !!msg.animation; // GIF/MP4
  const isVideo = "video" in msg && !!msg.video; // видео-мем
  return hasPhoto || isImageDoc || isAnimation || isVideo;
}
