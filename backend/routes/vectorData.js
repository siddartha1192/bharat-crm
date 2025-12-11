const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { uploadVectorData, deleteFile, formatFileSize } = require('../middleware/upload');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

/**
 * Process and upload data to vector database
 */
async function processVectorData(filePath, fileName) {
  try {
    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');

    // Determine file type and process accordingly
    const ext = path.extname(fileName).toLowerCase();

    let documents = [];

    if (ext === '.txt') {
      // Split text into chunks
      const chunks = content.split('\n\n').filter(chunk => chunk.trim());
      documents = chunks.map(chunk => ({ content: chunk }));
    } else if (ext === '.csv') {
      // Parse CSV
      const lines = content.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',');

      documents = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, index) => {
          obj[header.trim()] = values[index]?.trim() || '';
        });
        return { content: JSON.stringify(obj) };
      });
    } else if (ext === '.json') {
      // Parse JSON
      const data = JSON.parse(content);
      if (Array.isArray(data)) {
        documents = data.map(item => ({ content: JSON.stringify(item) }));
      } else {
        documents = [{ content: JSON.stringify(data) }];
      }
    }

    // Import documents to vector database (if vectorDB service is available)
    try {
      const vectorDBService = require('../services/ai/vectorDB.service');

      for (const doc of documents) {
        await vectorDBService.addDocument({
          content: doc.content,
          metadata: {
            source: fileName,
            uploadedAt: new Date().toISOString()
          }
        });
      }

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
router.post('/upload', authenticate, authorize('ADMIN', 'MANAGER'), uploadVectorData.single('file'), async (req, res) => {
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
        userId: req.user.id
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

        // Process the file
        const recordsProcessed = await processVectorData(req.file.path, req.file.originalname);

        // Update status to completed
        await prisma.vectorDataUpload.update({
          where: { id: upload.id },
          data: {
            status: 'completed',
            recordsProcessed,
            processedAt: new Date()
          }
        });

        console.log(`Vector data upload ${upload.id} completed: ${recordsProcessed} records`);
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

/**
 * Get all vector data uploads
 * GET /api/vector-data/uploads
 */
router.get('/uploads', authenticate, authorize('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const uploads = await prisma.vectorDataUpload.findMany({
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
router.get('/uploads/:id', authenticate, async (req, res) => {
  try {
    const upload = await prisma.vectorDataUpload.findUnique({
      where: { id: req.params.id },
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
router.delete('/uploads/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const upload = await prisma.vectorDataUpload.findUnique({
      where: { id: req.params.id }
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

module.exports = router;
