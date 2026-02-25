import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCompanyId } from "@/hooks/useCompanyId";
import { useToast } from "@/hooks/use-toast";
import { ChatSidebar, ChatContact } from "@/components/whatsapp-chat/ChatSidebar";
import { ChatMessages, ChatMessage } from "@/components/whatsapp-chat/ChatMessages";
import { ChatInput } from "@/components/whatsapp-chat/ChatInput";
import { AgentControlBar } from "@/components/whatsapp-chat/AgentControlBar";
import { MessageSquare } from "lucide-react";

function extractPhoneFromJid(jid: string) {
  return jid.replace(/@.*$/, "");
}

export default function WhatsAppChat() {
  const { companyId, isLoadingCompany } = useCompanyId();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);

  // Fetch active WhatsApp session
  const { data: session } = useQuery({
    queryKey: ["whatsapp-session", companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_config" as any)
        .select("*")
        .eq("company_id", companyId!)
        .eq("config_type", "session")
        .eq("is_active", true)
        .limit(1)
        .single();
      return data as any;
    },
    enabled: !!companyId,
  });

  const instanceName = session?.session_name;

  // Fetch chats
  const { data: contacts = [], isLoading: isLoadingChats } = useQuery({
    queryKey: ["whatsapp-chats", instanceName],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-chat", {
        body: { action: "findChats", instanceName },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar conversas");

      const chats = Array.isArray(data.data) ? data.data : [];
      return chats
        .filter((c: any) => {
          const jid = c.id || c.remoteJid || "";
          return jid.endsWith("@s.whatsapp.net") || jid.endsWith("@lid");
        })
        .filter((c: any) => {
          const jid = c.id || c.remoteJid || "";
          return jid !== "status@broadcast" && jid !== "0@s.whatsapp.net";
        })
        .map((c: any) => ({
          id: c.id,
          remoteJid: c.id,
          name: c.name || c.pushName || extractPhoneFromJid(c.id),
          lastMessage: c.lastMessage?.message?.conversation ||
            c.lastMessage?.message?.extendedTextMessage?.text || "",
          lastMessageTimestamp: c.lastMessage?.messageTimestamp || 0,
          unreadCount: c.unreadCount || 0,
        }))
        .sort((a: ChatContact, b: ChatContact) =>
          (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0)
        ) as ChatContact[];
    },
    enabled: !!instanceName,
    refetchInterval: 30000,
  });

  // Fetch messages for selected contact
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ["whatsapp-messages", instanceName, selectedContact?.remoteJid],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-chat", {
        body: {
          action: "findMessages",
          instanceName,
          remoteJid: selectedContact!.remoteJid,
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao buscar mensagens");

      const msgs = Array.isArray(data.data) ? data.data : [];
      return msgs
        .map((m: any) => ({
          id: m.key?.id || String(m.messageTimestamp),
          text:
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            "[mídia]",
          fromMe: m.key?.fromMe || false,
          timestamp: m.messageTimestamp || 0,
          senderName: m.pushName,
        }))
        .sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp) as ChatMessage[];
    },
    enabled: !!instanceName && !!selectedContact,
  });

  // Send message
  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const phone = extractPhoneFromJid(selectedContact!.remoteJid);
      const { data, error } = await supabase.functions.invoke("whatsapp-chat", {
        body: { action: "sendText", instanceName, number: phone, message: text },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || "Erro ao enviar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", instanceName, selectedContact?.remoteJid] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-chats", instanceName] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao enviar mensagem", description: err.message, variant: "destructive" });
    },
  });

  // Agent control
  const { data: agentControl } = useQuery({
    queryKey: ["agent-control", companyId, instanceName, selectedContact?.remoteJid],
    queryFn: async () => {
      const phone = selectedContact ? extractPhoneFromJid(selectedContact.remoteJid) : null;
      const { data } = await supabase
        .from("whatsapp_agent_control" as any)
        .select("*")
        .eq("company_id", companyId!)
        .eq("session_name", instanceName!)
        .or(phone ? `phone.eq.${phone},phone.is.null` : "phone.is.null");
      return data as any[];
    },
    enabled: !!companyId && !!instanceName,
  });

  const isContactPaused = agentControl?.some(
    (r: any) =>
      r.phone === extractPhoneFromJid(selectedContact?.remoteJid || "") && r.is_paused
  ) ?? false;

  const isGlobalPaused = agentControl?.some(
    (r: any) => r.phone === null && r.is_paused
  ) ?? false;

  const toggleAgentMutation = useMutation({
    mutationFn: async ({ phone, pause }: { phone: string | null; pause: boolean }) => {
      const { data: { user } } = await supabase.auth.getUser();
      // Try to find existing record
      let query = supabase
        .from("whatsapp_agent_control" as any)
        .select("id")
        .eq("company_id", companyId!)
        .eq("session_name", instanceName!);
      
      if (phone) {
        query = query.eq("phone", phone);
      } else {
        query = query.is("phone", null);
      }

      const { data: existing } = await query.single();

      if (existing) {
        await (supabase.from("whatsapp_agent_control" as any) as any)
          .update({
            is_paused: pause,
            paused_at: pause ? new Date().toISOString() : null,
            paused_by: pause ? user?.id : null,
          })
          .eq("id", (existing as any).id);
      } else {
        await (supabase.from("whatsapp_agent_control" as any) as any)
          .insert({
            company_id: companyId,
            session_name: instanceName,
            phone,
            is_paused: pause,
            paused_at: pause ? new Date().toISOString() : null,
            paused_by: pause ? user?.id : null,
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agent-control"] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao alterar agente", description: err.message, variant: "destructive" });
    },
  });

  // Realtime subscription to msg_history
  useEffect(() => {
    if (!companyId) return;

    const channel = supabase
      .channel("msg_history_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "msg_history",
          filter: `company_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["whatsapp-messages"] });
          queryClient.invalidateQueries({ queryKey: ["whatsapp-chats"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, queryClient]);

  if (isLoadingCompany) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] text-muted-foreground gap-3">
        <MessageSquare className="h-12 w-12" />
        <p className="text-lg font-medium">Nenhuma sessão WhatsApp conectada</p>
        <p className="text-sm">Configure uma sessão em WhatsApp → Configurações</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Sidebar */}
      <div className="w-[320px] min-w-[280px] max-w-[380px] shrink-0">
        <ChatSidebar
          contacts={contacts}
          selectedJid={selectedContact?.remoteJid ?? null}
          onSelectContact={setSelectedContact}
          isLoading={isLoadingChats}
          globalPaused={isGlobalPaused}
          onToggleGlobalPause={() =>
            toggleAgentMutation.mutate({ phone: null, pause: !isGlobalPaused })
          }
          isGlobalPauseLoading={toggleAgentMutation.isPending}
        />
      </div>

      {/* Messages area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selectedContact ? (
          <>
            <AgentControlBar
              contactName={selectedContact.name}
              isPaused={isContactPaused}
              isLoading={toggleAgentMutation.isPending}
              onToggle={() =>
                toggleAgentMutation.mutate({
                  phone: extractPhoneFromJid(selectedContact.remoteJid),
                  pause: !isContactPaused,
                })
              }
            />
            <ChatMessages messages={messages} isLoading={isLoadingMessages} />
            <ChatInput
              onSend={(text) => sendMutation.mutate(text)}
              disabled={sendMutation.isPending}
            />
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-2">
            <MessageSquare className="h-10 w-10" />
            <p className="text-sm">Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}
