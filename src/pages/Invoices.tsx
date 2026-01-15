import { useState, useEffect } from "react";
import { Invoice } from "@/types/invoice";
import { invoicesAPI, invoiceTemplatesAPI } from "@/lib/api";
import { InvoiceCard } from "@/components/invoice/InvoiceCard";
import { InvoiceDialog } from "@/components/invoice/InvoiceDialog";
import { StatsCard } from "@/components/dashboard/StatsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, FileText, DollarSign, AlertCircle, CheckCircle, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { exportInvoicesToCSV } from "@/lib/csvUtils";
import { ProtectedFeature } from "@/components/auth/ProtectedFeature";
import { toast as sonnerToast } from "sonner";

const Invoices = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | undefined>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  // Fetch invoices from API
  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const data = await invoicesAPI.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setInvoices(data);
    } catch (error) {
      toast({
        title: "Error fetching invoices",
        description: "Failed to load invoices. Please check if the backend is running.",
        variant: "destructive",
      });
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSaveInvoice = async (invoice: Invoice) => {
    try {
      if (invoice.id && selectedInvoice) {
        // Update existing invoice
        await invoicesAPI.update(invoice.id, invoice);
        toast({
          title: "Invoice updated",
          description: "Invoice has been updated successfully.",
        });
      } else {
        // Create new invoice
        await invoicesAPI.create(invoice);
        toast({
          title: "Invoice created",
          description: "New invoice has been created successfully.",
        });
      }
      // Refresh the invoices list
      fetchInvoices();
    } catch (error) {
      toast({
        title: "Error saving invoice",
        description: "Failed to save invoice. Please try again.",
        variant: "destructive",
      });
      console.error('Error saving invoice:', error);
    }
  };

  // Calculate stats from current invoices state (not static mock data)
  const stats = {
    totalInvoices: invoices.length,
    paidAmount: invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.total, 0),
    pendingAmount: invoices.filter(inv => inv.status === 'sent').reduce((sum, inv) => sum + inv.total, 0),
    overdueAmount: invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.total, 0),
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    try {
      sonnerToast.loading('Generating invoice PDF...');

      // Helper functions to format data
      const formatDate = (date: any) => {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        });
      };

      const formatNumber = (num: number) => {
        return Number(num || 0).toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      };

      // Determine status class for CSS
      const statusMap: Record<string, string> = {
        'Draft': 'draft',
        'Sent': 'sent',
        'Paid': 'paid',
        'Overdue': 'overdue',
        'Cancelled': 'cancelled'
      };

      // Format line items as HTML table rows
      const lineItemsHTML = invoice.lineItems.map((item, index) => `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${item.description || ''}</td>
          <td>${item.hsnSac || ''}</td>
          <td class="text-center">${item.quantity || 0} ${item.unit || ''}</td>
          <td class="text-right">₹${formatNumber(item.rate || 0)}</td>
          <td class="text-right">${item.taxRate || 0}%</td>
          <td class="text-right">₹${formatNumber(item.discount || 0)}</td>
          <td class="text-right">₹${formatNumber(item.amount || 0)}</td>
        </tr>
      `).join('');

      // Prepare invoice data for template
      const invoiceData = {
        invoiceNumber: invoice.invoiceNumber || '',
        invoiceDate: formatDate(invoice.issueDate || new Date()),
        dueDate: formatDate(invoice.dueDate),
        status: invoice.status || 'Draft',
        statusClass: statusMap[invoice.status] || 'draft',

        companyName: invoice.companyName || 'Your Company',
        companyAddress: `${invoice.companyAddress || ''}, ${invoice.companyCity || ''}, ${invoice.companyState || ''} - ${invoice.companyPincode || ''}`,
        companyGSTIN: invoice.companyGST || '',
        companyPAN: invoice.companyPAN || '',

        customerName: invoice.customerName || '',
        customerAddress: `${invoice.customerAddress || ''}, ${invoice.customerCity || ''}, ${invoice.customerState || ''} - ${invoice.customerPincode || ''}`,
        customerEmail: invoice.customerEmail || '',
        customerPhone: invoice.customerPhone || '',
        customerGSTIN: invoice.customerGST || '',

        lineItems: lineItemsHTML,

        subtotal: formatNumber(invoice.subtotal),
        totalDiscount: invoice.totalDiscount > 0 ? formatNumber(invoice.totalDiscount) : null,
        cgst: invoice.cgst > 0 ? formatNumber(invoice.cgst) : null,
        sgst: invoice.sgst > 0 ? formatNumber(invoice.sgst) : null,
        igst: invoice.igst > 0 ? formatNumber(invoice.igst) : null,
        totalTax: formatNumber(invoice.totalTax),
        roundOff: invoice.roundOff ? formatNumber(invoice.roundOff) : null,
        total: formatNumber(invoice.total),

        paymentMethod: invoice.paymentMethod || null,
        paymentDate: invoice.paymentDate ? formatDate(invoice.paymentDate) : null,
        notes: invoice.notes || null
      };

      // Get rendered HTML from backend template service using default template
      const result = await invoiceTemplatesAPI.render(invoiceData);

      sonnerToast.dismiss();
      sonnerToast.success(`Invoice PDF generated using "${result.templateName}"`);

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(result.html);
        printWindow.document.close();

        // Wait for content to load then trigger print dialog
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      sonnerToast.dismiss();
      sonnerToast.error('Failed to generate invoice PDF');
    }
  };

  const handleExportCSV = () => {
    try {
      console.log('Exporting invoices:', filteredInvoices.length);
      exportInvoicesToCSV(filteredInvoices, `invoices-${new Date().toISOString().split('T')[0]}.csv`);
      toast({
        title: "Export successful",
        description: `${filteredInvoices.length} invoices exported to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export invoices. Please try again.",
        variant: "destructive",
      });
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
            <div className="flex gap-2">
              <ProtectedFeature permission="invoices:export">
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </ProtectedFeature>
              <ProtectedFeature permission="invoices:create">
                <Button onClick={handleCreateInvoice} size="lg" className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
                  <Plus className="h-5 w-5" />
                  Create Invoice
                </Button>
              </ProtectedFeature>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Invoices"
            value={stats.totalInvoices}
            icon={FileText}
            colorClass="bg-gradient-to-br from-primary to-primary/80"
          />
          <StatsCard
            title="Paid Amount"
            value={`₹${(stats.paidAmount / 100000).toFixed(2)}L`}
            icon={CheckCircle}
            colorClass="bg-gradient-to-br from-accent to-accent/80"
          />
          <StatsCard
            title="Pending Amount"
            value={`₹${(stats.pendingAmount / 1000).toFixed(1)}K`}
            icon={DollarSign}
            colorClass="bg-gradient-to-br from-accent to-accent/80"
          />
          <StatsCard
            title="Overdue Amount"
            value={`₹${(stats.overdueAmount / 100000).toFixed(2)}L`}
            icon={AlertCircle}
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

      {loading ? (
        <Card className="p-12 text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <h3 className="text-lg font-semibold text-foreground mb-2">Loading invoices...</h3>
          <p className="text-muted-foreground">
            Please wait while we fetch your data
          </p>
        </Card>
      ) : (
        <>
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
        </>
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
