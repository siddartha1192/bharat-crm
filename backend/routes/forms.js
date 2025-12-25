const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticate } = require('../middleware/auth');
const { tenantContext, getTenantFilter, autoInjectTenantId } = require('../middleware/tenant');
const prisma = new PrismaClient();

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

// GET all forms for authenticated user
router.get('/', async (req, res) => {
  try {
    const forms = await prisma.form.findMany({
      where: getTenantFilter(req, { userId: req.user.id }),
      include: {
        _count: {
          select: { submissions: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ error: 'Failed to fetch forms' });
  }
});

// GET single form by ID
router.get('/:id', async (req, res) => {
  try {
    const form = await prisma.form.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      }),
      include: {
        _count: {
          select: { submissions: true }
        }
      }
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(form);
  } catch (error) {
    console.error('Error fetching form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

// POST create new form
router.post('/', async (req, res) => {
  try {
    const {
      name,
      title,
      description,
      fields,
      primaryColor,
      buttonText,
      successMessage,
      redirectUrl,
      notificationEmail,
      autoAssignTo,
      requireEmail,
      requirePhone
    } = req.body;

    // Generate unique slug from name
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    let slug = baseSlug;
    let counter = 1;

    // Ensure slug is unique
    while (await prisma.form.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const form = await prisma.form.create({
      data: {
        name,
        slug,
        title,
        description,
        fields: fields || [],
        primaryColor: primaryColor || '#3b82f6',
        buttonText: buttonText || 'Submit',
        successMessage: successMessage || "Thank you! We'll be in touch soon.",
        redirectUrl,
        notificationEmail,
        autoAssignTo,
        requireEmail: requireEmail !== false,
        requirePhone: requirePhone || false,
        userId: req.user.id
      }
    });

    res.status(201).json(form);
  } catch (error) {
    console.error('Error creating form:', error);
    res.status(500).json({ error: 'Failed to create form', message: error.message });
  }
});

// PUT update form
router.put('/:id', async (req, res) => {
  try {
    const existingForm = await prisma.form.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      })
    });

    if (!existingForm) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const {
      name,
      title,
      description,
      fields,
      primaryColor,
      buttonText,
      successMessage,
      redirectUrl,
      notificationEmail,
      autoAssignTo,
      requireEmail,
      requirePhone,
      isActive
    } = req.body;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (fields !== undefined) updateData.fields = fields;
    if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
    if (buttonText !== undefined) updateData.buttonText = buttonText;
    if (successMessage !== undefined) updateData.successMessage = successMessage;
    if (redirectUrl !== undefined) updateData.redirectUrl = redirectUrl;
    if (notificationEmail !== undefined) updateData.notificationEmail = notificationEmail;
    if (autoAssignTo !== undefined) updateData.autoAssignTo = autoAssignTo;
    if (requireEmail !== undefined) updateData.requireEmail = requireEmail;
    if (requirePhone !== undefined) updateData.requirePhone = requirePhone;
    if (isActive !== undefined) updateData.isActive = isActive;

    const form = await prisma.form.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json(form);
  } catch (error) {
    console.error('Error updating form:', error);
    res.status(500).json({ error: 'Failed to update form', message: error.message });
  }
});

// DELETE form
router.delete('/:id', async (req, res) => {
  try {
    const existingForm = await prisma.form.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      })
    });

    if (!existingForm) {
      return res.status(404).json({ error: 'Form not found' });
    }

    await prisma.form.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ error: 'Failed to delete form' });
  }
});

// GET form submissions
router.get('/:id/submissions', async (req, res) => {
  try {
    const form = await prisma.form.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      })
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const { page = '1', limit = '50', status } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const where = { formId: req.params.id };
    if (status && status !== 'all') where.status = status;

    const [submissions, total] = await Promise.all([
      prisma.formSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      }),
      prisma.formSubmission.count({ where })
    ]);

    res.json({
      data: submissions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET form by slug (public - no auth, for embedding)
router.get('/public/slug/:slug', async (req, res) => {
  try {
    const form = await prisma.form.findUnique({
      where: { slug: req.params.slug },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        fields: true,
        primaryColor: true,
        buttonText: true,
        requireEmail: true,
        requirePhone: true,
        isActive: true
      }
    });

    if (!form || !form.isActive) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Increment view count
    await prisma.form.update({
      where: { slug: req.params.slug },
      data: { viewCount: { increment: 1 } }
    });

    res.json(form);
  } catch (error) {
    console.error('Error fetching public form:', error);
    res.status(500).json({ error: 'Failed to fetch form' });
  }
});

// POST form submission (public - no auth)
router.post('/public/submit/:slug', async (req, res) => {
  try {
    const form = await prisma.form.findUnique({
      where: { slug: req.params.slug },
      include: { user: true }
    });

    if (!form || !form.isActive) {
      return res.status(404).json({ error: 'Form not found or inactive' });
    }

    const {
      data,
      utmSource,
      utmMedium,
      utmCampaign
    } = req.body;

    // Extract common fields
    const name = data.name || data.firstName || data.fullName || null;
    const email = data.email || null;
    const phone = data.phone || data.mobile || data.phoneNumber || null;
    const company = data.company || data.companyName || null;

    // Validate required fields
    if (form.requireEmail && !email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (form.requirePhone && !phone) {
      return res.status(400).json({ error: 'Phone is required' });
    }

    // Get request metadata
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const referrer = req.headers['referer'] || req.headers['referrer'];

    // Create submission
    const submission = await prisma.formSubmission.create({
      data: {
        formId: form.id,
        data,
        name,
        email,
        phone,
        company,
        ipAddress,
        userAgent,
        referrer,
        utmSource,
        utmMedium,
        utmCampaign,
        status: 'new'
      }
    });

    // Auto-create lead if configured
    if (name && email) {
      try {
        // Check if lead with this email already exists to prevent duplicates
        const existingLead = await prisma.lead.findFirst({
          where: {
            userId: form.userId,
            email
          }
        });

        if (existingLead) {
          console.log(`⚠️ Lead with email ${email} already exists, skipping lead creation but keeping form submission`);

          // Update submission to reference existing lead
          await prisma.formSubmission.update({
            where: { id: submission.id },
            data: {
              leadId: existingLead.id,
              status: 'duplicate'
            }
          });
        } else {
          // Create new lead
          const leadData = {
            name,
            email,
            phone: phone || '',
            company: company || '',
            source: 'web-form',
            status: 'new',
            priority: 'medium',
            estimatedValue: 0,
            assignedTo: form.autoAssignTo || form.user.name,
            createdBy: form.userId,
            notes: `Form submission from: ${form.name}\n\nSubmission data:\n${JSON.stringify(data, null, 2)}`,
            tags: ['web-form', form.slug],
            userId: form.userId
          };

          // Create lead and associated deal
          const result = await prisma.$transaction(async (tx) => {
          const deal = await tx.deal.create({
            data: {
              title: `${company || 'Lead'} - ${name}`,
              company: company || '',
              contactName: name,
              email,
              phone: phone || '',
              value: 0,
              stage: 'lead',
              probability: 20,
              expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              assignedTo: form.autoAssignTo || form.user.name,
              createdBy: form.userId,
              notes: leadData.notes,
              tags: leadData.tags,
              userId: form.userId
            }
          });

          const lead = await tx.lead.create({
            data: {
              ...leadData,
              dealId: deal.id
            }
          });

          // Update submission with lead ID
          await tx.formSubmission.update({
            where: { id: submission.id },
            data: {
              leadId: lead.id,
              status: 'converted'
            }
          });

          return { lead, deal };
        });

        console.log(`✅ Lead created from form submission: ${result.lead.id}`);
        }
      } catch (error) {
        console.error('Error creating lead from submission:', error);
        // Don't fail the submission if lead creation fails
      }
    }

    // Increment submission count
    await prisma.form.update({
      where: { id: form.id },
      data: { submissionCount: { increment: 1 } }
    });

    // Send notification email if configured
    if (form.notificationEmail) {
      // TODO: Implement email notification
      console.log(`📧 Would send notification to: ${form.notificationEmail}`);
    }

    res.json({
      success: true,
      message: form.successMessage,
      redirectUrl: form.redirectUrl
    });
  } catch (error) {
    console.error('Error processing form submission:', error);
    res.status(500).json({ error: 'Failed to process submission' });
  }
});

// GET form stats
router.get('/:id/stats', async (req, res) => {
  try {
    const form = await prisma.form.findFirst({
      where: getTenantFilter(req, {
        id: req.params.id,
        userId: req.user.id
      })
    });

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    const [totalSubmissions, convertedLeads, recentSubmissions] = await Promise.all([
      prisma.formSubmission.count({ where: { formId: form.id } }),
      prisma.formSubmission.count({ where: { formId: form.id, status: 'converted' } }),
      prisma.formSubmission.findMany({
        where: { formId: form.id },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const conversionRate = totalSubmissions > 0 ? (convertedLeads / totalSubmissions) * 100 : 0;

    res.json({
      viewCount: form.viewCount,
      totalSubmissions,
      convertedLeads,
      conversionRate: conversionRate.toFixed(2),
      recentSubmissions
    });
  } catch (error) {
    console.error('Error fetching form stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
