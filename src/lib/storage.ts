import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME
const AWS_REGION = process.env.AWS_REGION
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY
const AWS_ENDPOINT = process.env.AWS_ENDPOINT
const AWS_PUBLIC_ENDPOINT = process.env.AWS_PUBLIC_ENDPOINT

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

      // Construct public URL for browser access
      if (AWS_PUBLIC_ENDPOINT) {
        // Use public endpoint for R2/MinIO (browser-accessible URL)
        return `${AWS_PUBLIC_ENDPOINT}/${fileName}`
      }

      if (AWS_ENDPOINT) {
        // Fallback: use API endpoint (may not work if internal)
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
