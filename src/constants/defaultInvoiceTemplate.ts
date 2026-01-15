// Default Invoice Template with Variable Substitution
// Variables use {{variableName}} syntax for replacement

export const DEFAULT_INVOICE_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice {{invoiceNumber}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      padding: 20px;
      background: white;
    }
    .invoice-container {
      max-width: 900px;
      margin: 0 auto;
      border: 1px solid #ddd;
      padding: 40px;
      background: white;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #FF9933;
    }
    .company-info h1 {
      color: #FF9933;
      font-size: 28px;
      margin-bottom: 10px;
    }
    .company-info p { font-size: 13px; color: #666; margin: 2px 0; }
    .invoice-details { text-align: right; }
    .invoice-details h2 {
      font-size: 32px;
      color: #333;
      margin-bottom: 10px;
    }
    .invoice-number {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      margin-top: 10px;
    }
    .status-draft { background: #e2e8f0; color: #475569; }
    .status-sent { background: #dbeafe; color: #1e40af; }
    .status-paid { background: #d1fae5; color: #065f46; }
    .status-overdue { background: #fee2e2; color: #991b1b; }
    .status-cancelled { background: #f3f4f6; color: #6b7280; }
    .billing-section {
      display: flex;
      justify-content: space-between;
      margin-bottom: 40px;
      gap: 30px;
    }
    .billing-box {
      flex: 1;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e9ecef;
    }
    .billing-box h3 {
      font-size: 14px;
      color: #FF9933;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .billing-box p {
      font-size: 13px;
      margin: 4px 0;
      color: #555;
    }
    .billing-box strong { color: #333; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
      font-size: 13px;
    }
    thead {
      background: linear-gradient(135deg, #FF9933 0%, #FF6B00 100%);
      color: white;
    }
    thead th {
      padding: 14px 12px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    tbody td {
      padding: 14px 12px;
      border-bottom: 1px solid #e9ecef;
    }
    tbody tr:hover { background: #f8f9fa; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .totals-section {
      margin-top: 30px;
      display: flex;
      justify-content: flex-end;
    }
    .totals-table {
      width: 350px;
      margin: 0;
    }
    .totals-table td {
      padding: 10px 15px;
      border: none;
    }
    .totals-table tr:not(:last-child) {
      border-bottom: 1px solid #e9ecef;
    }
    .totals-table .label {
      text-align: right;
      color: #666;
      font-weight: 500;
    }
    .totals-table .value {
      text-align: right;
      font-weight: 600;
      color: #333;
    }
    .total-row {
      background: #f8f9fa;
      font-size: 16px;
    }
    .total-row td {
      padding: 15px;
      color: #FF9933;
      font-weight: bold;
    }
    .notes-section {
      margin-top: 40px;
      padding: 20px;
      background: #fffbeb;
      border-left: 4px solid #FF9933;
      border-radius: 4px;
    }
    .notes-section h3 {
      font-size: 14px;
      color: #FF9933;
      margin-bottom: 10px;
    }
    .notes-section p {
      font-size: 13px;
      color: #666;
      line-height: 1.8;
    }
    .payment-info {
      margin-top: 30px;
      padding: 20px;
      background: #d1fae5;
      border-radius: 8px;
      border: 1px solid #10b981;
    }
    .payment-info h3 {
      font-size: 14px;
      color: #065f46;
      margin-bottom: 10px;
    }
    .payment-info p {
      font-size: 13px;
      color: #065f46;
      margin: 4px 0;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e9ecef;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    @media print {
      body { padding: 0; }
      .invoice-container { border: none; padding: 20px; }
      .status-badge { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      thead { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header Section -->
    <div class="header">
      <div class="company-info">
        <h1>{{companyName}}</h1>
        <p><strong>Address:</strong> {{companyAddress}}</p>
        <p><strong>GSTIN:</strong> {{companyGSTIN}}</p>
        <p><strong>PAN:</strong> {{companyPAN}}</p>
      </div>
      <div class="invoice-details">
        <h2>INVOICE</h2>
        <p class="invoice-number"><strong>Invoice #:</strong> {{invoiceNumber}}</p>
        <p class="invoice-number"><strong>Date:</strong> {{invoiceDate}}</p>
        <p class="invoice-number"><strong>Due Date:</strong> {{dueDate}}</p>
        <span class="status-badge status-{{statusClass}}">{{status}}</span>
      </div>
    </div>

    <!-- Billing Section -->
    <div class="billing-section">
      <div class="billing-box">
        <h3>Bill To</h3>
        <p><strong>{{customerName}}</strong></p>
        <p>{{customerAddress}}</p>
        {{#if customerEmail}}<p><strong>Email:</strong> {{customerEmail}}</p>{{/if}}
        {{#if customerPhone}}<p><strong>Phone:</strong> {{customerPhone}}</p>{{/if}}
        {{#if customerGSTIN}}<p><strong>GSTIN:</strong> {{customerGSTIN}}</p>{{/if}}
      </div>
    </div>

    <!-- Line Items Table -->
    <table>
      <thead>
        <tr>
          <th style="width: 5%;">#</th>
          <th style="width: 35%;">Description</th>
          <th style="width: 12%;">HSN/SAC</th>
          <th style="width: 8%;" class="text-center">Qty</th>
          <th style="width: 12%;" class="text-right">Rate</th>
          <th style="width: 8%;" class="text-right">Tax %</th>
          <th style="width: 10%;" class="text-right">Discount</th>
          <th style="width: 10%;" class="text-right">Amount</th>
        </tr>
      </thead>
      <tbody>
        {{lineItems}}
      </tbody>
    </table>

    <!-- Totals Section -->
    <div class="totals-section">
      <table class="totals-table">
        <tr>
          <td class="label">Subtotal:</td>
          <td class="value">₹{{subtotal}}</td>
        </tr>
        {{#if totalDiscount}}
        <tr>
          <td class="label">Discount:</td>
          <td class="value">-₹{{totalDiscount}}</td>
        </tr>
        {{/if}}
        {{#if cgst}}
        <tr>
          <td class="label">CGST:</td>
          <td class="value">₹{{cgst}}</td>
        </tr>
        <tr>
          <td class="label">SGST:</td>
          <td class="value">₹{{sgst}}</td>
        </tr>
        {{/if}}
        {{#if igst}}
        <tr>
          <td class="label">IGST:</td>
          <td class="value">₹{{igst}}</td>
        </tr>
        {{/if}}
        <tr>
          <td class="label">Total Tax:</td>
          <td class="value">₹{{totalTax}}</td>
        </tr>
        {{#if roundOff}}
        <tr>
          <td class="label">Round Off:</td>
          <td class="value">₹{{roundOff}}</td>
        </tr>
        {{/if}}
        <tr class="total-row">
          <td class="label">TOTAL:</td>
          <td class="value">₹{{total}}</td>
        </tr>
      </table>
    </div>

    <!-- Payment Information (if paid) -->
    {{#if paymentMethod}}
    <div class="payment-info">
      <h3>✓ Payment Received</h3>
      <p><strong>Payment Method:</strong> {{paymentMethod}}</p>
      <p><strong>Payment Date:</strong> {{paymentDate}}</p>
      <p><strong>Amount Paid:</strong> ₹{{total}}</p>
    </div>
    {{/if}}

    <!-- Notes Section -->
    {{#if notes}}
    <div class="notes-section">
      <h3>Notes / Terms</h3>
      <p>{{notes}}</p>
    </div>
    {{/if}}

    <!-- Footer -->
    <div class="footer">
      <p>Thank you for your business!</p>
      <p>This is a computer-generated invoice and does not require a signature.</p>
    </div>
  </div>
</body>
</html>
`;

// Invoice template variables definition
export const INVOICE_TEMPLATE_VARIABLES = [
  { name: 'invoiceNumber', description: 'Invoice number', example: 'INV-2024-001', required: true },
  { name: 'invoiceDate', description: 'Invoice creation date', example: '15 Jan 2024', required: true },
  { name: 'dueDate', description: 'Payment due date', example: '30 Jan 2024', required: true },
  { name: 'status', description: 'Invoice status text', example: 'Paid', required: true },
  { name: 'statusClass', description: 'CSS class for status badge', example: 'paid', required: true },
  { name: 'companyName', description: 'Company name', example: 'Bharat CRM Solutions Pvt Ltd', required: true },
  { name: 'companyAddress', description: 'Company address', example: '123 Business Park, Mumbai', required: true },
  { name: 'companyGSTIN', description: 'Company GSTIN', example: '27AABCU9603R1ZM', required: false },
  { name: 'companyPAN', description: 'Company PAN', example: 'AABCU9603R', required: false },
  { name: 'customerName', description: 'Customer name', example: 'ABC Corporation', required: true },
  { name: 'customerAddress', description: 'Customer address', example: '456 Client Street, Delhi', required: true },
  { name: 'customerEmail', description: 'Customer email', example: 'contact@abc.com', required: false },
  { name: 'customerPhone', description: 'Customer phone', example: '+91 98765 43210', required: false },
  { name: 'customerGSTIN', description: 'Customer GSTIN', example: '07AABCU9603R1ZM', required: false },
  { name: 'lineItems', description: 'Invoice line items HTML rows', example: '<tr><td>1</td><td>Product</td>...</tr>', required: true },
  { name: 'subtotal', description: 'Subtotal amount', example: '10,000.00', required: true },
  { name: 'totalDiscount', description: 'Total discount amount', example: '500.00', required: false },
  { name: 'cgst', description: 'CGST amount', example: '900.00', required: false },
  { name: 'sgst', description: 'SGST amount', example: '900.00', required: false },
  { name: 'igst', description: 'IGST amount', example: '1,800.00', required: false },
  { name: 'totalTax', description: 'Total tax amount', example: '1,800.00', required: true },
  { name: 'roundOff', description: 'Round off amount', example: '0.00', required: false },
  { name: 'total', description: 'Final total amount', example: '11,300.00', required: true },
  { name: 'paymentMethod', description: 'Payment method', example: 'Bank Transfer', required: false },
  { name: 'paymentDate', description: 'Payment date', example: '20 Jan 2024', required: false },
  { name: 'notes', description: 'Additional notes or terms', example: 'Payment due within 15 days', required: false },
];
