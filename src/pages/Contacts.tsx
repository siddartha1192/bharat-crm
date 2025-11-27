import { useState, useRef, useEffect } from 'react';
import { contactsAPI } from '@/lib/api';
import { ContactCard } from '@/components/contacts/ContactCard';
import { ContactListView } from '@/components/contacts/ContactListView';
import { ContactDetailDialog } from '@/components/contacts/ContactDetailDialog';
import { ContactDialog } from '@/components/contacts/ContactDialog';
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
  Building2,
  IndianRupee,
  TrendingUp,
  Loader2,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Contact, ContactType } from '@/types/contact';
import { exportContactsToCSV, importContactsFromCSV } from '@/lib/csvUtils';
import { useToast } from '@/hooks/use-toast';

export default function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<ContactType | 'all'>('all');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch contacts from API
  useEffect(() => {
    fetchContacts();
  }, [typeFilter]);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const data = await contactsAPI.getAll({
        type: typeFilter !== 'all' ? typeFilter : undefined
      });
      setContacts(data);
    } catch (error) {
      toast({
        title: "Error fetching contacts",
        description: "Failed to load contacts. Please check if the backend is running.",
        variant: "destructive",
      });
      console.error('Error fetching contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (contact: Contact) => {
    setSelectedContact(contact);
    setDetailDialogOpen(true);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setEditDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingContact(null);
    setEditDialogOpen(true);
  };

  const handleSaveContact = async (contact: Contact) => {
    try {
      if (contact.id && editingContact) {
        // Update existing contact
        await contactsAPI.update(contact.id, contact);
        toast({
          title: "Contact updated",
          description: "Contact has been updated successfully.",
        });
      } else {
        // Create new contact
        await contactsAPI.create(contact);
        toast({
          title: "Contact created",
          description: "New contact has been created successfully.",
        });
      }
      // Refresh the contacts list
      fetchContacts();
    } catch (error) {
      toast({
        title: "Error saving contact",
        description: "Failed to save contact. Please try again.",
        variant: "destructive",
      });
      console.error('Error saving contact:', error);
    }
  };

  const handleDelete = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (contactToDelete) {
      try {
        await contactsAPI.delete(contactToDelete.id);
        toast({
          title: "Contact deleted",
          description: "Contact has been deleted successfully.",
        });
        setContactToDelete(null);
        // Refresh the contacts list
        fetchContacts();
      } catch (error) {
        toast({
          title: "Error deleting contact",
          description: "Failed to delete contact. Please try again.",
          variant: "destructive",
        });
        console.error('Error deleting contact:', error);
      }
    }
  };

  const handleExport = () => {
    try {
      console.log('Exporting contacts:', filteredContacts.length);
      exportContactsToCSV(filteredContacts, `contacts-${new Date().toISOString().split('T')[0]}.csv`);
      toast({
        title: "Export successful",
        description: `${filteredContacts.length} contacts exported to CSV.`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export failed",
        description: "Failed to export contacts. Please try again.",
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
      const importedContacts = await importContactsFromCSV(file);
      console.log('Imported contacts:', importedContacts.length);

      // Create all imported contacts in the backend
      for (const contact of importedContacts) {
        await contactsAPI.create(contact);
      }

      toast({
        title: "Import successful",
        description: `${importedContacts.length} contacts imported successfully.`,
      });

      // Refresh the contacts list
      fetchContacts();
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import failed",
        description: "Failed to import contacts. Please check the file format.",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredContacts = contacts.filter(contact => {
    const matchesSearch =
      contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = typeFilter === 'all' || contact.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const stats = {
    total: contacts.length,
    customers: contacts.filter(c => c.type === 'customer').length,
    prospects: contacts.filter(c => c.type === 'prospect').length,
    totalValue: contacts.reduce((sum, c) => sum + c.lifetimeValue, 0),
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative">
          <div className="absolute -left-6 top-0 bottom-0 w-1 bg-primary rounded-r" />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Contact Management</h1>
              <p className="text-muted-foreground">
                Manage contacts and company profiles with Indian compliance
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
                Add Contact
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Contacts</p>
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
                <p className="text-sm text-muted-foreground mb-1">Customers</p>
                <p className="text-2xl font-bold text-foreground">{stats.customers}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Prospects</p>
                <p className="text-2xl font-bold text-foreground">{stats.prospects}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Lifetime Value</p>
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
                placeholder="Search contacts by name, company, or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as any)}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="vendor">Vendor</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-1 border rounded-md p-1">
              <Button
                variant={viewMode === 'card' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('card')}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Card
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4 mr-2" />
                List
              </Button>
            </div>
          </div>
        </Card>

        {/* Contacts Grid/List */}
        {loading ? (
          <Card className="p-12 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Loading contacts...</h3>
            <p className="text-muted-foreground">
              Please wait while we fetch your data
            </p>
          </Card>
        ) : (
          <>
            {viewMode === 'card' ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredContacts.map(contact => (
                  <ContactCard
                    key={contact.id}
                    contact={contact}
                    onViewProfile={handleViewProfile}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            ) : (
              <ContactListView
                contacts={filteredContacts}
                onViewProfile={handleViewProfile}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            )}

            {filteredContacts.length === 0 && (
              <Card className="p-12 text-center">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No contacts found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters
                </p>
              </Card>
            )}
          </>
        )}

        {/* Contact Detail Dialog */}
        <ContactDetailDialog
          contact={selectedContact}
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
        />

        {/* Contact Add/Edit Dialog */}
        <ContactDialog
          contact={editingContact}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleSaveContact}
        />

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="Delete Contact"
          description={`Are you sure you want to delete "${contactToDelete?.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          variant="destructive"
        />
      </div>
    </div>
  );
}
