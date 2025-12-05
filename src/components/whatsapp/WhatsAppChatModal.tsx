import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Send, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { Contact } from '@/types/contact';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface WhatsAppChatModalProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppChatModal({ contact, open, onOpenChange }: WhatsAppChatModalProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const whatsappNumber = contact?.whatsapp || contact?.phone || '';
  const cleanNumber = whatsappNumber.replace(/\D/g, '');

  const handleSend = async () => {
    if (!message.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    if (!contact) {
      toast({
        title: 'Error',
        description: 'No contact selected',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    setSent(false);

    try {
      const userId = localStorage.getItem('userId');

      const response = await fetch(`${API_URL}/whatsapp/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId || '',
        },
        body: JSON.stringify({
          contactId: contact.id,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to send message');
      }

      setSent(true);
      toast({
        title: 'Message Sent!',
        description: `Your WhatsApp message has been sent to ${contact.name}`,
      });

      // Clear message after 2 seconds and close modal
      setTimeout(() => {
        setMessage('');
        setSent(false);
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      console.error('Error sending WhatsApp message:', error);

      let errorMessage = error.message || 'Failed to send message';

      // Check if it's a configuration error
      if (errorMessage.includes('not configured')) {
        errorMessage = 'WhatsApp is not configured. Please check your environment settings.';
      }

      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleOpenWhatsAppWeb = () => {
    const url = `https://wa.me/${cleanNumber}`;
    window.open(url, '_blank');
  };

  const handleReset = () => {
    setMessage('');
    setSent(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div>Send WhatsApp Message</div>
              <div className="text-sm font-normal text-muted-foreground">
                {contact?.name}
              </div>
            </div>
          </DialogTitle>
          <DialogDescription>
            Send a message to {whatsappNumber} via WhatsApp Business API
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {sent ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center animate-in zoom-in duration-300">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold">Message Sent Successfully!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your message has been delivered to {contact?.name}
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your message here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={6}
                  className="resize-none"
                  disabled={sending}
                />
                <p className="text-xs text-muted-foreground">
                  {message.length} characters
                </p>
              </div>

              <div className="p-4 bg-accent/50 rounded-lg border border-border/50">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> This will send a message via WhatsApp Business API.
                  Make sure your WhatsApp Business account is properly configured.
                </p>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {sent ? (
            <>
              <Button
                variant="outline"
                onClick={handleOpenWhatsAppWeb}
                className="w-full sm:w-auto"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open WhatsApp Web
              </Button>
              <Button
                onClick={handleReset}
                className="w-full sm:w-auto"
              >
                Send Another Message
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleOpenWhatsAppWeb}
                className="w-full sm:w-auto"
                disabled={sending}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open WhatsApp Web
              </Button>
              <Button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
