const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

/**
 * File Upload Middleware
 * Handles document uploads with size limits and organization
 */

// Ensure upload directories exist
const UPLOAD_BASE_DIR = path.join(__dirname, '../uploads');
const DOCUMENTS_DIR = path.join(UPLOAD_BASE_DIR, 'documents');
const KNOWLEDGE_BASE_DIR = path.join(__dirname, '../knowledge_base');

// Create directories if they don't exist
[UPLOAD_BASE_DIR, DOCUMENTS_DIR, KNOWLEDGE_BASE_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Storage configuration for lead/contact/deal documents
 */
const documentStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create unique subfolder for each entity
    const entityType = req.body.entityType || 'lead';
    const entityId = req.body.entityId || 'unknown';

    const uploadPath = path.join(DOCUMENTS_DIR, entityType, entityId);

    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename with UUID to prevent collisions
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

    cb(null, `${sanitizedBaseName}_${uniqueId}${ext}`);
  }
});

/**
 * Storage configuration for vector database data
 */
const vectorDataStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, KNOWLEDGE_BASE_DIR);
  },
  filename: function (req, file, cb) {
    // Keep original filename for knowledge base (ingestDocuments.js expects it)
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const sanitizedBaseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '_');

    cb(null, `${sanitizedBaseName}${ext}`);
  }
});

/**
 * File filter for documents
 * Updated to allow ALL file types for maximum flexibility
 */
const documentFileFilter = (req, file, cb) => {
  // Allow all file types - no restrictions
  // Security note: File content validation should be done at the application level
  cb(null, true);
};

/**
 * File filter for vector data
 * IMPROVED: Checks both MIME type AND file extension for better compatibility
 */
const vectorDataFileFilter = (req, file, cb) => {
  // Allowed MIME types for vector data
  const allowedMimeTypes = [
    'text/plain',
    'text/markdown',
    'text/x-markdown',
    'text/csv',
    'application/json',
    'application/pdf',
    // Excel files
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    // Word files
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    // Fallback MIME types (some browsers send these for Office files)
    'application/zip', // .docx/.xlsx are actually ZIP files
    'application/octet-stream' // Generic binary
  ];

  // Allowed file extensions (as fallback check)
  const allowedExtensions = ['.txt', '.md', '.csv', '.json', '.pdf', '.xlsx', '.xls', '.docx', '.doc'];

  // Get file extension
  const ext = path.extname(file.originalname).toLowerCase();

  // Check MIME type first, then fall back to extension check
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else if (allowedExtensions.includes(ext)) {
    // Allow if extension matches, even if MIME type is wrong
    console.log(`⚠️ Accepting file by extension: ${file.originalname} (MIME: ${file.mimetype})`);
    cb(null, true);
  } else {
    cb(new Error(`File type "${ext}" (MIME: ${file.mimetype}) is not allowed for vector data. Supported types: TXT, MD, CSV, JSON, PDF, XLSX, XLS, DOCX, DOC`), false);
  }
};

/**
 * Document upload middleware (max 50MB)
 */
const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB in bytes
  }
});

/**
 * Vector data upload middleware (max 50MB)
 */
const uploadVectorData = multer({
  storage: vectorDataStorage,
  fileFilter: vectorDataFileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB in bytes
  }
});

/**
 * Delete file helper
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
  deleteFile,
  getFileSize,
  formatFileSize,
  DOCUMENTS_DIR,
  KNOWLEDGE_BASE_DIR
};
