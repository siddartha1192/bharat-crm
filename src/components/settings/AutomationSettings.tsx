import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { api } from '../../lib/api';
import { Plus, Trash2, Edit, Power, Mail, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';

interface AutomationRule {
  id?: string;
  name: string;
  type: string;
  isEnabled: boolean;
  triggerEvent: string;
  actionType: string;
  emailSubject?: string;
  emailTemplate?: string;
  fromStage?: string;
  toStage?: string;
  entityType?: string; // 'lead' or 'deal'
  createdAt?: string;
}

const LEAD_STAGES = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];
const DEAL_STAGES = ['lead', 'qualified', 'proposal', 'negotiation', 'closed-won', 'closed-lost'];

export default function AutomationSettings() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);

  // Form state
  const [formData, setFormData] = useState<AutomationRule>({
    name: '',
    type: 'lead_created',
    isEnabled: true,
    triggerEvent: 'lead.created',
    actionType: 'send_email',
    emailSubject: '',
    emailTemplate: '',
    fromStage: '',
    toStage: '',
    entityType: 'lead'
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const response = await api.get('/automation/rules');
      setRules(response.data);
    } catch (error) {
      console.error('Error loading automation rules:', error);
      toast.error('Failed to load automation rules');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (rule?: AutomationRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        ...rule,
        entityType: rule.entityType || 'lead' // Default to lead for backward compatibility
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        type: 'lead_created',
        isEnabled: true,
        triggerEvent: 'lead.created',
        actionType: 'send_email',
        emailSubject: '',
        emailTemplate: '',
        fromStage: '',
        toStage: '',
        entityType: 'lead'
      });
    }
    setDialogOpen(true);
  };

  const handleSaveRule = async () => {
    try {
      if (editingRule?.id) {
        await api.put(`/automation/rules/${editingRule.id}`, formData);
        toast.success('Automation rule updated successfully');
      } else {
        await api.post('/automation/rules', formData);
        toast.success('Automation rule created successfully');
      }

      setDialogOpen(false);
      loadRules();
    } catch (error) {
      console.error('Error saving automation rule:', error);
      toast.error('Failed to save automation rule');
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation rule?')) return;

    try {
      await api.delete(`/automation/rules/${id}`);
      toast.success('Automation rule deleted');
      loadRules();
    } catch (error) {
      console.error('Error deleting automation rule:', error);
      toast.error('Failed to delete automation rule');
    }
  };

  const handleToggleRule = async (id: string, isEnabled: boolean) => {
    try {
      await api.patch(`/automation/rules/${id}/toggle`, { isEnabled });
      toast.success(`Automation ${isEnabled ? 'enabled' : 'disabled'}`);
      loadRules();
    } catch (error) {
      console.error('Error toggling automation rule:', error);
      toast.error('Failed to toggle automation rule');
    }
  };

  const handleTypeChange = (type: string) => {
    const eventMap: Record<string, string> = {
      'lead_created': 'lead.created',
      'stage_change': formData.entityType === 'deal' ? 'deal.stage_changed' : 'lead.stage_changed'
    };

    setFormData({
      ...formData,
      type,
      triggerEvent: eventMap[type] || 'lead.created',
      fromStage: '',
      toStage: ''
    });
  };

  const handleEntityTypeChange = (entityType: string) => {
    const triggerEvent = formData.type === 'stage_change'
      ? (entityType === 'deal' ? 'deal.stage_changed' : 'lead.stage_changed')
      : 'lead.created';

    setFormData({
      ...formData,
      entityType,
      triggerEvent,
      fromStage: '',
      toStage: ''
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Automation Rules</h2>
          <p className="text-muted-foreground">Configure automated workflows for leads and emails</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </div>

      {loading ? (
        <p>Loading automation rules...</p>
      ) : rules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Automation Rules</h3>
            <p className="text-muted-foreground mb-4">Get started by creating your first automation rule</p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Rule
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {rule.isEnabled ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-400" />
                    )}
                    <div>
                      <CardTitle>{rule.name}</CardTitle>
                      <CardDescription>
                        <Badge variant="outline" className="mr-2">
                          {rule.type === 'lead_created' ? 'Lead Created' : 'Stage Change'}
                        </Badge>
                        <Badge variant="secondary" className="mr-2">
                          {rule.entityType === 'deal' ? 'Deal' : 'Lead'}
                        </Badge>
                        {rule.type === 'stage_change' && rule.fromStage && rule.toStage && (
                          <span className="text-xs">
                            {rule.fromStage} → {rule.toStage}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.isEnabled}
                      onCheckedChange={(checked) => handleToggleRule(rule.id!, checked)}
                    />
                    <Button variant="outline" size="sm" onClick={() => handleOpenDialog(rule)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteRule(rule.id!)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-semibold">Action:</span> {rule.actionType === 'send_email' ? 'Send Email' : rule.actionType}
                  </div>
                  {rule.emailSubject && (
                    <div>
                      <span className="font-semibold">Subject:</span> {rule.emailSubject}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Edit' : 'Create'} Automation Rule</DialogTitle>
            <DialogDescription>
              Configure automated actions for your leads and pipeline
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Welcome Email for New Leads"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Trigger Type</Label>
              <Select value={formData.type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lead_created">Lead Created</SelectItem>
                  <SelectItem value="stage_change">Stage Change</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'stage_change' && (
              <div className="space-y-2">
                <Label htmlFor="entityType">Entity Type</Label>
                <Select value={formData.entityType} onValueChange={handleEntityTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lead">Lead</SelectItem>
                    <SelectItem value="deal">Deal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === 'stage_change' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fromStage">From Stage</Label>
                  <Select value={formData.fromStage} onValueChange={(value) => setFormData({ ...formData, fromStage: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.entityType === 'deal' ? DEAL_STAGES : LEAD_STAGES).map((stage) => (
                        <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="toStage">To Stage</Label>
                  <Select value={formData.toStage} onValueChange={(value) => setFormData({ ...formData, toStage: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {(formData.entityType === 'deal' ? DEAL_STAGES : LEAD_STAGES).map((stage) => (
                        <SelectItem key={stage} value={stage}>{stage}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="emailSubject">Email Subject</Label>
              <Input
                id="emailSubject"
                value={formData.emailSubject}
                onChange={(e) => setFormData({ ...formData, emailSubject: e.target.value })}
                placeholder="Use {{name}}, {{company}}, {{stage}} for variables"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="emailTemplate">Email Template (HTML)</Label>
              <Textarea
                id="emailTemplate"
                value={formData.emailTemplate}
                onChange={(e) => setFormData({ ...formData, emailTemplate: e.target.value })}
                placeholder="Leave empty to use default template. Use {{name}}, {{company}}, {{fromStage}}, {{toStage}} for variables"
                rows={10}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                Available variables: {'{'}{'{'} name {'}'}{'}'},  {'{'}{'{'} company {'}'}{'}'},  {'{'}{'{'} email {'}'}{'}'},  {'{'}{'{'} stage {'}'}{'}'},  {'{'}{'{'} fromStage {'}'}{'}'},  {'{'}{'{'} toStage {'}'}{'}'}</p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="enabled"
                checked={formData.isEnabled}
                onCheckedChange={(checked) => setFormData({ ...formData, isEnabled: checked })}
              />
              <Label htmlFor="enabled">Enable this automation rule</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRule} disabled={!formData.name}>
              Save Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
