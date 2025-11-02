"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GROUP_ID = exports.ADMIN_GROUP_ID = exports.BOT_TOKEN = exports.TIME_LIMIT_MINUTES = exports.ADMIN_USERNAMES = exports.isAdmin = exports.ADMIN_IDS = void 0;
exports.escapeHtml = escapeHtml;
exports.ADMIN_IDS = (process.env.ADMIN_IDS || "")
    .split(/[\s,]+/)
    .map(function (v) { return Number(v); })
    .filter(function (n) { return Number.isFinite(n); });
var isAdmin = function (userId) { return exports.ADMIN_IDS.includes(Number(userId)); };
exports.isAdmin = isAdmin;
exports.ADMIN_USERNAMES = ((_a = process.env.ADMIN_USERNAMES) === null || _a === void 0 ? void 0 : _a.split(",").map(function (username) { return username.trim(); }).filter(Boolean)) || [];
function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}
exports.TIME_LIMIT_MINUTES = Number(process.env.TIME_LIMIT_MINUTES || 10);
exports.BOT_TOKEN = process.env.BOT_TOKEN;
exports.ADMIN_GROUP_ID = Number(process.env.ADMIN_GROUP_ID);
exports.GROUP_ID = Number(process.env.GROUP_ID);
