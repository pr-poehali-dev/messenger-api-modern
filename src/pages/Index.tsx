import { useState } from 'react';
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

type Message = {
  id: number;
  text: string;
  sender: 'me' | 'other';
  timestamp: string;
};

type Chat = {
  id: number;
  username: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  avatar: string;
  online: boolean;
};

type Contact = {
  id: number;
  username: string;
  name: string;
  avatar: string;
  online: boolean;
};

type Report = {
  id: number;
  reportedUser: string;
  reportedBy: string;
  reason: string;
  timestamp: string;
  status: 'pending' | 'reviewed' | 'resolved';
};

const Index = () => {
  const [currentUser] = useState({ username: 'user123', isAdmin: false });
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('chats');

  const [chats] = useState<Chat[]>([
    {
      id: 1,
      username: 'alexdev',
      lastMessage: 'Привет! Как дела?',
      timestamp: '14:23',
      unread: 2,
      avatar: '',
      online: true,
    },
    {
      id: 2,
      username: 'maria_design',
      lastMessage: 'Отправила макеты',
      timestamp: '13:45',
      unread: 0,
      avatar: '',
      online: false,
    },
    {
      id: 3,
      username: 'support_bot',
      lastMessage: 'Добро пожаловать! Если нужна помощь, напишите.',
      timestamp: 'вчера',
      unread: 0,
      avatar: '',
      online: true,
    },
  ]);

  const [contacts] = useState<Contact[]>([
    { id: 1, username: 'alexdev', name: 'Алексей', avatar: '', online: true },
    { id: 2, username: 'maria_design', name: 'Мария', avatar: '', online: false },
    { id: 3, username: 'john_smith', name: 'Джон', avatar: '', online: true },
  ]);

  const [reports] = useState<Report[]>([
    {
      id: 1,
      reportedUser: 'spammer123',
      reportedBy: 'user456',
      reason: 'Спам в личных сообщениях',
      timestamp: '2 часа назад',
      status: 'pending',
    },
    {
      id: 2,
      reportedUser: 'baduser',
      reportedBy: 'user789',
      reason: 'Оскорбительные сообщения',
      timestamp: '5 часов назад',
      status: 'reviewed',
    },
  ]);

  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: 'Привет!', sender: 'other', timestamp: '14:20' },
    { id: 2, text: 'Как дела?', sender: 'other', timestamp: '14:23' },
  ]);

  const sendMessage = () => {
    if (messageInput.trim() && selectedChat) {
      const newMessage: Message = {
        id: messages.length + 1,
        text: messageInput,
        sender: 'me',
        timestamp: new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setMessageInput('');
    }
  };

  const filteredChats = chats.filter((chat) =>
    chat.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredContacts = contacts.filter((contact) =>
    contact.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                    <div className="flex items-center justify-between">
                      <Label htmlFor="online">Статус онлайн</Label>
                      <Switch id="online" defaultChecked />
                    </div>
                    <Separator />
                    <div>
                      <Label>Ваш username</Label>
                      <p className="text-sm text-muted-foreground mt-1">@{currentUser.username}</p>
                    </div>
                    <Button variant="outline" className="w-full">
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
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-2 rounded-none border-b">
            <TabsTrigger value="chats">Чаты</TabsTrigger>
            <TabsTrigger value="contacts">Контакты</TabsTrigger>
          </TabsList>

          <TabsContent value="chats" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b border-border cursor-pointer hover:bg-accent transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={chat.avatar} />
                        <AvatarFallback>{chat.username[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
                      {chat.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">@{chat.username}</span>
                        <span className="text-xs text-muted-foreground">{chat.timestamp}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{chat.lastMessage}</p>
                    </div>
                    {chat.unread > 0 && (
                      <Badge className="bg-primary text-primary-foreground">{chat.unread}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="contacts" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              {filteredContacts.map((contact) => (
                <div key={contact.id} className="p-4 border-b border-border hover:bg-accent transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar>
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback>{contact.name[0]}</AvatarFallback>
                      </Avatar>
                      {contact.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{contact.name}</p>
                      <p className="text-xs text-muted-foreground">@{contact.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="relative">
                <Avatar>
                  <AvatarImage src={selectedChat.avatar} />
                  <AvatarFallback>{selectedChat.username[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                {selectedChat.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">@{selectedChat.username}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedChat.online ? 'онлайн' : 'не в сети'}
                </p>
              </div>
              <Button variant="ghost" size="icon">
                <Icon name="MoreVertical" size={20} />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                        message.sender === 'me'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <span className={`text-xs mt-1 block ${
                        message.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="p-4 border-t border-border">
              <div className="flex gap-2">
                <Button variant="ghost" size="icon">
                  <Icon name="Paperclip" size={20} />
                </Button>
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