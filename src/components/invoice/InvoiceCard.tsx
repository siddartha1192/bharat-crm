import { Invoice } from "@/types/invoice";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Send, Eye } from "lucide-react";
import { format } from "date-fns";

interface InvoiceCardProps {
  invoice: Invoice;
  onEdit: (invoice: Invoice) => void;
}

const statusColors = {
  draft: "bg-muted text-muted-foreground",
  sent: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  paid: "bg-green-500/10 text-green-600 dark:text-green-400",
  overdue: "bg-red-500/10 text-red-600 dark:text-red-400",
  cancelled: "bg-gray-500/10 text-gray-600 dark:text-gray-400",
};

export const InvoiceCard = ({ invoice, onEdit }: InvoiceCardProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">
              {invoice.invoiceNumber}
            </h3>
            <p className="text-sm text-muted-foreground">{invoice.customerName}</p>
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
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-muted-foreground">Total Amount</span>
          <span className="text-lg font-bold text-primary">
            {formatCurrency(invoice.total)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-border/50">
        <Button variant="outline" size="sm" onClick={() => onEdit(invoice)}>
          <Eye className="h-4 w-4 mr-2" />
          View
        </Button>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </div>
    </Card>
  );
};
