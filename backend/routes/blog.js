const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const prisma = new PrismaClient();

/**
 * Get all published blog posts (Public)
 * GET /api/blog/posts
 */
router.get('/posts', async (req, res) => {
  try {
    const { category, tag, limit = 10, offset = 0, search } = req.query;

    const where = {
      status: 'published',
      publishedAt: { lte: new Date() },
    };

    if (category) {
      where.category = category;
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
        select: {
          id: true,
          slug: true,
          title: true,
          excerpt: true,
          featuredImage: true,
          featuredImageAlt: true,
          category: true,
          tags: true,
          author: true,
          authorImage: true,
          publishedAt: true,
          readTime: true,
          viewCount: true,
          relatedFeature: true,
        },
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({
      posts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get blog posts error:', error);
    res.status(500).json({ error: 'Failed to get blog posts' });
  }
});

/**
 * Get single blog post by slug (Public)
 * GET /api/blog/posts/:slug
 */
router.get('/posts/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const post = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Only show published posts to public
    if (post.status !== 'published') {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Increment view count
    await prisma.blogPost.update({
      where: { slug },
      data: { viewCount: { increment: 1 } },
    });

    res.json(post);
  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({ error: 'Failed to get blog post' });
  }
});

/**
 * Get blog categories (Public)
 * GET /api/blog/categories
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.blogPost.groupBy({
      by: ['category'],
      where: { status: 'published' },
      _count: { id: true },
    });

    res.json(
      categories.map((c) => ({
        name: c.category,
        count: c._count.id,
      }))
    );
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

/**
 * Get popular tags (Public)
 * GET /api/blog/tags
 */
router.get('/tags', async (req, res) => {
  try {
    const posts = await prisma.blogPost.findMany({
      where: { status: 'published' },
      select: { tags: true },
    });

    // Count tag frequencies
    const tagCounts = {};
    posts.forEach((post) => {
      post.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    // Convert to array and sort by count
    const tags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20 tags

    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

/**
 * Get related blog posts (Public)
 * GET /api/blog/posts/:slug/related
 */
router.get('/posts/:slug/related', async (req, res) => {
  try {
    const { slug } = req.params;
    const { limit = 3 } = req.query;

    const post = await prisma.blogPost.findUnique({
      where: { slug },
      select: { category: true, tags: true, relatedFeature: true },
    });

    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Find related posts by category, tags, or related feature
    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        status: 'published',
        publishedAt: { lte: new Date() },
        slug: { not: slug },
        OR: [
          { category: post.category },
          { tags: { hasSome: post.tags } },
          { relatedFeature: post.relatedFeature },
        ],
      },
      orderBy: { publishedAt: 'desc' },
      take: parseInt(limit),
      select: {
        id: true,
        slug: true,
        title: true,
        excerpt: true,
        featuredImage: true,
        category: true,
        author: true,
        publishedAt: true,
        readTime: true,
      },
    });

    res.json(relatedPosts);
  } catch (error) {
    console.error('Get related posts error:', error);
    res.status(500).json({ error: 'Failed to get related posts' });
  }
});

// ==================== ADMIN ROUTES ====================

/**
 * Get all blog posts including drafts (Admin only)
 * GET /api/blog/admin/posts
 */
router.get('/admin/posts', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { status, category, limit = 20, offset = 0 } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (category) {
      where.category = category;
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
      prisma.blogPost.count({ where }),
    ]);

    res.json({
      posts,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit),
      },
    });
  } catch (error) {
    console.error('Get admin blog posts error:', error);
    res.status(500).json({ error: 'Failed to get blog posts' });
  }
});

/**
 * Create new blog post (Admin only)
 * POST /api/blog/admin/posts
 */
router.post('/admin/posts', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const {
      title,
      slug,
      excerpt,
      content,
      featuredImage,
      featuredImageAlt,
      metaTitle,
      metaDescription,
      keywords,
      category,
      tags,
      status,
      publishedAt,
      scheduledFor,
      author,
      authorEmail,
      authorBio,
      authorImage,
      readTime,
      relatedFeature,
    } = req.body;

    if (!title || !slug || !excerpt || !content || !category) {
      return res.status(400).json({
        error: 'Title, slug, excerpt, content, and category are required',
      });
    }

    // Check if slug already exists
    const existing = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (existing) {
      return res.status(400).json({ error: 'A blog post with this slug already exists' });
    }

    // Calculate read time if not provided (average 200 words per minute)
    const calculatedReadTime =
      readTime || Math.ceil(content.split(/\s+/).length / 200);

    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        excerpt,
        content,
        featuredImage,
        featuredImageAlt,
        metaTitle: metaTitle || title,
        metaDescription: metaDescription || excerpt,
        keywords: keywords || [],
        category,
        tags: tags || [],
        status: status || 'draft',
        publishedAt: status === 'published' ? new Date() : publishedAt,
        scheduledFor,
        author: author || 'Bharat CRM Team',
        authorEmail,
        authorBio,
        authorImage,
        readTime: calculatedReadTime,
        relatedFeature,
      },
    });

    res.status(201).json(post);
  } catch (error) {
    console.error('Create blog post error:', error);
    res.status(500).json({ error: 'Failed to create blog post' });
  }
});

/**
 * Update blog post (Admin only)
 * PUT /api/blog/admin/posts/:id
 */
router.put('/admin/posts/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    // If status is changing to published and publishedAt is not set, set it
    if (updateData.status === 'published' && !updateData.publishedAt) {
      updateData.publishedAt = new Date();
    }

    // Recalculate read time if content changed
    if (updateData.content && !updateData.readTime) {
      updateData.readTime = Math.ceil(updateData.content.split(/\s+/).length / 200);
    }

    const post = await prisma.blogPost.update({
      where: { id },
      data: updateData,
    });

    res.json(post);
  } catch (error) {
    console.error('Update blog post error:', error);
    res.status(500).json({ error: 'Failed to update blog post' });
  }
});

/**
 * Delete blog post (Admin only)
 * DELETE /api/blog/admin/posts/:id
 */
router.delete('/admin/posts/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.blogPost.delete({
      where: { id },
    });

    res.json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error('Delete blog post error:', error);
    res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

/**
 * Bulk send blog notification to subscribers (Admin only)
 * POST /api/blog/admin/posts/:id/notify
 */
router.post('/admin/posts/:id/notify', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;

    const post = await prisma.blogPost.findUnique({
      where: { id },
    });

    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    if (post.emailSentToSubscribers) {
      return res.status(400).json({ error: 'Email already sent to subscribers' });
    }

    // TODO: Implement email sending to all active subscribers
    // Get all active subscribers
    const subscribers = await prisma.newsletterSubscription.findMany({
      where: { isActive: true },
      select: { email: true, name: true, unsubscribeToken: true },
    });

    // TODO: Send emails in batches
    // For now, just mark as sent
    await prisma.blogPost.update({
      where: { id },
      data: {
        emailSentToSubscribers: true,
        emailSentAt: new Date(),
      },
    });

    res.json({
      message: 'Blog notification queued for sending',
      subscriberCount: subscribers.length,
    });
  } catch (error) {
    console.error('Send blog notification error:', error);
    res.status(500).json({ error: 'Failed to send blog notification' });
  }
});

module.exports = router;
