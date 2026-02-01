"use client";

import { useState, useRef, useEffect } from "react";
import { sendChatMessage } from "@/app/actions/AI/geminiService";
import { ChatMessage, FileData } from "@/lib/types/awn";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatProps {
  file?: FileData | null;
}

export default function Chat({ file }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: 'أهلاً بك في "عَون". كيف يمكنني مساعدتك في دراستك اليوم؟',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({ role: m.role, text: m.text }));
      const responseText = await sendChatMessage(
        history,
        userMsg.text,
        file?.base64
      );

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "model",
        text: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-xl border border-beige-200 overflow-hidden">
      {/* Header */}
      <div className="bg-beige-100 p-4 border-b border-beige-200 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="font-bold text-beige-900">المساعد الذكي</span>
        </div>
        {file && (
          <span className="text-xs bg-gold-500 text-white px-2 py-1 rounded-full">
            ملف مرفق: {file.name.substring(0, 15)}...
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FDFCF5]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${
              msg.role === "user" ? "flex-row-reverse" : "flex-row"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-beige-900 text-white"
                  : "bg-gold-500 text-white"
              }`}
            >
              {msg.role === "user" ? (
                <User className="w-5 h-5" />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>

            <div
              className={`max-w-[80%] p-4 rounded-2xl ${
                msg.role === "user"
                  ? "bg-beige-900 text-white rounded-tl-none"
                  : "bg-white border border-beige-200 text-beige-900 rounded-tr-none shadow-sm"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed text-sm">
                {msg.text}
              </p>
              <span
                className={`text-[10px] block mt-2 opacity-70 ${
                  msg.role === "user" ? "text-beige-200" : "text-beige-500"
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-gold-500 text-white flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white border border-beige-200 p-4 rounded-2xl rounded-tr-none shadow-sm">
              <Loader2 className="w-5 h-5 animate-spin text-gold-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-white border-t border-beige-200">
        <div className="flex gap-2 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب رسالتك هنا..."
            className="flex-1 p-3 pl-12 rounded-xl bg-beige-50 border border-beige-200 focus:outline-none focus:ring-2 focus:ring-gold-500 text-beige-900 placeholder-beige-400"
          />
          <Button
            type="submit"
            size="icon"
            disabled={isLoading || !input.trim()}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-beige-900 text-white rounded-lg hover:bg-beige-800"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}


