"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { Card, Button, TextInput } from "@/components/ui";
import { sendAssistantChat, type ServiqAssistantChatResponse } from "@/lib/api";
import { type MessageKey } from "@/lib/i18n";
import { Sparkles, Mic, Send, Bot, User, Zap } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  action_suggested?: string | null;
}

export function AssistantTab({
  workOrderId,
  t,
}: {
  workOrderId: string;
  t: (key: MessageKey) => string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      text: "Merhaba! Bu iş emriyle ilgili size nasıl yardımcı olabilirim? İş özetini çıkarabilir, geçmişi kontrol edebilir veya SMS gönderebilirim."
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickActions = [
    "İş Emrini Özetle",
    "Geçmişi Göster",
    "Müşteriye SMS at"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const response = await sendAssistantChat(workOrderId, text);
      
      // Simulate slight delay for realistic AI feel
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          text: response.reply,
          action_suggested: response.action_suggested
        }]);
        setIsTyping(false);
      }, 600);
      
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: "Sistemle bağlantı kurulamadı, lütfen tekrar deneyin."
      }]);
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSend(input);
    }
  };

  const handleMicClick = () => {
    // Demo behavior: Auto-fill the input with a voice-like command
    setInput("Bu cihazın geçmiş arızaları neler?");
  };

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <Sparkles size={20} color="#0f172a" />
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
          Saha Asistanı
        </h3>
      </div>
      
      {/* Quick Actions */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
        {quickActions.map(action => (
          <button
            key={action}
            onClick={() => handleSend(action)}
            disabled={isTyping}
            style={{
              padding: "6px 12px",
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              color: "#1d4ed8",
              borderRadius: 16,
              fontSize: 13,
              fontWeight: 500,
              cursor: isTyping ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 4
            }}
          >
            <Zap size={14} />
            {action}
          </button>
        ))}
      </div>

      {/* Chat Area */}
      <div style={{ 
        height: 350, 
        overflowY: "auto", 
        background: "#f8fafc", 
        borderRadius: 8,
        border: "1px solid #e2e8f0",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        marginBottom: 16
      }}>
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            style={{ 
              display: "flex", 
              gap: 12, 
              alignItems: "flex-start",
              flexDirection: msg.role === "user" ? "row-reverse" : "row"
            }}
          >
            <div style={{ 
              width: 32, 
              height: 32, 
              borderRadius: "50%", 
              background: msg.role === "user" ? "#3b82f6" : "#10b981", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              flexShrink: 0
            }}>
              {msg.role === "user" ? <User size={18} color="#fff" /> : <Bot size={18} color="#fff" />}
            </div>
            <div style={{
              background: msg.role === "user" ? "#3b82f6" : "#ffffff",
              color: msg.role === "user" ? "#ffffff" : "#1e293b",
              border: msg.role === "user" ? "none" : "1px solid #e2e8f0",
              padding: "10px 14px",
              borderRadius: 12,
              borderTopRightRadius: msg.role === "user" ? 0 : 12,
              borderTopLeftRadius: msg.role === "assistant" ? 0 : 12,
              maxWidth: "85%",
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap"
            }}>
              {msg.text}
              {msg.action_suggested && (
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => handleSend(msg.action_suggested!)}
                    style={{
                      background: "#eff6ff",
                      border: "1px solid #bfdbfe",
                      color: "#1d4ed8",
                      padding: "4px 10px",
                      borderRadius: 4,
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer"
                    }}
                  >
                    👉 {msg.action_suggested}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isTyping && (
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Bot size={18} color="#fff" />
            </div>
            <div style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", display: "flex", gap: 4 }}>
              <span>Yazıyor</span>
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={handleMicClick}
          title="Sesli Komut (Demo)"
          style={{
            background: "#f1f5f9",
            border: "1px solid #cbd5e1",
            borderRadius: "50%",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            flexShrink: 0,
            color: "#64748b",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#ef4444")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
        >
          <Mic size={20} />
        </button>
        <TextInput
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Soru sorun veya sesli komut verin..."
          disabled={isTyping}
          style={{ flex: 1, height: 44 }}
        />
        <Button 
          variant="primary" 
          onClick={() => handleSend(input)}
          disabled={!input.trim() || isTyping}
          style={{ height: 44, padding: "0 16px" }}
        >
          <Send size={18} />
        </Button>
      </div>
    </Card>
  );
}
