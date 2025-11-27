import { Invoice } from "@/types/invoice";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Send, Eye } from "lucide-react";
import { format } from "date-fns";

interface InvoiceCardProps {
  invoice: Invoice;
  onEdit: (invoice: Invoice) => void;
  onDownload: (invoice: Invoice) => void;
}

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  paid: "bg-green-500/10 text-green-600 dark:text-green-400",
  overdue: "bg-red-500/10 text-red-600 dark:text-red-400",
  cancelled: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export const InvoiceCard = ({ invoice, onEdit, onDownload }: InvoiceCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  const isInterState = invoice.companyState !== invoice.customerState;

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">
              {invoice.invoiceNumber}
            </h3>
            <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
            <p className="text-xs text-muted-foreground">{invoice.customerState}</p>
          </div>
        </div>
        <Badge className={statusColors[invoice.status]}>
          {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
        </Badge>
      </div>

      <div className="space-y-3 mb-4">
        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Issue Date</span>
          <span className="text-sm font-medium text-foreground">
            {format(new Date(invoice.issueDate), "MMM dd, yyyy")}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border/50">
          <span className="text-sm text-muted-foreground">Due Date</span>
          <span className="text-sm font-medium text-foreground">
            {format(new Date(invoice.dueDate), "MMM dd, yyyy")}
          </span>
        </div>

        {/* GST Breakdown */}
        <div className="p-3 bg-primary/5 rounded-lg space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Subtotal:</span>
            <span>{formatCurrency(invoice.subtotal - (invoice.totalDiscount || 0))}</span>
          </div>
          {isInterState ? (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>IGST (Inter-state):</span>
              <span>{formatCurrency(invoice.igst)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>CGST:</span>
                <span>{formatCurrency(invoice.cgst)}</span>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>SGST:</span>
                <span>{formatCurrency(invoice.sgst)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-border/50">
            <span className="text-sm font-semibold text-foreground">Total Amount</span>
            <span className="text-lg font-bold text-primary">
              {formatCurrency(invoice.total)}
            </span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      {invoice.status === 'paid' && invoice.paymentDate && (
        <div className="mb-4 p-2 bg-accent/10 rounded text-xs text-accent">
          Paid on {format(new Date(invoice.paymentDate), "MMM dd, yyyy")}
          {invoice.paymentMethod && ` via ${invoice.paymentMethod.toUpperCase()}`}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border/50">
        <Button variant="outline" size="sm" onClick={() => onEdit(invoice)}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        <Button variant="outline" size="sm" onClick={() => onDownload(invoice)}>
          <Download className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </div>
    </Card>
  );
};
