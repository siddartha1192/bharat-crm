import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
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
import { Alert, AlertDescription } from '../ui/alert';
import { api, pipelineStagesAPI } from '../../lib/api';
import { Plus, Trash2, Edit, Power, Mail, MessageSquare, CheckCircle2, XCircle, AlertCircle, Users, Zap } from 'lucide-react';
import { toast } from 'sonner';
import RoundRobinSettings from './RoundRobinSettings';

interface AutomationRule {
  id?: string;
  name: string;
  type: string;
  isEnabled: boolean;
  triggerEvent: string;
  actionType: string;
  emailSubject?: string;
  emailTemplate?: string;
  whatsappMessage?: string;
  whatsappTemplate?: string;
  fromStage?: string;
  toStage?: string;
  entityType?: string; // 'lead' or 'deal'
  createdAt?: string;
}

interface PipelineStage {
  id: string;
  name: string;
  slug: string;
  stageType: 'LEAD' | 'DEAL' | 'BOTH';
  color: string;
  order: number;
  isActive: boolean;
}

export default function AutomationSettings() {
  const { user } = useAuth();
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);
  const [stagesLoading, setStagesLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState<AutomationRule>({
    name: '',
    type: 'lead_created',
    isEnabled: true,
    triggerEvent: 'lead.created',
    actionType: 'send_email',
    emailSubject: '',
    emailTemplate: '',
    whatsappMessage: '',
    whatsappTemplate: '',
    fromStage: '',
    toStage: '',
    entityType: 'lead'
  });

  useEffect(() => {
    loadRules();
    loadPipelineStages();
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

  const loadPipelineStages = async () => {
    try {
      const stages = await pipelineStagesAPI.getAll();
      setPipelineStages(stages);
    } catch (error) {
      console.error('Error loading pipeline stages:', error);
      toast.error('Failed to load pipeline stages');
    } finally {
      setStagesLoading(false);
    }
  };

  // Get filtered stages based on entity type
  const getStagesForEntityType = (entityType: string) => {
    if (entityType === 'lead') {
      return pipelineStages.filter(s => s.isActive && (s.stageType === 'LEAD' || s.stageType === 'BOTH'));
    } else if (entityType === 'deal') {
      return pipelineStages.filter(s => s.isActive && (s.stageType === 'DEAL' || s.stageType === 'BOTH'));
    }
    return [];
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
        whatsappMessage: '',
        whatsappTemplate: '',
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
      <Tabs defaultValue="rules" className="space-y-6">
        <TabsList>
          <TabsTrigger value="rules">
            <Zap className="w-4 h-4 mr-2" />
            Automation Rules
          </TabsTrigger>
          <TabsTrigger value="round-robin">
            <Users className="w-4 h-4 mr-2" />
            Round-Robin Assignment
          </TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Automation Rules</h2>
              <p className="text-muted-foreground">Configure automated workflows for Email and WhatsApp campaigns</p>
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
            <div className="flex gap-2 mb-4">
              <Mail className="h-12 w-12 text-blue-500" />
              <MessageSquare className="h-12 w-12 text-green-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Automation Rules</h3>
            <p className="text-muted-foreground mb-4">Automate Email and WhatsApp campaigns for leads and deals</p>
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
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Action:</span>
                    {rule.actionType === 'send_email' && (
                      <div className="flex items-center gap-1 text-blue-600">
                        <Mail className="h-4 w-4" />
                        <span>Email</span>
                      </div>
                    )}
                    {rule.actionType === 'send_whatsapp' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <MessageSquare className="h-4 w-4" />
                        <span>WhatsApp</span>
                      </div>
                    )}
                    {rule.actionType === 'send_both' && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-4 w-4 text-blue-600" />
                        <MessageSquare className="h-4 w-4 text-green-600" />
                        <span>Email & WhatsApp</span>
                      </div>
                    )}
                    {!['send_email', 'send_whatsapp', 'send_both'].includes(rule.actionType) && (
                      <span>{rule.actionType}</span>
                    )}
                  </div>
                  {rule.emailSubject && (
                    <div>
                      <span className="font-semibold">Email Subject:</span> {rule.emailSubject}
                    </div>
                  )}
                  {rule.whatsappMessage && (
                    <div>
                      <span className="font-semibold">WhatsApp:</span>
                      <span className="text-xs text-muted-foreground ml-2">Custom message configured</span>
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
              <>
                {getStagesForEntityType(formData.entityType || 'lead').length === 0 && (
                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      No {formData.entityType === 'deal' ? 'deal' : 'lead'} stages found. Please create pipeline stages with stageType="{formData.entityType === 'deal' ? 'DEAL' : 'LEAD'}" or "BOTH" to set up stage-based automation.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fromStage">From Stage</Label>
                    <Select
                      value={formData.fromStage}
                      onValueChange={(value) => setFormData({ ...formData, fromStage: value })}
                      disabled={getStagesForEntityType(formData.entityType || 'lead').length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {getStagesForEntityType(formData.entityType || 'lead').map((stage) => (
                          <SelectItem key={stage.id} value={stage.slug}>{stage.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="toStage">To Stage</Label>
                    <Select
                      value={formData.toStage}
                      onValueChange={(value) => setFormData({ ...formData, toStage: value })}
                      disabled={getStagesForEntityType(formData.entityType || 'lead').length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {getStagesForEntityType(formData.entityType || 'lead').map((stage) => (
                          <SelectItem key={stage.id} value={stage.slug}>{stage.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {/* Action Type Selector */}
            <div className="space-y-2">
              <Label htmlFor="actionType">Action Type</Label>
              <Select value={formData.actionType} onValueChange={(value) => setFormData({ ...formData, actionType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="send_email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>Send Email Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="send_whatsapp">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>Send WhatsApp Only</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="send_both">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <MessageSquare className="h-4 w-4" />
                      <span>Send Both Email & WhatsApp</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Email Fields - Show when actionType is send_email or send_both */}
            {(formData.actionType === 'send_email' || formData.actionType === 'send_both') && (
              <>
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
              </>
            )}

            {/* WhatsApp Fields - Show when actionType is send_whatsapp or send_both */}
            {(formData.actionType === 'send_whatsapp' || formData.actionType === 'send_both') && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="whatsappMessage">WhatsApp Message</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const response = await api.get('/automation/whatsapp-templates');
                          const templates = response.data;
                          const defaultTemplate = templates[formData.type] || templates.lead_created || '';
                          setFormData({ ...formData, whatsappMessage: defaultTemplate });
                          toast.success('Default WhatsApp template loaded');
                        } catch (error) {
                          console.error('Error loading template:', error);
                          toast.error('Failed to load template');
                        }
                      }}
                    >
                      Load Default Template
                    </Button>
                  </div>
                  <Textarea
                    id="whatsappMessage"
                    value={formData.whatsappMessage}
                    onChange={(e) => setFormData({ ...formData, whatsappMessage: e.target.value })}
                    placeholder="Leave empty to use default template. Use {{name}}, {{company}}, {{fromStage}}, {{toStage}} for variables"
                    rows={12}
                    className="font-mono text-sm"
                  />
                  <Alert className="bg-green-50 border-green-200">
                    <MessageSquare className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800 text-xs">
                      <strong>WhatsApp Formatting:</strong> Use *bold*, _italic_, ~strikethrough~, ```code```
                      <br />
                      <strong>Variables:</strong> {'{'}{'{'} name {'}'}{'}'},  {'{'}{'{'} company {'}'}{'}'},  {'{'}{'{'} fromStage {'}'}{'}'},  {'{'}{'{'} toStage {'}'}{'}'}, {'{'}{'{'} phone {'}'}{'}'}, {'{'}{'{'} email {'}'}{'}'}<br/>
                      <strong>Note:</strong> Recipient must have WhatsApp number in their contact profile
                    </AlertDescription>
                  </Alert>
                </div>
              </>
            )}

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
        </TabsContent>

        <TabsContent value="round-robin">
          <RoundRobinSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
