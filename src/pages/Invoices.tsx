import { useState } from "react";
import { Invoice } from "@/types/invoice";
import { mockInvoices, mockInvoiceStats } from "@/lib/mockData";
import { InvoiceCard } from "@/components/invoice/InvoiceCard";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FileText, DollarSign, AlertCircle, CheckCircle } from "lucide-react";

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>(mockInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreateInvoice = () => {
    setSelectedInvoice(undefined);
    setDialogOpen(true);
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setDialogOpen(true);
  };

  const handleSaveInvoice = (invoice: Invoice) => {
    setInvoices(prevInvoices => {
      // Check if updating existing invoice or creating new one
      const existingIndex = prevInvoices.findIndex(inv => inv.id === invoice.id);

      if (existingIndex >= 0) {
        // Update existing invoice
        const newInvoices = [...prevInvoices];
        newInvoices[existingIndex] = invoice;
        return newInvoices;
      } else {
        // Add new invoice
        return [invoice, ...prevInvoices];
      }
    });
  };

  // Calculate stats from current invoices state (not static mock data)
  const stats = {
    totalInvoices: invoices.length,
    paidAmount: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
    pendingAmount: invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.total, 0),
    overdueAmount: invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0),
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    // Create a formatted invoice HTML
    const isInterState = invoice.companyState !== invoice.customerState;

    const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    @page {
      size: A4;
      margin: 10mm;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #000;
    }

    .invoice-container {
      border: 2px solid #000;
      padding: 15px;
      max-width: 210mm;
      margin: 0 auto;
      background: white;
    }

    .header {
      text-align: center;
      border-bottom: 3px solid #FF9933;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }

    .company-name {
      font-size: 18px;
      font-weight: bold;
      color: #000080;
      margin-bottom: 3px;
    }

    .invoice-title {
      font-size: 16px;
      font-weight: bold;
      color: #138808;
      margin-top: 8px;
    }

    .info-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 15px;
      gap: 20px;
    }

    .info-block {
      flex: 1;
      font-size: 10px;
    }

    .info-block h3 {
      font-size: 11px;
      color: #333;
      margin-bottom: 5px;
      border-bottom: 1px solid #ddd;
      padding-bottom: 3px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0;
      font-size: 10px;
    }

    th {
      background: #f5f5f5;
      padding: 6px 4px;
      text-align: left;
      border: 1px solid #999;
      font-weight: bold;
      font-size: 10px;
    }

    td {
      padding: 5px 4px;
      border: 1px solid #ccc;
    }

    .text-right {
      text-align: right;
    }

    .totals {
      margin-top: 10px;
      float: right;
      width: 280px;
    }

    .totals table {
      margin: 0;
    }

    .grand-total {
      font-weight: bold;
      font-size: 12px;
      background: #f0f0f0;
    }

    .notes {
      margin-top: 15px;
      padding: 8px;
      background: #f9f9f9;
      border-left: 3px solid #FF9933;
      font-size: 9px;
      clear: both;
    }

    .footer {
      margin-top: 15px;
      text-align: center;
      color: #666;
      font-size: 9px;
      border-top: 1px solid #ddd;
      padding-top: 8px;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 3px;
      font-size: 10px;
      font-weight: bold;
    }

    .badge-paid { background: #d4edda; color: #155724; }
    .badge-sent { background: #cce5ff; color: #004085; }
    .badge-overdue { background: #f8d7da; color: #721c24; }
    .badge-draft { background: #e2e3e5; color: #383d41; }
    .badge-cancelled { background: #f8d7da; color: #721c24; }

    .gst-type {
      font-weight: bold;
      color: ${isInterState ? '#004085' : '#155724'};
      font-size: 10px;
    }

    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
    }

    @media print {
      body { margin: 0; }
      .invoice-container { border: 2px solid #000; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-name">${invoice.companyName || 'Bharat CRM Solutions Pvt Ltd'}</div>
      <div style="font-size: 10px;">${invoice.companyAddress || '456, MG Road, Bangalore'}, ${invoice.companyState} - ${invoice.companyPincode || '560001'}</div>
      <div style="font-size: 10px;">GSTIN: ${invoice.companyGSTIN || '29XYZAB5678C1D2'}</div>
      <div class="invoice-title">TAX INVOICE</div>
    </div>

    <div class="header-row">
      <div><strong>Invoice #:</strong> ${invoice.invoiceNumber}</div>
      <span class="badge badge-${invoice.status}">${invoice.status.toUpperCase()}</span>
    </div>

    <div class="info-section">
      <div class="info-block">
        <h3>Bill To:</h3>
        <strong>${invoice.customerName}</strong><br>
        ${invoice.customerAddress}<br>
        ${invoice.customerState} - ${invoice.customerPincode || ''}<br>
        ${invoice.customerGSTIN ? `GSTIN: ${invoice.customerGSTIN}<br>` : ''}
        Email: ${invoice.customerEmail}
      </div>
      <div class="info-block">
        <h3>Invoice Details:</h3>
        <strong>Issue Date:</strong> ${new Date(invoice.issueDate).toLocaleDateString('en-IN')}<br>
        <strong>Due Date:</strong> ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}<br>
        ${invoice.paymentDate ? `<strong>Paid On:</strong> ${new Date(invoice.paymentDate).toLocaleDateString('en-IN')}<br>` : ''}
        ${invoice.paymentMethod ? `<strong>Payment Method:</strong> ${invoice.paymentMethod.toUpperCase()}<br>` : ''}
        <div class="gst-type" style="margin-top: 5px;">${isInterState ? 'INTER-STATE (IGST)' : 'INTRA-STATE (CGST+SGST)'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 35%;">Description</th>
          <th style="width: 12%;">HSN/SAC</th>
          <th style="width: 10%;">Qty</th>
          <th style="width: 13%;">Rate</th>
          <th style="width: 10%;">Disc%</th>
          <th class="text-right" style="width: 20%;">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${invoice.lineItems.map(item => `
          <tr>
            <td>${item.description}</td>
            <td>${item.hsnSac || '-'}</td>
            <td>${item.quantity} ${item.unit || ''}</td>
            <td>₹${item.rate.toLocaleString('en-IN')}</td>
            <td>${item.discount || 0}%</td>
            <td class="text-right">₹${(item.quantity * item.rate * (1 - (item.discount || 0) / 100)).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="totals">
      <table>
        <tr>
          <td><strong>Subtotal:</strong></td>
          <td class="text-right">₹${invoice.subtotal.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        </tr>
        ${(invoice.totalDiscount && invoice.totalDiscount > 0) ? `
          <tr style="color: #dc3545;">
            <td><strong>Discount:</strong></td>
            <td class="text-right">-₹${invoice.totalDiscount.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          </tr>
        ` : ''}
        <tr>
          <td><strong>Taxable Amount:</strong></td>
          <td class="text-right">₹${(invoice.subtotal - (invoice.totalDiscount || 0)).toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
        </tr>
        ${isInterState ? `
          <tr>
            <td><strong>IGST:</strong></td>
            <td class="text-right">₹${invoice.igst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          </tr>
        ` : `
          <tr>
            <td><strong>CGST:</strong></td>
            <td class="text-right">₹${invoice.cgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          </tr>
          <tr>
            <td><strong>SGST:</strong></td>
            <td class="text-right">₹${invoice.sgst.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          </tr>
        `}
        ${(invoice.roundOff && invoice.roundOff !== 0) ? `
          <tr>
            <td><strong>Round Off:</strong></td>
            <td class="text-right">${invoice.roundOff > 0 ? '+' : ''}₹${invoice.roundOff.toLocaleString('en-IN', {minimumFractionDigits: 2})}</td>
          </tr>
        ` : ''}
        <tr class="grand-total">
          <td><strong>GRAND TOTAL:</strong></td>
          <td class="text-right"><strong>₹${invoice.total.toLocaleString('en-IN', {minimumFractionDigits: 2})}</strong></td>
        </tr>
      </table>
    </div>

    <div style="clear: both;"></div>

    ${invoice.notes || invoice.termsAndConditions ? `
      <div class="notes">
        ${invoice.notes ? `<div><strong>Notes:</strong> ${invoice.notes}</div>` : ''}
        ${invoice.termsAndConditions ? `<div style="margin-top: 5px;"><strong>Terms & Conditions:</strong> ${invoice.termsAndConditions}</div>` : ''}
      </div>
    ` : ''}

    <div class="footer">
      <div>This is a computer generated invoice and does not require a signature.</div>
      <div style="margin-top: 5px;"><strong>Bharat CRM</strong> - GST-Compliant Invoicing System</div>
    </div>
  </div>
</body>
</html>
    `;

    // Create a new window and print
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();

      // Wait for content to load then trigger print dialog
      printWindow.onload = () => {
        printWindow.focus();
        printWindow.print();
      };
    }
  };

  return (
    <div className="min-h-screen bg-background">

      <div className="relative p-8 space-y-8 animate-fade-in">
        <div className="relative">
          {/* Tricolor accent bar */}
          <div className="absolute -left-8 top-0 bottom-0 w-1 bg-primary rounded-r" />
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">GST Invoices</h1>
              <p className="text-muted-foreground">
                GST-compliant invoicing with automatic tax calculations
              </p>
            </div>
            <Button onClick={handleCreateInvoice} size="lg" className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
              <Plus className="h-5 w-5" />
              Create Invoice
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Invoices"
            value={stats.totalInvoices}
            icon={FileText}
            trend={{ value: 12, isPositive: true }}
            colorClass="bg-gradient-to-br from-primary to-primary/80"
          />
          <StatsCard
            title="Paid Amount"
            value={`₹${(stats.paidAmount / 100000).toFixed(2)}L`}
            icon={CheckCircle}
            trend={{ value: 8, isPositive: true }}
            colorClass="bg-gradient-to-br from-accent to-accent/80"
          />
          <StatsCard
            title="Pending Amount"
            value={`₹${(stats.pendingAmount / 1000).toFixed(1)}K`}
            icon={DollarSign}
            trend={{ value: 3, isPositive: false }}
            colorClass="bg-gradient-to-br from-secondary to-secondary/80"
          />
          <StatsCard
            title="Overdue Amount"
            value={`₹${(stats.overdueAmount / 100000).toFixed(2)}L`}
            icon={AlertCircle}
            trend={{ value: 15, isPositive: false }}
            colorClass="bg-gradient-to-br from-destructive to-destructive/80"
          />
        </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by customer or invoice number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredInvoices.map((invoice) => (
          <InvoiceCard
            key={invoice.id}
            invoice={invoice}
            onEdit={handleEditInvoice}
            onDownload={handleDownloadPDF}
          />
        ))}
      </div>

      {filteredInvoices.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No invoices found
          </h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first invoice to get started"}
          </p>
          {!searchQuery && statusFilter === "all" && (
            <Button onClick={handleCreateInvoice}>
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          )}
        </div>
      )}

        <InvoiceDialog
          invoice={selectedInvoice}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSave={handleSaveInvoice}
        />
      </div>
    </div>
  );
};

export default Invoices;
