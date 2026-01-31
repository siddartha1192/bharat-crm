const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const storageService = require('../services/storage');

/**
 * =============================================================================
 * FILE UPLOAD MIDDLEWARE
 * =============================================================================
 *
 * Supports two storage backends:
 *   - S3/DigitalOcean Spaces (production - stateless)
 *   - Local filesystem (development - with Docker volumes)
 *
 * S3 is used when S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY are configured.
 *
 * =============================================================================
 */

// Check if S3 storage is enabled
const USE_S3 = storageService.isEnabled();
console.log(`[Upload] Storage mode: ${USE_S3 ? 'S3/Spaces (stateless)' : 'Local filesystem'}`);

// Ensure upload directories exist (for local storage fallback)
const UPLOAD_BASE_DIR = path.join(__dirname, '../uploads');
const DOCUMENTS_DIR = path.join(UPLOAD_BASE_DIR, 'documents');
const KNOWLEDGE_BASE_DIR = path.join(__dirname, '../knowledge_base');

// Create directories if they don't exist (only needed for local storage)
if (!USE_S3) {
  [UPLOAD_BASE_DIR, DOCUMENTS_DIR, KNOWLEDGE_BASE_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Storage configuration for lead/contact/deal documents (LOCAL)
 */
const documentStorageLocal = multer.diskStorage({
  destination: function (req, file, cb) {
    const entityType = req.body.entityType || 'lead';
    const entityId = req.body.entityId || 'unknown';
    const uploadPath = path.join(DOCUMENTS_DIR, entityType, entityId);

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

    cb(null, `${sanitizedBaseName}_${uniqueId}${ext}`);
  }
});

/**
 * Storage configuration for S3/Spaces (memory buffer for S3 upload)
 */
const memoryStorage = multer.memoryStorage();

/**
 * Storage configuration for vector database data (LOCAL)
 */
const vectorDataStorageLocal = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, KNOWLEDGE_BASE_DIR);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

    cb(null, `${sanitizedBaseName}${ext}`);
  }
});

/**
 * File filter for documents - Allow ALL file types
 */
const documentFileFilter = (req, file, cb) => {
  cb(null, true);
};

/**
 * File filter for vector data
 */
const vectorDataFileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'text/csv',
    'application/json',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/zip',
    'application/octet-stream'
  ];

  const allowedExtensions = ['.txt', '.md', '.csv', '.json', '.pdf', '.xlsx', '.xls', '.docx', '.doc'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (allowedExtensions.includes(ext)) {
    console.log(`⚠️ Accepting file by extension: ${file.originalname} (MIME: ${file.mimetype})`);
    cb(null, true);
  } else {
    cb(new Error(`File type "${ext}" (MIME: ${file.mimetype}) is not allowed for vector data.`), false);
  }
};

/**
 * Document upload middleware (max 50MB)
 * Uses S3 in production, local storage in development
 */
const uploadDocument = multer({
  storage: USE_S3 ? memoryStorage : documentStorageLocal,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/**
 * Vector data upload middleware (max 50MB)
 * Uses S3 in production, local storage in development
 */
const uploadVectorData = multer({
  storage: USE_S3 ? memoryStorage : vectorDataStorageLocal,
  fileFilter: vectorDataFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

/**
 * Middleware to upload file to S3 after multer processes it
 * Use this AFTER uploadDocument middleware
 */
async function uploadToS3(req, res, next) {
  if (!USE_S3 || !req.file) {
    return next();
  }

  try {
    const entityType = req.body.entityType || 'documents';
    const entityId = req.body.entityId || 'general';
    const tenantId = req.user?.tenantId || 'default';

    // Generate S3 key
    const key = storageService.generateKey(
      `${tenantId}/${entityType}/${entityId}`,
      req.file.originalname
    );

    // Upload to S3
    const result = await storageService.uploadFile(
      key,
      req.file.buffer,
      req.file.mimetype,
      {
        originalName: req.file.originalname,
        uploadedBy: req.user?.userId || 'anonymous',
        entityType,
        entityId,
      }
    );

    // Replace file info with S3 info
    req.file.s3Key = key;
    req.file.s3Url = result.url;
    req.file.storageType = 's3';
    req.file.path = key; // For compatibility with existing code

    console.log(`[Upload] File uploaded to S3: ${key}`);
    next();
  } catch (error) {
    console.error('[Upload] S3 upload failed:', error);
    next(error);
  }
}

/**
 * Middleware to upload multiple files to S3
 */
async function uploadMultipleToS3(req, res, next) {
  if (!USE_S3 || !req.files || req.files.length === 0) {
    return next();
  }

  try {
    const entityType = req.body.entityType || 'documents';
    const entityId = req.body.entityId || 'general';
    const tenantId = req.user?.tenantId || 'default';

    for (const file of req.files) {
      const key = storageService.generateKey(
        `${tenantId}/${entityType}/${entityId}`,
        file.originalname
      );

      const result = await storageService.uploadFile(
        key,
        file.buffer,
        file.mimetype,
        {
          originalName: file.originalname,
          uploadedBy: req.user?.userId || 'anonymous',
        }
      );

      file.s3Key = key;
      file.s3Url = result.url;
      file.storageType = 's3';
      file.path = key;
    }

    console.log(`[Upload] ${req.files.length} files uploaded to S3`);
    next();
  } catch (error) {
    console.error('[Upload] S3 multi-upload failed:', error);
    next(error);
  }
}

/**
 * Middleware to upload vector data file to S3 after multer processes it
 * Use this AFTER uploadVectorData middleware
 */
async function uploadVectorDataToS3(req, res, next) {
  if (!USE_S3 || !req.file) {
    return next();
  }

  try {
    const tenantId = req.user?.tenantId || req.tenant?.id || 'default';

    // Generate S3 key for vector data (knowledge_base folder)
    const key = storageService.generateKey(
      `${tenantId}/knowledge_base`,
      req.file.originalname
    );

    // Upload to S3
    const result = await storageService.uploadFile(
      key,
      req.file.buffer,
      req.file.mimetype,
      {
        originalName: req.file.originalname,
        uploadedBy: req.user?.userId || 'anonymous',
        type: 'vector_data',
      }
    );

    // Replace file info with S3 info
    req.file.s3Key = key;
    req.file.s3Url = result.url;
    req.file.storageType = 's3';
    req.file.path = key; // For compatibility with existing code

    console.log(`[Upload] Vector data uploaded to S3: ${key}`);
    next();
  } catch (error) {
    console.error('[Upload] S3 vector data upload failed:', error);
    next(error);
  }
}

/**
 * Get a signed download URL for a file
 * @param {string} keyOrPath - S3 key or local path
 * @returns {Promise<string>} - Signed URL or local path
 */
async function getDownloadUrl(keyOrPath) {
  if (USE_S3 && !keyOrPath.startsWith('/')) {
    // It's an S3 key
    return storageService.getSignedDownloadUrl(keyOrPath, 3600); // 1 hour
  }
  // It's a local path
  return keyOrPath;
}

/**
 * Delete file from S3 or local storage
 * @param {string} keyOrPath - S3 key or local path
 */
async function deleteFileFromStorage(keyOrPath) {
  if (USE_S3 && !keyOrPath.startsWith('/')) {
    // It's an S3 key
    return storageService.deleteFile(keyOrPath);
  }
  // It's a local path
  return deleteFile(keyOrPath);
}

/**
 * Delete file helper (local storage)
 */
function deleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * Get file size helper
 */
function getFileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch (error) {
    console.error('Error getting file size:', error);
    return 0;
  }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

module.exports = {
  uploadDocument,
  uploadVectorData,
  uploadToS3,
  uploadMultipleToS3,
  uploadVectorDataToS3,
  getDownloadUrl,
  deleteFileFromStorage,
  deleteFile,
  getFileSize,
  formatFileSize,
  DOCUMENTS_DIR,
  KNOWLEDGE_BASE_DIR,
  USE_S3,
  storageService,
};
