import { randomBytes, createHash } from "crypto";

/**
 * Token generation and hashing for fulfillment links.
 *
 * We hash tokens in DB and return raw tokens via email.
 * The raw token is never stored — only its SHA-256 hash.
 */

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateNumericCode(length: number = 6): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += (bytes[i]! % 10).toString();
  }
  return code;
}

export type TokenConfig = {
  /** Max number of times the token can be used */
  maxUses?: number;
  /** Hours until expiration */
  expiresInHours?: number;
};

export const DEFAULT_TOKEN_CONFIG: Required<TokenConfig> = {
  maxUses: 1,
  expiresInHours: 168, // 7 days
};