import { Lead, Contact, Invoice, Deal, Task } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'An error occurred' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Helper functions to convert date strings to Date objects
function convertDealDates(deal: any): Deal {
  return {
    ...deal,
    expectedCloseDate: new Date(deal.expectedCloseDate),
    createdAt: new Date(deal.createdAt),
    updatedAt: new Date(deal.updatedAt),
  };
}

function convertTaskDates(task: any): Task {
  return {
    ...task,
    dueDate: new Date(task.dueDate),
    createdAt: new Date(task.createdAt),
    updatedAt: new Date(task.updatedAt),
    completedAt: task.completedAt ? new Date(task.completedAt) : undefined,
  };
}

function convertInvoiceDates(invoice: any): Invoice {
  return {
    ...invoice,
    dueDate: invoice.dueDate,
    paymentDate: invoice.paymentDate || undefined,
  };
}

// ============ LEADS API ============
export const leadsAPI = {
  // Get all leads with optional filters
  getAll: async (filters?: { status?: string; assignedTo?: string }): Promise<Lead[]> => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.assignedTo) {
      params.append('assignedTo', filters.assignedTo);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<Lead[]>(`/leads${query}`);
  },

  // Get single lead by ID
  getById: async (id: string): Promise<Lead> => {
    return fetchAPI<Lead>(`/leads/${id}`);
  },

  // Create new lead
  create: async (lead: Omit<Lead, 'id' | 'createdAt' | 'updatedAt'>): Promise<Lead> => {
    return fetchAPI<Lead>('/leads', {
      method: 'POST',
      body: JSON.stringify(lead),
    });
  },

  // Update existing lead
  update: async (id: string, lead: Partial<Lead>): Promise<Lead> => {
    return fetchAPI<Lead>(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(lead),
    });
  },

  // Delete lead
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/leads/${id}`, {
      method: 'DELETE',
    });
  },

  // Get lead statistics
  getStats: async (): Promise<{
    total: number;
    new: number;
    qualified: number;
    totalValue: number;
  }> => {
    return fetchAPI('/leads/stats/summary');
  },
};

// ============ CONTACTS API ============
export const contactsAPI = {
  // Get all contacts with optional filters
  getAll: async (filters?: { type?: string; assignedTo?: string }): Promise<Contact[]> => {
    const params = new URLSearchParams();
    if (filters?.type && filters.type !== 'all') {
      params.append('type', filters.type);
    }
    if (filters?.assignedTo) {
      params.append('assignedTo', filters.assignedTo);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<Contact[]>(`/contacts${query}`);
  },

  // Get single contact by ID
  getById: async (id: string): Promise<Contact> => {
    return fetchAPI<Contact>(`/contacts/${id}`);
  },

  // Create new contact
  create: async (contact: Omit<Contact, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contact> => {
    return fetchAPI<Contact>('/contacts', {
      method: 'POST',
      body: JSON.stringify(contact),
    });
  },

  // Update existing contact
  update: async (id: string, contact: Partial<Contact>): Promise<Contact> => {
    return fetchAPI<Contact>(`/contacts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(contact),
    });
  },

  // Delete contact
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/contacts/${id}`, {
      method: 'DELETE',
    });
  },

  // Get contact statistics
  getStats: async (): Promise<{
    total: number;
    customers: number;
    vendors: number;
    totalLifetimeValue: number;
  }> => {
    return fetchAPI('/contacts/stats/summary');
  },
};

// ============ INVOICES API ============
export const invoicesAPI = {
  // Get all invoices with optional filters
  getAll: async (filters?: { status?: string; clientId?: string }): Promise<Invoice[]> => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.clientId) {
      params.append('clientId', filters.clientId);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<Invoice[]>(`/invoices${query}`);
  },

  // Get single invoice by ID
  getById: async (id: string): Promise<Invoice> => {
    return fetchAPI<Invoice>(`/invoices/${id}`);
  },

  // Create new invoice
  create: async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> => {
    return fetchAPI<Invoice>('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
  },

  // Update existing invoice
  update: async (id: string, invoice: Partial<Invoice>): Promise<Invoice> => {
    return fetchAPI<Invoice>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice),
    });
  },

  // Delete invoice
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/invoices/${id}`, {
      method: 'DELETE',
    });
  },

  // Get invoice statistics
  getStats: async (): Promise<{
    totalInvoices: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
  }> => {
    return fetchAPI('/invoices/stats/summary');
  },
};

// ============ DEALS API ============
export const dealsAPI = {
  // Get all deals with optional filters
  getAll: async (filters?: { stage?: string; assignedTo?: string }): Promise<Deal[]> => {
    const params = new URLSearchParams();
    if (filters?.stage && filters.stage !== 'all') {
      params.append('stage', filters.stage);
    }
    if (filters?.assignedTo) {
      params.append('assignedTo', filters.assignedTo);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const deals = await fetchAPI<any[]>(`/deals${query}`);
    return deals.map(convertDealDates);
  },

  // Get single deal by ID
  getById: async (id: string): Promise<Deal> => {
    const deal = await fetchAPI<any>(`/deals/${id}`);
    return convertDealDates(deal);
  },

  // Create new deal
  create: async (deal: Omit<Deal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deal> => {
    const createdDeal = await fetchAPI<any>('/deals', {
      method: 'POST',
      body: JSON.stringify(deal),
    });
    return convertDealDates(createdDeal);
  },

  // Update existing deal
  update: async (id: string, deal: Partial<Deal>): Promise<Deal> => {
    const updatedDeal = await fetchAPI<any>(`/deals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(deal),
    });
    return convertDealDates(updatedDeal);
  },

  // Delete deal
  delete: async (id: string): Promise<Deal> => {
    return fetchAPI<Deal>(`/deals/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ TASKS API ============
export const tasksAPI = {
  // Get all tasks with optional filters
  getAll: async (filters?: { status?: string; priority?: string; assignedTo?: string }): Promise<Task[]> => {
    const params = new URLSearchParams();
    if (filters?.status && filters.status !== 'all') {
      params.append('status', filters.status);
    }
    if (filters?.priority && filters.priority !== 'all') {
      params.append('priority', filters.priority);
    }
    if (filters?.assignedTo) {
      params.append('assignedTo', filters.assignedTo);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const tasks = await fetchAPI<any[]>(`/tasks${query}`);
    return tasks.map(convertTaskDates);
  },

  // Get single task by ID
  getById: async (id: string): Promise<Task> => {
    const task = await fetchAPI<any>(`/tasks/${id}`);
    return convertTaskDates(task);
  },

  // Create new task
  create: async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> => {
    const createdTask = await fetchAPI<any>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
    return convertTaskDates(createdTask);
  },

  // Update existing task
  update: async (id: string, task: Partial<Task>): Promise<Task> => {
    const updatedTask = await fetchAPI<any>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
    return convertTaskDates(updatedTask);
  },

  // Delete task
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/tasks/${id}`, {
      method: 'DELETE',
    });
  },
};
