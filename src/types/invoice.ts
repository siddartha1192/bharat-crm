export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  taxRate: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  customerGSTIN?: string;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  notes?: string;
  termsAndConditions?: string;
}

export interface InvoiceStats {
  totalInvoices: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
}
