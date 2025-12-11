import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface NotificationItem {
  id: string;
  conversationId: string;
  contactName: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  aiEnabled: boolean;
}

interface WhatsAppNotificationContextType {
  notificationHistory: NotificationItem[];
  notificationPermission: NotificationPermission;
  unreadCount: number;
  addNotification: (conversationId: string, contactName: string, message: string) => void;
  markAllNotificationsRead: () => void;
  requestNotificationPermission: () => Promise<void>;
  conversations: Conversation[];
  loadConversation: (conversationId: string) => void;
}

const WhatsAppNotificationContext = createContext<WhatsAppNotificationContextType | undefined>(undefined);

export function WhatsAppNotificationProvider({ children }: { children: ReactNode }) {
  const [notificationHistory, setNotificationHistory] = useState<NotificationItem[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [previousUnreadCount, setPreviousUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastNotifiedMessagesRef = useRef<Set<string>>(new Set());
  const notificationSoundRef = useRef<HTMLAudioElement | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const token = localStorage.getItem('token');

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          setNotificationPermission(permission);
        });
      }
    }

    // Create notification sound
    notificationSoundRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSyAzvLZiTYIGWi77eeeTRAMUKfi8LZjHAY4ktfyy3ksBSN2x/HemT8KE2Cz6eyrVRQJRp/g8r9sIAUsgs/y14o2BxlruvHsn0wQC1Cn4+--3AA');

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      document.title = 'CRM';
    };
  }, []);

  // Start polling for conversations when component mounts
  useEffect(() => {
    if (!token) return;

    // Initial fetch
    fetchConversations(false);

    // Poll every 5 seconds
    pollingIntervalRef.current = setInterval(() => {
      fetchConversations(false);
    }, 5000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [token]);

  const playNotificationSound = () => {
    if (notificationSoundRef.current) {
      notificationSoundRef.current.volume = 0.5;
      notificationSoundRef.current.play().catch(err => {
        console.log('Could not play notification sound:', err);
      });
    }
  };

  const showDesktopNotification = (title: string, body: string) => {
    if (notificationPermission === 'granted' && 'Notification' in window) {
      try {
        const notification = new Notification(title, {
          body,
          icon: '/logo.png',
          badge: '/logo.png',
          tag: 'whatsapp-message',
          requireInteraction: false,
        });

        notification.onclick = () => {
          window.focus();
          // Navigate to WhatsApp page
          window.location.href = '/whatsapp';
          notification.close();
        };

        setTimeout(() => notification.close(), 5000);
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  };

  const updateDocumentTitle = (totalUnread: number) => {
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) CRM`;
    } else {
      document.title = 'CRM';
    }
  };

  const addNotification = (conversationId: string, contactName: string, message: string) => {
    const newNotification: NotificationItem = {
      id: `${conversationId}-${Date.now()}`,
      conversationId,
      contactName,
      message,
      timestamp: new Date(),
      read: false,
    };

    setNotificationHistory(prev => [newNotification, ...prev].slice(0, 5));
  };

  const markAllNotificationsRead = () => {
    setNotificationHistory(prev => prev.map(n => ({ ...n, read: true })));
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive notifications for new WhatsApp messages',
        });
      } else if (permission === 'denied') {
        toast({
          title: 'Notifications Blocked',
          description: 'Please enable notifications in your browser settings',
          variant: 'destructive',
        });
      }
    }
  };

  const fetchConversations = async (showLoading = false) => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/whatsapp/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) return;

      const data = await response.json();
      const newConversations = data.conversations;

      // Calculate total unread count
      const totalUnread = newConversations.reduce((sum: number, conv: Conversation) => sum + conv.unreadCount, 0);
      setUnreadCount(totalUnread);

      // Check for NEW unread messages that haven't been notified yet
      if (!showLoading) {
        const unreadConversations = newConversations.filter(
          (conv: Conversation) => conv.unreadCount > 0 && conv.lastMessageAt
        );

        // Find conversations with messages we haven't notified about yet
        const newUnreadConvs = unreadConversations.filter(conv => {
          const messageKey = `${conv.id}-${conv.lastMessageAt}`;
          return !lastNotifiedMessagesRef.current.has(messageKey);
        });

        if (newUnreadConvs.length > 0) {
          const firstUnread = newUnreadConvs[0];
          const messageKey = `${firstUnread.id}-${firstUnread.lastMessageAt}`;

          // Mark this message as notified FIRST (synchronously) to prevent duplicates
          lastNotifiedMessagesRef.current.add(messageKey);

          // Keep only last 20 messages in the set to prevent memory growth
          if (lastNotifiedMessagesRef.current.size > 20) {
            const arr = Array.from(lastNotifiedMessagesRef.current);
            lastNotifiedMessagesRef.current = new Set(arr.slice(-20));
          }

          // Now trigger all notifications (after marking as notified)
          playNotificationSound();

          // Show desktop notification
          showDesktopNotification(
            `New message from ${firstUnread.contactName}`,
            firstUnread.lastMessage || 'New message received',
          );

          // Add to notification history
          addNotification(
            firstUnread.id,
            firstUnread.contactName,
            firstUnread.lastMessage || 'New message received'
          );

          // Show toast notification
          toast({
            title: `New message from ${firstUnread.contactName}`,
            description: firstUnread.lastMessage?.substring(0, 50) + (firstUnread.lastMessage && firstUnread.lastMessage.length > 50 ? '...' : ''),
          });
        }
      }

      setPreviousUnreadCount(totalUnread);
      updateDocumentTitle(totalUnread);
      setConversations(newConversations);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const loadConversation = (conversationId: string) => {
    // Navigate to WhatsApp page with the conversation
    window.location.href = `/whatsapp?conversation=${conversationId}`;
  };

  return (
    <WhatsAppNotificationContext.Provider
      value={{
        notificationHistory,
        notificationPermission,
        unreadCount,
        addNotification,
        markAllNotificationsRead,
        requestNotificationPermission,
        conversations,
        loadConversation,
      }}
    >
      {children}
    </WhatsAppNotificationContext.Provider>
  );
}

export function useWhatsAppNotifications() {
  const context = useContext(WhatsAppNotificationContext);
  if (context === undefined) {
    throw new Error('useWhatsAppNotifications must be used within a WhatsAppNotificationProvider');
  }
  return context;
}
