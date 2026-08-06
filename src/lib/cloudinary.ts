import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  url: string;
  publicId: string;
  format: string;
  bytes: number;
}

/**
 * Upload a PDF file to Cloudinary
 */
export async function uploadPdf(
  buffer: Buffer,
  paperCode: string
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'soe-dqps/papers',
        public_id: `paper_${paperCode}_${Date.now()}`,
        resource_type: 'raw', // For PDF files
        type: 'private', // Private access, requires signed URLs
        format: 'pdf',
        access_mode: 'authenticated',
      },
      (error, result?: UploadApiResponse) => {
        if (error) {
          reject(new Error(`Cloudinary upload failed: ${error.message}`));
          return;
        }
        if (!result) {
          reject(new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Generate a short-lived signed URL for private PDF access
 * URL expires in 5 minutes (300 seconds)
 */
export function getSignedPdfUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    resource_type: 'raw',
    type: 'private',
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + 300, // 5 minutes
  });
}

/**
 * Delete a PDF from Cloudinary
 */
export async function deletePdf(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: 'raw',
      type: 'private',
    });
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
}

export default cloudinary;
