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
  Close,
  PersonAddAlt1
} from '@mui/icons-material';

interface Friend {
  id: string;
  friend_id: string;
  status: string;
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

interface UserSuggestion {
  id: string;
  username: string;
  avatar_url: string | null;
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
  const [friendUsername, setFriendUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchFriends(user.id);
        fetchUserSuggestions(user.id);
      }
    });
  }, []);

  const fetchUserSuggestions = async (userId: string) => {
    setLoadingSuggestions(true);
    try {
      // Get current friend IDs
      const { data: friendsData } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', userId);
      
      const friendIds = friendsData?.map(f => f.friend_id) || [];
      const excludeIds = [userId, ...friendIds];

      // Get users who are not friends
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .not('id', 'in', `(${excludeIds.join(',')})`)
        .not('username', 'is', null)
        .limit(10);

      if (error) {
        console.error('Error fetching suggestions:', error);
        return;
      }

      setUserSuggestions(users || []);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const addFriendById = async (friendId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('friends')
      .insert([
        { user_id: user.id, friend_id: friendId, status: 'accepted' },
        { user_id: friendId, friend_id: user.id, status: 'accepted' }
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
    
    fetchFriends(user.id);
    fetchUserSuggestions(user.id);
  };

  useEffect(() => {
    if (user && selectedFriendId) {
      fetchMessages(user.id, selectedFriendId);
      markMessagesAsRead(selectedFriendId);
      
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
      .select('id, friend_id, status')
      .eq('user_id', userId)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching friends:', error);
      return;
    }

    const friendsWithProfiles = await Promise.all(
      (data || []).map(async (friend) => {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', friend.friend_id)
          .single();

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
          friend_username: profile?.username || 'User',
          friend_avatar: profile?.avatar_url,
          unread_count: count || 0
        };
      })
    );

    setFriends(friendsWithProfiles);
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
    if (!friendUsername.trim() || !user) return;

    const { data: friendData, error: findError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', friendUsername.trim())
      .single();

    if (findError || !friendData) {
      toast({
        title: 'User not found',
        description: 'No user with that username exists',
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
    
    setFriendUsername('');
    setShowAddFriend(false);
    fetchFriends(user.id);
  };

  const filteredFriends = friends.filter(f => 
    f.friend_username?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedFriend = friends.find(f => f.friend_id === selectedFriendId);

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-lg p-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => selectedFriendId ? navigate('/chat') : navigate('/profile')}
          >
            <ArrowBack />
          </Button>
          {selectedFriend && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                {selectedFriend.friend_avatar ? (
                  <img src={selectedFriend.friend_avatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  selectedFriend.friend_username?.charAt(0).toUpperCase()
                )}
              </div>
              <h1 className="text-lg font-semibold">{selectedFriend.friend_username}</h1>
            </div>
          )}
          {!selectedFriendId && (
            <h1 className="text-xl font-bold">Messages</h1>
          )}
        </div>
        {!selectedFriendId && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowAddFriend(!showAddFriend)}
          >
            {showAddFriend ? <Close /> : <PersonAdd />}
          </Button>
        )}
        {selectedFriendId && (
          <Button variant="ghost" size="icon">
            <MoreVert />
          </Button>
        )}
      </header>

      {/* Add Friend Section */}
      {showAddFriend && !selectedFriendId && (
        <div className="bg-card/80 backdrop-blur-lg p-4 border-b border-border animate-in slide-in-from-top">
          <div className="flex gap-2">
            <Input
              placeholder="Enter friend's username..."
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFriend()}
              className="flex-1"
            />
            <Button onClick={addFriend}>
              Add Friend
            </Button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Friends List */}
        {!selectedFriendId && (
          <div className="flex-1 flex flex-col">
            {/* Search */}
            <div className="p-4 border-b border-border">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  placeholder="Search friends..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Friends */}
            <div className="flex-1 overflow-y-auto">
              {filteredFriends.length === 0 && searchQuery === '' ? (
                <div className="p-4">
                  {/* User Suggestions */}
                  {userSuggestions.length > 0 && (
                    <div className="mb-6">
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Suggested Users</h3>
                      <div className="space-y-2">
                        {userSuggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden flex-shrink-0">
                              {suggestion.avatar_url ? (
                                <img src={suggestion.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                suggestion.username?.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{suggestion.username}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addFriendById(suggestion.id)}
                              className="gap-1"
                            >
                              <PersonAddAlt1 className="h-4 w-4" />
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {userSuggestions.length === 0 && !loadingSuggestions && (
                    <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                      <PersonAdd className="h-16 w-16 mb-4" />
                      <p>No friends yet. Add friends to start chatting!</p>
                    </div>
                  )}
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-muted-foreground">
                  <p>No friends found</p>
                </div>
              ) : (
                <>
                  {filteredFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => navigate(`/chat?friend=${friend.friend_id}`)}
                      className="w-full p-4 flex items-center gap-3 hover:bg-accent transition-colors border-b border-border"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden flex-shrink-0">
                        {friend.friend_avatar ? (
                          <img src={friend.friend_avatar} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          friend.friend_username?.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{friend.friend_username}</p>
                        {friend.unread_count! > 0 && (
                          <p className="text-sm text-primary">
                            {friend.unread_count} new message{friend.unread_count! > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                      {friend.unread_count! > 0 && (
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                          {friend.unread_count}
                        </div>
                      )}
                    </button>
                  ))}
                  
                  {/* Suggestions at bottom when user has friends */}
                  {userSuggestions.length > 0 && searchQuery === '' && (
                    <div className="p-4 border-t border-border">
                      <h3 className="text-sm font-medium text-muted-foreground mb-3">Add More Friends</h3>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {userSuggestions.slice(0, 5).map((suggestion) => (
                          <button
                            key={suggestion.id}
                            onClick={() => addFriendById(suggestion.id)}
                            className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent transition-colors min-w-[70px]"
                          >
                            <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden">
                              {suggestion.avatar_url ? (
                                <img src={suggestion.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                suggestion.username?.charAt(0).toUpperCase()
                              )}
                            </div>
                            <p className="text-xs truncate max-w-[60px]">{suggestion.username}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Chat View */}
        {selectedFriendId && selectedFriend && (
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <p>No messages yet. Say hi!</p>
                </div>
              )}
              {messages.map((message) => {
                const isOwn = message.sender_id === user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
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
            <div className="p-4 border-t border-border bg-card/80 backdrop-blur-lg">
              <div className="flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  className="flex-1"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  size="icon"
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
