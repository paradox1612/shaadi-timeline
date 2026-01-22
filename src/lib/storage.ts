import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME
const AWS_REGION = process.env.AWS_REGION
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const AWS_ENDPOINT = process.env.AWS_ENDPOINT

const isS3Configured =
  S3_BUCKET_NAME && AWS_REGION && AWS_ACCESS_KEY_ID && AWS_SECRET_ACCESS_KEY

let s3Client: S3Client | null = null

if (isS3Configured) {
  s3Client = new S3Client({
    region: AWS_REGION,
    credentials: {
      accessKeyId: AWS_ACCESS_KEY_ID!,
      secretAccessKey: AWS_SECRET_ACCESS_KEY!,
    },
    endpoint: AWS_ENDPOINT,
    forcePathStyle: !!AWS_ENDPOINT, // Needed for MinIO
  })
}

export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  if (isS3Configured && s3Client) {
    try {
      const command = new PutObjectCommand({
        Bucket: S3_BUCKET_NAME,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
        // ACL: "public-read", // Optional: might need to be configured on bucket policy instead
      })

      await s3Client.send(command)

      // Construct URL
      if (AWS_ENDPOINT) {
        // For MinIO/Local S3
        // If running in Docker, AWS_ENDPOINT might be 'http://minio:9000', but browser needs localhost.
        // However, usually we return a relative path or a public URL.
        // For this local setup, we'll assume the endpoint is reachable (e.g. localhost:9000)
        // OR we can proxy it. For simplicity, let's return the endpoint URL.
        // Note: In a real docker-compose setup, browser access might need a different host than server access.
        // But let's use the provided endpoint variable or fallback to a relative path if needed?
        // Actually, if using MinIO locally, the image src needs to be reachable by the browser.
        // If AWS_ENDPOINT is internal docker (http://minio:9000), browser can't see it.
        // User should likely set a public URL var, but for now let's construct it assuming the ENDPOINT is public-facing if set.
        return `${AWS_ENDPOINT}/${S3_BUCKET_NAME}/${fileName}`
      }
      
      return `https://${S3_BUCKET_NAME}.s3.${AWS_REGION}.amazonaws.com/${fileName}`
    } catch (error) {
      console.error("Error uploading to S3:", error)
      throw new Error("Failed to upload file to storage")
    }
  } else {
    // Local storage fallback
    try {
      const uploadDir = path.join(process.cwd(), "public/uploads")
      
      // Ensure directory exists
      await mkdir(uploadDir, { recursive: true })
      
      const filePath = path.join(uploadDir, fileName)
      await writeFile(filePath, fileBuffer)

      return `/uploads/${fileName}`
    } catch (error) {
      console.error("Error saving to local storage:", error)
      throw new Error("Failed to save file locally")
    }
  }
}
