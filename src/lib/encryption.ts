import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { env } from "@/env";

const ALGORITHM = "aes-256-gcm";

/**
 * Derive the 32-byte AES-256 key.
 *
 * We SHA-256 the configured secret so the key is always exactly 32 bytes
 * regardless of the secret's length or character encoding (naively slicing the
 * string could yield the wrong byte length and break the cipher).
 */
function getEncryptionKey(): Buffer {
  const key = env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    // Outside production, fall back to an insecure, clearly-labeled dev key so
    // local flows work without configuration. Never reached in production.
    if (process.env.NODE_ENV !== "production") {
      console.warn("ENCRYPTION_KEY not set; using an insecure development key");
      return createHash("sha256")
        .update("development-key-do-not-use-in-prod")
        .digest();
    }
    throw new Error("ENCRYPTION_KEY must be set and at least 32 characters");
  }
  return createHash("sha256").update(key).digest();
}

/**
 * Encrypt a string using AES-256-GCM
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  const authTag = cipher.getAuthTag();
  
  // Format: iv:authTag:encryptedData
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt a string encrypted with AES-256-GCM
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(":");
  
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted text format");
  }
  
  const iv = Buffer.from(parts[0], "hex");
  const authTag = Buffer.from(parts[1], "hex");
  const encrypted = parts[2];
  
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}

/**
 * Encrypt OAuth tokens for storage
 */
export function encryptToken(token: string): string {
  return encrypt(token);
}

/**
 * Decrypt OAuth tokens from storage
 */
export function decryptToken(encryptedToken: string): string {
  return decrypt(encryptedToken);
}