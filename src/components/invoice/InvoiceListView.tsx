import { Invoice } from '@/types/invoice';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Building2,
  Mail,
  Calendar,
  IndianRupee,
  Edit,
  Trash2,
  Download,
  FileText,
  Clock,
  Phone,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface InvoiceListViewProps {
  invoices: Invoice[];
  onEdit?: (invoice: Invoice) => void;
  onDelete?: (invoice: Invoice) => void;
  onDownload?: (invoice: Invoice) => void;
}

const statusColors = {
  'draft': 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  'sent': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'paid': 'bg-green-500/10 text-green-600 border-green-500/20',
  'overdue': 'bg-red-500/10 text-red-600 border-red-500/20',
  'cancelled': 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export function InvoiceListView({ invoices, onEdit, onDelete, onDownload }: InvoiceListViewProps) {
  const isMobile = useIsMobile();

  const getCreatedDate = (date: any) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const formatDate = (date: any) => {
    try {
      return new Date(date).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '-';
    }
  };

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="p-4">
            <div className="space-y-3">
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <h3 className="font-semibold text-base">{invoice.invoiceNumber}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Building2 className="w-3 h-3" />
                    <span className="truncate">{invoice.customerName}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  {onDownload && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onDownload(invoice)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => onEdit(invoice)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onDelete(invoice)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Amount and Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-lg font-bold">
                  <IndianRupee className="w-5 h-5" />
                  {(invoice.totalAmount / 100000).toFixed(2)}L
                </div>
                <Badge className={`${statusColors[invoice.status]} border text-xs`}>
                  {invoice.status}
                </Badge>
              </div>

              {/* Contact Info */}
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{invoice.customerEmail}</span>
                </div>
                {invoice.customerPhone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    <span>{invoice.customerPhone}</span>
                  </div>
                )}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Issue Date:</span>
                  <div className="font-medium mt-0.5">{formatDate(invoice.issueDate)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Due Date:</span>
                  <div className="font-medium mt-0.5">{formatDate(invoice.dueDate)}</div>
                </div>
              </div>

              {/* Created Date */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
                <Clock className="w-3 h-3" />
                <span>Created {getCreatedDate(invoice.createdAt)}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="bg-card rounded-lg border">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="text-left p-4 font-semibold text-sm">Invoice #</th>
              <th className="text-left p-4 font-semibold text-sm">Customer</th>
              <th className="text-left p-4 font-semibold text-sm">Contact</th>
              <th className="text-left p-4 font-semibold text-sm">Amount</th>
              <th className="text-left p-4 font-semibold text-sm">Status</th>
              <th className="text-left p-4 font-semibold text-sm">Issue Date</th>
              <th className="text-left p-4 font-semibold text-sm">Due Date</th>
              <th className="text-left p-4 font-semibold text-sm">Created</th>
              <th className="text-right p-4 font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => {
              const getCreatedDate = () => {
                try {
                  return formatDistanceToNow(new Date(invoice.createdAt), { addSuffix: true });
                } catch {
                  return 'Recently';
                }
              };

              const formatDate = (date: any) => {
                try {
                  return new Date(date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric'
                  });
                } catch {
                  return '-';
                }
              };

              return (
              <tr
                key={invoice.id}
                className={`border-b hover:bg-muted/30 transition-colors ${
                  index % 2 === 0 ? 'bg-background' : 'bg-muted/10'
                }`}
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-foreground">{invoice.invoiceNumber || 'N/A'}</div>
                      <div className="text-xs text-muted-foreground">{invoice.companyName || 'No Company'}</div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{invoice.customerName || 'Unknown'}</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate max-w-[180px]">{invoice.customerEmail || 'No Email'}</span>
                    </div>
                    {invoice.customerPhone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {invoice.customerPhone}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-1 font-semibold">
                    <IndianRupee className="w-4 h-4" />
                    {(invoice.total / 1000).toFixed(1)}K
                  </div>
                  {invoice.totalTax > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Tax: ₹{(invoice.totalTax / 1000).toFixed(1)}K
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <Badge className={`${statusColors[invoice.status] || statusColors.draft} border`}>
                    {invoice.status || 'draft'}
                  </Badge>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    {formatDate(invoice.issueDate)}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-3 h-3 text-muted-foreground" />
                    {formatDate(invoice.dueDate)}
                  </div>
                </td>
                <td className="p-4 text-sm text-muted-foreground">
                  {getCreatedDate()}
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-end gap-1">
                    {onDownload && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onDownload(invoice)}
                        title="Download PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    {onEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onEdit(invoice)}
                        title="Edit Invoice"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => onDelete(invoice)}
                        title="Delete Invoice"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>
      {invoices.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No invoices found
        </div>
      )}
    </div>
  );
}
