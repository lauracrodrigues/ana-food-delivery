import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export interface ChatMessage {
  id: string;
  text: string;
  fromMe: boolean;
  timestamp: number;
  senderName?: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export function ChatMessages({ messages, isLoading }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Nenhuma mensagem encontrada
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4">
      <div className="space-y-2 max-w-3xl mx-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[75%] rounded-xl px-3 py-2 text-sm break-words ${
                msg.fromMe
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted rounded-bl-sm"
              }`}
            >
              {msg.senderName && !msg.fromMe && (
                <p className="text-xs font-medium text-primary mb-1">{msg.senderName}</p>
              )}
              <p className="whitespace-pre-wrap">{msg.text}</p>
              <p
                className={`text-[10px] mt-1 text-right ${
                  msg.fromMe ? "text-primary-foreground/70" : "text-muted-foreground"
                }`}
              >
                {format(new Date(msg.timestamp * 1000), "HH:mm")}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  );
}
