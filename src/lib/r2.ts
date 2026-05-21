import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand, 
  DeleteObjectCommand, 
  HeadObjectCommand 
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "@/env";

const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Generate a presigned URL for R2 storage uploads
 */
export async function generateUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ContentType: contentType,
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Upload a buffer directly to R2
 */
export async function uploadBufferToR2(key: string, buffer: Buffer, contentType: string): Promise<string> {
  await s3Client.send(new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }));
  return getPublicUrl(key);
}

/**
 * Generate a presigned URL for R2 storage downloads
 * Uses short expiry and Content-Disposition attachment filename.
 */
export async function generateDownloadUrl(key: string, filename?: string, expiresIn = 300): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
    ResponseContentDisposition: filename ? `attachment; filename="${filename}"` : "attachment",
  });
  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Delete a file from R2
 */
export async function deleteFile(key: string): Promise<void> {
  await s3Client.send(new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: key,
  }));
}

/**
 * Check if a file exists in R2
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3Client.send(new HeadObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get file metadata from R2
 */
export async function getFileMetadata(key: string): Promise<{ size: number; contentType: string } | null> {
  try {
    const response = await s3Client.send(new HeadObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    }));
    return {
      size: response.ContentLength ?? 0,
      contentType: response.ContentType ?? "application/octet-stream",
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate a unique key for a file upload
 */
export function generateFileKey(workspaceId: string, productId: string, filename: string): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `workspaces/${workspaceId}/products/${productId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Generate a public URL for a stored file
 */
export function getPublicUrl(key: string): string {
  return `${env.R2_PUBLIC_URL}/${key}`;
}

// Keep generatePresignedUrl for backward compatibility if needed, but implementation updated
export interface PresignedUrlOptions {
  key: string;
  expiresIn?: number;
  contentType?: string;
  action?: "upload" | "download";
}

export async function generatePresignedUrl(options: PresignedUrlOptions): Promise<string> {
  const { key, expiresIn, contentType, action = "upload" } = options;
  if (action === "upload") {
    return generateUploadUrl(key, contentType ?? "application/octet-stream", expiresIn);
  } else {
    return generateDownloadUrl(key, undefined, expiresIn);
  }
}
