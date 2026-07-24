import React, { useState } from "react";
import { MessageSquareText } from "lucide-react";
import { motion } from "motion/react";
import ChatAssistant from "./ChatAssistant";

export default function ChatFAB() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-28 right-6 z-40 bg-[#e41e2b] text-white p-4 rounded-full shadow-2xl flex items-center justify-center group cursor-pointer"
      >
        <MessageSquareText size={28} />
        <span className="absolute right-full mr-3 bg-slate-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-xl border border-slate-700">
          Help & Support
        </span>
      </motion.button>

      <ChatAssistant 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
