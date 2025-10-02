import React from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GamePanel } from '@/components/GamePanel';
import { ChatPanel } from '@/components/ChatPanel';
import { Gamepad2, MessageSquare } from 'lucide-react';
export function MobileGameDrawer() {
  return (
    <Drawer>
      <DrawerTrigger asChild>
        <Button className="retro-btn fixed bottom-4 right-4 z-50 lg:hidden animate-fade-in">
          Controls & Chat
        </Button>
      </DrawerTrigger>
      <DrawerContent className="bg-black/80 backdrop-blur-sm border-t-2 border-neon-cyan/50 text-white font-pixel h-[85vh]">
        <div className="p-4 h-full flex flex-col">
          <DrawerHeader className="text-center p-2">
            <DrawerTitle className="text-3xl text-glow-cyan">GAME MENU</DrawerTitle>
          </DrawerHeader>
          <Tabs defaultValue="controls" className="w-full flex-grow flex flex-col">
            <TabsList className="grid w-full grid-cols-2 bg-gray-900/50">
              <TabsTrigger value="controls" className="font-pixel text-lg flex items-center gap-2">
                <Gamepad2 size={18} /> Controls
              </TabsTrigger>
              <TabsTrigger value="chat" className="font-pixel text-lg flex items-center gap-2">
                <MessageSquare size={18} /> Chat
              </TabsTrigger>
            </TabsList>
            <TabsContent value="controls" className="flex-grow mt-4 overflow-y-auto">
              <div className="flex justify-center">
                <GamePanel />
              </div>
            </TabsContent>
            <TabsContent value="chat" className="flex-grow mt-4 overflow-y-auto">
              <div className="flex justify-center h-full">
                <ChatPanel />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}