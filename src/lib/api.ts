import { Lead, Contact, Invoice, Deal, Task } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    // Get token from localStorage for authentication
    const token = localStorage.getItem('token');

    // Don't set Content-Type for FormData - let browser set it with boundary
    const isFormData = options?.body instanceof FormData;

    const headers: HeadersInit = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    };

    // Add Authorization Bearer token if available
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token expired or invalid
      if (response.status === 401) {
        // Clear invalid token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('user');
        window.location.href = '/login';
        throw new Error('Session expired. Please login again.');
      }

      const error = await response.json().catch(() => ({ error: 'An error occurred' }));
      throw new Error(error.error || error.message || `HTTP error! status: ${response.status}`);
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
  // Get all leads with optional filters and pagination
  getAll: async (filters?: Record<string, any>): Promise<any> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<any>(`/leads${query}`);
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
  // Get all contacts with optional filters and pagination
  getAll: async (filters?: Record<string, any>): Promise<any> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    return fetchAPI<any>(`/contacts${query}`);
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

  // Search contacts (for dropdown/autocomplete)
  search: async (query: string): Promise<Contact[]> => {
    if (!query || query.trim().length < 2) {
      return [];
    }
    const params = new URLSearchParams({ search: query.trim() });
    return fetchAPI<Contact[]>(`/contacts?${params.toString()}`);
  },
};

// ============ INVOICES API ============
export const invoicesAPI = {
  // Get all invoices with optional filters and pagination
  getAll: async (filters?: Record<string, any>): Promise<any> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchAPI<any>(`/invoices${query}`);

    // Handle paginated response
    if (response.data) {
      return {
        ...response,
        data: response.data.map(convertInvoiceDates)
      };
    }
    // Handle non-paginated response (backward compatibility)
    return Array.isArray(response) ? response.map(convertInvoiceDates) : response;
  },

  // Get single invoice by ID
  getById: async (id: string): Promise<Invoice> => {
    const invoice = await fetchAPI<any>(`/invoices/${id}`);
    return convertInvoiceDates(invoice);
  },

  // Create new invoice
  create: async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> => {
    const createdInvoice = await fetchAPI<any>('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice),
    });
    return convertInvoiceDates(createdInvoice);
  },

  // Update existing invoice
  update: async (id: string, invoice: Partial<Invoice>): Promise<Invoice> => {
    const updatedInvoice = await fetchAPI<any>(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(invoice),
    });
    return convertInvoiceDates(updatedInvoice);
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
  // Get all deals with optional filters and pagination
  getAll: async (filters?: Record<string, any>): Promise<any> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchAPI<any>(`/deals${query}`);

    // Handle paginated response
    if (response.data) {
      return {
        ...response,
        data: response.data.map(convertDealDates)
      };
    }
    // Handle non-paginated response (backward compatibility)
    return Array.isArray(response) ? response.map(convertDealDates) : response;
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
  // Get all tasks with optional filters and pagination
  getAll: async (filters?: Record<string, any>): Promise<any> => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          params.append(key, String(value));
        }
      });
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    const response = await fetchAPI<any>(`/tasks${query}`);

    // Handle paginated response
    if (response.data) {
      return {
        ...response,
        data: response.data.map(convertTaskDates)
      };
    }
    // Handle non-paginated response (backward compatibility)
    return Array.isArray(response) ? response.map(convertTaskDates) : response;
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

// ============ PIPELINE STAGES API ============
export const pipelineStagesAPI = {
  // Get all active pipeline stages (user's custom + defaults)
  getAll: async (): Promise<any[]> => {
    return fetchAPI<any[]>('/pipeline-stages');
  },

  // Get single pipeline stage
  getById: async (id: string): Promise<any> => {
    return fetchAPI<any>(`/pipeline-stages/${id}`);
  },

  // Create new custom pipeline stage
  create: async (stage: {
    name: string;
    slug: string;
    color?: string;
    order?: number;
  }): Promise<any> => {
    return fetchAPI<any>('/pipeline-stages', {
      method: 'POST',
      body: JSON.stringify(stage),
    });
  },

  // Update pipeline stage
  update: async (id: string, stage: {
    name?: string;
    color?: string;
    order?: number;
    isActive?: boolean;
  }): Promise<any> => {
    return fetchAPI<any>(`/pipeline-stages/${id}`, {
      method: 'PUT',
      body: JSON.stringify(stage),
    });
  },

  // Delete pipeline stage (soft delete)
  delete: async (id: string): Promise<void> => {
    return fetchAPI<void>(`/pipeline-stages/${id}`, {
      method: 'DELETE',
    });
  },

  // Reorder pipeline stages
  reorder: async (stageOrders: { id: string; order: number }[]): Promise<void> => {
    return fetchAPI<void>('/pipeline-stages/reorder', {
      method: 'POST',
      body: JSON.stringify({ stageOrders }),
    });
  },
};

// ============ GENERIC API CLIENT ============
// Generic API client for custom endpoints
export const api = {
  get: async <T = any>(endpoint: string): Promise<{ data: T }> => {
    const data = await fetchAPI<T>(endpoint);
    return { data };
  },

  post: async <T = any>(endpoint: string, body?: any, options?: RequestInit): Promise<{ data: T }> => {
    const data = await fetchAPI<T>(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      ...options,
    });
    return { data };
  },

  put: async <T = any>(endpoint: string, body?: any): Promise<{ data: T }> => {
    const data = await fetchAPI<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return { data };
  },

  patch: async <T = any>(endpoint: string, body?: any): Promise<{ data: T }> => {
    const data = await fetchAPI<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    return { data };
  },

  delete: async <T = any>(endpoint: string): Promise<{ data: T }> => {
    const data = await fetchAPI<T>(endpoint, {
      method: 'DELETE',
    });
    return { data };
  },
};

// Export api as default for convenience
export default api;

