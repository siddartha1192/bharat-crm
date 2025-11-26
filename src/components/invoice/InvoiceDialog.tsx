import { useState } from "react";
import { Invoice, InvoiceLineItem } from "@/types/invoice";
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
}

export const InvoiceDialog = ({ invoice, open, onOpenChange }: InvoiceDialogProps) => {
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    invoice?.lineItems || [
      {
        id: "1",
        description: "",
        quantity: 1,
        rate: 0,
        amount: 0,
        taxRate: 18,
      },
    ]
  );

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        id: Date.now().toString(),
        description: "",
        quantity: 1,
        rate: 0,
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
          if (field === "quantity" || field === "rate") {
            updated.amount = updated.quantity * updated.rate;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
    const totalTax = lineItems.reduce(
      (sum, item) => sum + (item.amount * item.taxRate) / 100,
      0
    );
    return {
      subtotal,
      cgst: totalTax / 2,
      sgst: totalTax / 2,
      total: subtotal + totalTax,
    };
  };

  const totals = calculateTotals();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success(invoice ? "Invoice updated successfully!" : "Invoice created successfully!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invoice ? "Edit Invoice" : "Create New Invoice"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Customer Name</Label>
              <Input
                defaultValue={invoice?.customerName}
                placeholder="Enter customer name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Email</Label>
              <Input
                type="email"
                defaultValue={invoice?.customerEmail}
                placeholder="customer@example.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Issue Date</Label>
              <Input
                type="date"
                defaultValue={invoice?.issueDate}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                defaultValue={invoice?.dueDate}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Customer Address</Label>
            <Textarea
              defaultValue={invoice?.customerAddress}
              placeholder="Enter customer address"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Customer GSTIN (Optional)</Label>
            <Input
              defaultValue={invoice?.customerGSTIN}
              placeholder="27AABCU9603R1ZM"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Line Items</Label>
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

                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-4 space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(e) =>
                        updateLineItem(item.id, "description", e.target.value)
                      }
                      placeholder="Item description"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateLineItem(item.id, "quantity", parseFloat(e.target.value))
                      }
                      min="1"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Rate (₹)</Label>
                    <Input
                      type="number"
                      value={item.rate}
                      onChange={(e) =>
                        updateLineItem(item.id, "rate", parseFloat(e.target.value))
                      }
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>GST %</Label>
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
                  <div className="space-y-2">
                    <Label>Amount</Label>
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

          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">₹{totals.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">CGST:</span>
              <span className="font-medium">₹{totals.cgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">SGST:</span>
              <span className="font-medium">₹{totals.sgst.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-border">
              <span>Total:</span>
              <span className="text-primary">₹{totals.total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes (Optional)</Label>
            <Textarea
              defaultValue={invoice?.notes}
              placeholder="Any additional notes"
              rows={2}
            />
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
