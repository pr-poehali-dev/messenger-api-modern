import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { api, User, Chat as ApiChat, Message as ApiMessage, Report as ApiReport } from '@/lib/api';

const Index = () => {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [step, setStep] = useState<'phone' | 'code' | 'profile'>('phone');
  const [devCode, setDevCode] = useState('');
  
  const [selectedChat, setSelectedChat] = useState<ApiChat | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');
  
  const [chats, setChats] = useState<ApiChat[]>([]);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [contacts, setContacts] = useState<User[]>([]);
  const [reports, setReports] = useState<ApiReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      loadChats();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedChat && currentUser) {
      loadMessages(selectedChat.chat_id);
    }
  }, [selectedChat]);

  useEffect(() => {
    if (searchQuery && currentUser) {
      searchUsers();
    }
  }, [searchQuery]);

  const handleSendCode = async () => {
    if (!phone || phone.length < 10) {
      toast({ title: 'Ошибка', description: 'Введите корректный номер телефона', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      const result = await api.sendSmsCode(phone);
      setDevCode(result.dev_code || '');
      setStep('code');
      toast({ 
        title: 'Код отправлен', 
        description: result.dev_code ? `Ваш код: ${result.dev_code}` : 'Проверьте SMS' 
      });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!smsCode || smsCode.length !== 6) {
      toast({ title: 'Ошибка', description: 'Введите 6-значный код', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    try {
      await api.verifySmsCode(phone, smsCode);
      setStep('profile');
      toast({ title: 'Успех', description: 'Телефон подтвержден' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    setIsLoading(true);
    try {
      const result = await api.register(phone, username, fullName || username || phone);
      setCurrentUser(result.user);
      localStorage.setItem('user', JSON.stringify(result.user));
      toast({ title: 'Успех', description: 'Вы вошли в систему' });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const loadChats = async () => {
    if (!currentUser) return;
    try {
      const data = await api.getChats(currentUser.id);
      setChats(data);
    } catch (error) {
      console.error('Failed to load chats:', error);
    }
  };

  const loadMessages = async (chatId: number) => {
    if (!currentUser) return;
    try {
      const data = await api.getMessages(currentUser.id, chatId);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const searchUsers = async () => {
    try {
      const users = await api.searchUsers(searchQuery);
      setContacts(users);
    } catch (error) {
      console.error('Search failed:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedChat || !currentUser) return;

    try {
      await api.sendMessage(currentUser.id, selectedChat.user_id, messageInput);
      setMessageInput('');
      await loadMessages(selectedChat.chat_id);
      await loadChats();
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  };

  const startChat = async (user: User) => {
    if (!currentUser) return;
    
    const existingChat = chats.find(c => c.user_id === user.id);
    if (existingChat) {
      setSelectedChat(existingChat);
      return;
    }

    try {
      await api.sendMessage(currentUser.id, user.id, 'Привет!');
      await loadChats();
      toast({ title: 'Чат создан', description: `Начат диалог с @${user.username}` });
    } catch (error: any) {
      toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
    }
  };

  const loadReports = async () => {
    if (!currentUser || !currentUser.is_admin) return;
    try {
      const data = await api.getReports(currentUser.id);
      setReports(data);
    } catch (error) {
      console.error('Failed to load reports:', error);
    }
  };

  useEffect(() => {
    if (currentUser?.is_admin && activeTab === 'moderation') {
      loadReports();
    }
  }, [activeTab, currentUser]);

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-center">Messenger</h1>
          
          {step === 'phone' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="phone">Номер телефона</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+7 999 123 45 67"
                />
              </div>
              <Button onClick={handleSendCode} className="w-full" disabled={isLoading}>
                {isLoading ? 'Отправка...' : 'Получить код'}
              </Button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Код из SMS</Label>
                <Input
                  id="code"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                />
                {devCode && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Код для разработки: {devCode}
                  </p>
                )}
              </div>
              <Button onClick={handleVerifyCode} className="w-full" disabled={isLoading}>
                {isLoading ? 'Проверка...' : 'Подтвердить'}
              </Button>
              <Button onClick={() => setStep('phone')} variant="outline" className="w-full">
                Назад
              </Button>
            </div>
          )}

          {step === 'profile' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="username">Username (необязательно)</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                />
              </div>
              <div>
                <Label htmlFor="fullname">Имя (необязательно)</Label>
                <Input
                  id="fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ваше имя"
                />
              </div>
              <Button onClick={handleRegister} className="w-full" disabled={isLoading}>
                {isLoading ? 'Загрузка...' : 'Продолжить'}
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white">
      <div className="w-80 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-semibold">Messenger</h1>
            <div className="flex gap-2">
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Icon name="Settings" size={20} />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Настройки</DialogTitle>
                    <DialogDescription>Управление вашим аккаунтом</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifications">Уведомления</Label>
                      <Switch id="notifications" defaultChecked />
                    </div>
                    <Separator />
                    <div>
                      <Label>Ваш профиль</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentUser.username ? `@${currentUser.username}` : currentUser.phone}
                      </p>
                    </div>
                    {currentUser.is_admin && (
                      <Badge variant="secondary">Администратор</Badge>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        localStorage.removeItem('user');
                        setCurrentUser(null);
                      }}
                    >
                      <Icon name="LogOut" size={16} className="mr-2" />
                      Выйти
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="relative">
            <Icon name="Search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск пользователей..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className={`w-full grid ${currentUser.is_admin ? 'grid-cols-3' : 'grid-cols-2'} rounded-none border-b`}>
            <TabsTrigger value="chats">Чаты</TabsTrigger>
            <TabsTrigger value="contacts">Контакты</TabsTrigger>
            {currentUser.is_admin && <TabsTrigger value="moderation">Модерация</TabsTrigger>}
          </TabsList>

          <TabsContent value="chats" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              {chats.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>Нет чатов</p>
                  <p className="text-xs mt-2">Найдите пользователя через поиск</p>
                </div>
              ) : (
                chats.map((chat) => (
                  <div
                    key={chat.chat_id}
                    onClick={() => setSelectedChat(chat)}
                    className={`p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                      selectedChat?.chat_id === chat.chat_id ? 'bg-accent' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={chat.avatar_url || ''} />
                          <AvatarFallback>{(chat.username || chat.full_name || 'U')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        {chat.is_online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{chat.username ? `@${chat.username}` : chat.full_name}</span>
                          <span className="text-xs text-muted-foreground">
                            {chat.last_message_time ? new Date(chat.last_message_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground truncate">{chat.last_message || 'Нет сообщений'}</p>
                      </div>
                      {chat.unread_count > 0 && (
                        <Badge className="bg-primary text-primary-foreground">{chat.unread_count}</Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contacts" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              {contacts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">
                  <p>Введите username в поиск</p>
                </div>
              ) : (
                contacts.map((contact) => (
                  <div 
                    key={contact.id} 
                    className="p-4 border-b border-border hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => startChat(contact)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar>
                          <AvatarImage src={contact.avatar_url || ''} />
                          <AvatarFallback>{(contact.username || contact.full_name || 'U')[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{contact.full_name || contact.username || contact.phone}</p>
                        <p className="text-xs text-muted-foreground">{contact.username ? `@${contact.username}` : contact.phone}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </TabsContent>

          {currentUser.is_admin && (
            <TabsContent value="moderation" className="flex-1 mt-0">
              <ScrollArea className="h-full">
                {reports.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <p>Нет жалоб</p>
                  </div>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="p-4 border-b border-border">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">@{report.reported_username}</span>
                          <Badge variant={report.status === 'pending' ? 'default' : 'secondary'}>
                            {report.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{report.reason}</p>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>От: @{report.reported_by_username}</span>
                          <span>{new Date(report.created_at).toLocaleDateString('ru-RU')}</span>
                        </div>
                        {report.status === 'pending' && (
                          <div className="flex gap-2 mt-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="flex-1"
                              onClick={() => api.resolveReport(currentUser.id, report.id, 'reviewed')}
                            >
                              Отклонить
                            </Button>
                            <Button 
                              size="sm" 
                              className="flex-1"
                              onClick={() => api.resolveReport(currentUser.id, report.id, 'resolved')}
                            >
                              Заблокировать
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </TabsContent>
          )}
        </Tabs>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="relative">
                <Avatar>
                  <AvatarImage src={selectedChat.avatar_url || ''} />
                  <AvatarFallback>{(selectedChat.username || selectedChat.full_name || 'U')[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                {selectedChat.is_online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">{selectedChat.username ? `@${selectedChat.username}` : selectedChat.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedChat.is_online ? 'онлайн' : 'не в сети'}
                </p>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender_id === currentUser.id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        message.sender_id === currentUser.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.message_text}</p>
                      <span className={`text-xs mt-1 block ${
                        message.sender_id === currentUser.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {new Date(message.sent_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Input
                  placeholder="Сообщение..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  className="flex-1"
                />
                <Button onClick={sendMessage} size="icon">
                  <Icon name="Send" size={20} />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Icon name="MessageCircle" size={64} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">Выберите чат для начала общения</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;