import { useState } from "react";
import { Search, BotOff, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

export interface ChatContact {
  id: string;
  remoteJid: string;
  name: string;
  lastMessage?: string;
  lastMessageTimestamp?: number;
  unreadCount?: number;
}

interface ChatSidebarProps {
  contacts: ChatContact[];
  selectedJid: string | null;
  onSelectContact: (contact: ChatContact) => void;
  isLoading?: boolean;
  globalPaused?: boolean;
  onToggleGlobalPause?: () => void;
  isGlobalPauseLoading?: boolean;
}

export function ChatSidebar({
  contacts,
  selectedJid,
  onSelectContact,
  isLoading,
  globalPaused,
  onToggleGlobalPause,
  isGlobalPauseLoading,
}: ChatSidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = contacts.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.remoteJid.includes(search)
  );

  return (
    <div className="flex flex-col h-full border-r border-border bg-background">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
        {onToggleGlobalPause && (
          <Button
            variant={globalPaused ? "default" : "outline"}
            size="sm"
            className="w-full gap-1.5"
            onClick={onToggleGlobalPause}
            disabled={isGlobalPauseLoading}
          >
            <BotOff className="h-4 w-4" />
            {globalPaused ? "Retomar Todos" : "Pausar Todos"}
          </Button>
        )}
      </div>

      {/* Contact list */}
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            {search ? "Nenhuma conversa encontrada" : "Nenhuma conversa"}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((contact) => (
              <button
                key={contact.remoteJid}
                onClick={() => onSelectContact(contact)}
                className={`w-full text-left p-3 hover:bg-muted/50 transition-colors ${
                  selectedJid === contact.remoteJid ? "bg-muted" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {contact.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{contact.name}</span>
                      {(contact.unreadCount ?? 0) > 0 && (
                        <Badge variant="default" className="ml-1 h-5 min-w-[20px] text-xs">
                          {contact.unreadCount}
                        </Badge>
                      )}
                    </div>
                    {contact.lastMessage && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {contact.lastMessage}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
