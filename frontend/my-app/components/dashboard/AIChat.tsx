"use client";

import React, { useState, useRef, useEffect } from "react";
import type { RiskTile, SpeciesAlert } from "@/types";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AIChat {
  isOpen: boolean;
  sessionId?: string;
  messages: Message[];
  isLoading: boolean;
  error?: string;
}

export interface AIChatProps {
  tiles?: RiskTile[];
  species?: SpeciesAlert[];
  onClose?: () => void;
}

export default function AIChat({ tiles = [], species = [], onClose }: AIChatProps) {
  const [chat, setChat] = useState<AIChat>({
    isOpen: true,
    sessionId: undefined,
    messages: [],
    isLoading: false,
  });

  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session on mount
  useEffect(() => {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setChat((prev) => ({ ...prev, sessionId }));

    // Auto-scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !chat.sessionId) return;

    // Add user message to chat
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setChat((prev) => ({
      ...prev,
      messages: [...prev.messages, userMessage],
    }));

    setInputValue("");
    setChat((prev) => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/chat/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: inputValue,
            session_id: chat.sessionId,
            tiles: tiles.slice(0, 5), // Send top 5 risk tiles
            species: species.slice(0, 5), // Send top 5 species
          }),
        }
      );

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();

      const assistantMessage: Message = {
        id: `msg-${Date.now()}-ai`,
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      };

      setChat((prev) => ({
        ...prev,
        messages: [...prev.messages, assistantMessage],
        isLoading: false,
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error occurred";
      setChat((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMsg,
      }));
    }

    inputRef.current?.focus();
  };

  const clearSession = async () => {
    if (!chat.sessionId) return;

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"}/chat/session/${chat.sessionId}`,
        { method: "DELETE" }
      );
    } catch (error) {
      console.error("Failed to clear session:", error);
    }

    setChat({
      isOpen: true,
      sessionId: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      messages: [],
      isLoading: false,
    });
  };

  if (!chat.isOpen) return null;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-slate-900/50 to-slate-800/30 rounded-xl border border-emerald-400/20 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-emerald-400/20 bg-slate-900/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h3 className="text-sm font-bold tracking-widest text-emerald-400">CASCADE AI ASSISTANT</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={clearSession}
              className="text-xs px-2 py-1 rounded border border-slate-400/30 text-slate-300 hover:bg-slate-400/10 transition-colors"
              title="Clear conversation"
            >
              NEW
            </button>
            <button
              onClick={onClose}
              className="text-xs px-2 py-1 rounded border border-slate-400/30 text-slate-300 hover:bg-slate-400/10 transition-colors"
              title="Close chat"
            >
              ✕
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-400 mt-1">Flood forecasting • Species conservation • Real-time intelligence</p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin scrollbar-thumb-emerald-400/20 scrollbar-track-slate-900/20">
        {chat.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <div className="text-emerald-400/60 text-sm mb-2">Welcome to CascadeAI</div>
              <p className="text-xs text-slate-400 max-w-xs">
                Ask me about flood risks, species vulnerabilities, or conservation strategies for the Sundarbans delta.
              </p>
            </div>
          </div>
        ) : (
          <>
            {chat.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-emerald-400/20 border border-emerald-400/40 text-white"
                      : "bg-slate-800/60 border border-slate-700/40 text-slate-100"
                  }`}
                >
                  <p className="text-[12px] font-mono text-white/40 mb-1">
                    {msg.role === "user" ? "YOU" : "CASCADE"}
                  </p>
                  <p>{msg.content}</p>
                </div>
              </div>
            ))}
            {chat.isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800/60 border border-slate-700/40 px-3 py-2 rounded-lg">
                  <div className="flex gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
            {chat.error && (
              <div className="flex justify-center">
                <div className="bg-red-500/20 border border-red-400/40 px-3 py-2 rounded-lg text-red-300 text-xs">
                  Error: {chat.error}
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t border-emerald-400/20 bg-slate-900/40">
        <form onSubmit={sendMessage} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about flood risk, species, or conservation..."
            disabled={chat.isLoading}
            className="flex-1 bg-slate-900/60 border border-emerald-400/30 rounded px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/20 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={chat.isLoading || !inputValue.trim()}
            className="px-3 py-2 bg-emerald-400/20 border border-emerald-400/40 rounded text-xs font-bold text-emerald-400 hover:bg-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {chat.isLoading ? "..." : "SEND"}
          </button>
        </form>
      </div>
    </div>
  );
}
