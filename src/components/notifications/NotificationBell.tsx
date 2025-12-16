import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Notifications, Close, NotificationsActive } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, string>;
  read: boolean;
  created_at: string;
}

const NotificationBell = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const { 
    permission, 
    isSupported, 
    requestPermission, 
    registerServiceWorker,
    showNotification 
  } = useNotifications();

  // Register service worker on mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchNotifications(user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          
          // Show native notification
          const url = newNotif.type === 'new_message' 
            ? `/chat?friend=${newNotif.data.sender_id}`
            : newNotif.type === 'friend_accepted'
            ? `/chat?friend=${newNotif.data.friend_id}`
            : '/';

          showNotification(newNotif.title, {
            body: newNotif.message,
            url,
            tag: newNotif.type
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, showNotification]);

  const fetchNotifications = async (uid: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as Notification[]);
    }
  };

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    
    if (notification.type === 'new_message') {
      navigate(`/chat?friend=${notification.data.sender_id}`);
    } else if (notification.type === 'friend_accepted') {
      navigate(`/chat?friend=${notification.data.friend_id}`);
    }
    
    setShowDropdown(false);
  };

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative"
      >
        <Notifications />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 top-12 w-80 max-h-[28rem] bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden animate-in slide-in-from-top-2">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={markAllAsRead}
                    className="text-xs h-7"
                  >
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowDropdown(false)}
                >
                  <Close className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Enable notifications banner */}
            {isSupported && permission !== 'granted' && (
              <div className="p-3 bg-primary/10 border-b border-border">
                <div className="flex items-center gap-2">
                  <NotificationsActive className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Enable notifications</p>
                    <p className="text-xs text-muted-foreground">Get alerts for new messages</p>
                  </div>
                  <Button size="sm" onClick={handleEnableNotifications}>
                    Enable
                  </Button>
                </div>
              </div>
            )}
            
            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Notifications className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-3 text-left hover:bg-accent transition-colors border-b border-border last:border-b-0 ${
                      !notification.read ? 'bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!notification.read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                      )}
                      <div className={`flex-1 ${notification.read ? 'ml-4' : ''}`}>
                        <p className="font-medium text-sm">{notification.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{notification.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">{formatTime(notification.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
