import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import path from 'path';
import { logger } from '../utils/logger.js';

/**
 * Image Storage Service
 * Currently stores locally, but ready for Cloudinary/S3 integration
 */
export const uploadImage = async (file: { path: string, filename: string }): Promise<string> => {
    // Check for Cloud integration (e.g., Cloudinary)
    const isCloudinarySet = process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY);

    if (isCloudinarySet) {
        try {
            // Configuration
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET
            });

            const result = await cloudinary.uploader.upload(file.path, {
                folder: 'wms_products',
                use_filename: true
            });

            // Cleanup local temp file
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);

            logger.info(`[STORAGE] Image uploaded to Cloudinary: ${result.secure_url}`);
            return result.secure_url;
        } catch (error) {
            logger.error(`[STORAGE] Cloudinary upload failed, falling back to local:`, error);
        }
    }

    // LOCAL STORAGE FALLBACK
    logger.info(`[STORAGE] Image saved locally: ${file.filename}`);
    return `/uploads/${file.filename}`;
};

export const deleteImage = async (imageUrl: string) => {
    if (imageUrl.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), imageUrl);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            logger.info(`[STORAGE] Local image deleted: ${imageUrl}`);
        }
    }
    // Handle cloud deletion if needed
};
