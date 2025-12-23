import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Eye, Code, Sparkles, ArrowLeft, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

interface ContentSection {
  [key: string]: any;
}

interface PageData {
  id: string;
  name: string;
  slug: string;
  title: string;
  metaDescription?: string;
  content: {
    header: any;
    hero: any;
    positioning: any;
    about: any;
    services: any;
    testimonials: any;
    clients: any;
    blog: any;
    leadMagnet: any;
    footer: any;
  };
  theme: {
    colors: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
      textLight: string;
    };
    fonts: {
      heading: string;
      body: string;
    };
  };
  headScripts?: string;
  bodyScripts?: string;
  isPublished: boolean;
}

export default function LandingPageBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('header');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  useEffect(() => {
    fetchPage();
  }, [id]);

  const fetchPage = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/landing-pages/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to fetch page');

      const data = await response.json();
      setPage(data);
    } catch (error) {
      console.error('Error fetching page:', error);
      toast({
        title: 'Error',
        description: 'Failed to load landing page',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!page) return;

    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/landing-pages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: page.title,
          metaDescription: page.metaDescription,
          content: page.content,
          theme: page.theme,
          headScripts: page.headScripts,
          bodyScripts: page.bodyScripts,
        }),
      });

      if (!response.ok) throw new Error('Failed to save page');

      toast({
        title: 'Success',
        description: 'Landing page saved successfully',
      });
    } catch (error) {
      console.error('Error saving page:', error);
      toast({
        title: 'Error',
        description: 'Failed to save landing page',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAIEdit = async () => {
    if (!page || !aiPrompt.trim()) return;

    setAiLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/landing-pages/${id}/ai-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: aiPrompt,
          section: activeSection,
        }),
      });

      if (!response.ok) throw new Error('Failed to process AI edit');

      const data = await response.json();
      setPage(data.page);
      setAiPrompt('');

      toast({
        title: 'Success',
        description: 'AI edit applied successfully',
      });
    } catch (error) {
      console.error('Error with AI edit:', error);
      toast({
        title: 'Error',
        description: 'Failed to apply AI edit',
        variant: 'destructive',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const updateContent = (section: string, key: string, value: any) => {
    if (!page) return;

    setPage({
      ...page,
      content: {
        ...page.content,
        [section]: {
          ...page.content[section],
          [key]: value,
        },
      },
    });
  };

  const updateTheme = (category: string, key: string, value: string) => {
    if (!page) return;

    setPage({
      ...page,
      theme: {
        ...page.theme,
        [category]: {
          ...(page.theme as any)[category],
          [key]: value,
        },
      },
    });
  };

  const handlePublishToggle = async () => {
    if (!page) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/landing-pages/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isPublished: !page.isPublished }),
      });

      if (!response.ok) throw new Error('Failed to update publish status');

      setPage({ ...page, isPublished: !page.isPublished });

      toast({
        title: 'Success',
        description: `Page ${!page.isPublished ? 'published' : 'unpublished'}`,
      });
    } catch (error) {
      console.error('Error toggling publish:', error);
      toast({
        title: 'Error',
        description: 'Failed to update publish status',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading builder...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Page not found</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Left Sidebar - Editor */}
      <div className="w-96 border-r flex flex-col">
        <div className="p-4 border-b flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/landing-pages')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button size="sm" onClick={handlePublishToggle}>
              <Globe className="h-4 w-4 mr-2" />
              {page.isPublished ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* AI Assistant */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI Assistant
                </CardTitle>
                <CardDescription className="text-xs">
                  Describe changes to the {activeSection} section
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Textarea
                    placeholder="e.g., Make the headline more compelling for B2B SaaS..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                  />
                  <Button
                    onClick={handleAIEdit}
                    disabled={aiLoading || !aiPrompt.trim()}
                    className="w-full"
                    size="sm"
                  >
                    {aiLoading ? 'Processing...' : 'Apply AI Edit'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Section Selector */}
            <div>
              <Label>Edit Section</Label>
              <Select value={activeSection} onValueChange={setActiveSection}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="header">Header</SelectItem>
                  <SelectItem value="hero">Hero Banner</SelectItem>
                  <SelectItem value="positioning">Positioning Statement</SelectItem>
                  <SelectItem value="about">About Us</SelectItem>
                  <SelectItem value="services">Services</SelectItem>
                  <SelectItem value="testimonials">Testimonials</SelectItem>
                  <SelectItem value="clients">Client List</SelectItem>
                  <SelectItem value="blog">Blog/Latest Posts</SelectItem>
                  <SelectItem value="leadMagnet">Lead Magnet</SelectItem>
                  <SelectItem value="footer">Footer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Section-Specific Editors */}
            {activeSection === 'header' && page.content.header && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Header Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Logo Text</Label>
                    <Input
                      value={page.content.header.logo?.value || ''}
                      onChange={(e) => updateContent('header', 'logo', { type: 'text', value: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>CTA Text</Label>
                    <Input
                      value={page.content.header.cta?.text || ''}
                      onChange={(e) =>
                        updateContent('header', 'cta', { ...page.content.header.cta, text: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label>CTA Link</Label>
                    <Input
                      value={page.content.header.cta?.href || ''}
                      onChange={(e) =>
                        updateContent('header', 'cta', { ...page.content.header.cta, href: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'hero' && page.content.hero && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Hero Banner</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Headline</Label>
                    <Input
                      value={page.content.hero.headline || ''}
                      onChange={(e) => updateContent('hero', 'headline', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Tagline</Label>
                    <Input
                      value={page.content.hero.tagline || ''}
                      onChange={(e) => updateContent('hero', 'tagline', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={page.content.hero.description || ''}
                      onChange={(e) => updateContent('hero', 'description', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>CTA Button Text</Label>
                    <Input
                      value={page.content.hero.cta?.text || ''}
                      onChange={(e) =>
                        updateContent('hero', 'cta', { ...page.content.hero.cta, text: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'positioning' && page.content.positioning && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Positioning Statement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Statement</Label>
                    <Input
                      value={page.content.positioning.statement || ''}
                      onChange={(e) => updateContent('positioning', 'statement', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'about' && page.content.about && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">About Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Headline</Label>
                    <Input
                      value={page.content.about.headline || ''}
                      onChange={(e) => updateContent('about', 'headline', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={page.content.about.description || ''}
                      onChange={(e) => updateContent('about', 'description', e.target.value)}
                      rows={4}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'services' && page.content.services && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Services</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Headline</Label>
                    <Input
                      value={page.content.services.headline || ''}
                      onChange={(e) => updateContent('services', 'headline', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={page.content.services.description || ''}
                      onChange={(e) => updateContent('services', 'description', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>CTA Button Text</Label>
                    <Input
                      value={page.content.services.cta?.text || ''}
                      onChange={(e) =>
                        updateContent('services', 'cta', { ...page.content.services.cta, text: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'testimonials' && page.content.testimonials && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Testimonials</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Headline</Label>
                    <Input
                      value={page.content.testimonials.headline || ''}
                      onChange={(e) => updateContent('testimonials', 'headline', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {activeSection === 'leadMagnet' && page.content.leadMagnet && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Lead Magnet</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label>Headline</Label>
                    <Input
                      value={page.content.leadMagnet.headline || ''}
                      onChange={(e) => updateContent('leadMagnet', 'headline', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea
                      value={page.content.leadMagnet.description || ''}
                      onChange={(e) => updateContent('leadMagnet', 'description', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>CTA Button Text</Label>
                    <Input
                      value={page.content.leadMagnet.cta?.text || ''}
                      onChange={(e) =>
                        updateContent('leadMagnet', 'cta', { ...page.content.leadMagnet.cta, text: e.target.value })
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Theme Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Theme Colors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Primary Color</Label>
                  <Input
                    type="color"
                    value={page.theme.colors.primary}
                    onChange={(e) => updateTheme('colors', 'primary', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Secondary Color</Label>
                  <Input
                    type="color"
                    value={page.theme.colors.secondary}
                    onChange={(e) => updateTheme('colors', 'secondary', e.target.value)}
                  />
                </div>
                <div>
                  <Label>Accent Color</Label>
                  <Input
                    type="color"
                    value={page.theme.colors.accent}
                    onChange={(e) => updateTheme('colors', 'accent', e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Scripts */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Code Snippets</CardTitle>
                <CardDescription className="text-xs">
                  Add tracking codes (Analytics, Meta Pixel, AdSense, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Head Scripts</Label>
                  <Textarea
                    placeholder="<!-- Google Analytics, Meta Pixel, etc. -->"
                    value={page.headScripts || ''}
                    onChange={(e) => setPage({ ...page, headScripts: e.target.value })}
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>
                <div>
                  <Label>Body Scripts</Label>
                  <Textarea
                    placeholder="<!-- Additional tracking scripts -->"
                    value={page.bodyScripts || ''}
                    onChange={(e) => setPage({ ...page, bodyScripts: e.target.value })}
                    rows={4}
                    className="font-mono text-xs"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </div>

      {/* Main Preview Area */}
      <div className="flex-1 overflow-auto bg-gray-50">
        <div className="max-w-5xl mx-auto bg-white shadow-lg min-h-full">
          {/* Preview of Landing Page */}
          <div style={{ fontFamily: page.theme.fonts.body }}>
            {/* Header */}
            <header
              className="py-4 px-8 flex items-center justify-between border-b"
              style={{ backgroundColor: page.theme.colors.background }}
            >
              <div className="text-2xl font-bold" style={{ color: page.theme.colors.primary }}>
                {page.content.header?.logo?.value || 'Logo'}
              </div>
              <nav className="flex gap-6 text-sm">
                {page.content.header?.menu?.map((item: any, i: number) => (
                  <a key={i} href={item.href} style={{ color: page.theme.colors.text }}>
                    {item.label}
                  </a>
                ))}
              </nav>
              <button
                className="px-6 py-2 rounded-lg text-white font-medium"
                style={{ backgroundColor: page.theme.colors.primary }}
              >
                {page.content.header?.cta?.text || 'Get Started'}
              </button>
            </header>

            {/* Hero Section */}
            <section
              className="py-20 px-8 text-center"
              style={{
                backgroundColor: `${page.theme.colors.primary}10`,
              }}
            >
              <div className="max-w-3xl mx-auto">
                <p className="text-sm font-semibold mb-4" style={{ color: page.theme.colors.primary }}>
                  {page.content.hero?.tagline}
                </p>
                <h1
                  className="text-5xl font-bold mb-6"
                  style={{ fontFamily: page.theme.fonts.heading, color: page.theme.colors.text }}
                >
                  {page.content.hero?.headline}
                </h1>
                <p className="text-xl mb-8" style={{ color: page.theme.colors.textLight }}>
                  {page.content.hero?.description}
                </p>
                <button
                  className="px-8 py-4 rounded-lg text-white text-lg font-medium"
                  style={{ backgroundColor: page.theme.colors.primary }}
                >
                  {page.content.hero?.cta?.text}
                </button>
              </div>
            </section>

            {/* Positioning Statement */}
            <section className="py-12 px-8 text-center border-b">
              <p className="text-lg font-medium" style={{ color: page.theme.colors.text }}>
                {page.content.positioning?.statement}
              </p>
              <div className="flex justify-center gap-12 mt-8">
                {page.content.positioning?.achievements?.map((achievement: any, i: number) => (
                  <div key={i} className="text-center">
                    <div className="text-3xl font-bold" style={{ color: page.theme.colors.primary }}>
                      {achievement.value}
                    </div>
                    <div className="text-sm" style={{ color: page.theme.colors.textLight }}>
                      {achievement.label}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* About Section */}
            <section className="py-20 px-8">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold mb-6" style={{ color: page.theme.colors.text }}>
                  {page.content.about?.headline}
                </h2>
                <p className="text-lg" style={{ color: page.theme.colors.textLight }}>
                  {page.content.about?.description}
                </p>
              </div>
            </section>

            {/* Services Section */}
            <section className="py-20 px-8 bg-gray-50">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-4xl font-bold mb-4 text-center" style={{ color: page.theme.colors.text }}>
                  {page.content.services?.headline}
                </h2>
                <p className="text-lg text-center mb-12" style={{ color: page.theme.colors.textLight }}>
                  {page.content.services?.description}
                </p>
                <div className="grid grid-cols-3 gap-8">
                  {page.content.services?.serviceList?.map((service: any, i: number) => (
                    <div key={i} className="text-center p-6 bg-white rounded-lg shadow">
                      <div className="text-4xl mb-4">{service.icon}</div>
                      <h3 className="text-xl font-bold mb-2" style={{ color: page.theme.colors.text }}>
                        {service.title}
                      </h3>
                      <p style={{ color: page.theme.colors.textLight }}>{service.description}</p>
                    </div>
                  ))}
                </div>
                <div className="text-center mt-12">
                  <button
                    className="px-8 py-4 rounded-lg text-white text-lg font-medium"
                    style={{ backgroundColor: page.theme.colors.primary }}
                  >
                    {page.content.services?.cta?.text}
                  </button>
                </div>
              </div>
            </section>

            {/* Lead Magnet Section */}
            <section
              className="py-20 px-8"
              style={{ backgroundColor: `${page.theme.colors.secondary}10` }}
            >
              <div className="max-w-3xl mx-auto text-center">
                <h2 className="text-4xl font-bold mb-4" style={{ color: page.theme.colors.text }}>
                  {page.content.leadMagnet?.headline}
                </h2>
                <p className="text-lg mb-8" style={{ color: page.theme.colors.textLight }}>
                  {page.content.leadMagnet?.description}
                </p>
                <button
                  className="px-8 py-4 rounded-lg text-white text-lg font-medium"
                  style={{ backgroundColor: page.theme.colors.accent }}
                >
                  {page.content.leadMagnet?.cta?.text}
                </button>
              </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-8 border-t" style={{ backgroundColor: page.theme.colors.background }}>
              <div className="max-w-4xl mx-auto text-center">
                <div className="text-xl font-bold mb-2" style={{ color: page.theme.colors.text }}>
                  {page.content.footer?.companyName}
                </div>
                <p className="text-sm mb-4" style={{ color: page.theme.colors.textLight }}>
                  {page.content.footer?.tagline}
                </p>
                <div className="flex justify-center gap-6 text-sm">
                  {page.content.footer?.links?.map((link: any, i: number) => (
                    <a key={i} href={link.href} style={{ color: page.theme.colors.textLight }}>
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
