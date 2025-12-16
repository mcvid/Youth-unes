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
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSuggestions, setUserSuggestions] = useState<UserSuggestion[]>([]);
  const [searchedUsers, setSearchedUsers] = useState<UserSuggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        fetchFriends(user.id);
        fetchUserSuggestions(user.id);
        fetchUserAvatar(user.id);
      }
    });
  }, []);

  const fetchUserAvatar = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', userId)
      .single();
    if (data?.avatar_url) {
      setUserAvatar(data.avatar_url);
    }
  };

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

      // Build the NOT IN filter properly
      let query = supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .not('username', 'is', null);

      // Only apply the exclusion if there are IDs to exclude
      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data: users, error } = await query.limit(15);

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

  // Search all users when typing in the search box
  const searchAllUsers = async (query: string) => {
    if (!user || !query.trim()) {
      setSearchedUsers([]);
      return;
    }

    setSearchingUsers(true);
    try {
      // Get current friend IDs
      const { data: friendsData } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user.id);
      
      const friendIds = friendsData?.map(f => f.friend_id) || [];
      const excludeIds = [user.id, ...friendIds];

      // Search all users by username (case-insensitive)
      let searchQueryBuilder = supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${query.trim()}%`);

      if (excludeIds.length > 0) {
        searchQueryBuilder = searchQueryBuilder.not('id', 'in', `(${excludeIds.join(',')})`);
      }

      const { data: users, error } = await searchQueryBuilder.limit(50);

      if (error) {
        console.error('Error searching users:', error);
        return;
      }

      setSearchedUsers(users || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  };

  // Debounced user search
  useEffect(() => {
    const debounce = setTimeout(() => {
      if (userSearchQuery.trim()) {
        searchAllUsers(userSearchQuery);
      } else {
        setSearchedUsers([]);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [userSearchQuery, user]);

  const addFriendById = async (friendId: string) => {
    if (!user) return;

    // Only insert one row - trigger handles the reverse friendship
    const { error } = await supabase
      .from('friends')
      .insert({ user_id: user.id, friend_id: friendId, status: 'accepted' });

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

    // Only insert one row - trigger handles the reverse friendship
    const { error } = await supabase
      .from('friends')
      .insert({ user_id: user.id, friend_id: friendData.id, status: 'accepted' });

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
        <div className="bg-card/80 backdrop-blur-lg p-4 border-b border-border animate-in slide-in-from-top space-y-4">
          {/* Search for users */}
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Search all users</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Search Results */}
          {userSearchQuery.trim() && (
            <div className="max-h-60 overflow-y-auto space-y-2">
              {searchingUsers ? (
                <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>
              ) : searchedUsers.length > 0 ? (
                searchedUsers.map((foundUser) => (
                  <div
                    key={foundUser.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card/50 border border-border"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold overflow-hidden flex-shrink-0">
                      {foundUser.avatar_url ? (
                        <img src={foundUser.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        foundUser.username?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{foundUser.username}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        addFriendById(foundUser.id);
                        setUserSearchQuery('');
                        setSearchedUsers([]);
                      }}
                      className="gap-1"
                    >
                      <PersonAddAlt1 className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users found for "{userSearchQuery}"
                </p>
              )}
            </div>
          )}

          {/* Or add by exact username */}
          <div className="flex gap-2 pt-2 border-t border-border">
            <Input
              placeholder="Or enter exact username..."
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addFriend()}
              className="flex-1"
            />
            <Button onClick={addFriend}>
              Add
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
                const avatar = isOwn ? userAvatar : selectedFriend.friend_avatar;
                const initial = isOwn 
                  ? user?.user_metadata?.username?.[0]?.toUpperCase() 
                  : selectedFriend.friend_username?.charAt(0).toUpperCase();
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold overflow-hidden flex-shrink-0">
                      {avatar ? (
                        <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        initial || '?'
                      )}
                    </div>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
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
