import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { User } from '@supabase/supabase-js';
import { 
  ArrowBack,
  Send,
  PersonAdd,
  Search,
  MoreVert,
  Check,
  Close
} from '@mui/icons-material';
import { Avatar } from '@/components/ui/avatar';

interface Friend {
  id: string;
  friend_id: string;
  status: string;
  friend_email?: string;
  friend_username?: string;
  friend_avatar?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

const Chat = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedFriendId = searchParams.get('friend');
  
  const [user, setUser] = useState<User | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchFriends(user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (user && selectedFriendId) {
      fetchMessages(user.id, selectedFriendId);
      markMessagesAsRead(selectedFriendId);
      
      // Subscribe to new messages
      const channel = supabase
        .channel('messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${user.id}`
          },
          (payload) => {
            const newMsg = payload.new as Message;
            if (newMsg.sender_id === selectedFriendId) {
              setMessages(prev => [...prev, newMsg]);
              markMessagesAsRead(selectedFriendId);
            }
            fetchFriends(user.id);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, selectedFriendId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchFriends = async (userId: string) => {
    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        friend_id,
        status,
        profiles!friends_friend_id_fkey(id, username, avatar_url)
      `)
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }

    // Get unread message counts
    const friendsWithUnread = await Promise.all(
      (data || []).map(async (friend: any) => {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_id', friend.friend_id)
          .eq('receiver_id', userId)
          .eq('read', false);

        return {
          id: friend.id,
          friend_id: friend.friend_id,
          status: friend.status,
          friend_username: friend.profiles?.username || 'User',
          friend_avatar: friend.profiles?.avatar_url,
          unread_count: count || 0
        };
      })
    );

    setFriends(friendsWithUnread);
  };

  const fetchMessages = async (userId: string, friendId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return;
    }

    setMessages(data || []);
  };

  const markMessagesAsRead = async (friendId: string) => {
    if (!user) return;
    
    await supabase
      .from('messages')
      .update({ read: true })
      .eq('sender_id', friendId)
      .eq('receiver_id', user.id)
      .eq('read', false);

    fetchFriends(user.id);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedFriendId) return;

    const { error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: selectedFriendId,
        content: newMessage.trim()
      });

    if (error) {
      toast({
        title: 'Failed to send',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    setNewMessage('');
    fetchMessages(user.id, selectedFriendId);
  };

  const addFriend = async () => {
    if (!friendEmail.trim() || !user) return;

    // Find user by email
    const { data: friendData, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', friendEmail.trim())
      .single();

    if (findError || !friendData) {
      toast({
        title: 'User not found',
        description: 'No user with that email exists',
        variant: 'destructive'
      });
      return;
    }

    if (friendData.id === user.id) {
      toast({
        title: 'Invalid action',
        description: 'You cannot add yourself as a friend',
        variant: 'destructive'
      });
      return;
    }

    // Create friend request
    const { error } = await supabase
      .from('friends')
      .insert([
        { user_id: user.id, friend_id: friendData.id, status: 'accepted' },
        { user_id: friendData.id, friend_id: user.id, status: 'accepted' }
      ]);

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Already friends',
          description: 'This user is already your friend',
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Failed to add friend',
          description: error.message,
          variant: 'destructive'
        });
      }
      return;
    }

    toast({
      title: 'Friend added!',
      description: 'You can now chat with this user'
    });
    
    setFriendEmail('');
    setShowAddFriend(false);
    fetchFriends(user.id);
  };

  const filteredFriends = friends.filter(f => 
    f.friend_username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFriend = friends.find(f => f.friend_id === selectedFriendId);

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="glass p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selectedFriendId ? navigate('/chat') : navigate('/')}
            className="text-white"
          >
            <ArrowBack />
          </Button>
          <h1 className="text-xl font-bold text-white">
            {selectedFriend ? selectedFriend.friend_username : 'Messages'}
          </h1>
        </div>
        {!selectedFriendId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAddFriend(!showAddFriend)}
            className="text-white"
          >
            {showAddFriend ? <Close /> : <PersonAdd />}
          </Button>
        )}
        {selectedFriendId && (
          <Button
            variant="ghost"
            size="icon"
            className="text-white"
          >
            <MoreVert />
          </Button>
        )}
      </header>

      {/* Add Friend Section */}
      {showAddFriend && !selectedFriendId && (
        <div className="glass p-4 border-b border-border animate-fade-in">
          <div className="flex gap-2">
            <Input
              placeholder="Enter friend's email..."
              value={friendEmail}
              onChange={(e) => setFriendEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFriend()}
              className="flex-1 bg-gray-700 text-white border-gray-600"
            />
            <Button onClick={addFriend} className="bg-gradient-primary text-white">
              Add Friend
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Friends List */}
        {!selectedFriendId && (
          <div className="flex-1 flex flex-col glass">
            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-700 text-white border-gray-600"
                />
              </div>
            </div>

            {/* Friends */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filteredFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                  <PersonAdd className="h-16 w-16 mb-4" />
                  <p>
                    {friends.length === 0 
                      ? "No friends yet. Add friends to start chatting!"
                      : "No friends found"}
                  </p>
                </div>
              ) : (
                filteredFriends.map((friend) => (
                  <button
                    key={friend.id}
                    onClick={() => navigate(`/chat?friend=${friend.friend_id}`)}
                    className="w-full p-4 flex items-center gap-3 hover:bg-accent transition-colors border-b border-border"
                  >
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0">
                      {friend.friend_avatar ? (
                        <img src={friend.friend_avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        friend.friend_username?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-medium text-white">{friend.friend_username}</p>
                      {friend.unread_count! > 0 && (
                        <p className="text-sm text-primary">
                          {friend.unread_count} new message{friend.unread_count! > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Chat View */}
        {selectedFriendId && selectedFriend && (
          <div className="flex-1 flex flex-col glass">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-gradient-primary text-white'
                          : 'glass border border-border'
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {new Date(message.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-border glass">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1 bg-gray-700 text-white border-gray-600"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  size="icon"
                  className="bg-gradient-primary text-white"
                >
                  <Send />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
