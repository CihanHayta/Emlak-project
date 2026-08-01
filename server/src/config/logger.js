// server/src/config/logger.js
import winston from "winston";
import { env } from "./env.js";

// Telefon (+90 5XX XXX XX XX gibi 10-11 haneli diziler), email ve
// "token"/"password"/"secret" geçen anahtar-değer çiftlerini log çıktısında
// maskeler — ham log satırına yanlışlıkla kişisel veri/gizli anahtar sızmasın.
const PHONE_PATTERN = /(\+?\d[\d\s-]{8,14}\d)/g;
const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
const SECRET_KEY_PATTERN = /("(?:token|password|secret|apiKey|accessToken|privateKey)"\s*:\s*")([^"]*)(")/gi;

function maskSensitive(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(SECRET_KEY_PATTERN, "$1***$3")
    .replace(EMAIL_PATTERN, (_match, name, domain) => `${name.slice(0, 2)}***@${domain}`)
    .replace(PHONE_PATTERN, (match) => `${match.slice(0, 3)}***${match.slice(-2)}`);
}

const maskFormat = winston.format((info) => {
  info.message = maskSensitive(info.message);
  if (info.stack) info.stack = maskSensitive(info.stack);
  return info;
});

export const logger = winston.createLogger({
  level: env.logLevel,
  format: winston.format.combine(
    maskFormat(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [new winston.transports.Console()],
});
