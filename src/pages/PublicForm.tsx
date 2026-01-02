import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PhoneInput } from '@/components/shared/PhoneInput';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  defaultValue?: string;
  hidden?: boolean;
}

interface Form {
  id: string;
  slug: string;
  title: string;
  description?: string;
  fields: FormField[];
  primaryColor: string;
  buttonText: string;
  requireEmail: boolean;
  requirePhone: boolean;
}

export default function PublicForm() {
  const { slug } = useParams<{ slug: string }>();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState<Record<string, string>>({
    phoneCountryCode: '+91' // Default country code
  });

  useEffect(() => {
    fetchForm();
  }, [slug]);

  const fetchForm = async () => {
    try {
      const response = await fetch(`${API_URL}/forms/public/slug/${slug}`);

      if (!response.ok) {
        throw new Error('Form not found');
      }

      const data = await response.json();
      setForm(data);

      // Set default values
      const defaults: Record<string, string> = { phoneCountryCode: '+91' };
      data.fields.forEach((field: FormField) => {
        if (field.defaultValue) {
          defaults[field.name] = field.defaultValue;
        }
      });
      setFormData(defaults);
    } catch (err) {
      setError('Form not found or inactive');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/forms/public/submit/${slug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: formData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit form');
      }

      const result = await response.json();
      setSubmitted(true);

      // Redirect if configured
      if (result.redirectUrl) {
        setTimeout(() => {
          window.location.href = result.redirectUrl;
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (name: string, value: string) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const renderField = (field: FormField) => {
    // Skip hidden fields
    if (field.hidden) {
      return null;
    }

    // Phone field with country code selector
    if (field.type === 'phone' || field.name === 'phone') {
      return (
        <div key={field.name}>
          <PhoneInput
            label={field.label}
            id={field.name}
            phoneValue={formData[field.name] || ''}
            countryCodeValue={formData.phoneCountryCode || '+91'}
            onPhoneChange={(value) => handleInputChange(field.name, value)}
            onCountryCodeChange={(value) => handleInputChange('phoneCountryCode', value)}
            required={field.required}
            placeholder={field.placeholder || '9876543210'}
          />
        </div>
      );
    }

    // Textarea field
    if (field.type === 'textarea') {
      return (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>
            {field.label} {field.required && <span className="text-red-500">*</span>}
          </Label>
          <Textarea
            id={field.name}
            value={formData[field.name] || ''}
            onChange={(e) => handleInputChange(field.name, e.target.value)}
            required={field.required}
            placeholder={field.placeholder}
            rows={4}
            className="border-2 focus:border-blue-500 rounded-lg"
          />
        </div>
      );
    }

    // Standard input fields
    return (
      <div key={field.name} className="space-y-2">
        <Label htmlFor={field.name}>
          {field.label} {field.required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          id={field.name}
          type={field.type}
          value={formData[field.name] || ''}
          onChange={(e) => handleInputChange(field.name, e.target.value)}
          required={field.required}
          placeholder={field.placeholder}
          className="border-2 focus:border-blue-500 rounded-lg"
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-500 font-semibold">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">Thank You!</h2>
              <p className="text-gray-600">Your submission has been received successfully.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: `${form?.primaryColor}10` }}
    >
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader
          className="text-white"
          style={{ backgroundColor: form?.primaryColor }}
        >
          <CardTitle className="text-2xl">{form?.title}</CardTitle>
          {form?.description && (
            <CardDescription className="text-white/90">
              {form.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {form?.fields.map(field => renderField(field))}

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full"
              style={{ backgroundColor: form?.primaryColor }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                form?.buttonText || 'Submit'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
