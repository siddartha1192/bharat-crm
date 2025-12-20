import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Code } from 'lucide-react';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function EmailEditor({ value, onChange }: Props) {
  const [view, setView] = useState<'code' | 'preview'>('code');

  const insertTemplate = (template: string) => {
    onChange(template);
  };

  const templates = {
    basic: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <h1 style="color: #2563eb;">Hello {{name}}!</h1>
  <p>Welcome to our platform. We're excited to have you on board.</p>
  <p>If you have any questions, feel free to reach out.</p>
  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="color: #6b7280; font-size: 14px;">Best regards,<br>The Team</p>
  </div>
</body>
</html>`,

    professional: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background-color: #2563eb; padding: 30px; text-align: center;">
      <h1 style="color: white; margin: 0;">Your Company Name</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #1f2937; margin-top: 0;">Hi {{name}},</h2>
      <p style="color: #4b5563; line-height: 1.6;">
        Thank you for your interest! We're here to help you succeed.
      </p>
      <p style="color: #4b5563; line-height: 1.6;">
        Click the button below to get started:
      </p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="#" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold;">
          Get Started
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f9fafb; padding: 20px 30px; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px; margin: 0;">
        © 2025 Your Company. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>`,

    announcement: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: Arial, sans-serif; background-color: #ffffff; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; border-radius: 10px; color: white; text-align: center;">
      <h1 style="margin: 0; font-size: 32px;">🎉 Big News!</h1>
    </div>

    <div style="background-color: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
      <p style="color: #1f2937; font-size: 16px; line-height: 1.6;">
        Hi {{name}},
      </p>
      <p style="color: #4b5563; line-height: 1.6;">
        We're thrilled to announce our latest features designed just for you!
      </p>

      <ul style="color: #4b5563; line-height: 1.8;">
        <li>New Feature #1</li>
        <li>New Feature #2</li>
        <li>New Feature #3</li>
      </ul>

      <p style="color: #4b5563; line-height: 1.6;">
        Start exploring these features today!
      </p>

      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
          Cheers,<br>
          Your Team
        </p>
      </div>
    </div>
  </div>
</body>
</html>`,
  };

  return (
    <div className="space-y-4">
      {/* Template Buttons */}
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => insertTemplate(templates.basic)}
        >
          Basic Template
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => insertTemplate(templates.professional)}
        >
          Professional Template
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => insertTemplate(templates.announcement)}
        >
          Announcement Template
        </Button>
      </div>

      {/* Editor Tabs */}
      <Tabs value={view} onValueChange={(v: any) => setView(v)}>
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
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter your HTML email content here..."
            rows={15}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Use variables like {`{{name}}`}, {`{{email}}`}, {`{{company}}`} in your HTML
          </p>
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <div className="border rounded-lg p-4 bg-gray-50 min-h-[400px] overflow-auto">
            {value ? (
              <iframe
                srcDoc={value}
                className="w-full min-h-[400px] bg-white border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="text-center py-20 text-muted-foreground">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No content to preview yet</p>
                <p className="text-sm">Add HTML content or use a template to get started</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Helper Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium mb-2">💡 Email Tips:</p>
        <ul className="text-sm text-blue-700 space-y-1 ml-4 list-disc">
          <li>Use inline CSS styles for better email client compatibility</li>
          <li>Test your email in different clients before sending</li>
          <li>Keep images optimized and include alt text</li>
          <li>Ensure mobile responsiveness with max-width</li>
        </ul>
      </div>
    </div>
  );
}
