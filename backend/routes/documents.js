const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { uploadDocument, deleteFile, formatFileSize } = require('../middleware/upload');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Apply authentication and tenant context to all routes
router.use(authenticate);
router.use(tenantContext);

/**
 * Upload document for entity (Lead, Contact, Deal, Task)
 * POST /api/documents/upload
 * FormData: file, entityType, entityId, description, tags
 */
router.post('/upload', uploadDocument.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { entityType, entityId, description, tags } = req.body;

    // Validate entity type
    const validEntityTypes = ['Lead', 'Contact', 'Deal', 'Task'];
    if (!validEntityTypes.includes(entityType)) {
      // Delete uploaded file
      deleteFile(req.file.path);
      return res.status(400).json({ error: 'Invalid entity type' });
    }

    // Create document record in database
    const document = await prisma.document.create({
      data: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        filePath: req.file.path,
        entityType,
        entityId,
        description: description || null,
        uploadedBy: req.user.id,
        userId: req.user.id,
        tags: tags ? (Array.isArray(tags) ? tags : JSON.parse(tags)) : []
      }
    });

    res.json({
      message: 'File uploaded successfully',
      document: {
        ...document,
        formattedSize: formatFileSize(document.fileSize)
      }
    });
  } catch (error) {
    console.error('Error uploading document:', error);

    // Delete uploaded file if database operation failed
    if (req.file) {
      deleteFile(req.file.path);
    }

    res.status(500).json({ error: 'Failed to upload document' });
  }
});

/**
 * Get documents for entity
 * GET /api/documents/:entityType/:entityId
 */
router.get('/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const documents = await prisma.document.findMany({
      where: {
        entityType,
        entityId
      },
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
    const documentsWithSize = documents.map(doc => ({
      ...doc,
      formattedSize: formatFileSize(doc.fileSize)
    }));

    res.json(documentsWithSize);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * Download document
 * GET /api/documents/download/:id
 */
router.get('/download/:id', async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if file exists
    if (!fs.existsSync(document.filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Send file
    res.download(document.filePath, document.fileName);
  } catch (error) {
    console.error('Error downloading document:', error);
    res.status(500).json({ error: 'Failed to download document' });
  }
});

/**
 * Delete document
 * DELETE /api/documents/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const document = await prisma.document.findUnique({
      where: { id: req.params.id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user has permission to delete
    if (document.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this document' });
    }

    // Delete file from filesystem
    deleteFile(document.filePath);

    // Delete document record from database
    await prisma.document.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

/**
 * Update document metadata
 * PATCH /api/documents/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { description, tags } = req.body;

    const document = await prisma.document.findUnique({
      where: { id: req.params.id }
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if user has permission to update
    if (document.userId !== req.user.id && req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to update this document' });
    }

    const updated = await prisma.document.update({
      where: { id: req.params.id },
      data: {
        description: description !== undefined ? description : document.description,
        tags: tags !== undefined ? tags : document.tags
      }
    });

    res.json({
      ...updated,
      formattedSize: formatFileSize(updated.fileSize)
    });
  } catch (error) {
    console.error('Error updating document:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

module.exports = router;
