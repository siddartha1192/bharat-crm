import { useState, useEffect } from 'react';
import { Bell, BellOff, Search, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsAppNotifications } from '@/contexts/WhatsAppNotificationContext';
import { GlobalSearch } from '@/components/GlobalSearch';
import { formatDistanceToNow } from 'date-fns';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const {
    notificationHistory,
    notificationPermission,
    unreadCount,
    markAllNotificationsRead,
    requestNotificationPermission,
    loadConversation,
  } = useWhatsAppNotifications();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationPopoverOpen, setNotificationPopoverOpen] = useState(false);

  // Keyboard shortcut for search (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4 flex-1">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
              <Menu className="w-5 h-5" />
            </Button>

            <div
              className="relative max-w-md w-full cursor-pointer"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search everything... (Ctrl+K)"
                className="pl-10 bg-muted/50 border-muted cursor-pointer"
                readOnly
              />
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded bg-background border text-muted-foreground pointer-events-none hidden sm:inline-block">
                ⌘K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {notificationPermission !== 'granted' ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={requestNotificationPermission}
                title="Enable WhatsApp notifications"
                className="relative"
              >
                <BellOff className="w-5 h-5" />
              </Button>
            ) : (
              <Popover open={notificationPopoverOpen} onOpenChange={setNotificationPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    onClick={() => {
                      setNotificationPopoverOpen(true);
                      markAllNotificationsRead();
                    }}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-600 text-white text-xs">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0" align="end">
                  <div className="border-b p-3 bg-muted/50">
                    <h3 className="font-semibold text-sm">WhatsApp Notifications</h3>
                    <p className="text-xs text-muted-foreground">Last 5 messages</p>
                  </div>
                  <ScrollArea className="max-h-[400px]">
                    {notificationHistory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <Bell className="w-8 h-8 mb-2 opacity-50" />
                        <p className="text-sm">No notifications yet</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {notificationHistory.map(notification => (
                          <div
                            key={notification.id}
                            className={`p-3 hover:bg-accent cursor-pointer transition-colors ${
                              !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                            }`}
                            onClick={() => {
                              loadConversation(notification.conversationId);
                              setNotificationPopoverOpen(false);
                            }}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="bg-green-500/10 text-green-600 text-xs">
                                  {notification.contactName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-1">
                                  <p className="font-semibold text-sm truncate">
                                    {notification.contactName}
                                  </p>
                                  {!notification.read && (
                                    <div className="h-2 w-2 rounded-full bg-blue-600 flex-shrink-0 ml-2" />
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center gap-3 pl-3 border-l border-border cursor-pointer hover:bg-muted/50 rounded-md p-2 transition-colors">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.company || 'Company'}</p>
                  </div>
                  <Avatar>
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground">
                      {user ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span>{user?.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
