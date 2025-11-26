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

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Invoices</h1>
          <p className="text-muted-foreground">
            Manage your invoices and track payments
          </p>
        </div>
        <Button onClick={handleCreateInvoice} size="lg" className="gap-2">
          <Plus className="h-5 w-5" />
          Create Invoice
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Invoices"
          value={mockInvoiceStats.totalInvoices}
          icon={FileText}
          trend={{ value: 12, isPositive: true }}
          colorClass="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatsCard
          title="Paid Amount"
          value={`₹${(mockInvoiceStats.paidAmount / 1000).toFixed(1)}K`}
          icon={CheckCircle}
          trend={{ value: 8, isPositive: true }}
          colorClass="bg-gradient-to-br from-green-500 to-green-600"
        />
        <StatsCard
          title="Pending Amount"
          value={`₹${(mockInvoiceStats.pendingAmount / 1000).toFixed(1)}K`}
          icon={DollarSign}
          trend={{ value: 3, isPositive: false }}
          colorClass="bg-gradient-to-br from-amber-500 to-amber-600"
        />
        <StatsCard
          title="Overdue Amount"
          value={`₹${(mockInvoiceStats.overdueAmount / 1000).toFixed(1)}K`}
          icon={AlertCircle}
          trend={{ value: 15, isPositive: false }}
          colorClass="bg-gradient-to-br from-red-500 to-red-600"
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
      />
    </div>
  );
};

export default Invoices;
