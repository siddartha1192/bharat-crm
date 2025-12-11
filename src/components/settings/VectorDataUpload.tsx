import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { api } from '../../lib/api';
import {
  Upload,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface VectorUpload {
  id: string;
  fileName: string;
  fileSize: number;
  formattedSize: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  recordsProcessed: number;
  errorMessage?: string;
  uploadedBy: string;
  createdAt: string;
  processedAt?: string;
  user: {
    name: string;
    email: string;
  };
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export default function VectorDataUpload() {
  const { user } = useAuth();
  const [uploads, setUploads] = useState<VectorUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    try {
      const response = await api.get('/vector-data/uploads');
      setUploads(response.data);
    } catch (error) {
      console.error('Error loading uploads:', error);
      toast.error('Failed to load uploads');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`File size must be less than 50MB. Selected file is ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      return;
    }

    // Validate file type
    const allowedTypes = ['.txt', '.csv', '.json', '.pdf', '.doc', '.docx'];
    const fileExt = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowedTypes.includes(fileExt)) {
      toast.error(`File type ${fileExt} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/vector-data/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      toast.success('File uploaded successfully and is being processed');
      loadUploads();

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteUpload = async (id: string) => {
    if (!confirm('Are you sure you want to delete this upload?')) return;

    try {
      await api.delete(`/vector-data/uploads/${id}`);
      toast.success('Upload deleted');
      loadUploads();
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast.error('Failed to delete upload');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'processing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: 'default',
      failed: 'destructive',
      processing: 'secondary',
      pending: 'outline'
    };

    return (
      <Badge variant={variants[status] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Vector Database Management</h2>
        <p className="text-muted-foreground">Upload and manage data files for the AI vector database</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Data File</CardTitle>
          <CardDescription>
            Upload text, CSV, JSON, or document files to enhance the AI knowledge base
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upload Data File</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Supported formats: TXT, CSV, JSON, PDF, DOC, DOCX<br />
              Maximum file size: 50MB
            </p>
            <Button onClick={handleFileSelect} disabled={uploading}>
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Select File
                </>
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.csv,.json,.pdf,.doc,.docx"
              onChange={handleFileChange}
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-blue-900 mb-1">Important Notes:</p>
                <ul className="list-disc list-inside text-blue-800 space-y-1">
                  <li>Files are automatically processed and added to the vector database</li>
                  <li>Processing may take a few minutes depending on file size</li>
                  <li>The AI assistant will use this data to provide better responses</li>
                  <li>Maximum file size is 50MB per upload</li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>
            View all uploaded files and their processing status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No uploads yet. Upload your first data file to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(upload.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{upload.fileName}</h4>
                        {getStatusBadge(upload.status)}
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          Size: {upload.formattedSize} • Uploaded by {upload.user.name}
                        </p>
                        <p>
                          {new Date(upload.createdAt).toLocaleString()}
                        </p>
                        {upload.status === 'completed' && (
                          <p className="text-green-600 font-medium">
                            ✓ Processed {upload.recordsProcessed} records
                          </p>
                        )}
                        {upload.status === 'processing' && (
                          <div className="space-y-2">
                            <p className="text-blue-600 font-medium">Processing...</p>
                            <Progress value={50} className="w-full" />
                          </div>
                        )}
                        {upload.status === 'failed' && upload.errorMessage && (
                          <p className="text-red-600 font-medium">
                            ✗ {upload.errorMessage}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {user?.role === 'ADMIN' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteUpload(upload.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
