import { useState, useEffect } from "react";
import { Invoice, InvoiceLineItem, InvoiceStatus, PaymentMethod, calculateInvoiceTotal, indianStates } from "@/types/invoice";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Plus, Trash2 } from "lucide-react";
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
    customerAddress: "",
    customerState: "Karnataka",
    customerPincode: "",
    customerGSTIN: "",
    companyState: "Karnataka",
    issueDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    status: "draft" as InvoiceStatus,
    paymentMethod: "" as PaymentMethod | "",
    paymentDate: "",
    notes: "",
    termsAndConditions: "",
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
        customerAddress: invoice.customerAddress || "",
        customerState: invoice.customerState || "Karnataka",
        customerPincode: invoice.customerPincode || "",
        customerGSTIN: invoice.customerGSTIN || "",
        companyState: invoice.companyState || "Karnataka",
        issueDate: invoice.issueDate || new Date().toISOString().split('T')[0],
        dueDate: invoice.dueDate || "",
        status: invoice.status || "draft",
        paymentMethod: invoice.paymentMethod || "",
        paymentDate: invoice.paymentDate || "",
        notes: invoice.notes || "",
        termsAndConditions: invoice.termsAndConditions || "",
      });
      setLineItems(invoice.lineItems || []);
    } else {
      // Reset for new invoice
      setFormData({
        customerName: "",
        customerEmail: "",
        customerAddress: "",
        customerState: "Karnataka",
        customerPincode: "",
        customerGSTIN: "",
        companyState: "Karnataka",
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: "",
        status: "draft",
        paymentMethod: "",
        paymentDate: "",
        notes: "",
        termsAndConditions: "",
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

    const newInvoice: Invoice = {
      id: invoice?.id || `inv-${Date.now()}`,
      invoiceNumber: invoice?.invoiceNumber || `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`,
      customerId: invoice?.customerId || "NEW",
      customerName: formData.customerName,
      customerEmail: formData.customerEmail,
      customerAddress: formData.customerAddress,
      customerState: formData.customerState,
      customerPincode: formData.customerPincode,
      customerGSTIN: formData.customerGSTIN,
      companyName: "Bharat CRM Solutions Pvt Ltd",
      companyGSTIN: "29XYZAB5678C1D2",
      companyAddress: "456, MG Road, Bangalore",
      companyState: formData.companyState,
      companyPincode: "560001",
      issueDate: formData.issueDate,
      dueDate: formData.dueDate,
      status: formData.status,
      paymentMethod: formData.paymentMethod || undefined,
      paymentDate: formData.paymentDate || undefined,
      lineItems: lineItems,
      ...totals,
      notes: formData.notes,
      termsAndConditions: formData.termsAndConditions,
    };

    onSave(newInvoice);
    toast.success(invoice ? "Invoice updated successfully!" : "Invoice created successfully!");
    onOpenChange(false);
  };

  const totals = calculateInvoiceTotal(lineItems, formData.companyState, formData.customerState);
  const isInterState = formData.companyState !== formData.customerState;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? "Edit Invoice" : "Create New Invoice"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Customer Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  placeholder="Enter customer name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Email *</Label>
                <Input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  placeholder="customer@example.com"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Customer State *</Label>
                <Select value={formData.customerState} onValueChange={(value) => setFormData({ ...formData, customerState: value })}>
                  <SelectTrigger>
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
                <Label>Pincode</Label>
                <Input
                  value={formData.customerPincode}
                  onChange={(e) => setFormData({ ...formData, customerPincode: e.target.value })}
                  placeholder="560100"
                />
              </div>
              <div className="space-y-2">
                <Label>GSTIN (Optional)</Label>
                <Input
                  value={formData.customerGSTIN}
                  onChange={(e) => setFormData({ ...formData, customerGSTIN: e.target.value })}
                  placeholder="27AABCU9603R1ZM"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Customer Address *</Label>
              <Textarea
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                placeholder="Enter customer address"
                rows={2}
                required
              />
            </div>
          </div>

          {/* Invoice Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Invoice Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Issue Date *</Label>
                <Input
                  type="date"
                  value={formData.issueDate}
                  onChange={(e) => setFormData({ ...formData, issueDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status *</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as InvoiceStatus })}>
                  <SelectTrigger>
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
              <div className="grid grid-cols-2 gap-4 p-4 bg-accent/10 rounded-lg">
                <div className="space-y-2">
                  <Label>Payment Method *</Label>
                  <Select value={formData.paymentMethod} onValueChange={(value) => setFormData({ ...formData, paymentMethod: value as PaymentMethod })}>
                    <SelectTrigger>
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
                  <Label>Payment Date *</Label>
                  <Input
                    type="date"
                    value={formData.paymentDate}
                    onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Line Items</h3>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {lineItems.map((item, index) => (
              <div key={item.id} className="p-4 border border-border rounded-lg space-y-3 bg-card/50">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Item {index + 1}</span>
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
                    <Label>Description *</Label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, "description", e.target.value)
                      }
                      placeholder="Item description"
                      required
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>HSN/SAC Code</Label>
                    <Input
                      value={item.hsnSac}
                      onChange={(e) =>
                        updateLineItem(item.id, "hsnSac", e.target.value)
                      }
                      placeholder="998314"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, "quantity", parseFloat(e.target.value) || 1)
                      }
                      min="1"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit</Label>
                    <Input
                      value={item.unit}
                      onChange={(e) =>
                        updateLineItem(item.id, "unit", e.target.value)
                      }
                      placeholder="pcs"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Rate (₹) *</Label>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        updateLineItem(item.id, "rate", parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Discount %</Label>
                    <Input
                      type="number"
                      value={item.discount}
                      onChange={(e) =>
                        updateLineItem(item.id, "discount", parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      max="100"
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GST % *</Label>
                    <Select
                      value={item.taxRate.toString()}
                      onValueChange={(value) =>
                        updateLineItem(item.id, "taxRate", parseFloat(value))
                      }
                    >
                      <SelectTrigger>
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
                    <Label>Amount (After Discount)</Label>
                    <Input
                      type="number"
                      value={item.amount.toFixed(2)}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* GST Totals */}
          <div className="border-t border-border pt-4 space-y-3 bg-primary/5 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Tax Calculation</h3>
              <span className={`text-xs px-2 py-1 rounded ${isInterState ? 'bg-blue-500/10 text-blue-600' : 'bg-green-500/10 text-green-600'}`}>
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

              <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
                <span>Grand Total:</span>
                <span className="text-primary">₹{totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes for the customer"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Terms and Conditions</Label>
              <Textarea
                value={formData.termsAndConditions}
                onChange={(e) => setFormData({ ...formData, termsAndConditions: e.target.value })}
                placeholder="Payment terms, late fee policy, etc."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {invoice ? "Update Invoice" : "Create Invoice"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
