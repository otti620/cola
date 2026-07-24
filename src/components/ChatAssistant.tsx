import React, { useState, useRef, useEffect } from "react";
import { Send, X, Bot, User, Loader2, Sparkles, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  role: "user" | "model";
  text: string;
}

interface ChatAssistantProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatAssistant({ isOpen, onClose }: ChatAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", text: "Hello! I'm the Coca-Cola Inc. Investment Support AI. How can I assist you with your bottling packages, yield plans, or withdrawals today?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: userMessage }]);
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: userMessage,
          history: messages
            .filter((_, index) => index !== 0) // Skip the first message if it's the model greeting
            .map(m => ({
              role: m.role,
              parts: [{ text: m.text }]
            }))
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      
      const data = await response.json();
      setMessages((prev) => [...prev, { role: "model", text: data.text }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "model", text: "I'm sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-lg h-[600px] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
          >
            {/* Header */}
            <div className="bg-[#e41e2b] p-6 flex items-center justify-between text-white shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
                  <Bot size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight font-display">Coca-Cola Support</h3>
                  <div className="flex items-center text-white/80 text-xs font-medium">
                    <div className="w-2 h-2 bg-emerald-300 rounded-full mr-1.5 animate-pulse" />
                    Powered by Coca-Cola AI
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors duration-200 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: msg.role === "user" ? 10 : -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`flex max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 shadow-sm ${
                      msg.role === "user" ? "bg-slate-200 ml-3" : "bg-[#e41e2b]/10 mr-3"
                    }`}>
                      {msg.role === "user" ? <User size={16} className="text-slate-600" /> : <Bot size={16} className="text-[#e41e2b]" />}
                    </div>
                    <div className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "user" 
                        ? "bg-slate-800 text-white rounded-tr-none" 
                        : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                </motion.div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center space-x-2">
                    <Loader2 size={16} className="animate-spin text-[#e41e2b]" />
                    <span className="text-xs text-slate-500 font-medium">Assistant is thinking...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-6 bg-white border-t border-slate-100 flex items-center space-x-3">
              <div className="relative flex-1 group">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about bottling yield packages..."
                  className="w-full bg-slate-50 border-0 rounded-2xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-[#e41e2b]/20 transition-all duration-300 placeholder:text-slate-400 group-hover:bg-slate-100/80 outline-none"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex space-x-1">
                  <Sparkles size={16} className="text-[#e41e2b]/40" />
                </div>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className={`p-3 rounded-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
                  input.trim() && !loading
                    ? "bg-[#e41e2b] text-white shadow-lg shadow-red-900/20 hover:scale-105 active:scale-95"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                <Send size={20} />
              </button>
            </form>

            {/* Quick Tips */}
            <div className="px-6 pb-6 bg-white flex items-center space-x-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center">
                <HelpCircle size={10} className="mr-1" /> Suggestions:
              </div>
              <div className="flex space-x-2 overflow-x-auto no-scrollbar py-1">
                {["Bottling Packages", "Treasury Yields", "Referral Bonus"].map((tip) => (
                  <button
                    key={tip}
                    type="button"
                    onClick={() => setInput(tip)}
                    className="flex-shrink-0 bg-slate-50 border border-slate-200 text-slate-500 text-[10px] font-semibold px-2.5 py-1 rounded-full hover:bg-[#e41e2b]/5 hover:border-[#e41e2b]/20 hover:text-[#e41e2b] transition-all cursor-pointer"
                  >
                    {tip}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
