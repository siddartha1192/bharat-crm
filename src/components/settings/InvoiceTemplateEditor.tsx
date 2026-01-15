import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Code, Eye, Loader2 } from 'lucide-react';
import { invoiceTemplatesAPI } from '@/lib/api';
import { toast } from 'sonner';

interface InvoiceTemplateEditorProps {
  htmlTemplate: string;
  onChange: (html: string) => void;
  onPreview?: () => void;
}

export function InvoiceTemplateEditor({ htmlTemplate, onChange, onPreview }: InvoiceTemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');
  const [previewHtml, setPreviewHtml] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePreview = async () => {
    try {
      setLoading(true);
      const result = await invoiceTemplatesAPI.preview(htmlTemplate);
      setPreviewHtml(result.html);
      setActiveTab('preview');
      if (onPreview) onPreview();
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('Failed to generate preview');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Invoice Template HTML</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePreview}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </>
          )}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'code' | 'preview')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="code">
            <Code className="w-4 h-4 mr-2" />
            HTML Code
          </TabsTrigger>
          <TabsTrigger value="preview">
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="mt-4">
          <Textarea
            value={htmlTemplate}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your HTML template here..."
            className="font-mono text-sm min-h-[500px] resize-y"
          />
          <div className="mt-2 text-sm text-muted-foreground">
            <p className="font-semibold mb-1">Available Variables:</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p>• {`{{invoiceNumber}}`} - Invoice number</p>
                <p>• {`{{invoiceDate}}`} - Invoice date</p>
                <p>• {`{{dueDate}}`} - Due date</p>
                <p>• {`{{status}}`} - Invoice status</p>
                <p>• {`{{companyName}}`} - Company name</p>
                <p>• {`{{companyAddress}}`} - Company address</p>
                <p>• {`{{companyGSTIN}}`} - Company GSTIN</p>
                <p>• {`{{companyPAN}}`} - Company PAN</p>
              </div>
              <div>
                <p>• {`{{customerName}}`} - Customer name</p>
                <p>• {`{{customerAddress}}`} - Customer address</p>
                <p>• {`{{lineItems}}`} - Line items HTML</p>
                <p>• {`{{subtotal}}`} - Subtotal</p>
                <p>• {`{{cgst}}`} - CGST amount</p>
                <p>• {`{{sgst}}`} - SGST amount</p>
                <p>• {`{{igst}}`} - IGST amount</p>
                <p>• {`{{total}}`} - Final total</p>
              </div>
            </div>
            <p className="mt-2"><strong>Conditionals:</strong> Use {`{{#if variable}}...{{/if}}`} for optional content</p>
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          {previewHtml ? (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-[600px] border-0"
                sandbox="allow-same-origin"
                title="Invoice Preview"
              />
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Click "Preview" to see how your template looks</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
