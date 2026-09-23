'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { aiService } from '@/services/ai.service';
import { ChatMessage } from '@/types/ai.types';
import Link from 'next/link';

const INITIAL_GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  content: "Bonjour ! Je suis l'assistant de voyage Yuding. Que vous cherchiez des idées de destinations, des conseils culturels ou un itinéraire sur mesure, je suis là pour vous aider !\n\n*Note : Pour consulter les tarifs en temps réel et réserver, utilisez la recherche en direct sur le site.*",
  timestamp: new Date(),
};

const SUGGESTIONS = [
  "Conseils pour visiter Rome en 3 jours",
  "Idées d'escapade nature en France",
  "Meilleure période pour voyager au Japon",
  "Que faire à Marrakech en famille ?",
];

export const AiChatWidget: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_GREETING]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Initialize unique conversation ID on client mount
  useEffect(() => {
    if (!conversationId) {
      const newId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : 'conv-' + Math.random().toString(36).substring(2, 15);
      setConversationId(newId);
    }
  }, [conversationId]);

  // Auto-scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, scrollToBottom]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, isAuthenticated]);

  const handleStartNewConversation = () => {
    const newId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'conv-' + Math.random().toString(36).substring(2, 15);
    setConversationId(newId);
    setMessages([INITIAL_GREETING]);
    setErrorMessage(null);
    setInputValue('');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || isLoading) return;

    if (!isAuthenticated) {
      setErrorMessage("Veuillez vous connecter pour utiliser l'assistant de voyage.");
      return;
    }

    if (text.length > 8000) {
      setErrorMessage("Votre message dépasse la limite maximale de 8000 caractères.");
      return;
    }

    const userMessageId = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : 'msg-' + Date.now();

    const userMsg: ChatMessage = {
      id: userMessageId,
      role: 'user',
      content: text,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const response = await aiService.sendMessage({
        conversationId: conversationId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'conv-temp'),
        message: text,
      });

      const assistantMsg: ChatMessage = {
        id: response.messageId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : 'resp-' + Date.now()),
        role: 'assistant',
        content: response.content,
        timestamp: new Date(response.createdAt || Date.now()),
        status: 'delivered',
      };

      setMessages((prev) =>
        prev.map((m) => (m.id === userMessageId ? { ...m, status: 'delivered' as const } : m)).concat(assistantMsg)
      );
    } catch (err: any) {
      const errorText =
        err?.status === 429
          ? "L'assistant reçoit actuellement trop de demandes. Veuillez patienter quelques instants avant de réessayer."
          : err?.status === 503 || err?.status === 502
          ? "Le service d'assistance IA est temporairement indisponible. Veuillez réessayer dans un instant."
          : err?.message || "Une erreur est survenue lors de l'envoi du message.";

      setErrorMessage(errorText);
      setMessages((prev) =>
        prev.map((m) => (m.id === userMessageId ? { ...m, status: 'error' as const, errorMessage: errorText } : m))
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Safe formatting for assistant markdown text (bold, lists, paragraphs)
  const renderMessageContent = (content: string) => {
    const paragraphs = content.split('\n\n');
    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {paragraphs.map((para, pIdx) => {
          const lines = para.split('\n');
          return (
            <div key={pIdx} className="space-y-1">
              {lines.map((line, lIdx) => {
                const trimmed = line.trim();
                // Bullet item
                if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
                  const bulletText = trimmed.replace(/^(\*|-|•)\s+/, '');
                  return (
                    <div key={lIdx} className="flex items-start gap-2 ml-1">
                      <span className="text-[#087d70] dark:text-[#21bcae] mt-1 text-xs">•</span>
                      <span>{renderInlineFormatting(bulletText)}</span>
                    </div>
                  );
                }
                // Numbered list item
                const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
                if (numMatch) {
                  return (
                    <div key={lIdx} className="flex items-start gap-2 ml-1">
                      <span className="font-semibold text-[#087d70] dark:text-[#21bcae] text-xs mt-0.5">{numMatch[1]}.</span>
                      <span>{renderInlineFormatting(numMatch[2])}</span>
                    </div>
                  );
                }
                return (
                  <p key={lIdx} className="break-words">
                    {renderInlineFormatting(line)}
                  </p>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  // Basic inline bold and italic parsing
  const renderInlineFormatting = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-semibold">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={index} className="italic">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-r from-[#087d70] to-[#0ba392] text-white shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[#087d70]/30"
          aria-label="Ouvrir l'assistant IA Yuding"
        >
          <i className="fa-solid fa-robot text-2xl transition-transform duration-300 group-hover:rotate-12" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#22c7b8] opacity-75" />
            <span className="relative inline-flex rounded-full h-4 w-4 bg-[#22c7b8] border-2 border-white dark:border-[#151c1b]" />
          </span>
          {/* Tooltip on hover */}
          <span className="absolute right-16 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[#021b19] text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap shadow-md">
            Assistant Voyage Yuding
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="flex flex-col w-[380px] sm:w-[420px] h-[580px] max-h-[85vh] bg-white dark:bg-[#151c1b] rounded-2xl shadow-2xl border border-gray-200 dark:border-[#2d3937] overflow-hidden transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
          role="dialog"
          aria-labelledby="ai-chat-header-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-[#087d70] to-[#0ba392] text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm">
                <i className="fa-solid fa-robot text-lg text-white" />
              </div>
              <div>
                <h2 id="ai-chat-header-title" className="font-semibold text-sm leading-tight">
                  Assistant Yuding
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-white/80">
                  <span className="w-2 h-2 rounded-full bg-[#22c7b8] inline-block animate-pulse" />
                  <span>IA Voyage V2</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleStartNewConversation}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors text-xs flex items-center gap-1"
                title="Nouvelle conversation"
                aria-label="Nouvelle conversation"
              >
                <i className="fa-solid fa-arrows-rotate text-sm" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="Fermer"
                aria-label="Fermer l'assistant"
              >
                <i className="fa-solid fa-xmark text-lg" />
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f5f8fa] dark:bg-[#0d1110]">
            {messages.map((message) => {
              const isUser = message.role === 'user';
              return (
                <div
                  key={message.id}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in duration-200`}
                >
                  <div className={`flex gap-2 max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Role avatar */}
                    {!isUser && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#087d70]/10 dark:bg-[#21bcae]/20 text-[#087d70] dark:text-[#21bcae] flex items-center justify-center text-xs mt-1">
                        <i className="fa-solid fa-robot" />
                      </div>
                    )}

                    <div>
                      {/* Bubble */}
                      <div
                        className={`p-3.5 rounded-2xl ${
                          isUser
                            ? 'bg-[#087d70] text-white rounded-br-sm'
                            : 'bg-white dark:bg-[#1b2422] text-[#102220] dark:text-[#edf5f3] border border-gray-100 dark:border-[#2d3937] rounded-bl-sm shadow-sm'
                        }`}
                      >
                        {isUser ? (
                          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                        ) : (
                          renderMessageContent(message.content)
                        )}
                      </div>

                      {/* Error or delivery status */}
                      {message.status === 'error' && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <i className="fa-solid fa-circle-exclamation" />
                          <span>Échec de l&apos;envoi</span>
                        </p>
                      )}

                      {/* Timestamp */}
                      <p className={`text-[10px] text-gray-400 dark:text-gray-500 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Suggestions Chips (shown when conversation is fresh) */}
            {messages.length === 1 && (
              <div className="pt-2 space-y-1.5">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Suggestions :</p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(suggestion)}
                      disabled={isLoading || !isAuthenticated}
                      className="text-left text-xs px-3 py-2 bg-white dark:bg-[#1b2422] hover:bg-[#087d70]/5 dark:hover:bg-[#21bcae]/10 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-[#2d3937] rounded-xl transition-colors disabled:opacity-50"
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading / Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex gap-2 max-w-[85%]">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-[#087d70]/10 dark:bg-[#21bcae]/20 text-[#087d70] dark:text-[#21bcae] flex items-center justify-center text-xs mt-1">
                    <i className="fa-solid fa-robot" />
                  </div>
                  <div className="p-3 bg-white dark:bg-[#1b2422] border border-gray-100 dark:border-[#2d3937] rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#087d70] dark:bg-[#21bcae] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#087d70] dark:bg-[#21bcae] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[#087d70] dark:bg-[#21bcae] animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-gray-400 ml-1.5">Recherche en cours...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Global Error Banner */}
            {errorMessage && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <i className="fa-solid fa-triangle-exclamation mt-0.5 text-red-500" />
                <div className="flex-1">
                  <span>{errorMessage}</span>
                </div>
              </div>
            )}

            {/* Unauthenticated User Warning */}
            {!isAuthenticated && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-xs text-amber-800 dark:text-amber-200">
                <p className="font-semibold mb-1">Connexion requise</p>
                <p className="mb-2">Pour poser des questions à l&apos;assistant de voyage, veuillez vous connecter à votre compte.</p>
                <Link
                  href="/login"
                  className="inline-block px-3 py-1.5 bg-[#087d70] text-white rounded-lg font-medium hover:bg-[#05665c] transition-colors"
                >
                  Se connecter
                </Link>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-white dark:bg-[#151c1b] border-t border-gray-100 dark:border-[#2d3937]">
            <div className="relative flex items-center gap-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  isAuthenticated
                    ? "Posez votre question... (Entrée pour envoyer)"
                    : "Connectez-vous pour échanger avec l'assistant"
                }
                disabled={isLoading || !isAuthenticated}
                rows={1}
                maxLength={8000}
                className="flex-1 max-h-24 resize-none px-3.5 py-2.5 bg-gray-50 dark:bg-[#111817] text-gray-900 dark:text-[#edf5f3] placeholder-gray-400 dark:placeholder-[#637572] text-sm rounded-xl border border-gray-200 dark:border-[#2d3937] focus:outline-none focus:ring-2 focus:ring-[#087d70] dark:focus:ring-[#21bcae] focus:border-transparent transition-all disabled:opacity-50"
              />

              <button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading || !isAuthenticated}
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#087d70] hover:bg-[#05665c] disabled:bg-gray-200 dark:disabled:bg-[#2d3937] text-white disabled:text-gray-400 transition-colors flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-[#087d70]/30"
                aria-label="Envoyer"
              >
                <i className="fa-solid fa-paper-plane text-sm" />
              </button>
            </div>

            {/* Character counter & disclaimer */}
            <div className="flex items-center justify-between mt-2 text-[10px] text-gray-400 dark:text-gray-500">
              <span className="truncate pr-2">
                IA V2 • Vérifiez les tarifs et réservations en direct sur Yuding
              </span>
              {inputValue.length > 500 && (
                <span className={inputValue.length > 7500 ? 'text-amber-500 font-semibold' : ''}>
                  {inputValue.length}/8000
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
