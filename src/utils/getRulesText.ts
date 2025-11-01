import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import { TIME_LIMIT_MINUTES } from "./index";
import { pluralizeMinutesGenitive } from "./pluralizeMinutes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rulesPath = path.resolve(__dirname, "../rules.txt");
const baseText = fs.readFileSync(rulesPath, "utf8").trim();

const dynamicSection = `
⚠️⚠️⚠️
<b>Внимание!</b>
Вы должны написать приветственную анкету (имя, пол, возраст, город, фото или мем 18+) в течение ${pluralizeMinutesGenitive(TIME_LIMIT_MINUTES)} после вступления, иначе будете забанены. 
⚠️⚠️⚠️

<b>Нажав кнопку ниже, вы подтверждаете, что ознакомились и согласны с правилами группы.</b>
`;

export function getRulesText(): string {
  return `${baseText}\n\n${dynamicSection}`.trim();
}
