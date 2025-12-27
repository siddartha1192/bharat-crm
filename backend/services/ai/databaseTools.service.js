/**
 * Database Tools for Portal AI
 * Provides structured functions for AI to query the database
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class DatabaseToolsService {
  /**
   * Parse natural language date strings into Date objects
   */
  parseDate(dateString) {
    if (!dateString) return null;

    // If it's already a valid ISO date string, use it
    const isoDate = new Date(dateString);
    if (!isNaN(isoDate.getTime())) {
      return isoDate;
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Handle common date strings
    const lowerStr = dateString.toLowerCase().trim();

    // "start of month" or "beginning of month"
    if (lowerStr.includes('start of month') || lowerStr.includes('beginning of month')) {
      return new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // "end of month"
    if (lowerStr.includes('end of month')) {
      return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    // "start of week" or "beginning of week"
    if (lowerStr.includes('start of week') || lowerStr.includes('beginning of week')) {
      const dayOfWeek = now.getDay();
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start of week
      return new Date(today.getTime() + diff * 24 * 60 * 60 * 1000);
    }

    // "start of year"
    if (lowerStr.includes('start of year') || lowerStr.includes('beginning of year')) {
      return new Date(now.getFullYear(), 0, 1);
    }

    // "X days ago"
    const daysAgoMatch = lowerStr.match(/(\d+)\s*days?\s*ago/);
    if (daysAgoMatch) {
      const days = parseInt(daysAgoMatch[1]);
      return new Date(today.getTime() - days * 24 * 60 * 60 * 1000);
    }

    // "X weeks ago"
    const weeksAgoMatch = lowerStr.match(/(\d+)\s*weeks?\s*ago/);
    if (weeksAgoMatch) {
      const weeks = parseInt(weeksAgoMatch[1]);
      return new Date(today.getTime() - weeks * 7 * 24 * 60 * 60 * 1000);
    }

    // "X months ago"
    const monthsAgoMatch = lowerStr.match(/(\d+)\s*months?\s*ago/);
    if (monthsAgoMatch) {
      const months = parseInt(monthsAgoMatch[1]);
      return new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
    }

    // "yesterday"
    if (lowerStr === 'yesterday') {
      return new Date(today.getTime() - 24 * 60 * 60 * 1000);
    }

    // "today"
    if (lowerStr === 'today') {
      return today;
    }

    // "tomorrow"
    if (lowerStr === 'tomorrow') {
      return new Date(today.getTime() + 24 * 60 * 60 * 1000);
    }

    // If we can't parse it, return null
    console.warn(`Could not parse date string: "${dateString}"`);
    return null;
  }

  /**
   * Get available pipeline stages for a user (tenant-based)
   * Returns all active pipeline stages for the user's tenant
   */
  async getPipelineStages(userId) {
    try {
      // Get user's tenantId first
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tenantId: true }
      });

      if (!user) {
        console.error('User not found:', userId);
        return [];
      }

      const stages = await prisma.pipelineStage.findMany({
        where: {
          tenantId: user.tenantId,
          isActive: true,
        },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          color: true,
          order: true,
          isDefault: true,
          isSystemDefault: true,
          stageType: true,
        },
      });

      return stages;
    } catch (error) {
      console.error('Error fetching pipeline stages:', error);
      return [];
    }
  }

  /**
   * Get all available tools/functions for the AI
   */
  getTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'query_leads',
          description: 'Query leads from the CRM database. IMPORTANT: Every lead automatically creates a linked deal in the pipeline. When a lead status changes, the linked deal stage updates automatically. The user has configured their own custom pipeline stages - use the AVAILABLE PIPELINE STAGES section in your system prompt to see the exact stage names and slugs for this tenant.',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'],
                description: 'Filter by lead status',
              },
              source: {
                type: 'string',
                description: 'Filter by lead source (e.g., website, referral, email)',
              },
              dateFrom: {
                type: 'string',
                description: 'Filter leads created after this date (ISO format)',
              },
              dateTo: {
                type: 'string',
                description: 'Filter leads created before this date (ISO format)',
              },
              searchTerm: {
                type: 'string',
                description: 'Search in name, email, company, or phone',
              },
              sortBy: {
                type: 'string',
                enum: ['createdAt', 'estimatedValue', 'name', 'updatedAt'],
                description: 'Field to sort by',
              },
              sortOrder: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort order',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default 10, max 100)',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'query_contacts',
          description: 'Query contacts from the CRM database',
          parameters: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                enum: ['customer', 'prospect', 'partner', 'vendor'],
                description: 'Filter by contact type',
              },
              searchTerm: {
                type: 'string',
                description: 'Search in name, email, company, or phone',
              },
              dateFrom: {
                type: 'string',
                description: 'Filter contacts created after this date',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'query_deals',
          description: 'Query deals/opportunities from the pipeline. IMPORTANT: Deals are automatically created when leads are created - each lead has a linked deal. The user has configured their own custom pipeline stages - refer to the AVAILABLE PIPELINE STAGES section in your system prompt to see the exact stage names and slugs for this tenant. When deal stages change, linked lead statuses update automatically.',
          parameters: {
            type: 'object',
            properties: {
              stage: {
                type: 'string',
                description: 'OPTIONAL - Filter by specific pipeline stage slug. Use the exact slug values from the AVAILABLE PIPELINE STAGES section in your system prompt. IMPORTANT: Omit this parameter entirely to get ALL deals across all stages. Do NOT use "all" or empty string - simply omit the parameter.',
              },
              minValue: {
                type: 'number',
                description: 'Minimum deal value',
              },
              maxValue: {
                type: 'number',
                description: 'Maximum deal value',
              },
              dateFrom: {
                type: 'string',
                description: 'Filter deals created after this date',
              },
              sortBy: {
                type: 'string',
                enum: ['value', 'createdAt', 'probability', 'expectedCloseDate'],
                description: 'Field to sort by (default: value)',
              },
              sortOrder: {
                type: 'string',
                enum: ['asc', 'desc'],
                description: 'Sort order (default: desc)',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results (default: 10, max: 100)',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'query_tasks',
          description: 'Query tasks and to-do items',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['todo', 'in-progress', 'completed'],
                description: 'Filter by task status',
              },
              priority: {
                type: 'string',
                enum: ['low', 'medium', 'high', 'urgent'],
                description: 'Filter by priority',
              },
              assignedTo: {
                type: 'string',
                description: 'Filter by assigned user name',
              },
              dueDateFrom: {
                type: 'string',
                description: 'Filter tasks due after this date',
              },
              dueDateTo: {
                type: 'string',
                description: 'Filter tasks due before this date',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'query_invoices',
          description: 'Query invoices and billing information',
          parameters: {
            type: 'object',
            properties: {
              status: {
                type: 'string',
                enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
                description: 'Filter by invoice status',
              },
              minAmount: {
                type: 'number',
                description: 'Minimum invoice amount',
              },
              dateFrom: {
                type: 'string',
                description: 'Filter invoices created after this date',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
              },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'get_analytics',
          description: 'Get aggregated analytics and statistics',
          parameters: {
            type: 'object',
            properties: {
              metric: {
                type: 'string',
                enum: [
                  'leads_by_status',
                  'deals_by_stage',
                  'conversion_rate',
                  'total_revenue',
                  'monthly_revenue',
                  'tasks_by_status',
                  'top_leads',
                  'pipeline_value',
                ],
                description: 'The analytics metric to retrieve',
              },
              dateFrom: {
                type: 'string',
                description: 'Start date for time-based metrics',
              },
              dateTo: {
                type: 'string',
                description: 'End date for time-based metrics',
              },
              groupBy: {
                type: 'string',
                enum: ['day', 'week', 'month'],
                description: 'Time grouping for trend analysis',
              },
            },
            required: ['metric'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'query_calendar_events',
          description: 'Query calendar events and appointments',
          parameters: {
            type: 'object',
            properties: {
              startDate: {
                type: 'string',
                description: 'Filter events starting after this date',
              },
              endDate: {
                type: 'string',
                description: 'Filter events starting before this date',
              },
              searchTerm: {
                type: 'string',
                description: 'Search in event title or description',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results',
              },
            },
          },
        },
      },
    ];
  }

  /**
   * Execute a tool function
   */
  async executeTool(toolName, args, userId) {
    console.log(`🔧 Executing tool: ${toolName}`, args);
    console.log(`👤 User ID: ${userId}`);

    try {
      switch (toolName) {
        case 'query_leads':
          return await this.queryLeads(args, userId);
        case 'query_contacts':
          return await this.queryContacts(args, userId);
        case 'query_deals':
          return await this.queryDeals(args, userId);
        case 'query_tasks':
          return await this.queryTasks(args, userId);
        case 'query_invoices':
          return await this.queryInvoices(args, userId);
        case 'get_analytics':
          return await this.getAnalytics(args, userId);
        case 'query_calendar_events':
          return await this.queryCalendarEvents(args, userId);
        default:
          return { error: `Unknown tool: ${toolName}` };
      }
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Query leads with filters
   */
  async queryLeads(args, userId) {
    const where = {
      userId, // Filter by logged-in user
    };

    // Support both old status field and new stageId
    if (args.status) where.status = args.status;
    if (args.source) where.source = { contains: args.source, mode: 'insensitive' };
    if (args.dateFrom || args.dateTo) {
      where.createdAt = {};
      if (args.dateFrom) {
        const parsedDate = this.parseDate(args.dateFrom);
        if (parsedDate) where.createdAt.gte = parsedDate;
      }
      if (args.dateTo) {
        const parsedDate = this.parseDate(args.dateTo);
        if (parsedDate) where.createdAt.lte = parsedDate;
      }
    }
    if (args.searchTerm) {
      where.OR = [
        { name: { contains: args.searchTerm, mode: 'insensitive' } },
        { email: { contains: args.searchTerm, mode: 'insensitive' } },
        { company: { contains: args.searchTerm, mode: 'insensitive' } },
        { phone: { contains: args.searchTerm, mode: 'insensitive' } },
      ];
    }

    const orderBy = {};
    orderBy[args.sortBy || 'createdAt'] = args.sortOrder || 'desc';

    const leads = await prisma.lead.findMany({
      where,
      orderBy,
      take: Math.min(args.limit || 10, 100),
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        stageId: true,
        pipelineStage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
        source: true,
        priority: true,
        estimatedValue: true,
        assignedTo: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Format leads with stage information
    const formattedLeads = leads.map(lead => ({
      ...lead,
      stage: lead.pipelineStage?.name || lead.status,
      stageSlug: lead.pipelineStage?.slug || lead.status,
      stageColor: lead.pipelineStage?.color,
    }));

    return {
      count: formattedLeads.length,
      leads: formattedLeads,
      filters: args,
    };
  }

  /**
   * Query contacts with filters
   */
  async queryContacts(args, userId) {
    const where = {
      userId, // Filter by logged-in user
    };

    if (args.type) where.type = args.type;
    if (args.dateFrom) {
      const parsedDate = this.parseDate(args.dateFrom);
      if (parsedDate) where.createdAt = { gte: parsedDate };
    }
    if (args.searchTerm) {
      where.OR = [
        { name: { contains: args.searchTerm, mode: 'insensitive' } },
        { email: { contains: args.searchTerm, mode: 'insensitive' } },
        { company: { contains: args.searchTerm, mode: 'insensitive' } },
      ];
    }

    const contacts = await prisma.contact.findMany({
      where,
      take: Math.min(args.limit || 10, 100),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        type: true,
        lifetimeValue: true,
        createdAt: true,
      },
    });

    return {
      count: contacts.length,
      contacts,
    };
  }

  /**
   * Query deals with filters
   */
  async queryDeals(args, userId) {
    const where = {
      userId, // Filter by logged-in user
    };

    // Only filter by stage if it's a valid stage (not 'all' or empty)
    // Support both old stage field and new stageId
    if (args.stage && args.stage !== 'all' && args.stage.trim() !== '') {
      where.stage = args.stage;
    }

    if (args.minValue || args.maxValue) {
      where.value = {};
      if (args.minValue) where.value.gte = args.minValue;
      if (args.maxValue) where.value.lte = args.maxValue;
    }
    if (args.dateFrom) {
      const parsedDate = this.parseDate(args.dateFrom);
      if (parsedDate) where.createdAt = { gte: parsedDate };
    }

    // Support dynamic sorting based on args
    const validSortFields = ['value', 'createdAt', 'probability', 'expectedCloseDate'];
    const sortField = args.sortBy && validSortFields.includes(args.sortBy) ? args.sortBy : 'value';
    const sortOrder = args.sortOrder === 'asc' ? 'asc' : 'desc';

    const deals = await prisma.deal.findMany({
      where,
      take: Math.min(args.limit || 10, 100),
      orderBy: { [sortField]: sortOrder },
      select: {
        id: true,
        title: true,
        company: true,
        contactName: true,
        stage: true,
        stageId: true,
        pipelineStage: {
          select: {
            id: true,
            name: true,
            slug: true,
            color: true,
          },
        },
        value: true,
        probability: true,
        expectedCloseDate: true,
        createdAt: true,
      },
    });

    // Format deals with stage information
    const formattedDeals = deals.map(deal => ({
      ...deal,
      stageName: deal.pipelineStage?.name || deal.stage,
      stageSlug: deal.pipelineStage?.slug || deal.stage,
      stageColor: deal.pipelineStage?.color,
    }));

    const totalValue = formattedDeals.reduce((sum, deal) => sum + deal.value, 0);

    return {
      count: formattedDeals.length,
      totalValue,
      deals: formattedDeals,
    };
  }

  /**
   * Query tasks with filters
   */
  async queryTasks(args, userId) {
    const where = {
      userId, // Filter by logged-in user
    };

    if (args.status) where.status = args.status;
    if (args.priority) where.priority = args.priority;
    if (args.assignedTo) {
      where.assignedTo = { contains: args.assignedTo, mode: 'insensitive' };
    }
    if (args.dueDateFrom || args.dueDateTo) {
      where.dueDate = {};
      if (args.dueDateFrom) {
        const parsedDate = this.parseDate(args.dueDateFrom);
        if (parsedDate) where.dueDate.gte = parsedDate;
      }
      if (args.dueDateTo) {
        const parsedDate = this.parseDate(args.dueDateTo);
        if (parsedDate) where.dueDate.lte = parsedDate;
      }
    }

    const tasks = await prisma.task.findMany({
      where,
      take: Math.min(args.limit || 10, 100),
      orderBy: { dueDate: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        assignedTo: true,
        dueDate: true,
        createdAt: true,
        completedAt: true,
      },
    });

    return {
      count: tasks.length,
      tasks,
    };
  }

  /**
   * Query invoices with filters
   */
  async queryInvoices(args, userId) {
    const where = {
      userId, // Filter by logged-in user
    };

    if (args.status) where.status = args.status;
    if (args.minAmount) where.total = { gte: args.minAmount };
    if (args.dateFrom) {
      const parsedDate = this.parseDate(args.dateFrom);
      if (parsedDate) where.createdAt = { gte: parsedDate };
    }

    const invoices = await prisma.invoice.findMany({
      where,
      take: Math.min(args.limit || 10, 100),
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        invoiceNumber: true,
        customerName: true,
        status: true,
        total: true,
        dueDate: true,
        createdAt: true,
      },
    });

    const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);

    return {
      count: invoices.length,
      totalAmount,
      invoices,
    };
  }

  /**
   * Query calendar events
   */
  async queryCalendarEvents(args, userId) {
    const where = {
      userId, // Filter by logged-in user
    };

    if (args.startDate || args.endDate) {
      where.startTime = {};

      let startParsed = null;
      let endParsed = null;

      if (args.startDate) {
        startParsed = this.parseDate(args.startDate);
        if (startParsed) where.startTime.gte = startParsed;
      }

      if (args.endDate) {
        endParsed = this.parseDate(args.endDate);
        if (endParsed) where.startTime.lte = endParsed;
      }

      // If only startDate is provided and it's a single day (like "today"),
      // automatically set end to end of that day
      if (startParsed && !endParsed) {
        const endOfDay = new Date(startParsed);
        endOfDay.setHours(23, 59, 59, 999);
        where.startTime.lte = endOfDay;
      }
    }
    if (args.searchTerm) {
      where.OR = [
        { title: { contains: args.searchTerm, mode: 'insensitive' } },
        { description: { contains: args.searchTerm, mode: 'insensitive' } },
      ];
    }

    const events = await prisma.calendarEvent.findMany({
      where,
      take: Math.min(args.limit || 10, 100),
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        attendees: true,
      },
    });

    return {
      count: events.length,
      events,
    };
  }

  /**
   * Get analytics and aggregated metrics
   */
  async getAnalytics(args, userId) {
    const { metric, dateFrom, dateTo, groupBy } = args;

    const dateFilter = {};
    if (dateFrom) {
      const parsedDate = this.parseDate(dateFrom);
      if (parsedDate) dateFilter.gte = parsedDate;
    }
    if (dateTo) {
      const parsedDate = this.parseDate(dateTo);
      if (parsedDate) dateFilter.lte = parsedDate;
    }

    switch (metric) {
      case 'leads_by_status':
        const leadsByStatus = await prisma.lead.groupBy({
          by: ['status'],
          _count: { id: true },
          where: {
            userId, // Filter by logged-in user
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
        });
        return {
          metric: 'leads_by_status',
          data: leadsByStatus.map(g => ({ status: g.status, count: g._count.id })),
        };

      case 'deals_by_stage':
        // Pipeline stages are customizable - get actual stage names from PipelineStage table
        const dealsByStage = await prisma.deal.groupBy({
          by: ['stageId'],
          _count: { id: true },
          _sum: { value: true },
          where: {
            userId, // Filter by logged-in user
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
        });

        // Get stage names for each stageId
        const stageIds = dealsByStage.map(g => g.stageId).filter(Boolean);
        const stages = await prisma.pipelineStage.findMany({
          where: { id: { in: stageIds } },
          select: { id: true, name: true, slug: true },
        });

        const stageMap = Object.fromEntries(stages.map(s => [s.id, s]));

        return {
          metric: 'deals_by_stage',
          data: dealsByStage.map(g => ({
            stageId: g.stageId,
            stage: stageMap[g.stageId]?.name || 'Unknown',
            stageSlug: stageMap[g.stageId]?.slug || g.stageId,
            count: g._count.id,
            totalValue: g._sum.value || 0,
          })),
        };

      case 'conversion_rate':
        const totalLeads = await prisma.lead.count({
          where: {
            userId, // Filter by logged-in user
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
        });

        // Get user's tenantId to find won stages
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { tenantId: true }
        });

        // Find "won" stages dynamically (look for stages with "won" in slug)
        const wonStages = await prisma.pipelineStage.findMany({
          where: {
            tenantId: user.tenantId,
            slug: { contains: 'won' },
            isActive: true,
          },
          select: { id: true },
        });

        const wonStageIds = wonStages.map(s => s.id);

        const wonDeals = wonStageIds.length > 0 ? await prisma.deal.count({
          where: {
            userId, // Filter by logged-in user
            stageId: { in: wonStageIds },
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
        }) : 0;

        return {
          metric: 'conversion_rate',
          data: {
            totalLeads,
            wonDeals,
            conversionRate: totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(2) : 0,
          },
        };

      case 'total_revenue':
        const revenue = await prisma.invoice.aggregate({
          _sum: { total: true },
          where: {
            userId, // Filter by logged-in user
            status: 'paid',
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
        });
        return {
          metric: 'total_revenue',
          data: {
            totalRevenue: revenue._sum.total || 0,
          },
        };

      case 'pipeline_value':
        // Get user's tenantId to find closed stages
        const pipelineUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { tenantId: true }
        });

        // Find "closed" stages dynamically (won/lost)
        const closedStages = await prisma.pipelineStage.findMany({
          where: {
            tenantId: pipelineUser.tenantId,
            OR: [
              { slug: { contains: 'won' } },
              { slug: { contains: 'lost' } },
              { slug: { contains: 'closed' } },
            ],
            isActive: true,
          },
          select: { id: true },
        });

        const closedStageIds = closedStages.map(s => s.id);

        const pipelineValue = await prisma.deal.aggregate({
          _sum: { value: true },
          where: {
            userId, // Filter by logged-in user
            ...(closedStageIds.length > 0 ? { stageId: { notIn: closedStageIds } } : {}),
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
        });

        return {
          metric: 'pipeline_value',
          data: {
            totalPipelineValue: pipelineValue._sum.value || 0,
          },
        };

      case 'tasks_by_status':
        const tasksByStatus = await prisma.task.groupBy({
          by: ['status'],
          _count: { id: true },
          where: {
            userId, // Filter by logged-in user
            ...(dateFrom || dateTo ? { createdAt: dateFilter } : {}),
          },
        });
        return {
          metric: 'tasks_by_status',
          data: tasksByStatus.map(g => ({ status: g.status, count: g._count.id })),
        };

      default:
        return { error: `Unknown metric: ${metric}` };
    }
  }
}

module.exports = new DatabaseToolsService();
