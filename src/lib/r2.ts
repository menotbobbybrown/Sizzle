import { env } from "@/env";

/**
 * Cloudflare R2 Storage Helper
 *
 * Provides presigned URLs for secure file uploads and downloads.
 * R2 is S3-compatible, so we use the AWS SDK with S3-compatible endpoints.
 */

export interface PresignedUrlOptions {
  key: string;
  expiresIn?: number; // seconds, default 3600 (1 hour)
  contentType?: string;
  action?: "upload" | "download"; // default "upload"
}

/**
 * Generate a presigned URL for R2 storage
 * 
 * For uploads (PUT): Used when creators upload product files
 * For downloads (GET): Used when delivering files to buyers
 */
export async function generatePresignedUrl(options: PresignedUrlOptions): Promise<string> {
  const { key, expiresIn = 3600, contentType, action = "upload" } = options;

  // TODO: Implement actual R2 presigned URL generation
  // For now, return a placeholder that can be replaced with real R2 integration
  
  if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY || !env.R2_BUCKET_NAME) {
    console.warn("R2 configuration missing - using placeholder URLs");
    return `${env.NEXT_PUBLIC_APP_URL}/api/storage/${encodeURIComponent(key)}?placeholder=true`;
  }

  // In production, use @aws-sdk/client-s3 with custom endpoint for R2:
  // const client = new S3Client({
  //   region: "auto",
  //   endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  //   credentials: {
  //     accessKeyId: env.R2_ACCESS_KEY_ID,
  //     secretAccessKey: env.R2_SECRET_ACCESS_KEY,
  //   },
  // });
  // const command = action === "upload" 
  //   ? new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key, ContentType: contentType })
  //   : new GetObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key });
  // const url = await getSignedUrl(client, command, { expiresIn });

  // Placeholder until R2 is configured
  const baseUrl = env.R2_PUBLIC_URL ?? `${env.NEXT_PUBLIC_APP_URL}/api/storage`;
  return `${baseUrl}/${encodeURIComponent(key)}?expires=${Date.now() + expiresIn * 1000}`;
}

/**
 * Generate a public URL for a stored file
 */
export function getPublicUrl(key: string): string {
  const baseUrl = env.R2_PUBLIC_URL ?? `${env.NEXT_PUBLIC_APP_URL}/api/storage`;
  return `${baseUrl}/${encodeURIComponent(key)}`;
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
 * Delete a file from R2
 */
export async function deleteFile(key: string): Promise<void> {
  // TODO: Implement R2 file deletion
  // const client = new S3Client({ ... });
  // await client.send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
  console.log(`Would delete file: ${key}`);
}

/**
 * Check if a file exists in R2
 */
export async function fileExists(key: string): Promise<boolean> {
  // TODO: Implement R2 file existence check
  // const client = new S3Client({ ... });
  // try {
  //   await client.send(new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: key }));
  //   return true;
  // } catch {
  //   return false;
  // }
  return false;
}

/**
 * Get file metadata from R2
 */
export async function getFileMetadata(key: string): Promise<{ size: number; contentType: string } | null> {
  // TODO: Implement R2 file metadata retrieval
  return null;
}

// Export types for use in other parts of the app
export type { S3Client } from "@aws-sdk/client-s3";