"use client";

import React from "react";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useGameState } from "@/hooks/use-game-state";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const { gameState, setGameState } = useGameState();
  
  if (!gameState) return null;

  const unreadCount = gameState.notifications.filter(n => !n.read).length;

  const markAsRead = () => {
    setGameState(prev => {
        if (!prev) return null;
        return {
            ...prev,
            notifications: prev.notifications.map(n => ({ ...n, read: true }))
        }
    });
  };

  return (
    <Popover onOpenChange={(open) => { if(open) markAsRead()}}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-6 w-6" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-foreground text-xs">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <div className="p-4">
          <h4 className="font-medium leading-none">Notifications</h4>
        </div>
        <ScrollArea className="h-80">
          <div className="p-4 pt-0">
            {gameState.notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No notifications yet.</p>
            ) : (
                [...gameState.notifications].reverse().map((notification, index) => (
                    <React.Fragment key={notification.id}>
                        <div>
                            <p className="text-sm font-medium">{notification.message}</p>
                            <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                            </p>
                        </div>
                        {index < gameState.notifications.length -1 && <Separator className="my-2" />}
                    </React.Fragment>
                ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
