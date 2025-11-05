import { config } from "dotenv";
import path from "path";

const envPath = process.env.DOTENV_CONFIG_PATH || ".env";
config({ path: path.resolve(process.cwd(), envPath) });

import fs from "fs";
import { fileURLToPath } from "url";

import { appType } from "../const";
import { AppTypes } from "../types/types";
import { TIME_LIMIT_MINUTES } from "./index";
import { pluralizeMinutesGenitive } from "./pluralizeMinutes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envType = process.env.TYPE || "";
const rulesPath = path.resolve(__dirname, `../rules.${envType}.txt`);
const baseText = fs.readFileSync(rulesPath, "utf8").trim();

const dynamicSection =
  appType === AppTypes.gryzuka
    ? `
⚠️⚠️⚠️
<b>Внимание!</b>
Вы должны написать приветственную анкету (имя, пол, возраст, город, фото или мем 18+) в течение ${pluralizeMinutesGenitive(TIME_LIMIT_MINUTES)} после вступления, иначе будете забанены. 
⚠️⚠️⚠️

<b>Нажав кнопку ниже, вы подтверждаете, что ознакомились и согласны с правилами группы.</b>
`
    : "";

export function getRulesText(): string {
  return `${baseText}\n\n${dynamicSection}`.trim();
}
