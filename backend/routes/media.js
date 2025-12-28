/**
 * Media Upload Routes - Cloudinary Integration
 * Handles file uploads to Cloudinary for WhatsApp media messages
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const cloudinary = require('cloudinary').v2;

const prisma = new PrismaClient();

// Configure multer for memory storage (files will be uploaded directly to Cloudinary)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Allow images, documents, videos, and audio files
    const allowedMimes = [
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv',
      // Videos
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/x-msvideo',
      // Audio
      'audio/mpeg',
      'audio/mp3',
      'audio/mp4',
      'audio/ogg',
      'audio/wav',
      'audio/aac',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not supported. Allowed types: images, documents, videos, and audio files.`));
    }
  },
});

/**
 * Get Cloudinary configuration for the authenticated user's tenant
 * @param {string} userId - User ID
 * @returns {object|null} - Cloudinary configuration or null
 */
async function getCloudinaryConfig(userId) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tenant: {
          select: {
            settings: true
          }
        }
      }
    });

    if (!user || !user.tenant) {
      return null;
    }

    const settings = user.tenant.settings || {};
    const cloudinarySettings = settings.cloudinary;

    if (!cloudinarySettings || !cloudinarySettings.cloudName || !cloudinarySettings.apiKey || !cloudinarySettings.apiSecret) {
      return null;
    }

    return {
      cloud_name: cloudinarySettings.cloudName,
      api_key: cloudinarySettings.apiKey,
      api_secret: cloudinarySettings.apiSecret
    };
  } catch (error) {
    console.error('Error fetching Cloudinary config:', error);
    return null;
  }
}

/**
 * Upload media file to Cloudinary
 * POST /api/media/upload
 */
router.post('/upload', authenticate, upload.single('file'), async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Get Cloudinary configuration for this tenant
    const cloudinaryConfig = await getCloudinaryConfig(userId);

    if (!cloudinaryConfig) {
      return res.status(400).json({
        success: false,
        error: 'Cloudinary is not configured for your organization. Please contact your administrator to configure Cloudinary settings.'
      });
    }

    // Configure Cloudinary with tenant-specific credentials
    cloudinary.config(cloudinaryConfig);

    // Determine resource type based on file mimetype
    let resourceType = 'auto';
    if (req.file.mimetype.startsWith('image/')) {
      resourceType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      resourceType = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      resourceType = 'video'; // Cloudinary uses 'video' for audio files
    } else {
      resourceType = 'raw'; // For documents
    }

    // Upload to Cloudinary using upload_stream
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: resourceType,
          folder: 'whatsapp-media', // Organize files in a folder
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      // Write the buffer to the stream
      uploadStream.end(req.file.buffer);
    });

    const result = await uploadPromise;

    // Return the Cloudinary URL
    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      bytes: result.bytes,
      width: result.width,
      height: result.height,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('Error uploading file to Cloudinary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload file: ' + error.message
    });
  }
});

/**
 * Delete media file from Cloudinary
 * DELETE /api/media/:publicId
 */
router.delete('/:publicId', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        error: 'Public ID is required'
      });
    }

    // Get Cloudinary configuration for this tenant
    const cloudinaryConfig = await getCloudinaryConfig(userId);

    if (!cloudinaryConfig) {
      return res.status(400).json({
        success: false,
        error: 'Cloudinary is not configured for your organization'
      });
    }

    // Configure Cloudinary with tenant-specific credentials
    cloudinary.config(cloudinaryConfig);

    // Delete the file from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    res.json({
      success: true,
      result: result.result,
      message: 'File deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting file from Cloudinary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file: ' + error.message
    });
  }
});

module.exports = router;
