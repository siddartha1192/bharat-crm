import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PromoNav } from '@/components/promo/PromoNav';
import { PromoFooter } from '@/components/promo/PromoFooter';
import { Calendar, User, ArrowLeft, Clock, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  tags: string[];
  publishedAt: string;
  author: string;
  readTime: number;
  viewCount?: number;
}

export default function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      fetchBlogPost(slug);
    }
  }, [slug]);

  const fetchBlogPost = async (postSlug: string) => {
    try {
      const response = await fetch(`${API_URL}/blog/posts/${postSlug}`);

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            variant: 'destructive',
            title: 'Blog post not found',
            description: 'The blog post you are looking for does not exist.',
          });
          navigate('/blog');
          return;
        }
        throw new Error('Failed to fetch blog post');
      }

      const data = await response.json();
      setPost(data);
    } catch (error) {
      console.error('Error fetching blog post:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load blog post',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <PromoNav />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading blog post...</p>
          </div>
        </div>
        <PromoFooter />
      </div>
    );
  }

  if (!post) {
    return null; // Will redirect in fetchBlogPost
  }

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'AI': '🤖',
      'WhatsApp': '💬',
      'Sales': '📈',
      'Marketing': '📊',
      'Automation': '⚡',
      'Features': '🚀',
      'Integration': '🔗',
      'Analytics': '📉',
      'CRM': '💼',
      'Tips': '💡',
    };
    return icons[category] || '📄';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <PromoNav />

      {/* Back Button */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <Button
          variant="ghost"
          onClick={() => navigate('/blog')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Blog
        </Button>
      </div>

      {/* Article Header */}
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          {/* Category Badge */}
          <div className="mb-6">
            <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 px-4 py-1 text-sm">
              <span className="mr-2">{getCategoryIcon(post.category)}</span>
              {post.category}
            </Badge>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
            {post.title}
          </h1>

          {/* Excerpt */}
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            {post.excerpt}
          </p>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-6 pb-8 mb-8 border-b border-gray-200">
            <div className="flex items-center text-gray-600">
              <User className="w-5 h-5 mr-2" />
              <span className="font-medium">{post.author}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Calendar className="w-5 h-5 mr-2" />
              <span>{format(new Date(post.publishedAt), 'MMMM dd, yyyy')}</span>
            </div>
            <div className="flex items-center text-gray-600">
              <Clock className="w-5 h-5 mr-2" />
              <span>{post.readTime} min read</span>
            </div>
            {post.viewCount !== undefined && (
              <div className="flex items-center text-gray-600">
                <span>👁️ {post.viewCount} views</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            <div
              className="text-gray-800 leading-relaxed"
              style={{ whiteSpace: 'pre-wrap' }}
            >
              {post.content}
            </div>
          </div>

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex items-center gap-3 flex-wrap">
                <Tag className="w-5 h-5 text-gray-600" />
                {post.tags.map((tag, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-sm"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Call to Action */}
        <div className="mt-12 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-6 text-purple-100">
            Try Bharat CRM free for 25 days with all features included
          </p>
          <Button
            size="lg"
            className="bg-white text-purple-600 hover:bg-gray-100"
            onClick={() => navigate('/contact')}
          >
            Start Free Trial
          </Button>
        </div>
      </article>

      <PromoFooter />
    </div>
  );
}
