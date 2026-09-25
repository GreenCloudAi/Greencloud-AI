import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Derives a consistent 32-byte (256-bit) encryption key from the environment secret
 * or a system-level master salt.
 */
function getMasterKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET || "greencloud-ai-master-encryption-key-salt-2026";
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a sensitive credential (like AWS Secret Access Key or session token)
 * using AES-256-GCM with authenticated tags.
 * Output format: "iv:authTag:encryptedCiphertext" (Hex encoded)
 */
export function encryptCredential(plaintext: string): string {
  if (!plaintext) return "";
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted credential back into plaintext in-memory only.
 * Returns null if decryption or authentication tag fails.
 */
export function decryptCredential(encryptedPayload: string): string | null {
  if (!encryptedPayload || !encryptedPayload.includes(":")) return null;

  try {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, encryptedHex] = parts;
    const key = getMasterKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.error("Failed to decrypt credential:", err);
    return null;
  }
}
