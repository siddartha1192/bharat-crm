import { useState, useRef, useEffect } from 'react';
import { leadsAPI } from '@/lib/api';
import { LeadCard } from '@/components/leads/LeadCard';
import { LeadDetailDialog } from '@/components/leads/LeadDetailDialog';
import { LeadDialog } from '@/components/leads/LeadDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Users,
  TrendingUp,
  IndianRupee,
  Target,
  Loader2,
} from 'lucide-react';
import { Lead, LeadStatus } from '@/types/lead';
import { exportLeadsToCSV, importLeadsFromCSV } from '@/lib/csvUtils';
import { useToast } from '@/hooks/use-toast';

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'all'>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<Lead | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch leads from API
  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const data = await leadsAPI.getAll({
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setLeads(data);
    } catch (error) {
      toast({
        title: "Error fetching leads",
        description: "Failed to load leads. Please check if the backend is running.",
        variant: "destructive",
      });
      console.error('Error fetching leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (lead: Lead) => {
    setSelectedLead(lead);
    setDetailDialogOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingLead(null);
    setEditDialogOpen(true);
  };

  const handleSaveLead = async (lead: Lead) => {
    try {
      if (lead.id && editingLead) {
        // Update existing lead
        await leadsAPI.update(lead.id, lead);
        toast({
          title: "Lead updated",
          description: "Lead has been updated successfully.",
        });
      } else {
        // Create new lead
        await leadsAPI.create(lead);
        toast({
          title: "Lead created",
          description: "New lead has been created successfully.",
        });
      }
      // Refresh the leads list
      fetchLeads();
    } catch (error) {
      toast({
        title: "Error saving lead",
        description: "Failed to save lead. Please try again.",
        variant: "destructive",
      });
      console.error('Error saving lead:', error);
    }
  };

  const handleDelete = (lead: Lead) => {
    setLeadToDelete(lead);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (leadToDelete) {
      try {
        await leadsAPI.delete(leadToDelete.id);
        toast({
          title: "Lead deleted",
          description: "Lead has been deleted successfully.",
        });
        setLeadToDelete(null);
        // Refresh the leads list
        fetchLeads();
      } catch (error) {
        toast({
          title: "Error deleting lead",
          description: "Failed to delete lead. Please try again.",
          variant: "destructive",
        });
        console.error('Error deleting lead:', error);
      }
    }
  };

  const handleExport = () => {
    try {
      console.log('Exporting leads:', filteredLeads.length);
      exportLeadsToCSV(filteredLeads, `leads-${new Date().toISOString().split('T')[0]}.csv`);
      toast({
        title: "Export successful",
        description: `${filteredLeads.length} leads exported to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export leads. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('Importing file:', file.name);

    try {
      const importedLeads = await importLeadsFromCSV(file);
      console.log('Imported leads:', importedLeads.length);

      // Create all imported leads in the backend
      for (const lead of importedLeads) {
        await leadsAPI.create(lead);
      }

      toast({
        title: "Import successful",
        description: `${importedLeads.length} leads imported successfully.`,
      });

      // Refresh the leads list
      fetchLeads();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: "Failed to import leads. Please check the file format.",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch =
      lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: leads.length,
    new: leads.filter(l => l.status === 'new').length,
    qualified: leads.filter(l => l.status === 'qualified').length,
    totalValue: leads.reduce((sum, l) => sum + l.estimatedValue, 0),
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="absolute -left-6 top-0 bottom-0 w-1 bg-primary rounded-r" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Lead Management</h1>
              <p className="text-muted-foreground">
                Capture and manage leads from multiple sources
              </p>
            </div>
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleImport}
                className="hidden"
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleAddNew}>
                <Plus className="w-4 h-4 mr-2" />
                Add Lead
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Leads</p>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">New Leads</p>
                <p className="text-2xl font-bold text-foreground">{stats.new}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
                <Target className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Qualified</p>
                <p className="text-2xl font-bold text-foreground">{stats.qualified}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Pipeline Value</p>
                <p className="text-2xl font-bold text-foreground">
                  ₹{(stats.totalValue / 100000).toFixed(1)}L
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center">
                <IndianRupee className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search leads by name, company, or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="proposal">Proposal</SelectItem>
                <SelectItem value="negotiation">Negotiation</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Leads Grid */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Loading leads...</h3>
            <p className="text-muted-foreground">
              Please wait while we fetch your data
            </p>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredLeads.map(lead => (
                <LeadCard
                  key={lead.id}
                  lead={lead}
                  onViewDetails={handleViewDetails}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>

            {filteredLeads.length === 0 && (
              <Card className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No leads found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </Card>
            )}
          </>
        )}

        {/* Lead Detail Dialog */}
        <LeadDetailDialog
          lead={selectedLead}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />

        {/* Lead Add/Edit Dialog */}
        <LeadDialog
          lead={editingLead}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveLead}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Lead"
          description={`Are you sure you want to delete "${leadToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          variant="destructive"
        />
      </div>
    </div>
  );
}
