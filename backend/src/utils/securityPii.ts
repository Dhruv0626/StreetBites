import crypto from "crypto";

/**
 * Enterprise PII Protection & Bank Account Security Utilities
 * 
 * Provides:
 * 1. Visual Masking: Prevents shoulder-surfing and client-side PII leakage (••••••••1234)
 * 2. Field-Level Encryption: AES-256-GCM authenticated encryption for sensitive bank data at rest
 * 3. 100% Backward Compatibility: Gracefully handles existing plaintext test/dummy data
 */

// Derive a 32-byte (256-bit) encryption key from environment secret
const getEncryptionKey = (): Buffer => {
  const secret =
    process.env.PII_ENCRYPTION_KEY ||
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_SECRET ||
    "streetbites_secure_pii_vault_key_2026_x89!";
  return crypto.createHash("sha256").update(secret).digest();
};

/**
 * Visually masks a bank account number, preserving only the last 4 digits.
 * e.g., "123456789012" -> "••••••••9012"
 */
export const maskBankAccount = (accountNo?: string | null): string | null => {
  if (!accountNo || typeof accountNo !== "string") return null;

  const trimmed = accountNo.trim();
  if (!trimmed) return null;

  // If already masked, return as-is
  if (trimmed.includes("•")) return trimmed;

  // If encrypted, decrypt first before masking
  const plain = decryptPii(trimmed) || trimmed;

  if (plain.length <= 4) {
    return "••••";
  }

  const last4 = plain.slice(-4);
  const maskedPrefix = "•".repeat(Math.max(4, plain.length - 4));
  return `${maskedPrefix}${last4}`;
};

/**
 * Visually masks a UPI ID for privacy.
 * e.g., "rider@okhdfc" -> "r•••r@okhdfc"
 */
export const maskUpiId = (upiId?: string | null): string | null => {
  if (!upiId || typeof upiId !== "string") return null;

  const trimmed = upiId.trim();
  if (!trimmed || !trimmed.includes("@")) return trimmed;

  const [username, handle] = trimmed.split("@");
  if (username.length <= 2) {
    return `••@${handle}`;
  }

  const firstChar = username[0];
  const lastChar = username[username.length - 1];
  return `${firstChar}•••${lastChar}@${handle}`;
};

/**
 * Encrypts a sensitive string using AES-256-GCM.
 * Formats output as: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export const encryptPii = (plaintext?: string | null): string | null => {
  if (!plaintext || typeof plaintext !== "string") return null;

  const trimmed = plaintext.trim();
  if (!trimmed) return null;

  // Do not re-encrypt already encrypted data
  if (trimmed.startsWith("enc:v1:")) return trimmed;

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(trimmed, "utf8", "hex");
    encrypted += cipher.final("hex");

    const authTag = cipher.getAuthTag().toString("hex");

    return `enc:v1:${iv.toString("hex")}:${authTag}:${encrypted}`;
  } catch (err) {
    console.error("PII Encryption Error:", err);
    return trimmed; // Fail safe to original value if encryption error occurs
  }
};

/**
 * Decrypts a sensitive string encrypted with AES-256-GCM.
 * BACKWARD COMPATIBLE: If value is not encrypted (e.g. existing dummy test data),
 * it returns the original value directly without error.
 */
export const decryptPii = (ciphertext?: string | null): string | null => {
  if (!ciphertext || typeof ciphertext !== "string") return null;

  const trimmed = ciphertext.trim();
  if (!trimmed) return null;

  // Backward Compatibility: If not encrypted with our tag, return plaintext as-is
  if (!trimmed.startsWith("enc:v1:")) {
    return trimmed;
  }

  try {
    const parts = trimmed.split(":");
    if (parts.length !== 5) {
      return trimmed;
    }

    const iv = Buffer.from(parts[2], "hex");
    const authTag = Buffer.from(parts[3], "hex");
    const encryptedText = parts[4];

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (err) {
    console.warn("PII Decryption Warning (returning fallback):", err);
    return trimmed;
  }
};

