import { useState, useEffect } from "react";
import { Invoice, InvoiceLineItem, InvoiceStatus, PaymentMethod, calculateInvoiceTotal, indianStates } from "@/types/invoice";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, FileText, X } from "lucide-react";
import { toast } from "sonner";

interface InvoiceDialogProps {
  invoice?: Invoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (invoice: Invoice) => void;
}

export const InvoiceDialog = ({ invoice, open, onOpenChange, onSave }: InvoiceDialogProps) => {
  const [formData, setFormData] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerAddress: "",
    customerState: "Karnataka",
    customerGSTIN: "",
    companyState: "Karnataka",
    dueDate: "",
    status: "draft" as InvoiceStatus,
    paymentMethod: "" as PaymentMethod | "",
    paymentDate: "",
    notes: "",
  });

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      id: "1",
      description: "",
      hsnSac: "",
      quantity: 1,
      unit: "pcs",
      rate: 0,
      discount: 0,
      amount: 0,
      taxRate: 18,
    },
  ]);

  // Update form when invoice prop changes
  useEffect(() => {
    if (invoice) {
      setFormData({
        customerName: invoice.customerName || "",
        customerEmail: invoice.customerEmail || "",
        customerPhone: invoice.customerPhone || "",
        customerAddress: invoice.customerAddress || "",
        customerState: invoice.customerState || "Karnataka",
        customerGSTIN: invoice.customerGSTIN || "",
        companyState: invoice.companyState || "Karnataka",
        dueDate: invoice.dueDate || "",
        status: invoice.status || "draft",
        paymentMethod: invoice.paymentMethod || "",
        paymentDate: invoice.paymentDate || "",
        notes: invoice.notes || "",
      });
      setLineItems(invoice.lineItems || []);
    } else {
      // Reset for new invoice
      setFormData({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerAddress: "",
        customerState: "Karnataka",
        customerGSTIN: "",
        companyState: "Karnataka",
        dueDate: "",
        status: "draft",
        paymentMethod: "",
        paymentDate: "",
        notes: "",
      });
      setLineItems([{
        id: "1",
        description: "",
        hsnSac: "",
        quantity: 1,
        unit: "pcs",
        rate: 0,
        discount: 0,
        amount: 0,
        taxRate: 18,
      }]);
    }
  }, [invoice]);

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: "",
        hsnSac: "",
        quantity: 1,
        unit: "pcs",
        rate: 0,
        discount: 0,
        amount: 0,
        taxRate: 18,
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === "quantity" || field === "rate" || field === "discount") {
            updated.amount = updated.quantity * updated.rate * (1 - (updated.discount || 0) / 100);
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Calculate GST totals
    const totals = calculateInvoiceTotal(lineItems, formData.companyState, formData.customerState);

    const invoiceData: any = {
      invoiceNumber: invoice?.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerPhone: formData.customerPhone || "",
      customerAddress: formData.customerAddress,
      customerState: formData.customerState,
      customerGSTIN: formData.customerGSTIN,
      companyName: "Bharat CRM Solutions Pvt Ltd",
      companyGSTIN: "29XYZAB5678C1D2",
      companyAddress: "456, MG Road, Bangalore",
      companyState: formData.companyState,
      companyPAN: "AABCU9603R",
      dueDate: formData.dueDate,
      status: formData.status,
      paymentMethod: formData.paymentMethod || undefined,
      paymentDate: formData.paymentDate || undefined,
      lineItems: lineItems,
      ...totals,
      notes: formData.notes,
    };

    // Only include id when editing existing invoice
    if (invoice?.id) {
      invoiceData.id = invoice.id;
    }

    onSave(invoiceData);
    toast.success(invoice ? "Invoice updated successfully!" : "Invoice created successfully!");
    onOpenChange(false);
  };

  const totals = calculateInvoiceTotal(lineItems, formData.companyState, formData.customerState);
  const isInterState = formData.companyState !== formData.customerState;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-3xl lg:max-w-4xl overflow-hidden flex flex-col">
        {/* Modern Blue Ribbon Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white px-6 py-5 shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <FileText className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">{invoice ? "Edit Invoice" : "Create New Invoice"}</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20 rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Scrollable Form Area */}
        <ScrollArea className="flex-1 px-6 py-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Customer Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-blue-500 pl-3">Customer Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Customer Name *</Label>
                  <Input
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    placeholder="Enter customer name"
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Customer Email *</Label>
                  <Input
                    type="email"
                    value={formData.customerEmail}
                    onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                    placeholder="customer@example.com"
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Customer Phone *</Label>
                  <Input
                    type="tel"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                    placeholder="+91 98765 43210"
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Customer State *</Label>
                  <Select value={formData.customerState} onValueChange={(value) => setFormData({ ...formData, customerState: value })}>
                    <SelectTrigger className="border-2 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {indianStates.map(state => (
                        <SelectItem key={state} value={state}>{state}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">GSTIN (Optional)</Label>
                  <Input
                    value={formData.customerGSTIN}
                    onChange={(e) => setFormData({ ...formData, customerGSTIN: e.target.value })}
                    placeholder="27AABCU9603R1ZM"
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Customer Address *</Label>
                <Textarea
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  placeholder="Enter customer address"
                  rows={2}
                  required
                  className="border-2 focus:border-blue-500 rounded-lg resize-none"
                />
              </div>
            </div>

            {/* Invoice Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-purple-500 pl-3">Invoice Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Due Date *</Label>
                  <Input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    required
                    className="border-2 focus:border-blue-500 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Status *</Label>
                  <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as InvoiceStatus })}>
                    <SelectTrigger className="border-2 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Payment Details - Show only if paid */}
              {formData.status === 'paid' && (
                <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-200 dark:border-green-900">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Payment Method *</Label>
                    <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}>
                      <SelectTrigger className="border-2 rounded-lg">
                        <SelectValue placeholder="Select method" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="bank-transfer">Bank Transfer</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="razorpay">Razorpay</SelectItem>
                        <SelectItem value="paytm">Paytm</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Payment Date *</Label>
                    <Input
                      type="date"
                      value={formData.paymentDate}
                      onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                      required
                      className="border-2 focus:border-blue-500 rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-l-4 border-l-green-500 pl-3">
                <h3 className="font-semibold text-lg text-foreground">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="rounded-lg">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {lineItems.map((item, index) => (
                <div key={item.id} className="p-4 border-2 border-border rounded-lg space-y-3 bg-slate-50 dark:bg-slate-900/20">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Item {index + 1}</span>
                    {lineItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(item.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-6 gap-3">
                    <div className="col-span-6 space-y-2">
                      <Label className="text-sm font-semibold">Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) =>
                          updateLineItem(item.id, "description", e.target.value)
                        }
                        placeholder="Item description"
                        required
                        className="border-2 focus:border-blue-500 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-sm font-semibold">HSN/SAC Code</Label>
                      <Input
                        value={item.hsnSac}
                        onChange={(e) =>
                          updateLineItem(item.id, "hsnSac", e.target.value)
                        }
                        placeholder="998314"
                        className="border-2 focus:border-blue-500 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Quantity *</Label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 1)
                        }
                        min="1"
                        step="0.01"
                        required
                        className="border-2 focus:border-blue-500 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Unit</Label>
                      <Input
                        value={item.unit}
                        onChange={(e) =>
                          updateLineItem(item.id, "unit", e.target.value)
                        }
                        placeholder="pcs"
                        className="border-2 focus:border-blue-500 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-sm font-semibold">Rate (₹) *</Label>
                      <Input
                        type="number"
                        value={item.rate}
                        onChange={(e) =>
                          updateLineItem(item.id, "rate", parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        step="0.01"
                        required
                        className="border-2 focus:border-blue-500 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">Discount %</Label>
                      <Input
                        type="number"
                        value={item.discount}
                        onChange={(e) =>
                          updateLineItem(item.id, "discount", parseFloat(e.target.value) || 0)
                        }
                        min="0"
                        max="100"
                        step="0.01"
                        className="border-2 focus:border-blue-500 rounded-lg"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-semibold">GST % *</Label>
                      <Select
                        value={item.taxRate.toString()}
                        onValueChange={(value) =>
                          updateLineItem(item.id, "taxRate", parseFloat(value))
                        }
                      >
                        <SelectTrigger className="border-2 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0%</SelectItem>
                          <SelectItem value="5">5%</SelectItem>
                          <SelectItem value="12">12%</SelectItem>
                          <SelectItem value="18">18%</SelectItem>
                          <SelectItem value="28">28%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label className="text-sm font-semibold">Amount (After Discount)</Label>
                      <Input
                        type="number"
                        value={item.amount.toFixed(2)}
                        disabled
                        className="bg-muted border-2 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* GST Totals */}
            <div className="border-t-2 border-border pt-4 space-y-3 bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg text-foreground">Tax Calculation</h3>
                <span className={`text-xs px-2 py-1 rounded-lg font-semibold ${isInterState ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'}`}>
                  {isInterState ? 'Inter-state (IGST)' : 'Intra-state (CGST+SGST)'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
                </div>
                {totals.totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-destructive">
                    <span>Total Discount:</span>
                    <span>-₹{totals.totalDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxable Amount:</span>
                  <span className="font-medium">₹{(totals.subtotal - totals.totalDiscount).toFixed(2)}</span>
                </div>

                {isInterState ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">IGST:</span>
                    <span className="font-medium">₹{totals.igst.toFixed(2)}</span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CGST:</span>
                      <span className="font-medium">₹{totals.cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SGST:</span>
                      <span className="font-medium">₹{totals.sgst.toFixed(2)}</span>
                    </div>
                  </>
                )}

                {totals.roundOff !== 0 && (
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Round Off:</span>
                    <span>{totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-border">
                  <span>Grand Total:</span>
                  <span className="text-blue-600">₹{totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground border-l-4 border-l-amber-500 pl-3">Additional Information</h3>
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional notes for the customer"
                  rows={2}
                  className="border-2 focus:border-blue-500 rounded-lg resize-none"
                />
              </div>
            </div>
          </form>
        </ScrollArea>

        {/* Modern Action Footer */}
        <div className="border-t bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 flex gap-3 shadow-lg">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg shadow-sm"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              const formElement = e.currentTarget.closest('.flex.flex-col')?.querySelector('form');
              if (formElement instanceof HTMLFormElement) {
                formElement.requestSubmit();
              }
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg"
          >
            {invoice ? "Update Invoice" : "Create Invoice"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
