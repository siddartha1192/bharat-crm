import { useState, useEffect } from 'react';
import { Campaign, CampaignChannel, CampaignTargetType, CreateCampaignData } from '@/types/campaign';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { Badge } from '@/components/ui/badge';
import { Mail, MessageSquare, ChevronLeft, ChevronRight, Send, CalendarIcon, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EmailEditor } from './EmailEditor';
import api from '@/lib/api';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editingCampaign?: Campaign | null;
}

export function CampaignDialog({ open, onOpenChange, onSuccess, editingCampaign }: Props) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);

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
    });
    setStep(1);
    setScheduleType('immediate');
    setScheduleDate(undefined);
    setScheduleTime('12:00');
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
      if (formData.channel === 'email' && !formData.subject?.trim()) {
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

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Campaign Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => updateFormData({ name: e.target.value })}
          placeholder="e.g., Welcome Email Campaign"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => updateFormData({ description: e.target.value })}
          placeholder="Briefly describe this campaign"
          rows={3}
        />
      </div>

      <div>
        <Label>Channel *</Label>
        <RadioGroup
          value={formData.channel}
          onValueChange={(value) => updateFormData({ channel: value as CampaignChannel })}
        >
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-2 border rounded-lg p-4 flex-1 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="email" id="email" />
              <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                <Mail className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-sm text-muted-foreground">Send HTML emails</div>
                </div>
              </Label>
            </div>

            <div className="flex items-center space-x-2 border rounded-lg p-4 flex-1 cursor-pointer hover:bg-accent">
              <RadioGroupItem value="whatsapp" id="whatsapp" />
              <Label htmlFor="whatsapp" className="flex items-center gap-2 cursor-pointer">
                <MessageSquare className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-medium">WhatsApp</div>
                  <div className="text-sm text-muted-foreground">Send WhatsApp messages</div>
                </div>
              </Label>
            </div>
          </div>
        </RadioGroup>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      {formData.channel === 'email' && (
        <div>
          <Label htmlFor="subject">Email Subject *</Label>
          <Input
            id="subject"
            value={formData.subject}
            onChange={(e) => updateFormData({ subject: e.target.value })}
            placeholder="e.g., Welcome to {{name}}!"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Use variables like {`{{name}}`}, {`{{email}}`}, {`{{company}}`}
          </p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="textContent">Message Content *</Label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable('name')}
            >
              + Name
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable('email')}
            >
              + Email
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => insertVariable('company')}
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
          placeholder={
            formData.channel === 'email'
              ? 'Plain text version of your email...'
              : 'Hi {{name}}, we have exciting news for you!'
          }
          rows={6}
        />
        {formData.channel === 'whatsapp' && (
          <p className="text-xs text-muted-foreground mt-1">
            {formData.textContent.length} characters
          </p>
        )}
      </div>

      {formData.channel === 'email' && (
        <div>
          <Label>HTML Content (Optional)</Label>
          <EmailEditor
            value={formData.htmlContent || ''}
            onChange={(value) => updateFormData({ htmlContent: value })}
          />
        </div>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <Label>Target Audience *</Label>
        <Select
          value={formData.targetType}
          onValueChange={(value) => updateFormData({ targetType: value as CampaignTargetType })}
        >
          <SelectTrigger>
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

      {formData.targetType === 'tags' && (
        <div>
          <Label>Tags (comma-separated) *</Label>
          <Input
            placeholder="e.g., interested, demo-requested, vip"
            onChange={(e) => {
              const tags = e.target.value.split(',').map((t) => t.trim()).filter((t) => t.length > 0);
              updateFormData({ targetFilters: { ...formData.targetFilters, tags } });
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Enter tags separated by commas. Recipients with ANY of these tags will be included.
          </p>
        </div>
      )}

      {formData.targetType === 'custom' && (
        <div>
          <Label>
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
          />
          <p className="text-xs text-muted-foreground mt-1">
            {formData.channel === 'email'
              ? 'Enter one email address per line. Invalid emails will be filtered out.'
              : 'Enter one phone number per line with country code (e.g., +91 for India).'}
          </p>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-blue-900">Estimated Recipients</p>
          <Users className="w-5 h-5 text-blue-600" />
        </div>
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
            <p className="text-sm text-blue-700">Calculating...</p>
          </div>
        ) : (
          <>
            <p className="text-3xl font-bold text-blue-900 mb-2">
              {recipientCount.toLocaleString()}
            </p>
            <p className="text-xs text-blue-700">
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
      <div>
        <Label>When to send?</Label>
        <RadioGroup value={scheduleType} onValueChange={(v: any) => setScheduleType(v)}>
          <div className="flex items-center space-x-2 mt-2">
            <RadioGroupItem value="immediate" id="immediate" />
            <Label htmlFor="immediate">Send Immediately (after creating)</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="scheduled" id="scheduled" />
            <Label htmlFor="scheduled">Schedule for Later</Label>
          </div>
        </RadioGroup>
      </div>

      {scheduleType === 'scheduled' && (
        <div className="space-y-4 ml-6">
          <div>
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {scheduleDate ? format(scheduleDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={scheduleDate}
                  onSelect={setScheduleDate}
                  disabled={(date) => date < new Date()}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label>Time</Label>
            <Input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <div className="bg-muted p-6 rounded-lg space-y-4">
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
          <div className="bg-background p-4 rounded border mt-2 max-h-40 overflow-y-auto">
            <p className="text-sm whitespace-pre-wrap">{formData.textContent}</p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
        <p className="text-sm text-yellow-800">
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}
          </DialogTitle>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((s, idx) => (
            <div key={s.number} className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= s.number
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s.number}
              </div>
              <span className="text-xs ml-2 hidden md:inline">{s.title}</span>
              {idx < steps.length - 1 && (
                <div className="w-8 h-0.5 bg-muted mx-2 hidden md:block" />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">{steps[step - 1].component()}</div>

        {/* Footer */}
        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={handleBack}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              {step < 5 ? (
                <Button onClick={handleNext}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
