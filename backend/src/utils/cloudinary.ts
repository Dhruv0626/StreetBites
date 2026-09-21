import crypto from "crypto";

export interface DocumentValidationOptions {
  /** Optional human-readable label for the document (e.g. 'Aadhaar Card', 'Stall Photo') */
  label?: string;
  /** Maximum allowed file size in bytes (defaults to 500KB = 512,000 bytes) */
  maxSizeBytes?: number;
  /** Allowed image extensions (defaults to ['JPG', 'JPEG', 'PNG']) */
  allowedExtensions?: string[];
}

export class DocumentValidationError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "DocumentValidationError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, DocumentValidationError.prototype);
  }
}

const MAX_DOCUMENT_SIZE_BYTES = 500 * 1024; // 500 KB (512,000 bytes)
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/pjpeg",
  "image/png",
];

/**
 * Validates document format (.JPG, .JPEG, .PNG) and file size (up to 500KB).
 * Throws a descriptive DocumentValidationError specifying the user's exact mistake.
 */
export const validateDocumentFile = (
  fileData: string,
  options?: DocumentValidationOptions
): { mimeType: string; sizeBytes: number; extension: string } => {
  const maxBytes = options?.maxSizeBytes ?? MAX_DOCUMENT_SIZE_BYTES;
  const allowedExts = (options?.allowedExtensions || ["JPG", "JPEG", "PNG"]).map((e) =>
    e.toUpperCase()
  );
  const labelPrefix = options?.label ? `${options.label}: ` : "";

  if (!fileData || typeof fileData !== "string" || fileData.trim() === "") {
    throw new DocumentValidationError(
      `${labelPrefix}No file data provided. Please select a valid document or image to upload.`,
      400
    );
  }

  // If already a hosted URL (e.g. existing Cloudinary or remote image), bypass binary check
  if (fileData.startsWith("http://") || fileData.startsWith("https://")) {
    return { mimeType: "image/jpeg", sizeBytes: 0, extension: "JPG" };
  }

  let declaredMime: string | null = null;
  let base64Payload = fileData;

  const dataUriMatch = fileData.match(/^data:([a-zA-Z0-9\/+.-]+);base64,(.+)$/s);
  if (dataUriMatch) {
    declaredMime = dataUriMatch[1].toLowerCase().trim();
    base64Payload = dataUriMatch[2].trim();
  }

  // Decode buffer to inspect size and magic bytes
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64Payload, "base64");
  } catch {
    throw new DocumentValidationError(
      `${labelPrefix}Invalid file encoding. Please upload a valid image.`,
      400
    );
  }

  if (buffer.length === 0) {
    throw new DocumentValidationError(
      `${labelPrefix}The uploaded file is empty. Please select a valid file.`,
      400
    );
  }

  const sizeInBytes = buffer.length;
  const sizeInKB = (sizeInBytes / 1024).toFixed(1);
  const maxLimitLabel = maxBytes >= 1024 * 1024 ? `${(maxBytes / (1024 * 1024)).toFixed(0)}MB` : `${Math.round(maxBytes / 1024)}KB`;

  // 1. Enforce Maximum File Size
  if (sizeInBytes > maxBytes) {
    throw new DocumentValidationError(
      `${labelPrefix}File size (${sizeInKB} KB) exceeds the maximum allowed limit of ${maxLimitLabel}. Please compress or select an image under ${maxLimitLabel}.`,
      400
    );
  }

  // 2. Identify File Type via Magic Bytes
  let detectedFormat = "UNKNOWN";
  let detectedExt = "";

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedFormat = "JPEG";
    detectedExt = "JPG";
  } else if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    detectedFormat = "PNG";
    detectedExt = "PNG";
  } else if (
    buffer.length >= 4 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    detectedFormat = "PDF";
    detectedExt = "PDF";
  } else if (
    buffer.length >= 3 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46
  ) {
    detectedFormat = "GIF";
    detectedExt = "GIF";
  } else if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    detectedFormat = "WEBP";
    detectedExt = "WEBP";
  }

  const isExtAllowed =
    allowedExts.includes(detectedExt) ||
    (detectedExt === "JPG" && allowedExts.includes("JPEG")) ||
    (detectedExt === "JPEG" && allowedExts.includes("JPG"));

  if (!isExtAllowed) {
    throw new DocumentValidationError(
      `${labelPrefix}Format ${detectedFormat} is not allowed. Allowed formats: ${allowedExts.join(", ")}.`,
      400
    );
  }

  return {
    mimeType:
      declaredMime ||
      (detectedExt === "PNG"
        ? "image/png"
        : detectedExt === "WEBP"
        ? "image/webp"
        : "image/jpeg"),
    sizeBytes: sizeInBytes,
    extension: detectedExt || "JPG",
  };
};

/**
 * Uploads a file (base64 data URL, image buffer, or remote URL) directly to Cloudinary
 * after validating the file against document rules (.JPG, .JPEG, .PNG up to 500KB).
 * Returns the secure HTTPS URL of the uploaded asset.
 */
export const uploadToCloudinary = async (
  fileData: string,
  folder: string = "streetbites/documents",
  options?: DocumentValidationOptions
): Promise<string> => {
  // 1. Validate file format and size
  validateDocumentFile(fileData, options);

  // If already a hosted URL (e.g. Cloudinary or external URL), return it directly
  if (fileData.startsWith("http://") || fileData.startsWith("https://")) {
    return fileData;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "";
  const apiKey = process.env.CLOUDINARY_API_KEY || "";
  const apiSecret = process.env.CLOUDINARY_API_SECRET || "";

  const timestamp = Math.round(new Date().getTime() / 1000);
  const signatureString = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureString).digest("hex");

  const formData = new URLSearchParams();
  formData.append("file", fileData);
  formData.append("api_key", apiKey);
  formData.append("timestamp", timestamp.toString());
  formData.append("folder", folder);
  formData.append("signature", signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data: any = await res.json();
  if (!res.ok) {
    console.error("Cloudinary upload error response:", data);
    const labelPrefix = options?.label ? `${options.label}: ` : "";
    throw new Error(`${labelPrefix}${data.error?.message || "Failed to upload document to Cloudinary"}`);
  }

  return data.secure_url;
};

export default uploadToCloudinary;
