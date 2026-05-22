import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { env } from "@/env";

const ALGORITHM = "aes-256-gcm";

/**
 * Get encryption key from environment or generate a warning
 */
function getEncryptionKey(): Buffer {
  const key = env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    // In development, use a default key (NOT for production!)
    if (process.env.NODE_ENV === "development") {
      console.warn("ENCRYPTION_KEY not set, using development key");
      return Buffer.from("development-key-do-not-use-in-prod!!");
    }
    throw new Error("ENCRYPTION_KEY must be set and at least 32 characters");
  }
  return Buffer.from(key.slice(0, 32));
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