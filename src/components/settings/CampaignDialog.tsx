import { useState, useEffect, useRef } from 'react';
import { Campaign, CampaignChannel, CampaignTargetType, CreateCampaignData, WhatsAppMessageType, WhatsAppMediaType } from '@/types/campaign';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Mail, MessageSquare, ChevronLeft, ChevronRight, Send, CalendarIcon, Users, Image, FileText, Video, Music, Plus, X, AlertCircle, Upload, Loader2, Megaphone, FileCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmailEditor } from './EmailEditor';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingCampaign?: Campaign | null;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface CampaignTemplate {
  id: string;
  name: string;
  channel: CampaignChannel;
  subject?: string;
  htmlContent?: string;
  textContent: string;
  targetType: CampaignTargetType;
}

interface UtmTemplate {
  id: string;
  name: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  platform?: string;
  isDefault: boolean;
  isActive: boolean;
}

export function CampaignDialog({ open, onOpenChange, onSuccess, editingCampaign }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [utmTemplates, setUtmTemplates] = useState<UtmTemplate[]>([]);
  const [selectedUtmTemplate, setSelectedUtmTemplate] = useState<string>('');
  const [enableUtmTracking, setEnableUtmTracking] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const token = localStorage.getItem('token');

  // Form state
  const [formData, setFormData] = useState<CreateCampaignData>({
    name: '',
    description: '',
    channel: 'email',
    subject: '',
    htmlContent: '',
    textContent: '',
    targetType: 'all',
    targetFilters: {},
    scheduledAt: undefined,
    // WhatsApp-specific fields
    whatsappMessageType: 'text',
    whatsappMediaType: undefined,
    whatsappMediaUrl: '',
    whatsappCaption: '',
    whatsappTemplateName: '',
    whatsappTemplateLanguage: 'en',
    whatsappTemplateParams: [''],
    // UTM tracking fields
    utmSource: undefined,
    utmMedium: undefined,
    utmCampaign: undefined,
    utmTerm: undefined,
    utmContent: undefined,
  });

  const [scheduleType, setScheduleType] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduleDate, setScheduleDate] = useState<Date>();
  const [scheduleTime, setScheduleTime] = useState('12:00');

  useEffect(() => {
    if (editingCampaign) {
      setFormData({
        name: editingCampaign.name,
        description: editingCampaign.description || '',
        channel: editingCampaign.channel,
        subject: editingCampaign.subject || '',
        htmlContent: editingCampaign.htmlContent || '',
        textContent: editingCampaign.textContent,
        targetType: editingCampaign.targetType,
        targetFilters: editingCampaign.targetFilters || {},
        scheduledAt: editingCampaign.scheduledAt,
        whatsappMessageType: editingCampaign.whatsappMessageType || 'text',
        whatsappMediaType: editingCampaign.whatsappMediaType,
        whatsappMediaUrl: editingCampaign.whatsappMediaUrl || '',
        whatsappCaption: editingCampaign.whatsappCaption || '',
        whatsappTemplateName: editingCampaign.whatsappTemplateName || '',
        whatsappTemplateLanguage: editingCampaign.whatsappTemplateLanguage || 'en',
        whatsappTemplateParams: editingCampaign.whatsappTemplateParams || [''],
      });
    } else {
      resetForm();
    }
  }, [editingCampaign, open]);

  // Fetch estimated recipient count when targeting changes
  useEffect(() => {
    if (step === 3 && formData.channel && formData.targetType) {
      fetchRecipientCount();
    }
  }, [step, formData.channel, formData.targetType, formData.targetFilters]);

  const fetchRecipientCount = async () => {
    try {
      const response = await api.post('/campaigns/estimate-recipients', {
        channel: formData.channel,
        targetType: formData.targetType,
        targetFilters: formData.targetFilters,
      });
      setRecipientCount(response.data.count || 0);
    } catch (error) {
      console.error('Error fetching recipient count:', error);
      setRecipientCount(0);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const response = await api.get('/campaigns/templates/list');
      setTemplates(response.data.templates || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Error',
        description: 'Failed to load templates',
        variant: 'destructive',
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const applyTemplate = (template: CampaignTemplate) => {
    updateFormData({
      subject: template.subject || formData.subject,
      htmlContent: template.htmlContent || formData.htmlContent,
      textContent: template.textContent,
      targetType: template.targetType,
    });
    toast({
      title: 'Template Applied',
      description: `${template.name} has been loaded. You can customize it before creating the campaign.`,
    });
  };

  useEffect(() => {
    if (open && step === 2) {
      fetchTemplates();
      fetchUtmTemplates();
    }
  }, [open, step]);

  const fetchUtmTemplates = async () => {
    try {
      const response = await api.get('/utm-templates');
      const templatesData = response.data.data || response.data;
      if (Array.isArray(templatesData)) {
        // Only show active templates
        setUtmTemplates(templatesData.filter((t: UtmTemplate) => t.isActive));
      }
    } catch (error) {
      console.error('Error fetching UTM templates:', error);
    }
  };

  const applyUtmTemplate = (templateId: string) => {
    const template = utmTemplates.find((t) => t.id === templateId);
    if (template) {
      updateFormData({
        utmSource: template.utmSource,
        utmMedium: template.utmMedium,
        utmCampaign: template.utmCampaign,
        utmTerm: template.utmTerm,
        utmContent: template.utmContent,
      });
      setSelectedUtmTemplate(templateId);
      toast({
        title: 'UTM Template Applied',
        description: `"${template.name}" parameters will be applied to all links in this campaign.`,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      channel: 'email',
      subject: '',
      htmlContent: '',
      textContent: '',
      targetType: 'all',
      targetFilters: {},
      scheduledAt: undefined,
      whatsappMessageType: 'text',
      whatsappMediaType: undefined,
      whatsappMediaUrl: '',
      whatsappCaption: '',
      whatsappTemplateName: '',
      whatsappTemplateLanguage: 'en',
      whatsappTemplateParams: [''],
      utmSource: undefined,
      utmMedium: undefined,
      utmCampaign: undefined,
      utmTerm: undefined,
      utmContent: undefined,
    });
    setStep(1);
    setScheduleType('immediate');
    setScheduleDate(undefined);
    setScheduleTime('12:00');
    setEnableUtmTracking(false);
    setSelectedUtmTemplate('');
  };

  const updateFormData = (updates: Partial<CreateCampaignData>) => {
    setFormData((prev) => ({ ...prev, ...updates }));
  };

  const handleNext = () => {
    // Validation for each step
    if (step === 1) {
      if (!formData.name.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Campaign name is required',
          variant: 'destructive',
        });
        return;
      }
    } else if (step === 2) {
      if (formData.channel === 'email') {
        if (!formData.subject?.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Email subject is required',
            variant: 'destructive',
          });
          return;
        }
        if (!formData.textContent.trim()) {
          toast({
            title: 'Validation Error',
            description: 'Message content is required',
            variant: 'destructive',
          });
          return;
        }
      } else if (formData.channel === 'whatsapp') {
        // WhatsApp validation
        if (formData.whatsappMessageType === 'text') {
          if (!formData.textContent.trim()) {
            toast({
              title: 'Validation Error',
              description: 'Message content is required',
              variant: 'destructive',
            });
            return;
          }
        } else if (formData.whatsappMessageType === 'media') {
          if (!formData.whatsappMediaType) {
            toast({
              title: 'Validation Error',
              description: 'Please select a media type',
              variant: 'destructive',
            });
            return;
          }
          if (!formData.whatsappMediaUrl?.trim()) {
            toast({
              title: 'Validation Error',
              description: 'Media URL is required',
              variant: 'destructive',
            });
            return;
          }
        } else if (formData.whatsappMessageType === 'template') {
          if (!formData.whatsappTemplateName?.trim()) {
            toast({
              title: 'Validation Error',
              description: 'Template name is required',
              variant: 'destructive',
            });
            return;
          }
          if (!formData.whatsappTemplateLanguage?.trim()) {
            toast({
              title: 'Validation Error',
              description: 'Template language is required',
              variant: 'destructive',
            });
            return;
          }
        }
      }
    }

    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      // Prepare campaign data
      const campaignData: CreateCampaignData = {
        ...formData,
      };

      // Enable auto-tagging if UTM tracking is enabled
      if (enableUtmTracking && (formData.utmSource || formData.utmMedium || formData.utmCampaign)) {
        campaignData.autoTagLinks = true;
        campaignData.trackClicks = true;
      }

      // Add schedule if selected
      if (scheduleType === 'scheduled' && scheduleDate) {
        const [hours, minutes] = scheduleTime.split(':');
        const scheduledDateTime = new Date(scheduleDate);
        scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        campaignData.scheduledAt = scheduledDateTime.toISOString();
      }

      if (editingCampaign) {
        await api.put(`/campaigns/${editingCampaign.id}`, campaignData);
        toast({
          title: 'Success',
          description: 'Campaign updated successfully',
        });
      } else {
        const response = await api.post('/campaigns', campaignData);
        const campaign = response.data.campaign;

        // If scheduled, schedule it
        if (scheduleType === 'scheduled' && campaignData.scheduledAt) {
          await api.post(`/campaigns/${campaign.id}/schedule`, {
            scheduledAt: campaignData.scheduledAt,
          });
          toast({
            title: 'Success',
            description: 'Campaign created and scheduled successfully',
          });
        } else {
          toast({
            title: 'Success',
            description: 'Campaign created as draft',
          });
        }
      }

      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error('Error creating campaign:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create campaign',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[name="textContent"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = formData.textContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      updateFormData({ textContent: before + `{{${variable}}}` + after });

      // Set cursor position
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length + 4, start + variable.length + 4);
      }, 0);
    }
  };

  const handleFileUploadToCloudinary = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_URL}/media/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload file');
      }

      const data = await response.json();
      updateFormData({ whatsappMediaUrl: data.url });

      toast({
        title: 'File Uploaded',
        description: 'File uploaded to Cloudinary successfully',
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload file to Cloudinary',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset file input
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-semibold">Campaign Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="e.g., Welcome Email Campaign"
          className="border-2 focus:border-blue-500 rounded-lg"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-semibold">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Briefly describe this campaign"
          rows={3}
          className="border-2 focus:border-blue-500 rounded-lg resize-none"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-semibold">Channel *</Label>
        <RadioGroup
          value={formData.channel}
          onValueChange={(value) => updateFormData({ channel: value as CampaignChannel })}
        >
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="flex items-center space-x-2 border-2 rounded-lg p-4 cursor-pointer hover:border-blue-400 hover:shadow-sm transition-all">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer flex-1">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold">Email</div>
                  <div className="text-xs text-muted-foreground">Send HTML emails</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 border-2 rounded-lg p-4 cursor-pointer hover:border-green-400 hover:shadow-sm transition-all">
              <RadioGroupItem value="whatsapp" id="whatsapp" />
              <Label htmlFor="whatsapp" className="flex items-center gap-2 cursor-pointer flex-1">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold">WhatsApp</div>
                  <div className="text-xs text-muted-foreground">Send WhatsApp messages</div>
                </div>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderStep2 = () => {
    // Filter templates by channel
    const channelTemplates = templates.filter((t) => t.channel === formData.channel);

    if (formData.channel === 'email') {
      // Email campaign content
      return (
        <div className="space-y-4">
          {/* Template Selector */}
          {channelTemplates.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-blue-600" />
                <Label className="text-sm font-semibold text-blue-900 dark:text-blue-100">Use a Template</Label>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Choose a pre-designed template to get started quickly
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {loadingTemplates ? (
                  <div className="col-span-2 flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  </div>
                ) : (
                  channelTemplates.map((template) => (
                    <Button
                      key={template.id}
                      type="button"
                      variant="outline"
                      onClick={() => applyTemplate(template)}
                      className="justify-start text-left h-auto py-3 border-2 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                    >
                      <div>
                        <div className="font-semibold text-sm">{template.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {template.subject || template.textContent.substring(0, 40)}...
                        </div>
                      </div>
                    </Button>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="subject" className="text-sm font-semibold">Email Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => updateFormData({ subject: e.target.value })}
              placeholder="e.g., Welcome to {{name}}!"
              className="border-2 focus:border-blue-500 rounded-lg"
            />
            <p className="text-xs text-muted-foreground">
              Use variables like {`{{name}}`}, {`{{email}}`}, {`{{company}}`}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="textContent" className="text-sm font-semibold">Message Content *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable('name')}
                  className="rounded-lg"
                >
                  + Name
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable('email')}
                  className="rounded-lg"
                >
                  + Email
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable('company')}
                  className="rounded-lg"
                >
                  + Company
                </Button>
              </div>
            </div>
            <Textarea
              id="textContent"
              name="textContent"
              value={formData.textContent}
              onChange={(e) => updateFormData({ textContent: e.target.value })}
              placeholder="Plain text version of your email..."
              rows={6}
              className="border-2 focus:border-blue-500 rounded-lg resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">HTML Content (Optional)</Label>
            <EmailEditor
              value={formData.htmlContent || ''}
              onChange={(value) => updateFormData({ htmlContent: value })}
            />
          </div>

          {/* UTM Tracking Configuration */}
          <div className="border-t pt-4 mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <Label className="text-sm font-semibold">Link Tracking (UTM Parameters)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Automatically track all links in your email campaign with UTM parameters
                </p>
              </div>
              <Switch
                checked={enableUtmTracking}
                onCheckedChange={setEnableUtmTracking}
              />
            </div>

            {enableUtmTracking && (
              <div className="space-y-4 ml-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border-2 border-blue-200 dark:border-blue-900">
                {/* UTM Template Selector */}
                {utmTemplates.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Use a UTM Template</Label>
                    <div className="flex gap-2">
                      <Select value={selectedUtmTemplate} onValueChange={applyUtmTemplate}>
                        <SelectTrigger className="bg-white dark:bg-slate-900">
                          <SelectValue placeholder="Choose a template..." />
                        </SelectTrigger>
                        <SelectContent>
                          {utmTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                              {template.platform && ` (${template.platform})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedUtmTemplate && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUtmTemplate('');
                            updateFormData({
                              utmSource: undefined,
                              utmMedium: undefined,
                              utmCampaign: undefined,
                              utmTerm: undefined,
                              utmContent: undefined,
                            });
                          }}
                        >
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Manual UTM Parameters */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Source</Label>
                    <Input
                      placeholder="e.g., newsletter"
                      value={formData.utmSource || ''}
                      onChange={(e) => updateFormData({ utmSource: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Medium</Label>
                    <Input
                      placeholder="e.g., email"
                      value={formData.utmMedium || ''}
                      onChange={(e) => updateFormData({ utmMedium: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Campaign</Label>
                    <Input
                      placeholder="e.g., spring_sale"
                      value={formData.utmCampaign || ''}
                      onChange={(e) => updateFormData({ utmCampaign: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Content (Optional)</Label>
                    <Input
                      placeholder="e.g., header_link"
                      value={formData.utmContent || ''}
                      onChange={(e) => updateFormData({ utmContent: e.target.value })}
                      className="text-sm"
                    />
                  </div>
                </div>

                <p className="text-xs text-blue-700 dark:text-blue-300">
                  💡 All URLs in your email will automatically include these UTM parameters for tracking
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // WhatsApp campaign content with tabs
    return (
      <div className="space-y-4">
        {/* Template Selector for WhatsApp */}
        {channelTemplates.length > 0 && (
          <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-900 p-4 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <FileCode className="w-5 h-5 text-green-600" />
              <Label className="text-sm font-semibold text-green-900 dark:text-green-100">Use a Template</Label>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300">
              Choose a pre-designed template to get started quickly
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {loadingTemplates ? (
                <div className="col-span-2 flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-green-600" />
                </div>
              ) : (
                channelTemplates.map((template) => (
                  <Button
                    key={template.id}
                    type="button"
                    variant="outline"
                    onClick={() => applyTemplate(template)}
                    className="justify-start text-left h-auto py-3 border-2 hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-950/40"
                  >
                    <div>
                      <div className="font-semibold text-sm">{template.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {template.textContent.substring(0, 40)}...
                      </div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </div>
        )}

        <Tabs
          value={formData.whatsappMessageType || 'text'}
          onValueChange={(value) => updateFormData({ whatsappMessageType: value as WhatsAppMessageType })}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="text">Text</TabsTrigger>
            <TabsTrigger value="media">Media</TabsTrigger>
            <TabsTrigger value="template">Template</TabsTrigger>
          </TabsList>

          {/* Text Message Tab */}
          <TabsContent value="text" className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="textContent" className="text-sm font-semibold">Message Content *</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable('name')}
                    className="rounded-lg"
                  >
                    + Name
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable('email')}
                    className="rounded-lg"
                  >
                    + Email
                  </Button>
                </div>
              </div>
              <Textarea
                id="textContent"
                name="textContent"
                value={formData.textContent}
                onChange={(e) => updateFormData({ textContent: e.target.value })}
                placeholder="Hi {{name}}, we have exciting news for you!"
                rows={8}
                className="border-2 focus:border-blue-500 rounded-lg resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {formData.textContent.length} characters
              </p>
            </div>
          </TabsContent>

          {/* Media Message Tab */}
          <TabsContent value="media" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Media Type *</Label>
              <Select
                value={formData.whatsappMediaType || ''}
                onValueChange={(value) => updateFormData({ whatsappMediaType: value as WhatsAppMediaType })}
              >
                <SelectTrigger className="border-2 rounded-lg">
                  <SelectValue placeholder="Select media type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="image">
                    <div className="flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Image (PNG, JPG - Max 5MB)
                    </div>
                  </SelectItem>
                  <SelectItem value="document">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Document (PDF, DOC - Max 100MB)
                    </div>
                  </SelectItem>
                  <SelectItem value="video">
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video (MP4 - Max 16MB)
                    </div>
                  </SelectItem>
                  <SelectItem value="audio">
                    <div className="flex items-center gap-2">
                      <Music className="w-4 h-4" />
                      Audio (MP3, AAC - Max 16MB)
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mediaUrl" className="text-sm font-semibold">Media URL *</Label>
              <div className="flex gap-2">
                <Input
                  id="mediaUrl"
                  value={formData.whatsappMediaUrl}
                  onChange={(e) => updateFormData({ whatsappMediaUrl: e.target.value })}
                  placeholder="https://example.com/media.jpg"
                  type="url"
                  className="flex-1 border-2 focus:border-blue-500 rounded-lg"
                />
                <input
                  ref={uploadInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  onChange={handleFileUploadToCloudinary}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => uploadInputRef.current?.click()}
                  disabled={uploading}
                  className="rounded-lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a public URL or upload a file to Cloudinary
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="caption" className="text-sm font-semibold">Caption (Optional)</Label>
              <Textarea
                id="caption"
                value={formData.whatsappCaption}
                onChange={(e) => updateFormData({ whatsappCaption: e.target.value })}
                placeholder="Add a caption for your media (supports {{name}}, {{email}})"
                rows={3}
                className="border-2 focus:border-blue-500 rounded-lg resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {(formData.whatsappCaption?.length || 0)} characters
              </p>
            </div>

            <Alert className="border-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Media files must be hosted on a publicly accessible URL. Consider using cloud storage services like Cloudinary, AWS S3, or Google Cloud Storage.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Template Message Tab */}
          <TabsContent value="template" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="templateName" className="text-sm font-semibold">Template Name *</Label>
              <Input
                id="templateName"
                value={formData.whatsappTemplateName}
                onChange={(e) => updateFormData({ whatsappTemplateName: e.target.value })}
                placeholder="e.g., welcome_message"
                className="border-2 focus:border-blue-500 rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                Enter the exact name of your approved WhatsApp template
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="templateLanguage" className="text-sm font-semibold">Language Code *</Label>
              <Input
                id="templateLanguage"
                value={formData.whatsappTemplateLanguage}
                onChange={(e) => updateFormData({ whatsappTemplateLanguage: e.target.value })}
                placeholder="e.g., en, es, fr"
                className="border-2 focus:border-blue-500 rounded-lg"
              />
              <p className="text-xs text-muted-foreground">
                Language code of your template (e.g., en for English, es for Spanish)
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Template Parameters</Label>
              <div className="space-y-2">
                {(formData.whatsappTemplateParams || ['']).map((param, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={param}
                      onChange={(e) => {
                        const newParams = [...(formData.whatsappTemplateParams || [''])];
                        newParams[index] = e.target.value;
                        updateFormData({ whatsappTemplateParams: newParams });
                      }}
                      placeholder={`Parameter ${index + 1} (e.g., {{name}})`}
                      className="border-2 focus:border-blue-500 rounded-lg"
                    />
                    {index > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => {
                          const newParams = (formData.whatsappTemplateParams || ['']).filter((_, i) => i !== index);
                          updateFormData({ whatsappTemplateParams: newParams });
                        }}
                        className="rounded-lg"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    updateFormData({
                      whatsappTemplateParams: [...(formData.whatsappTemplateParams || ['']), ''],
                    });
                  }}
                  className="rounded-lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Parameter
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Add dynamic parameters for your template. Use variables like {`{{name}}`}, {`{{email}}`}
              </p>
            </div>

            <Alert className="border-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Template messages must be pre-approved by Meta. Make sure your template is approved before creating the campaign.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {/* UTM Tracking Configuration for WhatsApp */}
        <div className="border-t pt-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Label className="text-sm font-semibold">Link Tracking (UTM Parameters)</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Automatically track all links in your WhatsApp campaign with UTM parameters
              </p>
            </div>
            <Switch
              checked={enableUtmTracking}
              onCheckedChange={setEnableUtmTracking}
            />
          </div>

          {enableUtmTracking && (
            <div className="space-y-4 ml-4 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border-2 border-green-200 dark:border-green-900">
              {/* UTM Template Selector */}
              {utmTemplates.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Use a UTM Template</Label>
                  <div className="flex gap-2">
                    <Select value={selectedUtmTemplate} onValueChange={applyUtmTemplate}>
                      <SelectTrigger className="bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Choose a template..." />
                      </SelectTrigger>
                      <SelectContent>
                        {utmTemplates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name}
                            {template.platform && ` (${template.platform})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedUtmTemplate && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUtmTemplate('');
                          updateFormData({
                            utmSource: undefined,
                            utmMedium: undefined,
                            utmCampaign: undefined,
                            utmTerm: undefined,
                            utmContent: undefined,
                          });
                        }}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Manual UTM Parameters */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Source</Label>
                  <Input
                    placeholder="e.g., whatsapp"
                    value={formData.utmSource || ''}
                    onChange={(e) => updateFormData({ utmSource: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Medium</Label>
                  <Input
                    placeholder="e.g., messenger"
                    value={formData.utmMedium || ''}
                    onChange={(e) => updateFormData({ utmMedium: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Campaign</Label>
                  <Input
                    placeholder="e.g., product_launch"
                    value={formData.utmCampaign || ''}
                    onChange={(e) => updateFormData({ utmCampaign: e.target.value })}
                    className="text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Content (Optional)</Label>
                  <Input
                    placeholder="e.g., button_link"
                    value={formData.utmContent || ''}
                    onChange={(e) => updateFormData({ utmContent: e.target.value })}
                    className="text-sm"
                  />
                </div>
              </div>

              <p className="text-xs text-green-700 dark:text-green-300">
                💡 All URLs in your WhatsApp message will automatically include these UTM parameters for tracking
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStep3 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">Target Audience *</Label>
        <Select
          value={formData.targetType}
          onValueChange={(value) => updateFormData({ targetType: value as CampaignTargetType })}
        >
          <SelectTrigger className="border-2 rounded-lg">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leads & Contacts</SelectItem>
            <SelectItem value="leads">All Leads</SelectItem>
            <SelectItem value="contacts">All Contacts</SelectItem>
            <SelectItem value="tags">Filter by Tags</SelectItem>
            <SelectItem value="custom">Custom List (Manual Entry)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lead/Contact Search and Filters */}
      {(formData.targetType === 'leads' || formData.targetType === 'contacts' || formData.targetType === 'all') && (
        <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-900/20 rounded-lg border-2">
          <Label className="text-sm font-semibold">Filter Recipients (Optional)</Label>

          {/* Search Input */}
          <div className="space-y-2">
            <Label className="text-xs">Search by Name, Email, or Company</Label>
            <Input
              placeholder="Type to search..."
              value={formData.targetFilters?.searchQuery || ''}
              onChange={(e) => {
                const value = e.target.value.trim();
                const newFilters = { ...formData.targetFilters };

                if (value) {
                  newFilters.searchQuery = value;
                } else {
                  delete newFilters.searchQuery;
                }

                updateFormData({ targetFilters: newFilters });
              }}
              className="border-2 focus:border-blue-500 rounded-lg"
            />
          </div>

          {/* Tag Filter */}
          <div className="space-y-2">
            <Label className="text-xs">Filter by Tags</Label>
            <Input
              placeholder="e.g., vip, interested, premium (comma-separated)"
              value={formData.targetFilters?.tags?.join(', ') || ''}
              onChange={(e) => {
                const value = e.target.value.trim();
                const newFilters = { ...formData.targetFilters };

                if (value) {
                  const tags = value.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
                  if (tags.length > 0) {
                    newFilters.tags = tags;
                  } else {
                    delete newFilters.tags;
                  }
                } else {
                  delete newFilters.tags;
                }

                updateFormData({ targetFilters: newFilters });
              }}
              className="border-2 focus:border-blue-500 rounded-lg"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            💡 Leave filters empty to include all {formData.targetType === 'leads' ? 'leads' : formData.targetType === 'contacts' ? 'contacts' : 'leads and contacts'}
          </p>
        </div>
      )}

      {formData.targetType === 'tags' && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Tags (comma-separated) *</Label>
          <Input
            placeholder="e.g., interested, demo-requested, vip"
            onChange={(e) => {
              const tags = e.target.value.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
              updateFormData({ targetFilters: { ...formData.targetFilters, tags } });
            }}
            className="border-2 focus:border-blue-500 rounded-lg"
          />
          <p className="text-xs text-muted-foreground">
            Enter tags separated by commas. Recipients with ANY of these tags will be included.
          </p>
        </div>
      )}

      {formData.targetType === 'custom' && (
        <div className="space-y-2">
          <Label className="text-sm font-semibold">
            {formData.channel === 'email' ? 'Email Addresses *' : 'Phone Numbers *'}
          </Label>
          <Textarea
            placeholder={
              formData.channel === 'email'
                ? 'Enter email addresses (one per line):\njohn@example.com\njane@example.com\nbob@company.com'
                : 'Enter phone numbers (one per line):\n+919876543210\n+919123456789\n+919999888877'
            }
            rows={8}
            onChange={(e) => {
              const lines = e.target.value.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
              const customList = formData.channel === 'email'
                ? { emails: lines }
                : { phones: lines };
              updateFormData({ targetFilters: { customList } });
            }}
            className="border-2 focus:border-blue-500 rounded-lg resize-none"
          />
          <p className="text-xs text-muted-foreground">
            {formData.channel === 'email'
              ? 'Enter one email address per line. Invalid emails will be filtered out.'
              : 'Enter one phone number per line with country code (e.g., +91 for India).'}
          </p>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Estimated Recipients</p>
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <p className="text-sm text-blue-700 dark:text-blue-300">Calculating...</p>
          </div>
        ) : (
          <>
            <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mb-2">
              {recipientCount.toLocaleString()}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300">
              {recipientCount === 0
                ? 'No recipients found with current filters'
                : formData.channel === 'email'
                ? `${recipientCount} ${recipientCount === 1 ? 'email' : 'emails'} will be sent`
                : `${recipientCount} WhatsApp ${recipientCount === 1 ? 'message' : 'messages'} will be sent`}
            </p>
          </>
        )}
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-semibold">When to send?</Label>
        <RadioGroup value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
          <div className="flex items-center space-x-2 border-2 rounded-lg p-3">
            <RadioGroupItem value="immediate" id="immediate" />
            <Label htmlFor="immediate" className="cursor-pointer flex-1">Send Immediately (after creating)</Label>
          </div>
          <div className="flex items-center space-x-2 border-2 rounded-lg p-3">
            <RadioGroupItem value="scheduled" id="scheduled" />
            <Label htmlFor="scheduled" className="cursor-pointer flex-1">Schedule for Later</Label>
          </div>
        </RadioGroup>
      </div>

      {scheduleType === 'scheduled' && (
        <div className="space-y-4 ml-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start border-2 rounded-lg">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduleDate ? format(scheduleDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-xl shadow-xl">
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Time</Label>
            <Input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="border-2 focus:border-blue-500 rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-900/20 p-6 rounded-lg border-2 space-y-4">
        <h3 className="font-semibold text-lg">Review Your Campaign</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Name</p>
            <p className="font-medium">{formData.name}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Channel</p>
            <div className="flex items-center gap-2">
              {formData.channel === 'email' ? (
                <Mail className="w-4 h-4 text-blue-600" />
              ) : (
                <MessageSquare className="w-4 h-4 text-green-600" />
              )}
              <p className="font-medium capitalize">{formData.channel}</p>
            </div>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Target Audience</p>
            <p className="font-medium capitalize">{formData.targetType.replace('_', ' ')}</p>
          </div>

          <div>
            <p className="text-sm text-muted-foreground">Schedule</p>
            <p className="font-medium">
              {scheduleType === 'immediate'
                ? 'Save as Draft'
                : scheduleDate
                ? `${format(scheduleDate, 'PPP')} at ${scheduleTime}`
                : 'Not set'}
            </p>
          </div>
        </div>

        {formData.channel === 'email' && formData.subject && (
          <div>
            <p className="text-sm text-muted-foreground">Subject</p>
            <p className="font-medium">{formData.subject}</p>
          </div>
        )}

        <div>
          <p className="text-sm text-muted-foreground">Message Preview</p>
          <div className="bg-background p-4 rounded-lg border-2 mt-2 max-h-40 overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap">{formData.textContent}</p>
          </div>
        </div>

        {/* UTM Tracking Info */}
        {enableUtmTracking && (formData.utmSource || formData.utmMedium || formData.utmCampaign) && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900 p-4 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Link Tracking Enabled
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {formData.utmSource && (
                <div>
                  <span className="text-muted-foreground">Source:</span>
                  <span className="ml-2 font-mono">{formData.utmSource}</span>
                </div>
              )}
              {formData.utmMedium && (
                <div>
                  <span className="text-muted-foreground">Medium:</span>
                  <span className="ml-2 font-mono">{formData.utmMedium}</span>
                </div>
              )}
              {formData.utmCampaign && (
                <div>
                  <span className="text-muted-foreground">Campaign:</span>
                  <span className="ml-2 font-mono">{formData.utmCampaign}</span>
                </div>
              )}
              {formData.utmContent && (
                <div>
                  <span className="text-muted-foreground">Content:</span>
                  <span className="ml-2 font-mono">{formData.utmContent}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-200 dark:border-yellow-900 p-4 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          ⚠️ {scheduleType === 'immediate'
            ? 'This campaign will be saved as a draft. You can start it from the campaigns list.'
            : 'This campaign will be automatically sent at the scheduled time.'}
        </p>
      </div>
    </div>
  );

  const steps = [
    { number: 1, title: 'Basic Info', component: renderStep1 },
    { number: 2, title: 'Content', component: renderStep2 },
    { number: 3, title: 'Audience', component: renderStep3 },
    { number: 4, title: 'Schedule', component: renderStep4 },
    { number: 5, title: 'Review', component: renderStep5 },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 w-full sm:max-w-3xl lg:max-w-4xl overflow-hidden flex flex-col">
        {/* Modern Blue Ribbon Header */}
        <div className="relative bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 text-white px-6 py-5 shadow-lg">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAwIDEwIEwgNDAgMTAgTSAxMCAwIEwgMTAgNDAgTSAwIDIwIEwgNDAgMjAgTSAyMCAwIEwgMjAgNDAgTSAwIDMwIEwgNDAgMzAgTSAzMCAwIEwgMzAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjAzIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-40"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Megaphone className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold">{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</h2>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="text-white hover:bg-white/20 rounded-lg"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50 dark:bg-slate-900/20">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                  step >= s.number
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-200 dark:bg-slate-700 text-muted-foreground'
                }`}
              >
                {s.number}
              </div>
              <span className="text-xs ml-2 hidden md:inline font-medium">{s.title}</span>
              {idx < steps.length - 1 && (
                <div className={`w-8 h-1 rounded mx-2 hidden md:block ${step > s.number ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Scrollable Step Content */}
        <ScrollArea className="flex-1 px-6 py-6">
          <div className="min-h-[400px]">{steps[step - 1].component()}</div>
        </ScrollArea>

        {/* Modern Action Footer */}
        <div className="border-t bg-gradient-to-r from-slate-50 to-slate-100/50 px-6 py-4 flex justify-between shadow-lg">
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} className="border-2 rounded-lg shadow-sm">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="border-2 border-slate-200 hover:border-slate-300 rounded-lg shadow-sm">
              Cancel
            </Button>

            {step < 5 ? (
              <Button onClick={handleNext} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg">
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transition-all rounded-lg disabled:opacity-50">
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Create Campaign
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
