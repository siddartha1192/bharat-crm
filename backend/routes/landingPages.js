const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const prisma = require('../lib/prisma');

// Apply authentication and tenant context to authenticated routes
router.use((req, res, next) => {
  // Skip auth for public routes
  if (req.path.startsWith('/public/')) {
    return next();
  }
  authenticate(req, res, next);
});

router.use((req, res, next) => {
  // Skip tenant context for public routes
  if (req.path.startsWith('/public/')) {
    return next();
  }
  tenantContext(req, res, next);
});

// Default landing page content structure
const getDefaultContent = () => ({
  header: {
    logo: { type: 'text', value: 'Your Company' },
    menu: [
      { label: 'Home', href: '#home' },
      { label: 'About', href: '#about' },
      { label: 'Services', href: '#services' },
      { label: 'Contact', href: '#contact' }
    ],
    cta: { text: 'Get Started', href: '#contact' },
    socialMedia: []
  },
  hero: {
    headline: 'Transform Your Business Today',
    tagline: 'The #1 Solution for Growing Companies',
    description: 'Discover how our innovative platform can help you achieve your goals faster than ever before.',
    cta: { text: 'Start Free Trial', href: '#contact' },
    image: { type: 'placeholder', url: '' }
  },
  positioning: {
    statement: 'Trusted by 10,000+ companies worldwide',
    achievements: [
      { label: 'Companies', value: '10,000+' },
      { label: 'Countries', value: '50+' },
      { label: 'Satisfaction', value: '99%' }
    ]
  },
  about: {
    headline: 'About Us',
    description: 'We are dedicated to helping businesses succeed through innovative solutions and exceptional service.',
    image: { type: 'placeholder', url: '' }
  },
  services: {
    headline: 'Our Services',
    description: 'We offer comprehensive solutions tailored to your needs',
    serviceList: [
      {
        title: 'Service 1',
        description: 'Description of service 1',
        icon: 'check-circle'
      },
      {
        title: 'Service 2',
        description: 'Description of service 2',
        icon: 'star'
      },
      {
        title: 'Service 3',
        description: 'Description of service 3',
        icon: 'zap'
      }
    ],
    cta: { text: 'Schedule Free Consultation', href: '#contact' }
  },
  testimonials: {
    headline: 'What Our Clients Say',
    testimonialList: [
      {
        name: 'John Doe',
        company: 'ABC Corp',
        text: 'This service transformed our business!',
        rating: 5
      }
    ]
  },
  clients: {
    headline: 'Trusted By',
    clientList: []
  },
  blog: {
    headline: 'Latest Insights',
    posts: []
  },
  leadMagnet: {
    headline: 'Download Your Free Lead Generation Guide',
    description: 'Learn proven strategies to grow your business',
    cta: { text: 'Download Free Guide', href: '#contact' }
  },
  footer: {
    companyName: 'Your Company',
    tagline: 'Your Success Partner',
    socialMedia: [],
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' }
    ]
  }
});

// Default theme
const getDefaultTheme = () => ({
  colors: {
    primary: '#3b82f6',
    secondary: '#8b5cf6',
    accent: '#10b981',
    background: '#ffffff',
    text: '#1f2937',
    textLight: '#6b7280'
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif'
  },
  spacing: {
    section: '4rem',
    container: '1280px'
  }
});

// GET all landing pages for authenticated user
router.get('/', async (req, res) => {
  try {
    const pages = await prisma.landingPage.findMany({
      where: getTenantFilter(req, { userId: req.user.id }),
      include: {
        form: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(pages);
  } catch (error) {
    console.error('Error fetching landing pages:', error);
    res.status(500).json({ error: 'Failed to fetch landing pages' });
  }
});

// GET single landing page by ID
router.get('/:id', async (req, res) => {
  try {
    const page = await prisma.landingPage.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      }),
      include: {
        form: true
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    res.json(page);
  } catch (error) {
    console.error('Error fetching landing page:', error);
    res.status(500).json({ error: 'Failed to fetch landing page' });
  }
});

// POST create new landing page
router.post('/', async (req, res) => {
  try {
    const {
      name,
      title,
      metaDescription,
      content,
      theme,
      formId,
      headScripts,
      bodyScripts
    } = req.body;

    // Generate unique slug from name
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (await prisma.landingPage.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const page = await prisma.landingPage.create({
      data: {
        name,
        slug,
        title: title || name,
        metaDescription,
        content: content || getDefaultContent(),
        theme: theme || getDefaultTheme(),
        formId,
        headScripts,
        bodyScripts,
        isPublished: false,
        userId: req.user.id,
        tenantId: req.tenant.id
      },
      include: {
        form: true
      }
    });

    res.status(201).json(page);
  } catch (error) {
    console.error('Error creating landing page:', error);
    res.status(500).json({ error: 'Failed to create landing page', message: error.message });
  }
});

// PUT update landing page
router.put('/:id', async (req, res) => {
  try {
    const existingPage = await prisma.landingPage.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      })
    });

    if (!existingPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    const {
      name,
      title,
      metaDescription,
      content,
      theme,
      formId,
      headScripts,
      bodyScripts,
      isPublished,
      customDomain
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (metaDescription !== undefined) updateData.metaDescription = metaDescription;
    if (content !== undefined) updateData.content = content;
    if (theme !== undefined) updateData.theme = theme;
    if (formId !== undefined) updateData.formId = formId;
    if (headScripts !== undefined) updateData.headScripts = headScripts;
    if (bodyScripts !== undefined) updateData.bodyScripts = bodyScripts;
    if (customDomain !== undefined) updateData.customDomain = customDomain;

    // Handle publishing
    if (isPublished !== undefined) {
      updateData.isPublished = isPublished;
      if (isPublished && !existingPage.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const page = await prisma.landingPage.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        form: true
      }
    });

    res.json(page);
  } catch (error) {
    console.error('Error updating landing page:', error);
    res.status(500).json({ error: 'Failed to update landing page', message: error.message });
  }
});

// DELETE landing page
router.delete('/:id', async (req, res) => {
  try {
    const existingPage = await prisma.landingPage.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      })
    });

    if (!existingPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    await prisma.landingPage.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Landing page deleted successfully' });
  } catch (error) {
    console.error('Error deleting landing page:', error);
    res.status(500).json({ error: 'Failed to delete landing page' });
  }
});

// POST AI edit landing page
router.post('/:id/ai-edit', async (req, res) => {
  try {
    const page = await prisma.landingPage.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      })
    });

    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    const { prompt, section } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Get tenant settings for OpenAI configuration
    const tenant = await prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { settings: true }
    });
    const openaiConfig = tenant?.settings?.openai;

    if (!openaiConfig || !openaiConfig.apiKey) {
      return res.status(400).json({
        error: 'OpenAI API not configured for this tenant. Please configure OpenAI API settings in Settings.'
      });
    }

    // Use OpenAI to generate content based on prompt
    const OpenAI = require('openai');
    const openai = new OpenAI({
      apiKey: openaiConfig.apiKey
    });

    const systemPrompt = `You are a professional copywriter and web designer.
Your task is to modify landing page content based on user instructions.
The current content section is: ${JSON.stringify(page.content[section] || page.content, null, 2)}

Generate updated content that maintains the same structure but with improved copy based on the user's request.
Return ONLY valid JSON that matches the structure of the input.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const aiGeneratedContent = JSON.parse(response.choices[0].message.content);

    // Update the page content
    const updatedContent = { ...page.content };
    if (section) {
      updatedContent[section] = aiGeneratedContent;
    } else {
      Object.assign(updatedContent, aiGeneratedContent);
    }

    // Save AI prompt history
    const aiPrompts = page.aiPrompts || [];
    aiPrompts.push({
      timestamp: new Date(),
      prompt,
      section,
      result: aiGeneratedContent
    });

    const updatedPage = await prisma.landingPage.update({
      where: { id: req.params.id },
      data: {
        content: updatedContent,
        aiPrompts
      }
    });

    res.json({
      success: true,
      updatedContent: aiGeneratedContent,
      page: updatedPage
    });
  } catch (error) {
    console.error('Error AI editing landing page:', error);
    res.status(500).json({
      error: 'Failed to edit landing page with AI',
      message: error.message
    });
  }
});

// GET landing page by slug (public - no auth)
router.get('/public/slug/:slug', async (req, res) => {
  try {
    const page = await prisma.landingPage.findUnique({
      where: { slug: req.params.slug },
      include: {
        form: {
          select: {
            id: true,
            slug: true,
            title: true,
            description: true,
            fields: true,
            primaryColor: true,
            buttonText: true,
            successMessage: true
          }
        }
      }
    });

    if (!page || !page.isPublished) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    // Increment view count
    await prisma.landingPage.update({
      where: { slug: req.params.slug },
      data: { viewCount: { increment: 1 } }
    });

    res.json(page);
  } catch (error) {
    console.error('Error fetching public landing page:', error);
    res.status(500).json({ error: 'Failed to fetch landing page' });
  }
});

// GET landing page stats
router.get('/:id/stats', async (req, res) => {
  try {
    const page = await prisma.landingPage.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      }),
      include: {
        form: {
          include: {
            _count: {
              select: { submissions: true }
            }
          }
        }
      }
    });

    if (!page) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    const stats = {
      viewCount: page.viewCount,
      isPublished: page.isPublished,
      publishedAt: page.publishedAt,
      formSubmissions: page.form ? page.form._count.submissions : 0,
      conversionRate: page.viewCount > 0 && page.form
        ? ((page.form._count.submissions / page.viewCount) * 100).toFixed(2)
        : 0
    };

    res.json(stats);
  } catch (error) {
    console.error('Error fetching landing page stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST duplicate landing page
router.post('/:id/duplicate', async (req, res) => {
  try {
    const originalPage = await prisma.landingPage.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      })
    });

    if (!originalPage) {
      return res.status(404).json({ error: 'Landing page not found' });
    }

    // Generate unique slug
    const baseSlug = `${originalPage.slug}-copy`;
    let slug = baseSlug;
    let counter = 1;

    while (await prisma.landingPage.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const duplicatedPage = await prisma.landingPage.create({
      data: {
        name: `${originalPage.name} (Copy)`,
        slug,
        title: originalPage.title,
        metaDescription: originalPage.metaDescription,
        content: originalPage.content,
        theme: originalPage.theme,
        headScripts: originalPage.headScripts,
        bodyScripts: originalPage.bodyScripts,
        formId: originalPage.formId,
        isPublished: false,
        userId: req.user.id,
        tenantId: req.tenant.id
      },
      include: {
        form: true
      }
    });

    res.status(201).json(duplicatedPage);
  } catch (error) {
    console.error('Error duplicating landing page:', error);
    res.status(500).json({ error: 'Failed to duplicate landing page' });
  }
});

module.exports = router;
