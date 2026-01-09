/**
 * Call Scripts Page
 * Manage AI and manual call scripts with document upload
 */

import { useState } from 'react';
import { useCallScripts, useCreateCallScript, useUpdateCallScript, useDeleteCallScript } from '@/hooks/useCalls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  FileText, Plus, Edit, Trash2, Upload, Check, X, Loader2, AlertCircle, Sparkles
} from 'lucide-react';
import { format } from 'date-fns';

export default function CallScriptsPage() {
  const { data: scripts, isLoading } = useCallScripts();
  const createScript = useCreateCallScript();
  const updateScript = useUpdateCallScript();
  const deleteScript = useDeleteCallScript();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scriptType: 'ai',
    aiGreeting: '',
    aiObjective: '',
    aiInstructions: '',
    aiPersonality: 'professional',
    manualScript: '',
    isDefault: false,
  });
  const [documentFile, setDocumentFile] = useState<File | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formDataToSend = new FormData();
    Object.entries(formData).forEach(([key, value]) => {
      formDataToSend.append(key, String(value));
    });

    if (documentFile) {
      formDataToSend.append('document', documentFile);
    }

    if (editingScript) {
      await updateScript.mutateAsync({ id: editingScript.id, data: formDataToSend });
    } else {
      await createScript.mutateAsync(formDataToSend);
    }

    setIsDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      scriptType: 'ai',
      aiGreeting: '',
      aiObjective: '',
      aiInstructions: '',
      aiPersonality: 'professional',
      manualScript: '',
      isDefault: false,
    });
    setDocumentFile(null);
    setEditingScript(null);
  };

  const handleEdit = (script: any) => {
    setEditingScript(script);
    setFormData({
      name: script.name,
      description: script.description || '',
      scriptType: script.scriptType,
      aiGreeting: script.aiGreeting || '',
      aiObjective: script.aiObjective || '',
      aiInstructions: script.aiInstructions || '',
      aiPersonality: script.aiPersonality || 'professional',
      manualScript: script.manualScript || '',
      isDefault: script.isDefault,
    });
    setIsDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Call Scripts</h2>
          <p className="text-gray-600">Manage AI and manual call scripts</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              New Script
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingScript ? 'Edit Script' : 'Create New Script'}</DialogTitle>
              <DialogDescription>
                Create scripts for AI or manual calls with custom instructions
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Script Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scriptType">Type</Label>
                    <Select
                      value={formData.scriptType}
                      onValueChange={(value) => setFormData({ ...formData, scriptType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ai">AI Call</SelectItem>
                        <SelectItem value="manual">Manual Call</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>

              {/* AI Script Settings */}
              {(formData.scriptType === 'ai' || formData.scriptType === 'hybrid') && (
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-500" />
                    <h3 className="font-semibold">AI Configuration</h3>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiPersonality">AI Personality</Label>
                    <Select
                      value={formData.aiPersonality}
                      onValueChange={(value) => setFormData({ ...formData, aiPersonality: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="formal">Formal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiGreeting">Opening Greeting</Label>
                    <Textarea
                      id="aiGreeting"
                      value={formData.aiGreeting}
                      onChange={(e) => setFormData({ ...formData, aiGreeting: e.target.value })}
                      placeholder="Hi {name}, this is calling from {company}..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiObjective">Call Objective</Label>
                    <Textarea
                      id="aiObjective"
                      value={formData.aiObjective}
                      onChange={(e) => setFormData({ ...formData, aiObjective: e.target.value })}
                      placeholder="The goal is to qualify the lead and schedule a demo..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="aiInstructions">Detailed Instructions</Label>
                    <Textarea
                      id="aiInstructions"
                      value={formData.aiInstructions}
                      onChange={(e) => setFormData({ ...formData, aiInstructions: e.target.value })}
                      placeholder="Ask about their current challenges, budget, timeline..."
                      rows={4}
                    />
                  </div>

                  {/* Document Upload */}
                  <div className="space-y-2">
                    <Label>Upload Reference Document</Label>
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept=".txt,.pdf,.doc,.docx,.md"
                        onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      {documentFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => setDocumentFile(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Upload product info, FAQs, or other reference material for AI to use
                    </p>
                  </div>
                </div>
              )}

              {/* Manual Script */}
              {(formData.scriptType === 'manual' || formData.scriptType === 'hybrid') && (
                <div className="space-y-4 border-t pt-4">
                  <h3 className="font-semibold">Manual Call Script</h3>
                  <Textarea
                    value={formData.manualScript}
                    onChange={(e) => setFormData({ ...formData, manualScript: e.target.value })}
                    placeholder="Enter the script for manual calls..."
                    rows={6}
                  />
                </div>
              )}

              {/* Settings */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="space-y-0.5">
                  <Label>Set as Default Script</Label>
                  <p className="text-sm text-gray-500">Use this script by default for calls</p>
                </div>
                <Switch
                  checked={formData.isDefault}
                  onCheckedChange={(checked) => setFormData({ ...formData, isDefault: checked })}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createScript.isPending || updateScript.isPending}
                >
                  {(createScript.isPending || updateScript.isPending) ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : editingScript ? (
                    'Update Script'
                  ) : (
                    'Create Script'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Scripts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scripts && scripts.length > 0 ? (
          scripts.map((script: any) => (
            <Card key={script.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {script.name}
                      {script.isDefault && (
                        <Badge variant="outline" className="text-xs">
                          <Check className="w-3 h-3 mr-1" />
                          Default
                        </Badge>
                      )}
                    </CardTitle>
                    {script.description && (
                      <CardDescription className="mt-1">{script.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={script.scriptType === 'ai' ? 'default' : 'secondary'}>
                    {script.scriptType}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {script.aiPersonality && (
                  <div className="text-sm">
                    <span className="text-gray-500">Personality:</span>{' '}
                    <span className="capitalize font-medium">{script.aiPersonality}</span>
                  </div>
                )}

                {script.documentFileName && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Upload className="w-4 h-4" />
                    {script.documentFileName}
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Used {script.usageCount} times</span>
                  {script.lastUsedAt && (
                    <span>{format(new Date(script.lastUsedAt), 'MMM dd')}</span>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(script)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (confirm('Are you sure you want to delete this script?')) {
                        deleteScript.mutate(script.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No scripts yet</h3>
              <p className="text-gray-500 mb-4">Create your first call script to get started</p>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Script
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
