'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthContext';
import { aiService } from '@/services/ai.service';
import type { ChatMessage, ConversationSummaryDto } from '@/types/ai.types';
import styles from './AiChatWidget.module.css';

const ACTIVE_CONV_STORAGE_KEY = 'yuding_ai_active_conv';
const SUGGESTIONS = [
  { label: 'Paris demain', prompt: 'Quels vols pour Paris demain ?' },
  { label: 'Météo Marrakech', prompt: 'Quel temps fait-il à Marrakech aujourd’hui ?' },
  { label: 'Hôtels à Rome', prompt: 'Trouve-moi des hôtels à Rome.' },
  { label: '150 EUR → MAD', prompt: 'Convertis 150 EUR en MAD.' },
];

function AssistantMark({ size = 22 }: { size?: number }) {
  return <span className={styles.assistantMark} style={{ width: size, height: size }} aria-hidden="true" />;
}

function Icon({ name }: { name: 'history' | 'plus' | 'close' | 'send' | 'back' | 'check' | 'warning' }) {
  const paths = {
    history: <><path d="M3 12a9 9 0 1 0 2.5-6.2" /><path d="M3 4v4h4M12 7v5l3 2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="M5 5l14 14M19 5 5 19" />,
    send: <><path d="m4 12 16-7-4 14-4-6-8-1Z" /><path d="m12 13 8-8" /></>,
    back: <><path d="m14 5-7 7 7 7" /><path d="M7 12h13" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    warning: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function InlineText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    return part;
  })}</>;
}

function AssistantContent({ content }: { content: string }) {
  return (
    <div className={styles.answer}>
      {content.split('\n').map((line, index) => {
        const value = line.trim();
        if (!value) return <div key={index} className={styles.answerGap} />;
        if (/^#{1,4}\s/.test(value)) return <h3 key={index}><InlineText text={value.replace(/^#{1,4}\s+/, '')} /></h3>;
        if (/^[-*•]\s/.test(value)) return <div key={index} className={styles.answerList}><span aria-hidden="true">•</span><p><InlineText text={value.replace(/^[-*•]\s+/, '')} /></p></div>;
        const numbered = value.match(/^(\d+)\.\s+(.*)$/);
        if (numbered) return <div key={index} className={styles.answerList}><span>{numbered[1]}.</span><p><InlineText text={numbered[2]} /></p></div>;
        if (/^[-—_]{3,}$/.test(value)) return <hr key={index} />;
        if (value.startsWith('>')) return <blockquote key={index} className={styles.answerQuote}><InlineText text={value.replace(/^>\s*/, '')} /></blockquote>;
        if (value.startsWith('|')) {
          const cells = value.split('|').slice(1, -1).map((cell) => cell.trim());
          if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) return null;
          return <div key={index} className={styles.answerTableRow}>{cells.map((cell, cellIndex) => <span key={cellIndex}><InlineText text={cell} /></span>)}</div>;
        }
        return <p key={index}><InlineText text={line} /></p>;
      })}
    </div>
  );
}

function formatTime(date: Date) {
  return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatHistoryDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatTime(date);
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function SourcesList({ sources }: { sources: NonNullable<ChatMessage['sources']> }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className={styles.sourcesWrapper}>
      <button
        type="button"
        className={styles.sourcesToggle}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span>Sources Yuding ({sources.length})</span>
        <span className={`${styles.sourcesChevron} ${isOpen ? styles.sourcesChevronOpen : ''}`}>▾</span>
      </button>
      {isOpen && (
        <ul className={styles.sourcesList}>
          {sources.map((src, idx) => (
            <li key={`${src.reference || idx}-${idx}`} className={styles.sourceItem}>
              <span className={styles.sourceTitle}>{src.title}</span>
              {src.section && <span className={styles.sourceSection}> — {src.section}</span>}
              {src.reference && <span className={styles.sourceRef}>[{src.reference}]</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export const AiChatWidget: React.FC = () => {
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isRendered, setIsRendered] = useState(false);
  const [view, setView] = useState<'chat' | 'history'>('chat');
  const [conversationId, setConversationId] = useState('');
  const [conversations, setConversations] = useState<ConversationSummaryDto[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryText, setRetryText] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nearBottomRef = useRef(true);
  const forceScrollRef = useRef(false);
  const loadSequenceRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const firstName = user?.firstName?.trim().split(/\s+/)[0];
  const safeName = firstName && firstName.length <= 30 && !firstName.includes('@') ? firstName : null;

  useEffect(() => {
    let header: HTMLElement | null = null;
    let observer: ResizeObserver | null = null;
    const syncHeaderBottom = () => {
      const currentHeader = document.querySelector<HTMLElement>('.yuding-header, .auth-header');
      if (currentHeader !== header) {
        observer?.disconnect();
        header = currentHeader;
        if (header && typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(syncHeaderBottom);
          observer.observe(header);
        }
      }
      const bottom = Math.max(0, Math.ceil(header?.getBoundingClientRect().bottom ?? 0));
      rootRef.current?.style.setProperty('--ai-header-bottom', `${bottom}px`);
    };
    syncHeaderBottom();
    window.addEventListener('resize', syncHeaderBottom);
    window.addEventListener('scroll', syncHeaderBottom, { passive: true });
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', syncHeaderBottom);
      window.removeEventListener('scroll', syncHeaderBottom);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      return;
    }
    const timeout = window.setTimeout(() => setIsRendered(false), 190);
    return () => window.clearTimeout(timeout);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && view === 'chat' && isAuthenticated) {
      const timeout = window.setTimeout(() => textareaRef.current?.focus(), 190);
      return () => window.clearTimeout(timeout);
    }
  }, [isOpen, view, isAuthenticated]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 104)}px`;
  }, [inputValue, isOpen, view]);

  useEffect(() => {
    if (!isOpen || view !== 'chat') return;
    const frame = requestAnimationFrame(() => {
      const scroll = scrollRef.current;
      if (scroll && (nearBottomRef.current || forceScrollRef.current)) {
        scroll.scrollTop = scroll.scrollHeight;
        forceScrollRef.current = false;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [messages, isLoading, isOpen, view]);

  const readConversation = useCallback(async (id: string) => {
    const sequence = ++loadSequenceRef.current;
    setIsLoadingHistory(true);
    setNotice(null);
    setRetryText(null);
    try {
      const serverMessages = await aiService.getConversationMessages(id);
      if (sequence !== loadSequenceRef.current) return;
      setMessages(serverMessages.map((message) => ({
        id: message.id,
        role: message.role === 'user' ? 'user' : 'assistant',
        content: message.content,
        timestamp: new Date(message.createdAt || Date.now()),
        status: 'delivered',
        grounded: message.grounded,
        groundingType: message.groundingType,
        toolsUsed: message.toolsUsed,
        sources: message.sources,
      })));
      setConversationId(id);
      setView('chat');
      nearBottomRef.current = true;
      forceScrollRef.current = true;
      try { sessionStorage.setItem(ACTIVE_CONV_STORAGE_KEY, id); } catch {}
    } catch {
      if (sequence !== loadSequenceRef.current) return;
      setNotice('Cette conversation ne peut pas être chargée.');
      try { sessionStorage.removeItem(ACTIVE_CONV_STORAGE_KEY); } catch {}
    } finally {
      if (sequence === loadSequenceRef.current) setIsLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (isAuthLoading) return;
    const sequence = ++loadSequenceRef.current;
    if (!isAuthenticated) {
      try { sessionStorage.removeItem(ACTIVE_CONV_STORAGE_KEY); } catch {}
      setConversationId('');
      setConversations([]);
      setMessages([]);
      setView('chat');
      setNotice(null);
      setRetryText(null);
      return;
    }
    const initialize = async () => {
      try {
        const list = await aiService.getConversations(25);
        if (cancelled || sequence !== loadSequenceRef.current) return;
        setConversations(list);
        let savedId: string | null = null;
        try { savedId = sessionStorage.getItem(ACTIVE_CONV_STORAGE_KEY); } catch {}
        const target = list.find((item) => item.id === savedId) || list[0];
        if (target) {
          await readConversation(target.id);
        } else {
          const created = await aiService.createConversation('Nouvelle conversation');
          if (cancelled) return;
          setConversationId(created.id);
          setMessages([]);
          setConversations([{ ...created, status: 'ACTIVE' }]);
          try { sessionStorage.setItem(ACTIVE_CONV_STORAGE_KEY, created.id); } catch {}
        }
      } catch {
        if (!cancelled) setNotice('Connexion à vos conversations indisponible.');
      }
    };
    void initialize();
    return () => { cancelled = true; };
  }, [isAuthenticated, isAuthLoading, readConversation]);

  const startNewConversation = async () => {
    if (!isAuthenticated || isLoading || isLoadingHistory) return;
    setNotice(null);
    setRetryText(null);
    setIsLoadingHistory(true);
    try {
      const created = await aiService.createConversation('Nouvelle conversation');
      ++loadSequenceRef.current;
      setConversationId(created.id);
      setConversations((current) => [{ ...created, status: 'ACTIVE' }, ...current.filter((item) => item.id !== created.id)]);
      setMessages([]);
      setInputValue('');
      setView('chat');
      nearBottomRef.current = true;
      try { sessionStorage.setItem(ACTIVE_CONV_STORAGE_KEY, created.id); } catch {}
    } catch {
      setNotice('Nouvelle conversation indisponible. Réessayez.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const sendMessage = async (suggested?: string) => {
    const text = (suggested ?? inputValue).trim();
    if (!text || isLoading || isLoadingHistory) return;
    if (!isAuthenticated) {
      setNotice('Connectez-vous pour échanger avec l’assistant.');
      return;
    }
    if (text.length > 8000) {
      setNotice('Votre message dépasse 8 000 caractères.');
      return;
    }
    setIsLoading(true);
    setNotice(null);
    setRetryText(null);
    setView('chat');
    let id = conversationId;
    try {
      if (!id) {
        const created = await aiService.createConversation('Nouvelle conversation');
        id = created.id;
        setConversationId(id);
        setConversations((current) => [{ ...created, status: 'ACTIVE' }, ...current]);
        try { sessionStorage.setItem(ACTIVE_CONV_STORAGE_KEY, id); } catch {}
      }
      const messageId = crypto.randomUUID();
      const userMessage: ChatMessage = { id: messageId, role: 'user', content: text, timestamp: new Date(), status: 'sending' };
      setMessages((current) => [...current, userMessage]);
      setInputValue('');
      nearBottomRef.current = true;
      forceScrollRef.current = true;
      try {
        const response = await aiService.sendMessage({ conversationId: id, message: text });
        const assistantMessage: ChatMessage = {
          id: response.messageId || crypto.randomUUID(),
          role: 'assistant',
          content: response.content,
          timestamp: new Date(response.createdAt || Date.now()),
          status: 'delivered',
          grounded: response.grounded,
          groundingType: response.groundingType,
          toolsUsed: response.toolsUsed,
          sources: response.sources,
        };
        setMessages((current) => current.map((message) => message.id === messageId ? { ...message, status: 'delivered' as const } : message).concat(assistantMessage));
        aiService.getConversations(25).then(setConversations).catch(() => {});
      } catch (error: unknown) {
        const status = (error as { status?: number })?.status;
        setNotice(status === 429 ? 'Trop de demandes. Réessayez dans un instant.' : 'L’assistant est momentanément indisponible.');
        setRetryText(text);
        setMessages((current) => current.map((message) => message.id === messageId ? { ...message, status: 'error' as const } : message));
      }
    } catch {
      setNotice('Impossible de démarrer la conversation. Réessayez.');
      setRetryText(text);
    } finally {
      setIsLoading(false);
    }
  };

  const retryMessage = () => {
    if (!retryText) return;
    const text = retryText;
    setMessages((current) => current.filter((message) => !(message.role === 'user' && message.status === 'error' && message.content === text)));
    void sendMessage(text);
  };

  const openHistory = async () => {
    if (view === 'history') { setView('chat'); return; }
    setView('history');
    setNotice(null);
    setRetryText(null);
    try {
      const list = await aiService.getConversations(25);
      setConversations(list);
    } catch {
      setNotice('Historique momentanément indisponible.');
    }
  };

  const onScroll = () => {
    const area = scrollRef.current;
    if (!area) return;
    nearBottomRef.current = area.scrollHeight - area.scrollTop - area.clientHeight < 88;
  };

  return (
    <div className={styles.root} ref={rootRef}>
      {isRendered && (
        <section className={`${styles.panel} ${isOpen ? styles.panelOpen : styles.panelClosed}`} role="dialog" aria-label="Assistant Yuding" aria-hidden={!isOpen}>
          <header className={styles.header}>
            <span className={styles.headerMark}><AssistantMark size={29} /></span>
            <div className={styles.headerText}>
              <h2>Assistant Yuding</h2>
              <p>Votre compagnon de voyage</p>
            </div>
            <div className={styles.actions}>
              {isAuthenticated && <button type="button" className={`${styles.iconButton} ${view === 'history' ? styles.iconButtonActive : ''}`} title={view === 'history' ? 'Retour à la conversation' : 'Historique des conversations'} aria-label={view === 'history' ? 'Retour à la conversation' : 'Historique des conversations'} onClick={() => void openHistory()}><Icon name={view === 'history' ? 'back' : 'history'} /></button>}
              <button type="button" className={styles.iconButton} title="Nouvelle conversation" aria-label="Nouvelle conversation" disabled={!isAuthenticated || isLoading || isLoadingHistory} onClick={() => void startNewConversation()}><Icon name="plus" /></button>
              <button type="button" className={styles.iconButton} title="Fermer" aria-label="Fermer l’assistant" onClick={() => setIsOpen(false)}><Icon name="close" /></button>
            </div>
          </header>

          <div key={view} className={styles.body} ref={scrollRef} onScroll={onScroll}>
            {view === 'history' ? (
              <div className={styles.history}>
                <div className={styles.sectionHeading}><p>Conversations récentes</p><span>{conversations.length}</span></div>
                {conversations.length === 0 && <p className={styles.emptyHistory}>Vos échanges apparaîtront ici.</p>}
                {conversations.map((conversation) => (
                  <button key={conversation.id} type="button" className={`${styles.historyRow} ${conversation.id === conversationId ? styles.historyRowActive : ''}`} onClick={() => void readConversation(conversation.id)}>
                    <span className={styles.historyRowTitle}>{conversation.title || 'Nouvelle conversation'}</span>
                    <span className={styles.historyRowDate}>{formatHistoryDate(conversation.lastMessageAt || conversation.updatedAt)}</span>
                  </button>
                ))}
              </div>
            ) : isLoadingHistory ? (
              <div className={styles.loadingHistory}>Chargement de la conversation…</div>
            ) : (
              <>
                {messages.length === 0 && (
                  <div className={`${styles.welcome} ${isAuthenticated ? styles.welcomeCentered : ''}`}>
                    <div className={styles.welcomeMark}><AssistantMark size={38} /></div>
                    <p className={styles.welcomeEyebrow}>VOTRE PROCHAIN VOYAGE COMMENCE ICI</p>
                    <h3>Bonjour{safeName ? ` ${safeName}` : ''}.<br />Où souhaitez-vous aller&nbsp;?</h3>
                    <p className={styles.welcomeDescription}>Une destination, une météo, un budget&nbsp;: demandez-moi.</p>
                    <div className={styles.suggestions} aria-label="Idées de questions">
                      {SUGGESTIONS.map((item) => <button type="button" key={item.label} onClick={() => void sendMessage(item.prompt)} disabled={!isAuthenticated || isLoading}>{item.label}<span aria-hidden="true">↗</span></button>)}
                    </div>
                  </div>
                )}
                <div className={styles.messageList} aria-live="polite" aria-relevant="additions">
                  {messages.map((message, index) => {
                    const userMessage = message.role === 'user';
                    const showTime = index === messages.length - 1 || messages[index + 1]?.role !== message.role;
                    return <div className={`${styles.message} ${userMessage ? styles.userMessage : styles.assistantMessage}`} key={message.id}>
                      {!userMessage && <span className={styles.messageMark}><AssistantMark size={21} /></span>}
                      <div className={styles.messageContent}>
                        {userMessage ? <div className={styles.userBubble}>{message.content}</div> : <AssistantContent content={message.content} />}
                        {!userMessage && message.grounded && (
                          <div className={styles.groundedContainer}>
                            <span className={styles.grounded}>
                              <Icon name="check" />
                              {message.groundingType === 'MIXED'
                                ? 'Sources Yuding + données vérifiées'
                                : message.groundingType === 'RAG'
                                ? 'Source Yuding'
                                : 'Données Yuding vérifiées'}
                            </span>
                            {message.sources && message.sources.length > 0 && (
                              <SourcesList sources={message.sources} />
                            )}
                          </div>
                        )}
                        {showTime && <time className={styles.timestamp} dateTime={new Date(message.timestamp).toISOString()}>{formatTime(message.timestamp)}</time>}
                      </div>
                    </div>;
                  })}
                  {isLoading && <div className={styles.typing} role="status"><span className={styles.messageMark}><AssistantMark size={21} /></span><span className={styles.typingDots}><i /><i /><i /></span><span>Je cherche pour vous…</span></div>}
                </div>
                {!isAuthenticated && <div className={styles.authPrompt}><p>Connectez-vous pour préparer votre voyage avec Yuding.</p><Link href="/login">Se connecter</Link></div>}
              </>
            )}
            {notice && <div className={styles.notice} role="alert"><Icon name="warning" /><span>{notice}</span>{retryText && view === 'chat' && <button type="button" onClick={retryMessage}>Réessayer</button>}</div>}
          </div>

          <footer className={styles.footer}>
              <div className={styles.composer}>
                <label className={styles.srOnly} htmlFor="yuding-assistant-input">Votre question</label>
                <textarea id="yuding-assistant-input" ref={textareaRef} rows={1} maxLength={8000} value={inputValue} placeholder={isAuthenticated ? 'Posez votre question…' : 'Connectez-vous pour échanger'} disabled={!isAuthenticated || isLoading || isLoadingHistory} onChange={(event) => setInputValue(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void sendMessage(); } }} />
                <button type="button" className={styles.sendButton} disabled={!inputValue.trim() || !isAuthenticated || isLoading || isLoadingHistory} onClick={() => void sendMessage()} aria-label="Envoyer le message" title="Envoyer"><Icon name="send" /></button>
              </div>
          </footer>
        </section>
      )}
      <button type="button" className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`} onClick={() => setIsOpen((current) => !current)} aria-label={isOpen ? 'Fermer l’assistant Yuding' : 'Ouvrir l’assistant Yuding'} aria-expanded={isOpen} title="Assistant Yuding"><AssistantMark size={38} /></button>
    </div>
  );
};
