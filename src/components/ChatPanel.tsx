import React, { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { useShallow } from 'zustand/react/shallow';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, Eye, EyeOff } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
export function ChatPanel() {
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('public');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const {
    myPlayerId,
    myObserverId,
    players,
    observers,
    playerChat,
    publicChat,
    isPlayerChatVisible,
    sendMessage,
    togglePlayerChatVisibility,
  } = useGameStore(
    useShallow((s) => ({
      myPlayerId: s.myPlayerId,
      myObserverId: s.myObserverId,
      players: s.players,
      observers: s.observers,
      playerChat: s.playerChat,
      publicChat: s.publicChat,
      isPlayerChatVisible: s.isPlayerChatVisible,
      sendMessage: s.sendMessage,
      togglePlayerChatVisibility: s.togglePlayerChatVisibility,
    }))
  );
  const isPlayer = players.some(p => p.id === myPlayerId);
  const isObserver = observers.some(o => o.id === myObserverId);
  const canChat = isPlayer || isObserver;
  useEffect(() => {
    // This effect ensures the scroll area auto-scrolls to the bottom when new messages arrive.
    const scrollViewport = scrollAreaRef.current?.querySelector('div[data-radix-scroll-area-viewport]');
    if (scrollViewport) {
        setTimeout(() => {
            scrollViewport.scrollTop = scrollViewport.scrollHeight;
        }, 0);
    }
  }, [playerChat, publicChat, activeTab]);
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && canChat) {
      sendMessage(message, activeTab as 'player' | 'public');
      setMessage('');
    }
  };
  const getSenderColor = (senderId: string) => {
    const player = players.find(p => p.id === senderId);
    if (player) {
      return player.color === 'black' ? 'text-neon-magenta' : 'text-neon-cyan';
    }
    return 'text-neon-green'; // Observer color
  };
  const renderMessages = (messages: typeof playerChat) => {
    if (!messages || messages.length === 0) {
      return <div className="text-center text-gray-500 text-sm py-4">No messages yet.</div>;
    }
    return messages.map((msg, index) => (
      <div key={index} className="text-sm mb-2 leading-relaxed">
        <span className={cn('font-bold mr-2', getSenderColor(msg.senderId))}>
          {msg.senderName}:
        </span>
        <span className="text-gray-300 break-words">{msg.message}</span>
        <span className="text-xs text-gray-500 ml-2 whitespace-nowrap">
          {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
        </span>
      </div>
    ));
  };
  const getPlaceholderText = () => {
    if (isPlayer) return "Type message...";
    if (isObserver) return "Type public message...";
    return "Log in to chat";
  };
  return (
    <div className="w-full max-w-sm h-full flex flex-col bg-black/30 border border-neon-cyan/20 p-4 rounded-lg">
      <h3 className="font-pixel text-3xl text-glow-cyan text-center mb-4">COMMS-LINK</h3>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-grow flex flex-col">
        <TabsList className="grid w-full grid-cols-2 bg-gray-900/50">
          <TabsTrigger value="public" className="font-pixel text-lg">Public</TabsTrigger>
          <TabsTrigger value="player" className="font-pixel text-lg" disabled={!isPlayer}>Players</TabsTrigger>
        </TabsList>
        <ScrollArea className="flex-grow my-4 pr-3" ref={scrollAreaRef}>
          <TabsContent value="public">{renderMessages(publicChat)}</TabsContent>
          <TabsContent value="player">{isPlayer ? renderMessages(playerChat) : null}</TabsContent>
        </ScrollArea>
      </Tabs>
      {isPlayer && (
        <div className="flex items-center space-x-2 mb-4 p-2 border-t border-b border-neon-cyan/20">
          <Switch
            id="visibility-toggle"
            checked={isPlayerChatVisible}
            onCheckedChange={togglePlayerChatVisibility}
          />
          <Label htmlFor="visibility-toggle" className="flex items-center gap-2 text-sm text-gray-400">
            {isPlayerChatVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            Player Chat Visible to Observers
          </Label>
        </div>
      )}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <Input
          type="text"
          placeholder={getPlaceholderText()}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="bg-gray-900/50 border-neon-magenta text-neon-magenta focus:ring-neon-magenta"
          disabled={!canChat}
          maxLength={100}
        />
        <Button type="submit" className="retro-btn px-4" disabled={!canChat || !message.trim()}>
          <Send size={18} />
        </Button>
      </form>
    </div>
  );
}