const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadVectorData, deleteFile, formatFileSize } = require('../middleware/upload');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const { PrismaClient } = require('@prisma/client');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const xlsx = require('xlsx'); // For Excel files
const mammoth = require('mammoth'); // For Word .docx files

const prisma = new PrismaClient();

// Apply authentication and tenant context to all routes
router.use(authenticate);
router.use(tenantContext);

// Track ingest process status in memory (could be moved to Redis for production)
let ingestStatus = {
  isRunning: false,
  startedAt: null,
  completedAt: null,
  error: null,
  logs: []
};

function addIngestLog(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}`;
  ingestStatus.logs.push(logEntry);
  console.log(logEntry);
  // Keep only last 100 logs
  if (ingestStatus.logs.length > 100) {
    ingestStatus.logs.shift();
  }
}

/**
 * Process and upload data to vector database
 * @param {string} filePath - Path to the uploaded file
 * @param {string} fileName - Original filename
 * @param {string} tenantId - Tenant ID for multi-tenant isolation
 */
async function processVectorData(filePath, fileName, tenantId) {
  try {
    if (!tenantId) {
      throw new Error('tenantId is required for vector data processing');
    }

    // Determine file type and process accordingly
    const ext = path.extname(fileName).toLowerCase();

    let documents = [];

    if (ext === '.pdf') {
      // Read PDF file as buffer
      const dataBuffer = fs.readFileSync(filePath);

      // Create PDF parser instance with the buffer
      const parser = new PDFParse({ data: dataBuffer });

      // Extract text content from PDF
      const result = await parser.getText();
      const content = result.text;

      // Clean up parser resources
      await parser.destroy();

      // Split text into chunks (by paragraphs or pages)
      const chunks = content.split('\n\n').filter(chunk => chunk.trim());
      documents = chunks.map(chunk => ({ content: chunk, metadata: { fileName } }));
    } else if (ext === '.xlsx' || ext === '.xls') {
      // Process Excel files
      const workbook = xlsx.readFile(filePath);

      // Process each sheet
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];

        // Convert sheet to JSON
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        // Convert each row to semantic text format for better search
        // Mark as doNotChunk to preserve row integrity
        jsonData.forEach((row, index) => {
          // Create enhanced semantic text representation with natural language
          // This dramatically improves vector search accuracy for tabular data
          const entries = Object.entries(row);

          // Build natural language representation
          const rowText = entries
            .map(([key, value]) => {
              // Clean up key names (remove underscores, capitalize)
              const cleanKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return `${cleanKey}: ${value}`;
            })
            .join(' | '); // Use pipe separator for better readability

          // Add sheet and row number for reference
          const enhancedText = `Sheet: ${sheetName}, Row ${index + 1} - ${rowText}`;

          documents.push({
            content: enhancedText,
            metadata: {
              fileName,
              fileType: 'excel',
              sheetName,
              rowNumber: index + 1,
              doNotChunk: true, // Flag to prevent chunking
              originalData: row // Store original for reference
            }
          });
        });

        // Also store the sheet as a single text representation for broader context
        const textData = xlsx.utils.sheet_to_csv(worksheet);
        if (textData && textData.trim()) {
          const headers = Object.keys(jsonData[0] || {}).join(', ');
          documents.push({
            content: `Excel Sheet: ${sheetName} (File: ${fileName})\nHeaders: ${headers}\nTotal Rows: ${jsonData.length}\n\nPreview:\n${textData.split('\n').slice(0, 10).join('\n')}`,
            metadata: {
              fileName,
              fileType: 'excel',
              sheetName,
              isFullSheet: true,
              doNotChunk: true
            }
          });
        }
      });
    } else if (ext === '.docx') {
      // Process Word .docx files
      const result = await mammoth.extractRawText({ path: filePath });
      const content = result.value;

      // Split text into paragraphs
      const paragraphs = content.split('\n').filter(para => para.trim());

      // Group paragraphs into reasonable chunks (max 5 paragraphs per chunk)
      for (let i = 0; i < paragraphs.length; i += 5) {
        const chunk = paragraphs.slice(i, i + 5).join('\n');
        if (chunk.trim()) {
          documents.push({
            content: chunk,
            metadata: {
              fileName,
              fileType: 'docx',
              chunkNumber: Math.floor(i / 5) + 1
            }
          });
        }
      }
    } else if (ext === '.doc') {
      // For older .doc files, try to read as text (best effort)
      // Note: Full .doc parsing requires more complex libraries
      // This is a fallback that may not work perfectly
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const chunks = content.split('\n\n').filter(chunk => chunk.trim());
        documents = chunks.map((chunk, index) => ({
          content: chunk,
          metadata: {
            fileName,
            fileType: 'doc',
            chunkNumber: index + 1
          }
        }));
      } catch (error) {
        console.warn('Warning: .doc file format not fully supported. Please convert to .docx for best results.');
        throw new Error('Older .doc format detected. Please convert to .docx format for better processing.');
      }
    } else {
      // Read file content as text for other formats
      const content = fs.readFileSync(filePath, 'utf-8');

      if (ext === '.txt' || ext === '.md') {
        // Split text into chunks
        const chunks = content.split('\n\n').filter(chunk => chunk.trim());
        documents = chunks.map(chunk => ({ content: chunk, metadata: { fileName } }));
      } else if (ext === '.csv') {
        // Parse CSV using xlsx for better handling
        const workbook = xlsx.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: '' });

        // Convert each row to semantic text format for better search
        // Mark as doNotChunk to preserve row integrity
        documents = jsonData.map((row, index) => {
          // Create enhanced semantic text representation with natural language
          // This dramatically improves vector search accuracy for tabular data
          const entries = Object.entries(row);

          // Build natural language representation
          const rowText = entries
            .map(([key, value]) => {
              // Clean up key names (remove underscores, capitalize)
              const cleanKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              return `${cleanKey}: ${value}`;
            })
            .join(' | '); // Use pipe separator for better readability

          // Add row number for reference
          const enhancedText = `Row ${index + 1} - ${rowText}`;

          return {
            content: enhancedText,
            metadata: {
              fileName,
              fileType: 'csv',
              rowNumber: index + 1,
              doNotChunk: true, // Flag to prevent chunking
              originalData: row // Store original for reference
            }
          };
        });

        // Also store full CSV as searchable context (headers + summary)
        const csvText = xlsx.utils.sheet_to_csv(worksheet);
        const headers = Object.keys(jsonData[0] || {}).join(', ');
        documents.push({
          content: `CSV File: ${fileName}\nHeaders: ${headers}\nTotal Rows: ${jsonData.length}\n\nPreview:\n${csvText.split('\n').slice(0, 10).join('\n')}`,
          metadata: {
            fileName,
            fileType: 'csv',
            isFullFile: true,
            doNotChunk: true
          }
        });
      } else if (ext === '.json') {
        // Parse JSON
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          documents = data.map(item => ({ content: JSON.stringify(item), metadata: { fileName, fileType: 'json' } }));
        } else {
          documents = [{ content: JSON.stringify(data), metadata: { fileName, fileType: 'json' } }];
        }
      }
    }

    // Import documents to vector database with tenant isolation
    try {
      const vectorDBService = require('../services/ai/vectorDB.service');

      // addDocuments now requires tenantId for isolation
      await vectorDBService.addDocuments(documents, tenantId);

      console.log(`✅ Uploaded ${documents.length} documents to vector database for tenant ${tenantId}`);
      return documents.length;
    } catch (error) {
      console.error('VectorDB service not available or error:', error);
      // Continue without vector DB processing
      return documents.length;
    }
  } catch (error) {
    console.error('Error processing vector data:', error);
    throw error;
  }
}

/**
 * Upload data file for vector database
 * POST /api/vector-data/upload
 * Only admins can upload
 */
router.post('/upload', authorize('ADMIN', 'MANAGER'), (req, res) => {
  // Use multer with error handling
  uploadVectorData.single('file')(req, res, async (err) => {
    // Handle multer errors
    if (err) {
      console.error('Multer error:', err);

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size too large. Maximum size is 50MB.'
        });
      }

      if (err.message && err.message.includes('File type')) {
        return res.status(400).json({
          error: err.message
        });
      }

      return res.status(400).json({
        error: err.message || 'Error uploading file'
      });
    }

    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Create upload record
      const upload = await prisma.vectorDataUpload.create({
        data: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          filePath: req.file.path,
          status: 'pending',
          uploadedBy: req.user.id,
          userId: req.user.id,
          tenantId: req.tenant.id
        }
      });

      // Process file asynchronously
      setImmediate(async () => {
        try {
          // Update status to processing
          await prisma.vectorDataUpload.update({
            where: { id: upload.id },
            data: { status: 'processing' }
          });

          // Process the file with tenant isolation
          const recordsProcessed = await processVectorData(req.file.path, req.file.originalname, req.tenant.id);

          // Update status to completed
          await prisma.vectorDataUpload.update({
            where: { id: upload.id },
            data: {
              status: 'completed',
              recordsProcessed,
              processedAt: new Date()
            }
          });

          console.log(`Vector data upload ${upload.id} completed: ${recordsProcessed} records for tenant ${req.tenant.id}`);
        } catch (error) {
          console.error('Error processing vector data:', error);

          // Update status to failed
          await prisma.vectorDataUpload.update({
            where: { id: upload.id },
            data: {
              status: 'failed',
              errorMessage: error.message
            }
          });
        }
      });

      res.json({
        message: 'File uploaded successfully and is being processed',
        upload: {
          ...upload,
          formattedSize: formatFileSize(upload.fileSize)
        }
      });
    } catch (error) {
      console.error('Error uploading vector data:', error);

      // Delete uploaded file if database operation failed
      if (req.file) {
        deleteFile(req.file.path);
      }

      res.status(500).json({ error: 'Failed to upload vector data' });
    }
  });
});

/**
 * Get all vector data uploads
 * GET /api/vector-data/uploads
 */
router.get('/uploads', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const uploads = await prisma.vectorDataUpload.findMany({
      where: getTenantFilter(req),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Add formatted file sizes
    const uploadsWithSize = uploads.map(upload => ({
      ...upload,
      formattedSize: formatFileSize(upload.fileSize)
    }));

    res.json(uploadsWithSize);
  } catch (error) {
    console.error('Error fetching vector data uploads:', error);
    res.status(500).json({ error: 'Failed to fetch uploads' });
  }
});

/**
 * Get upload status
 * GET /api/vector-data/uploads/:id
 */
router.get('/uploads/:id', async (req, res) => {
  try {
    const upload = await prisma.vectorDataUpload.findFirst({
      where: getTenantFilter(req, { id: req.params.id }),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    res.json({
      ...upload,
      formattedSize: formatFileSize(upload.fileSize)
    });
  } catch (error) {
    console.error('Error fetching upload status:', error);
    res.status(500).json({ error: 'Failed to fetch upload status' });
  }
});

/**
 * Delete vector data upload
 * DELETE /api/vector-data/uploads/:id
 */
router.delete('/uploads/:id', authorize('ADMIN'), async (req, res) => {
  try {
    const upload = await prisma.vectorDataUpload.findFirst({
      where: getTenantFilter(req, { id: req.params.id })
    });

    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }

    // Delete file from filesystem
    deleteFile(upload.filePath);

    // Delete upload record
    await prisma.vectorDataUpload.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Upload deleted successfully' });
  } catch (error) {
    console.error('Error deleting upload:', error);
    res.status(500).json({ error: 'Failed to delete upload' });
  }
});

/**
 * Run ingest script to process knowledge base into vector database
 * POST /api/vector-data/ingest
 * Admin only
 */
router.post('/ingest', authorize('ADMIN'), async (req, res) => {
  try {
    if (ingestStatus.isRunning) {
      return res.status(409).json({ error: 'Ingest process is already running' });
    }

    const scriptPath = path.join(__dirname, '../scripts/ingestDocuments.js');

    // Check if script exists
    if (!fs.existsSync(scriptPath)) {
      return res.status(404).json({ error: 'Ingest script not found' });
    }

    // Reset status
    ingestStatus = {
      isRunning: true,
      startedAt: new Date(),
      completedAt: null,
      error: null,
      logs: []
    };

    addIngestLog('🚀 Starting ingest process...');

    // Send immediate response
    res.json({
      message: 'Ingest process started',
      status: 'processing'
    });

    // Run script with captured output and pass tenantId via environment
    const ingestProcess = spawn('node', [scriptPath, '--clear'], {
      cwd: path.join(__dirname, '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        INGEST_TENANT_ID: req.tenant.id // Pass tenantId to script
      }
    });

    // Capture stdout
    ingestProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => addIngestLog(line));
    });

    // Capture stderr
    ingestProcess.stderr.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line => line.trim());
      lines.forEach(line => addIngestLog(`ERROR: ${line}`));
    });

    // Handle completion
    ingestProcess.on('close', (code) => {
      ingestStatus.isRunning = false;
      ingestStatus.completedAt = new Date();

      if (code === 0) {
        addIngestLog('✅ Ingest process completed successfully');
      } else {
        ingestStatus.error = `Process exited with code ${code}`;
        addIngestLog(`❌ Ingest process failed with exit code ${code}`);
      }
    });

    // Handle errors
    ingestProcess.on('error', (error) => {
      ingestStatus.isRunning = false;
      ingestStatus.completedAt = new Date();
      ingestStatus.error = error.message;
      addIngestLog(`❌ Process error: ${error.message}`);
    });

    addIngestLog(`Process started with PID: ${ingestProcess.pid}`);
  } catch (error) {
    console.error('Error starting ingest script:', error);
    ingestStatus.isRunning = false;
    ingestStatus.error = error.message;
    res.status(500).json({ error: 'Failed to start ingest process' });
  }
});

/**
 * Get ingest process status
 * GET /api/vector-data/ingest/status
 */
router.get('/ingest/status', authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    res.json(ingestStatus);
  } catch (error) {
    console.error('Error fetching ingest status:', error);
    res.status(500).json({ error: 'Failed to fetch ingest status' });
  }
});

/**
 * Restart backend server
 * POST /api/vector-data/restart-backend
 * Admin only
 */
router.post('/restart-backend', authorize('ADMIN'), async (req, res) => {
  try {
    // Send response before restarting
    res.json({
      message: 'Backend restart initiated. Server will be back online in a few seconds.',
      status: 'restarting'
    });

    // Close response and restart after a short delay
    setTimeout(() => {
      console.log('Restarting backend server...');
      process.exit(0); // Exit cleanly - assuming a process manager (pm2, nodemon, etc.) will restart
    }, 1000);
  } catch (error) {
    console.error('Error restarting backend:', error);
    res.status(500).json({ error: 'Failed to restart backend' });
  }
});

module.exports = router;
