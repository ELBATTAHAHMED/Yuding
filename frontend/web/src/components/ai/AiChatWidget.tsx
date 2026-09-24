'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/AuthContext';
import { aiService } from '@/services/ai.service';
import type { AiAttachmentDto, ChatMessage, ConversationSummaryDto } from '@/types/ai.types';
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

function Icon({ name }: { name: 'history' | 'plus' | 'close' | 'send' | 'back' | 'check' | 'warning' | 'paperclip' | 'mic' | 'trash' | 'stop' }) {
  const paths = {
    history: <><path d="M3 12a9 9 0 1 0 2.5-6.2" /><path d="M3 4v4h4M12 7v5l3 2" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="M5 5l14 14M19 5 5 19" />,
    send: <><path d="m4 12 16-7-4 14-4-6-8-1Z" /><path d="m12 13 8-8" /></>,
    back: <><path d="m14 5-7 7 7 7" /><path d="M7 12h13" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    warning: <><path d="M12 3 2.5 20h19L12 3Z" /><path d="M12 9v5M12 17h.01" /></>,
    paperclip: <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l7.88-7.88" />,
    mic: <><rect x="9" y="2" width="6" height="13" rx="3" /><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8" /></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" />,
  };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function AttachmentMedia({ attachment, localUrl, onOpenImage, showTranscript = false }: { attachment: AiAttachmentDto; localUrl?: string; onOpenImage: (url: string) => void; showTranscript?: boolean }) {
  const [url, setUrl] = useState<string | null>(localUrl || null);
  useEffect(() => {
    if (localUrl) { setUrl(localUrl); return; }
    if (attachment.kind !== 'IMAGE' && attachment.kind !== 'AUDIO') return;
    let active = true;
    let objectUrl: string | null = null;
    aiService.getAttachmentContent(attachment.id).then((blob) => {
      if (!active) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    }).catch(() => { if (active) setUrl(null); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [attachment.id, attachment.kind, localUrl]);
  if (attachment.kind === 'IMAGE') return url ? (
    <button type="button" className={styles.imagePreview} onClick={() => onOpenImage(url)} aria-label={`Agrandir l’image ${attachment.originalFilename}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={attachment.originalFilename} />
    </button>
  ) : <span className={styles.mediaLoading}>Image indisponible</span>;
  if (attachment.kind === 'AUDIO') return <div className={styles.audioAttachment}>
    {url ? <audio controls src={url} preload="metadata" aria-label="Lire le message vocal" /> : <span className={styles.mediaLoading}>Chargement du message vocal…</span>}
    {showTranscript && (attachment.transcript ? <small>{attachment.transcript}</small> : attachment.status === 'FAILED' ? <small>Transcription indisponible. Réessayez.</small> : null)}
  </div>;
  return <span className={styles.messageAttachmentItem}><span className={styles.messageAttachmentIcon}>📄</span><span>{attachment.originalFilename}</span></span>;
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
  const conversationIdRef = useRef('');
  const [conversations, setConversations] = useState<ConversationSummaryDto[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [retryText, setRetryText] = useState<string | null>(null);
  const [stagedAttachments, setStagedAttachments] = useState<AiAttachmentDto[]>([]);
  const stagedAttachmentsRef = useRef<AiAttachmentDto[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingMedia, setPendingMedia] = useState<Array<{ url: string; kind: 'IMAGE' | 'AUDIO' }>>([]);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const previewUrlsRef = useRef<Record<string, string>>({});
  const pendingUrlsRef = useRef<Set<string>>(new Set());
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isRequestingMic, setIsRequestingMic] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const cancelRecordingRef = useRef(false);
  const recordingTimerRef = useRef<number | null>(null);
  const micRequestRef = useRef(0);
  const micPendingRef = useRef(false);
  const micTimeoutRef = useRef<number | null>(null);
  const pasteCounterRef = useRef(0);
  const uploadLockRef = useRef(false);
  const recordingElapsedRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nearBottomRef = useRef(true);
  const forceScrollRef = useRef(false);
  const loadSequenceRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const firstName = user?.firstName?.trim().split(/\s+/)[0];
  const safeName = firstName && firstName.length <= 30 && !firstName.includes('@') ? firstName : null;

  const releasePreviews = useCallback(() => {
    Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    pendingUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    pendingUrlsRef.current.clear();
    previewUrlsRef.current = {};
    setPreviewUrls({});
    setLightboxUrl(null);
  }, []);

  useEffect(() => { stagedAttachmentsRef.current = stagedAttachments; }, [stagedAttachments]);
  useEffect(() => { conversationIdRef.current = conversationId; }, [conversationId]);

  const discardStagedAttachments = useCallback(() => {
    const discarded = stagedAttachmentsRef.current;
    stagedAttachmentsRef.current = [];
    setStagedAttachments([]);
    discarded.forEach((attachment) => { void aiService.deleteAttachment(attachment.id).catch(() => {}); });
  }, []);

  useEffect(() => () => {
    micRequestRef.current += 1;
    if (micTimeoutRef.current) window.clearTimeout(micTimeoutRef.current);
    recorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    Object.values(previewUrlsRef.current).forEach((url) => URL.revokeObjectURL(url));
    pendingUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

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
      if (conversationIdRef.current !== id) {
        discardStagedAttachments();
        releasePreviews();
      }
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
        attachments: message.attachments || [],
      })));
      setConversationId(id);
      conversationIdRef.current = id;
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
  }, [discardStagedAttachments, releasePreviews]);

  useEffect(() => {
    let cancelled = false;
    if (isAuthLoading) return;
    const sequence = ++loadSequenceRef.current;
    if (!isAuthenticated) {
      try { sessionStorage.removeItem(ACTIVE_CONV_STORAGE_KEY); } catch {}
      setConversationId('');
      conversationIdRef.current = '';
      setConversations([]);
      setMessages([]);
      setView('chat');
      setNotice(null);
      setRetryText(null);
      discardStagedAttachments();
      releasePreviews();
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
          conversationIdRef.current = created.id;
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
  }, [isAuthenticated, isAuthLoading, readConversation, discardStagedAttachments, releasePreviews]);

  const startNewConversation = async () => {
    if (!isAuthenticated || isLoading || isLoadingHistory || isUploading) return;
    setNotice(null);
    setRetryText(null);
    setIsLoadingHistory(true);
    try {
      const created = await aiService.createConversation('Nouvelle conversation');
      ++loadSequenceRef.current;
      discardStagedAttachments();
      releasePreviews();
      setConversationId(created.id);
      conversationIdRef.current = created.id;
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
    if ((!text && stagedAttachments.length === 0) || isLoading || isLoadingHistory || isUploading) return;
    if (!isAuthenticated) {
      setNotice('Connectez-vous pour échanger avec l’assistant.');
      return;
    }
    if (text.length > 8000) {
      setNotice('Votre message dépasse 8 000 caractères.');
      return;
    }
    if (!text && stagedAttachments.some((attachment) => attachment.kind === 'AUDIO' && attachment.status === 'FAILED')) {
      setNotice('Transcription indisponible. Supprimez le message vocal et réessayez.');
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
        conversationIdRef.current = id;
        setConversations((current) => [{ ...created, status: 'ACTIVE' }, ...current]);
        try { sessionStorage.setItem(ACTIVE_CONV_STORAGE_KEY, id); } catch {}
      }
      const currentStaged = [...stagedAttachments];
      const voice = currentStaged.find((attachment) => attachment.kind === 'AUDIO');
      const semanticText = text || (voice ? (voice.transcript?.trim() || 'Message vocal. Transcription indisponible. Réessayez.') : 'Veuillez analyser les pièces jointes.');
      setStagedAttachments([]);
      stagedAttachmentsRef.current = [];

      const messageId = crypto.randomUUID();
      const userMessage: ChatMessage = {
        id: messageId,
        role: 'user',
        content: text || (voice ? (voice.transcript?.trim() || 'Message vocal. Transcription indisponible.') : ''),
        timestamp: new Date(),
        status: 'sending',
        attachments: currentStaged,
      };
      setMessages((current) => [...current, userMessage]);
      setInputValue('');
      nearBottomRef.current = true;
      forceScrollRef.current = true;
      try {
        const response = await aiService.sendMessage({
          conversationId: id,
          message: semanticText,
          attachmentIds: currentStaged.map((a) => a.id),
        });
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
        setRetryText(semanticText);
        stagedAttachmentsRef.current = currentStaged;
        setStagedAttachments(currentStaged);
        setMessages((current) => current.map((message) => message.id === messageId ? { ...message, status: 'error' as const } : message));
      }
    } catch {
      setNotice('Impossible de démarrer la conversation. Réessayez.');
      setRetryText(text);
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFiles = async (files: File[]) => {
    if (!files.length || uploadLockRef.current || !isAuthenticated) return;
    const allowed = new Set(['jpg', 'jpeg', 'png', 'webp', 'pdf', 'txt', 'md', 'csv', 'docx', 'webm', 'ogg', 'mp3', 'm4a', 'mp4', 'wav']);
    const totalBytes = stagedAttachments.reduce((sum, attachment) => sum + attachment.sizeBytes, 0) + files.reduce((sum, file) => sum + file.size, 0);
    if (stagedAttachments.length + files.length > 4) { setNotice('Maximum 4 pièces jointes par message.'); return; }
    if (totalBytes > 20 * 1024 * 1024) { setNotice('Les pièces jointes dépassent 20 Mo au total.'); return; }
    for (const file of files) {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (!allowed.has(ext)) { setNotice('Format non autorisé. Choisissez une image, un document ou un message vocal.'); return; }
      if (!file.size || file.size > (['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? 8 : 10) * 1024 * 1024) {
        setNotice('Fichier vide ou trop volumineux. Limite : 8 Mo par image, 10 Mo sinon.'); return;
      }
    }
    uploadLockRef.current = true;
    setIsUploading(true);
    setNotice(null);
    const localUrls = files.map((file) => /^(image|audio)\//.test(file.type) ? URL.createObjectURL(file) : null);
    localUrls.forEach((url) => { if (url) pendingUrlsRef.current.add(url); });
    setPendingMedia((current) => [...current, ...localUrls.flatMap((url, index) => url ? [{ url, kind: files[index].type.startsWith('audio/') ? 'AUDIO' as const : 'IMAGE' as const }] : [])]);
    try {
      let id = conversationId;
      if (!id) {
        const created = await aiService.createConversation('Nouvelle conversation');
        id = created.id;
        setConversationId(id);
        conversationIdRef.current = id;
        setConversations((current) => [{ ...created, status: 'ACTIVE' }, ...current]);
        try { sessionStorage.setItem(ACTIVE_CONV_STORAGE_KEY, id); } catch {}
      }
      for (let index = 0; index < files.length; index++) {
        const uploaded = await aiService.uploadAttachment(id, files[index]);
        stagedAttachmentsRef.current = [...stagedAttachmentsRef.current, uploaded];
        setStagedAttachments((current) => [...current, uploaded]);
        if (uploaded.kind === 'AUDIO' && uploaded.status === 'FAILED') {
          setNotice('Transcription indisponible. Vous pouvez écouter puis supprimer ce message vocal.');
        }
        const localUrl = localUrls[index];
        if (localUrl) {
          pendingUrlsRef.current.delete(localUrl);
          previewUrlsRef.current[uploaded.id] = localUrl;
          setPreviewUrls({ ...previewUrlsRef.current });
          setPendingMedia((current) => current.filter((item) => item.url !== localUrl));
        }
      }
    } catch (err: unknown) {
      setNotice((err as { message?: string })?.message || 'Échec du téléversement du fichier.');
      for (const url of localUrls) {
        if (url && pendingUrlsRef.current.delete(url)) URL.revokeObjectURL(url);
      }
    } finally {
      setPendingMedia([]);
      setIsUploading(false);
      uploadLockRef.current = false;
    }
  };

  const removeAttachment = async (attachment: AiAttachmentDto) => {
    stagedAttachmentsRef.current = stagedAttachmentsRef.current.filter((item) => item.id !== attachment.id);
    setStagedAttachments((current) => current.filter((item) => item.id !== attachment.id));
    const url = previewUrlsRef.current[attachment.id];
    if (url) {
      URL.revokeObjectURL(url);
      delete previewUrlsRef.current[attachment.id];
      setPreviewUrls({ ...previewUrlsRef.current });
    }
    try { await aiService.deleteAttachment(attachment.id); }
    catch { setNotice('Impossible de supprimer cette pièce jointe.'); }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    void uploadFiles(files);
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const images = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile()).filter((file): file is File => Boolean(file));
    if (!images.length) return;
    event.preventDefault();
    const stamped = images.map((file) => {
      const extension = file.type === 'image/jpeg' ? 'jpg' : file.type === 'image/webp' ? 'webp' : 'png';
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const name = `image-collee-${date}-${String(++pasteCounterRef.current).padStart(3, '0')}.${extension}`;
      return new File([file], name, { type: file.type });
    });
    void uploadFiles(stamped);
  };

  const stopRecording = (cancel = false) => {
    cancelRecordingRef.current = cancel;
    if (recordingTimerRef.current) window.clearInterval(recordingTimerRef.current);
    recordingTimerRef.current = null;
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    setIsRecording(false);
  };

  const cancelMicRequest = () => {
    micRequestRef.current += 1;
    micPendingRef.current = false;
    if (micTimeoutRef.current) window.clearTimeout(micTimeoutRef.current);
    micTimeoutRef.current = null;
    setIsRequestingMic(false);
  };

  const startRecording = async () => {
    if (micPendingRef.current || isRecording) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setNotice('Enregistrement vocal non pris en charge par ce navigateur.'); return;
    }
    const requestId = ++micRequestRef.current;
    micPendingRef.current = true;
    setIsRequestingMic(true);
    setNotice(null);
    micTimeoutRef.current = window.setTimeout(() => {
      if (micRequestRef.current !== requestId) return;
      cancelMicRequest();
      setNotice('Autorisation du microphone expirée. Réessayez.');
    }, 20000);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (micRequestRef.current !== requestId) { stream.getTracks().forEach((track) => track.stop()); return; }
      streamRef.current = stream;
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recorderRef.current = recorder;
      recordingChunksRef.current = [];
      cancelRecordingRef.current = false;
      recordingElapsedRef.current = 0;
      setRecordingSeconds(0);
      recorder.ondataavailable = (event) => { if (event.data.size) recordingChunksRef.current.push(event.data); };
      recorder.onerror = () => { setNotice('Enregistrement vocal interrompu.'); stopRecording(true); };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (cancelRecordingRef.current || !recordingChunksRef.current.length) return;
        const type = recorder.mimeType.split(';')[0] || 'audio/webm';
        const extension = type === 'audio/ogg' ? 'ogg' : type === 'audio/mp4' ? 'm4a' : 'webm';
        const file = new File(recordingChunksRef.current, `message-vocal-${Date.now()}.${extension}`, { type });
        void uploadFiles([file]);
      };
      recorder.start(1000);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        recordingElapsedRef.current += 1;
        setRecordingSeconds(recordingElapsedRef.current);
        if (recordingElapsedRef.current >= 300) stopRecording();
      }, 1000);
    } catch (error) {
      if (micRequestRef.current === requestId) {
        setNotice((error as DOMException)?.name === 'NotAllowedError' ? 'Accès au microphone refusé.' : 'Microphone indisponible.');
        streamRef.current?.getTracks().forEach((track) => track.stop());
      }
    } finally {
      if (micRequestRef.current === requestId) {
        if (micTimeoutRef.current) window.clearTimeout(micTimeoutRef.current);
        micTimeoutRef.current = null;
        micPendingRef.current = false;
        setIsRequestingMic(false);
      }
    }
  };

  const deleteConversation = async (id: string) => {
    setIsDeleting(true);
    setNotice(null);
    try {
      await aiService.deleteConversation(id);
      setConversations((current) => current.filter((item) => item.id !== id));
      setDeleteTarget(null);
      if (conversationId === id) {
        ++loadSequenceRef.current;
        setConversationId('');
        conversationIdRef.current = '';
        setMessages([]);
        setStagedAttachments([]);
        stagedAttachmentsRef.current = [];
        releasePreviews();
        setInputValue('');
        setView('chat');
        try { sessionStorage.removeItem(ACTIVE_CONV_STORAGE_KEY); } catch {}
      }
    } catch {
      setNotice('Impossible de supprimer la conversation.');
    } finally { setIsDeleting(false); }
  };

  const retryMessage = () => {
    if (!retryText) return;
    const text = retryText;
    setMessages((current) => current.filter((message) => !(message.role === 'user' && message.status === 'error')));
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
        <section className={`${styles.panel} ${isOpen ? styles.panelOpen : styles.panelClosed}`} role="dialog" aria-label="Assistant Yuding" aria-hidden={!isOpen}
          onDragEnter={(event) => { if (Array.from(event.dataTransfer.types).includes('Files')) setDragActive(true); }}
          onDragOver={(event) => { if (Array.from(event.dataTransfer.types).includes('Files')) { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; } }}
          onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragActive(false); }}
          onDrop={(event) => { event.preventDefault(); setDragActive(false); void uploadFiles(Array.from(event.dataTransfer.files)); }}>
          {dragActive && <div className={styles.dropOverlay} aria-hidden="true">Déposez vos fichiers ici</div>}
          <header className={styles.header}>
            <span className={styles.headerMark}><AssistantMark size={29} /></span>
            <div className={styles.headerText}>
              <h2>Assistant Yuding</h2>
              <p>Votre compagnon de voyage</p>
            </div>
            <div className={styles.actions}>
              {isAuthenticated && <button type="button" className={`${styles.iconButton} ${view === 'history' ? styles.iconButtonActive : ''}`} title={view === 'history' ? 'Retour à la conversation' : 'Historique des conversations'} aria-label={view === 'history' ? 'Retour à la conversation' : 'Historique des conversations'} disabled={isUploading} onClick={() => void openHistory()}><Icon name={view === 'history' ? 'back' : 'history'} /></button>}
              <button type="button" className={styles.iconButton} title="Nouvelle conversation" aria-label="Nouvelle conversation" disabled={!isAuthenticated || isLoading || isLoadingHistory || isUploading} onClick={() => void startNewConversation()}><Icon name="plus" /></button>
              <button type="button" className={styles.iconButton} title="Fermer" aria-label="Fermer l’assistant" onClick={() => setIsOpen(false)}><Icon name="close" /></button>
            </div>
          </header>

          <div key={view} className={styles.body} ref={scrollRef} onScroll={onScroll}>
            {view === 'history' ? (
              <div className={styles.history}>
                <div className={styles.sectionHeading}><p>Conversations récentes</p><span>{conversations.length}</span></div>
                {conversations.length === 0 && <p className={styles.emptyHistory}>Vos échanges apparaîtront ici.</p>}
                {conversations.map((conversation) => (
                  <div key={conversation.id} className={`${styles.historyRow} ${conversation.id === conversationId ? styles.historyRowActive : ''}`}>
                    {deleteTarget === conversation.id ? <div className={styles.deleteConfirm}>
                      <span>Supprimer cette conversation ?</span>
                      <button type="button" onClick={() => setDeleteTarget(null)} disabled={isDeleting}>Annuler</button>
                      <button type="button" onClick={() => void deleteConversation(conversation.id)} disabled={isDeleting} aria-label="Confirmer la suppression">Supprimer</button>
                    </div> : <>
                      <button type="button" className={styles.historyRowMain} disabled={isUploading} onClick={() => void readConversation(conversation.id)}>
                        <span className={styles.historyRowTitle}>{conversation.title || 'Nouvelle conversation'}</span>
                        <span className={styles.historyRowDate}>{formatHistoryDate(conversation.lastMessageAt || conversation.updatedAt)}</span>
                      </button>
                      <button type="button" className={styles.historyDelete} onClick={() => setDeleteTarget(conversation.id)} aria-label={`Supprimer la conversation ${conversation.title || 'Nouvelle conversation'}`}><Icon name="trash" /></button>
                    </>}
                  </div>
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
                        {userMessage ? (
                          <div className={styles.userBubble}>
                            {message.content && <div>{message.content}</div>}
                            {message.attachments && message.attachments.length > 0 && (
                              <div className={styles.messageAttachments}>
                                {message.attachments.map((att) => <AttachmentMedia key={att.id} attachment={att} localUrl={previewUrls[att.id]} onOpenImage={setLightboxUrl} />)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <AssistantContent content={message.content} />
                        )}
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
            {(stagedAttachments.length > 0 || pendingMedia.length > 0) && (
              <div className={styles.attachmentPreviewBar}>
                {stagedAttachments.map((att) => (
                  <div key={att.id} className={att.kind === 'IMAGE' ? styles.stagedImage : att.kind === 'AUDIO' ? styles.stagedAudio : styles.attachmentChip}>
                    <AttachmentMedia attachment={att} localUrl={previewUrls[att.id]} onOpenImage={setLightboxUrl} showTranscript />
                    {att.kind === 'DOCUMENT' && <span className={styles.attachmentChipSize}>({Math.round(att.sizeBytes / 1024)} ko)</span>}
                    <button
                      type="button"
                      className={styles.attachmentChipRemove}
                      onClick={() => void removeAttachment(att)}
                      title="Supprimer la pièce jointe"
                      aria-label={`Retirer ${att.originalFilename}`}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {pendingMedia.map(({ url, kind }) => kind === 'IMAGE'
                  ? <div key={url} className={styles.stagedImage}>{/* eslint-disable-next-line @next/next/no-img-element */}<img src={url} alt="Pièce jointe en cours de chargement" /></div>
                  : <div key={url} className={styles.stagedAudio}><span className={styles.mediaLoading}>Préparation du message vocal…</span></div>)}
              </div>
            )}
            {isRequestingMic ? <div className={styles.recordingBar} role="status">
              <Icon name="mic" />
              <span>Autorisez le microphone…</span>
              <button type="button" onClick={cancelMicRequest} aria-label="Annuler la demande de microphone">Annuler</button>
            </div> : isRecording ? <div className={styles.recordingBar} role="status">
              <span className={styles.recordingDot} aria-hidden="true" />
              <span>{String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:{String(recordingSeconds % 60).padStart(2, '0')}</span>
              <button type="button" onClick={() => stopRecording(true)} aria-label="Annuler l’enregistrement">Annuler</button>
              <button type="button" onClick={() => stopRecording()} aria-label="Arrêter l’enregistrement"><Icon name="stop" /> Terminer</button>
            </div> : <div className={styles.composer}>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="image/jpeg,image/png,image/webp,.pdf,.txt,.md,.csv,.docx,audio/webm,audio/ogg,audio/mpeg,audio/mp4,audio/wav"
                multiple
                onChange={handleFileUpload}
              />
              <button
                type="button"
                className={styles.attachButton}
                disabled={!isAuthenticated || isLoading || isLoadingHistory || isUploading || stagedAttachments.length >= 4}
                onClick={() => fileInputRef.current?.click()}
                title={isUploading ? 'Téléversement en cours…' : 'Joindre un fichier (JPG, PNG, PDF, DOCX)'}
                aria-label="Joindre un fichier"
              >
                <Icon name="paperclip" />
              </button>
              <label className={styles.srOnly} htmlFor="yuding-assistant-input">Votre question</label>
              <textarea
                id="yuding-assistant-input"
                ref={textareaRef}
                rows={1}
                maxLength={8000}
                value={inputValue}
                placeholder={isAuthenticated ? 'Posez votre question…' : 'Connectez-vous pour échanger'}
                disabled={!isAuthenticated || isLoading || isLoadingHistory}
                onChange={(event) => setInputValue(event.target.value)}
                onPaste={handlePaste}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
              />
              <button type="button" className={styles.attachButton} disabled={!isAuthenticated || isLoading || isLoadingHistory || isUploading || stagedAttachments.length >= 4} onClick={() => void startRecording()} aria-label="Enregistrer un message vocal" title="Message vocal"><Icon name="mic" /></button>
              <button
                type="button"
                className={styles.sendButton}
                disabled={(!inputValue.trim() && stagedAttachments.length === 0) || !isAuthenticated || isLoading || isLoadingHistory || isUploading}
                onClick={() => void sendMessage()}
                aria-label="Envoyer le message"
                title="Envoyer"
              >
                <Icon name="send" />
              </button>
            </div>}
          </footer>
        </section>
      )}
      {lightboxUrl && <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Aperçu de l’image" onClick={() => setLightboxUrl(null)}>
        <button type="button" onClick={() => setLightboxUrl(null)} aria-label="Fermer l’aperçu"><Icon name="close" /></button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={lightboxUrl} alt="Aperçu agrandi" onClick={(event) => event.stopPropagation()} />
      </div>}
      <button type="button" className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ''}`} onClick={() => setIsOpen((current) => !current)} aria-label={isOpen ? 'Fermer l’assistant Yuding' : 'Ouvrir l’assistant Yuding'} aria-expanded={isOpen} title="Assistant Yuding"><AssistantMark size={38} /></button>
    </div>
  );
};
