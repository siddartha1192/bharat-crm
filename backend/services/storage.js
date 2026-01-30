/**
 * =============================================================================
 * STORAGE SERVICE - S3/DigitalOcean Spaces Compatible
 * =============================================================================
 *
 * Provides stateless file storage using S3-compatible services.
 * In production: Uses DigitalOcean Spaces (or AWS S3)
 * In development: Falls back to local filesystem
 *
 * =============================================================================
 */

const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class StorageService {
  constructor() {
    this.isS3Enabled = !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
    this.client = null;
    this.bucket = process.env.S3_BUCKET || 'crm-uploads';

    if (this.isS3Enabled) {
      this.client = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'nyc3',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY,
          secretAccessKey: process.env.S3_SECRET_KEY,
        },
        forcePathStyle: false, // Required for DigitalOcean Spaces
      });
      console.log('[Storage] S3/Spaces storage enabled');
      console.log(`[Storage] Endpoint: ${process.env.S3_ENDPOINT}`);
      console.log(`[Storage] Bucket: ${this.bucket}`);
    } else {
      console.log('[Storage] Using local filesystem storage (S3 not configured)');
    }
  }

  /**
   * Check if S3 storage is enabled
   */
  isEnabled() {
    return this.isS3Enabled;
  }

  /**
   * Generate a unique key for file storage
   */
  generateKey(folder, originalFilename) {
    const ext = path.extname(originalFilename);
    const baseName = path.basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9-_]/g, '_')
      .substring(0, 50);
    const uniqueId = uuidv4();
    return `${folder}/${baseName}_${uniqueId}${ext}`;
  }

  /**
   * Upload a file to S3/Spaces
   * @param {string} key - The storage key (path)
   * @param {Buffer|ReadableStream} body - File content
   * @param {string} contentType - MIME type
   * @param {object} metadata - Optional metadata
   * @returns {Promise<{url: string, key: string}>}
   */
  async uploadFile(key, body, contentType, metadata = {}) {
    if (!this.isS3Enabled) {
      throw new Error('S3 storage is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'private', // Files are private, use signed URLs for access
      Metadata: metadata,
    });

    await this.client.send(command);

    // Return the CDN URL if available, otherwise construct the S3 URL
    const baseUrl = process.env.S3_CDN_URL || `${process.env.S3_ENDPOINT}/${this.bucket}`;
    return {
      url: `${baseUrl}/${key}`,
      key: key,
    };
  }

  /**
   * Upload a file from local path to S3
   * @param {string} localPath - Local file path
   * @param {string} key - S3 key
   * @param {string} contentType - MIME type
   */
  async uploadFromPath(localPath, key, contentType) {
    const fileBuffer = fs.readFileSync(localPath);
    return this.uploadFile(key, fileBuffer, contentType);
  }

  /**
   * Get a signed URL for downloading a file
   * @param {string} key - The storage key
   * @param {number} expiresIn - URL expiration in seconds (default 1 hour)
   * @returns {Promise<string>}
   */
  async getSignedDownloadUrl(key, expiresIn = 3600) {
    if (!this.isS3Enabled) {
      throw new Error('S3 storage is not configured');
    }

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Get a signed URL for uploading a file (for direct browser uploads)
   * @param {string} key - The storage key
   * @param {string} contentType - Expected content type
   * @param {number} expiresIn - URL expiration in seconds
   * @returns {Promise<string>}
   */
  async getSignedUploadUrl(key, contentType, expiresIn = 3600) {
    if (!this.isS3Enabled) {
      throw new Error('S3 storage is not configured');
    }

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
      ACL: 'private',
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Delete a file from S3
   * @param {string} key - The storage key
   */
  async deleteFile(key) {
    if (!this.isS3Enabled) {
      throw new Error('S3 storage is not configured');
    }

    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    await this.client.send(command);
    return true;
  }

  /**
   * Check if a file exists in S3
   * @param {string} key - The storage key
   * @returns {Promise<boolean>}
   */
  async fileExists(key) {
    if (!this.isS3Enabled) {
      return false;
    }

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NotFound') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get file metadata from S3
   * @param {string} key - The storage key
   */
  async getFileMetadata(key) {
    if (!this.isS3Enabled) {
      throw new Error('S3 storage is not configured');
    }

    const command = new HeadObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    const response = await this.client.send(command);
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      lastModified: response.LastModified,
      metadata: response.Metadata,
    };
  }
}

// Export singleton instance
module.exports = new StorageService();
