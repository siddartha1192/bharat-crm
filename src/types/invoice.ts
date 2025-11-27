export type GSTRate = 0 | 5 | 12 | 18 | 28;
export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";
export type PaymentMethod = "cash" | "upi" | "bank-transfer" | "cheque" | "card" | "razorpay" | "paytm";

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsnSac?: string; // HSN for goods, SAC for services
  quantity: number;
  unit?: string; // pcs, kg, hours, etc.
  rate: number;
  discount?: number; // percentage
  amount: number;
  taxRate: GSTRate;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;

  // Customer details
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerAddress: string;
  customerState: string; // Required for inter-state/intra-state GST
  customerPincode?: string;
  customerGSTIN?: string;

  // Company details (seller)
  companyName?: string;
  companyGSTIN?: string;
  companyAddress?: string;
  companyState: string; // Required for GST calculation
  companyPincode?: string;

  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;

  // Payment details
  paymentMethod?: PaymentMethod;
  paymentDate?: string;

  lineItems: InvoiceLineItem[];

  // GST Calculations
  subtotal: number;
  totalDiscount?: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax?: number;
  roundOff?: number;
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

// Indian states for GST calculation
export const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Chandigarh', 'Puducherry', 'Jammu and Kashmir', 'Ladakh'
];

// GST Calculation Helper
export function calculateInvoiceTotal(
  items: InvoiceLineItem[],
  companyState: string,
  customerState: string
): {
  subtotal: number;
  totalDiscount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  total: number;
} {
  // Calculate subtotal and discount
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const totalDiscount = items.reduce((sum, item) => {
    const itemAmount = item.quantity * item.rate;
    return sum + (itemAmount * (item.discount || 0) / 100);
  }, 0);

  const taxableAmount = subtotal - totalDiscount;

  // Determine if inter-state or intra-state
  const isInterState = companyState !== customerState;

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (isInterState) {
    // Inter-state: IGST (full GST rate)
    igst = items.reduce((sum, item) => {
      const itemAmount = item.quantity * item.rate * (1 - (item.discount || 0) / 100);
      return sum + (itemAmount * item.taxRate / 100);
    }, 0);
  } else {
    // Intra-state: CGST + SGST (split GST rate equally)
    const totalGST = items.reduce((sum, item) => {
      const itemAmount = item.quantity * item.rate * (1 - (item.discount || 0) / 100);
      return sum + (itemAmount * item.taxRate / 100);
    }, 0);
    cgst = totalGST / 2;
    sgst = totalGST / 2;
  }

  const totalTax = cgst + sgst + igst;
  const totalBeforeRounding = taxableAmount + totalTax;

  // Round off to nearest rupee
  const total = Math.round(totalBeforeRounding);
  const roundOff = total - totalBeforeRounding;

  return {
    subtotal,
    totalDiscount,
    cgst: parseFloat(cgst.toFixed(2)),
    sgst: parseFloat(sgst.toFixed(2)),
    igst: parseFloat(igst.toFixed(2)),
    totalTax: parseFloat(totalTax.toFixed(2)),
    roundOff: parseFloat(roundOff.toFixed(2)),
    total,
  };
}
