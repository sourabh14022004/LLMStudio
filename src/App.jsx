import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as webllm from "@mlc-ai/web-llm";
import { 
  FiAlertCircle, 
  FiCpu, 
  FiSend, 
  FiCopy, 
  FiCheck, 
  FiTrash2, 
  FiMenu, 
  FiX, 
  FiSettings, 
  FiExternalLink,
  FiPlus,
  FiEdit2,
  FiMessageSquare,
} from 'react-icons/fi';
import { RiSparkling2Line, RiRobot2Line, RiUser3Line } from 'react-icons/ri';

// ─── Helpers ────────────────────────────────────────────────────────────────
const genId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

const DEFAULT_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC";
const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful, respectful, and honest assistant. Answer as briefly and accurately as possible.';

const createNewChat = (overrides = {}) => ({
  id: genId(),
  title: 'New Chat',
  createdAt: Date.now(),
  messages: [],
  model: DEFAULT_MODEL,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  ...overrides,
});

const loadChats = () => {
  try {
    const raw = localStorage.getItem('llm_chats_v2');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (_) {}
  return [createNewChat()];
};

// ─── Main App ────────────────────────────────────────────────────────────────
const App = () => {
  // ── Chat sessions state ──────────────────────────────────────────────────
  const [chats, setChats] = useState(loadChats);
  const [activeChatId, setActiveChatId] = useState(() => loadChats()[0].id);

  // ── Derived active chat ──────────────────────────────────────────────────
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

  // ── Engine and progress states ───────────────────────────────────────────
  const [engine, setEngine] = useState(null);
  const [progressText, setProgressText] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isWebGPUSupported, setIsWebGPUSupported] = useState(true);
  const [initError, setInitError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadedModel, setLoadedModel] = useState(null);

  // ── Input & typing ───────────────────────────────────────────────────────
  const [input, setInput] = useState('');
  const [typingChatIds, setTypingChatIds] = useState(new Set());

  // ── UI states ────────────────────────────────────────────────────────────
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const renameInputRef = useRef(null);

  // ── Model catalog ────────────────────────────────────────────────────────
  const modelCatalog = [
    {
      family: "🦙 Llama",
      models: [
        { id: "Llama-3.2-1B-Instruct-q4f16_1-MLC",      label: "Llama 3.2 · 1B",   size: "~0.8 GB",  desc: "Fastest, great for quick replies" },
        { id: "Llama-3.2-3B-Instruct-q4f16_1-MLC",      label: "Llama 3.2 · 3B",   size: "~2 GB",    desc: "Good balance of speed & quality" },
        { id: "Llama-3.1-8B-Instruct-q4f16_1-MLC",      label: "Llama 3.1 · 8B",   size: "~5 GB",    desc: "Best Llama quality, needs VRAM" },
        { id: "Llama-2-7b-chat-hf-q4f16_1-MLC",         label: "Llama 2 · 7B",     size: "~4 GB",    desc: "Stable classic chat model" },
      ]
    },
    {
      family: "🧠 DeepSeek R1",
      models: [
        { id: "DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC",  label: "DeepSeek-R1 · 7B (Qwen)",  size: "~5 GB",  desc: "Strong reasoning, chain-of-thought" },
        { id: "DeepSeek-R1-Distill-Llama-8B-q4f16_1-MLC", label: "DeepSeek-R1 · 8B (Llama)", size: "~5 GB",  desc: "R1 reasoning on Llama backbone" },
      ]
    },
    {
      family: "⚡ Phi",
      models: [
        { id: "Phi-3.5-mini-instruct-q4f16_1-MLC",      label: "Phi-3.5 Mini",     size: "~2.5 GB",  desc: "Microsoft's compact powerhouse" },
        { id: "Phi-3-mini-4k-instruct-q4f16_1-MLC",     label: "Phi-3 Mini 4K",   size: "~2.5 GB",  desc: "Efficient, good for coding" },
      ]
    },
    {
      family: "🌬️ Mistral",
      models: [
        { id: "Mistral-7B-Instruct-v0.3-q4f16_1-MLC",   label: "Mistral v0.3 · 7B",  size: "~4.5 GB", desc: "Excellent general-purpose model" },
        { id: "Hermes-2-Pro-Mistral-7B-q4f16_1-MLC",    label: "Hermes 2 Pro · 7B",  size: "~4.5 GB", desc: "Fine-tuned for instructions & chat" },
        { id: "OpenHermes-2.5-Mistral-7B-q4f16_1-MLC",  label: "OpenHermes 2.5 · 7B",size: "~4.5 GB", desc: "Top open-source chat quality" },
      ]
    },
    {
      family: "💎 Gemma",
      models: [
        { id: "gemma-2-2b-it-q4f16_1-MLC",              label: "Gemma 2 · 2B",     size: "~1.5 GB",  desc: "Google's efficient small model" },
        { id: "gemma-2-9b-it-q4f16_1-MLC",              label: "Gemma 2 · 9B",     size: "~6 GB",    desc: "Google's high-quality model" },
      ]
    },
    {
      family: "🐉 Qwen 2.5",
      models: [
        { id: "Qwen2.5-0.5B-Instruct-q4f16_1-MLC",     label: "Qwen 2.5 · 0.5B",  size: "~0.4 GB",  desc: "Tiny but surprisingly capable" },
        { id: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC",     label: "Qwen 2.5 · 1.5B",  size: "~1 GB",    desc: "Lightweight multilingual model" },
        { id: "Qwen2.5-3B-Instruct-q4f16_1-MLC",       label: "Qwen 2.5 · 3B",    size: "~2 GB",    desc: "Strong multilingual & coding" },
        { id: "Qwen2.5-7B-Instruct-q4f16_1-MLC",       label: "Qwen 2.5 · 7B",    size: "~5 GB",    desc: "Best Qwen quality" },
        { id: "Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC", label: "Qwen Coder · 1.5B", size: "~1 GB", desc: "Specialized for code generation" },
        { id: "Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC",   label: "Qwen Coder · 7B",   size: "~5 GB", desc: "Top-tier open coding model" },
      ]
    },
    {
      family: "🤏 SmolLM2",
      models: [
        { id: "SmolLM2-135M-Instruct-q0f16-MLC",        label: "SmolLM2 · 135M",   size: "~0.3 GB",  desc: "Ultra-tiny, instant responses" },
        { id: "SmolLM2-360M-Instruct-q4f16_1-MLC",      label: "SmolLM2 · 360M",   size: "~0.3 GB",  desc: "Small & snappy" },
        { id: "SmolLM2-1.7B-Instruct-q4f16_1-MLC",      label: "SmolLM2 · 1.7B",   size: "~1.1 GB",  desc: "Best SmolLM quality" },
      ]
    },
    {
      family: "🦎 TinyLlama",
      models: [
        { id: "TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC",  label: "TinyLlama · 1.1B", size: "~0.7 GB",  desc: "Tiny Llama for edge devices" },
      ]
    },
    {
      family: "🏕️ RedPajama",
      models: [
        { id: "RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC", label: "RedPajama · 3B",  size: "~2 GB",    desc: "Open chat model" },
      ]
    },
  ];

  const availableModels = modelCatalog.flatMap(f => f.models);

  const samplePrompts = [
    "Explain quantum physics in simple terms.",
    "Write a JavaScript script to fetch data from an API.",
    "Compose a short poem about space exploration.",
    "How does WebGPU run models locally in the browser?"
  ];

  // ── Persist chats to localStorage ────────────────────────────────────────
  useEffect(() => {
    localStorage.setItem('llm_chats_v2', JSON.stringify(chats));
  }, [chats]);

  // ── Check WebGPU support ─────────────────────────────────────────────────
  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.gpu) {
      setIsWebGPUSupported(false);
    }
  }, []);

  // ── Load engine when active chat's model changes ─────────────────────────
  useEffect(() => {
    if (!activeChat.model || !isWebGPUSupported) return;
    // Skip reload if the same model is already loaded
    if (loadedModel === activeChat.model && engine) return;

    let active = true;
    setIsLoading(true);
    setInitError(null);
    setProgressPercentage(0);
    setProgressText('Initializing...');
    setEngine(null);

    webllm.CreateMLCEngine(activeChat.model, {
      initProgressCallback: (report) => {
        if (!active) return;
        if (report && typeof report.progress === 'number') {
          setProgressPercentage(Math.round(report.progress * 100));
        }
        if (report && report.text) {
          setProgressText(report.text);
        }
      },
    })
    .then((createdEngine) => {
      if (!active) return;
      setEngine(createdEngine);
      setLoadedModel(activeChat.model);
      setIsLoading(false);
    })
    .catch((error) => {
      if (!active) return;
      console.error('Failed to load engine:', error);
      setInitError(error.message || 'Failed to initialize the MLC Web Engine.');
      setIsLoading(false);
    });

    return () => { active = false; };
  }, [activeChat.model, isWebGPUSupported]);

  // ── Auto-resize textarea ─────────────────────────────────────────────────
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
    }
  }, [input]);

  // ── Scroll to bottom on new messages ────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat.messages]);

  // ── Focus rename input when editing ─────────────────────────────────────
  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  // ── Chat management helpers ───────────────────────────────────────────────
  const updateActiveChat = useCallback((updater) => {
    setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, ...updater(c) } : c));
  }, [activeChatId]);

  const createChat = () => {
    const newChat = createNewChat({ model: activeChat.model, systemPrompt: activeChat.systemPrompt });
    setChats(prev => [newChat, ...prev]);
    setActiveChatId(newChat.id);
    setInput('');
    setSidebarOpen(false);
  };

  const deleteChat = (id) => {
    setChats(prev => {
      const remaining = prev.filter(c => c.id !== id);
      if (remaining.length === 0) {
        const fresh = createNewChat();
        setActiveChatId(fresh.id);
        return [fresh];
      }
      if (activeChatId === id) {
        setActiveChatId(remaining[0].id);
      }
      return remaining;
    });
  };

  const startRename = (chat) => {
    setRenamingId(chat.id);
    setRenameValue(chat.title);
  };

  const commitRename = () => {
    if (renamingId) {
      setChats(prev => prev.map(c => c.id === renamingId ? { ...c, title: renameValue.trim() || c.title } : c));
      setRenamingId(null);
    }
  };

  const clearActiveChat = () => {
    updateActiveChat(() => ({ messages: [] }));
  };

  // ── Send message ─────────────────────────────────────────────────────────
  // Derived: is the currently active chat generating?
  const isTyping = typingChatIds.has(activeChatId);

  async function sendMessageToLLM() {
    if (!input.trim() || !engine || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const chatHistory = activeChat.messages.filter(m => m.role !== 'system');
    const isFirstMessage = chatHistory.length === 0;

    const fullMessages = [
      { role: 'system', content: activeChat.systemPrompt },
      ...chatHistory,
      userMessage
    ];

    // Auto-title from first message
    if (isFirstMessage) {
      const autoTitle = input.trim().slice(0, 32) + (input.trim().length > 32 ? '…' : '');
      setChats(prev => prev.map(c => c.id === activeChatId ? { ...c, title: autoTitle } : c));
    }

    // Capture the chat ID at the time of submission so the state update
    // targets the right chat even if the user switches tabs mid-generation.
    const thisChatId = activeChatId;
    updateActiveChat(c => ({ messages: [...c.messages, userMessage] }));
    setInput('');
    setTypingChatIds(prev => new Set(prev).add(thisChatId));

    try {
      const reply = await engine.chat.completions.create({ messages: fullMessages });
      const response = reply.choices[0].message.content;
      setChats(prev => prev.map(c =>
        c.id === thisChatId
          ? { ...c, messages: [...c.messages, { role: 'assistant', content: response }] }
          : c
      ));
    } catch (error) {
      console.error(error);
      setChats(prev => prev.map(c =>
        c.id === thisChatId
          ? { ...c, messages: [...c.messages, {
              role: 'assistant',
              content: '⚠️ Error: Could not get a response. Please check your WebGPU status and try reloading.',
            }] }
          : c
      ));
    }

    setTypingChatIds(prev => {
      const next = new Set(prev);
      next.delete(thisChatId);
      return next;
    });
  }

  // ── Copy helper ──────────────────────────────────────────────────────────
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // ── Markdown formatter ───────────────────────────────────────────────────
  function formatMessage(text) {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped
      .replace(/```([\s\S]*?)```/gim, (_, code) =>
        `<pre class="bg-slate-950/80 p-3 rounded-lg border border-white/10 text-xs font-mono overflow-x-auto my-2 custom-scroll text-pink-300"><code>${code}</code></pre>`)
      .replace(/`([^`]+)`/gim, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-purple-300">$1</code>')
      .replace(/^### (.*$)/gim, '<h3 class="font-bold text-base mt-3 mb-1 text-white">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="font-bold text-lg mt-4 mb-1 text-white">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl mt-5 mb-2 text-white">$1</h1>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="italic text-slate-200">$1</em>')
      .replace(/(?:^|\n)[-*]\s+(.+)/g, (_, item) => `<li class="ml-4 list-disc text-slate-300">${item}</li>`)
      .replace(/(?:^|\n)\d+\.\s+(.+)/g, (_, item) => `<li class="ml-4 list-decimal text-slate-300">${item}</li>`)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" class="text-indigo-400 hover:text-indigo-300 underline transition-colors">$1</a>')
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-2 border border-white/10 shadow-lg" />')
      .replace(/\n/g, '<br>');
  }

  // ── Current model info ───────────────────────────────────────────────────
  const currentModelInfo = availableModels.find(m => m.id === activeChat.model);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#030014] text-slate-300 font-sans antialiased">
      {/* Background Neon Glows */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-purple-500/10 blur-[150px]" />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <div className={`fixed inset-y-0 left-0 z-40 w-72 glass-panel border-r border-white/10 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative`}>

        {/* Sidebar Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 glow-indigo">
              <RiSparkling2Line className="text-lg text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-wide">LLM Studio</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${engine ? 'bg-green-400 animate-pulse' : (isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-red-400')}`} />
                <span className="text-[10px] text-slate-400 font-medium font-mono">
                  {engine ? 'Ready' : (isLoading ? 'Downloading...' : 'Not Initialized')}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-3 pt-3 pb-1 shrink-0">
          <button
            id="new-chat-btn"
            onClick={createChat}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-dashed border-indigo-500/40 hover:border-indigo-400/70 hover:bg-indigo-600/10 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-all cursor-pointer group"
          >
            <FiPlus className="w-3.5 h-3.5 group-hover:rotate-90 transition-transform duration-200" />
            New Chat
          </button>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto custom-scroll px-2 py-2 space-y-0.5">
          <div className="px-2 pb-1 pt-1">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Chats</span>
          </div>

          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`chat-item group flex items-center gap-2 rounded-xl px-2.5 py-2 cursor-pointer transition-all duration-150 ${
                chat.id === activeChatId ? 'chat-item-active' : 'hover:bg-white/5'
              }`}
              onClick={() => {
                if (renamingId !== chat.id) {
                  setActiveChatId(chat.id);
                  setSidebarOpen(false);
                  setDropdownOpen(false);
                }
              }}
            >
              <FiMessageSquare className={`w-3.5 h-3.5 shrink-0 ${chat.id === activeChatId ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-400'}`} />

              {renamingId === chat.id ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onBlur={commitRename}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  onClick={e => e.stopPropagation()}
                  className="rename-input flex-1 min-w-0 text-xs text-white"
                />
              ) : (
                <span className={`flex-1 min-w-0 text-xs truncate ${chat.id === activeChatId ? 'text-white font-medium' : 'text-slate-400 group-hover:text-slate-300'}`}>
                  {chat.title}
                </span>
              )}

              {/* Action buttons — shown on hover or active */}
              <div className={`flex items-center gap-0.5 shrink-0 transition-opacity ${chat.id === activeChatId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                <button
                  title="Rename"
                  onClick={e => { e.stopPropagation(); startRename(chat); }}
                  className="p-1 rounded-md hover:bg-white/10 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                >
                  <FiEdit2 className="w-3 h-3" />
                </button>
                <button
                  title="Delete"
                  onClick={e => { e.stopPropagation(); deleteChat(chat.id); }}
                  className="p-1 rounded-md hover:bg-red-500/15 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                >
                  <FiTrash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Settings Section */}
        <div className="flex-shrink-0 border-t border-white/10 p-3 space-y-3 overflow-y-auto custom-scroll max-h-[45vh]">
          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Model</label>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl glass-input text-sm text-left font-medium hover:bg-white/5 transition-all text-white"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FiCpu className="text-indigo-400 shrink-0 w-3.5 h-3.5" />
                  <div className="min-w-0">
                    <div className="text-white text-xs font-semibold truncate">
                      {currentModelInfo?.label || activeChat.model.split('-')[0]}
                    </div>
                    <div className="text-slate-500 text-[10px] truncate">{currentModelInfo?.size || ''}</div>
                  </div>
                </div>
                <svg className={`w-3.5 h-3.5 shrink-0 transition-transform text-slate-400 ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute left-0 right-0 bottom-full mb-2 rounded-xl glass-dropdown z-50 shadow-2xl border border-white/10 max-h-64 overflow-y-auto custom-scroll">
                  {modelCatalog.map((family, fi) => (
                    <div key={fi}>
                      <div className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        {family.family}
                      </div>
                      {family.models.map((m, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            updateActiveChat(() => ({ model: m.id }));
                            setDropdownOpen(false);
                          }}
                          className={`w-full px-3 py-2.5 text-left hover:bg-indigo-600/15 transition-colors flex items-center gap-3 ${
                            activeChat.model === m.id ? 'bg-indigo-600/25' : ''
                          }`}
                        >
                          <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${activeChat.model === m.id ? 'bg-indigo-400' : 'bg-transparent'}`} />
                          <div className="min-w-0 flex-1">
                            <div className={`text-xs font-semibold truncate ${activeChat.model === m.id ? 'text-indigo-300' : 'text-slate-200'}`}>
                              {m.label}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate">{m.desc}</div>
                          </div>
                          <span className="text-[9px] text-slate-600 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded-md shrink-0 font-mono">
                            {m.size}
                          </span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* System Prompt */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">System Prompt</label>
            <textarea
              value={activeChat.systemPrompt}
              onChange={e => updateActiveChat(() => ({ systemPrompt: e.target.value }))}
              rows="3"
              className="w-full p-2.5 rounded-lg bg-black/20 border border-white/5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/40 resize-none leading-relaxed overflow-y-auto custom-scroll"
              placeholder="Configure assistant personality..."
            />
          </div>

          {/* Clear + footer */}
          <button
            onClick={clearActiveChat}
            disabled={activeChat.messages.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-xs font-medium text-slate-300 hover:text-red-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
            Clear Conversation
          </button>

          <div className="text-[10px] text-slate-500 flex justify-between px-1">
            <span>v0.2.78 (WebLLM)</span>
            <a href="https://github.com/mlc-ai/web-llm" target="_blank" className="hover:underline flex items-center gap-0.5 text-indigo-400">
              Docs <FiExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* ── Main Chat Interface ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Top Header */}
        <header className="lg:hidden w-full h-14 border-b border-white/10 glass-panel px-4 flex items-center justify-between shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <FiMenu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${engine ? 'bg-green-400' : (isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-red-400')}`} />
              <h2 className="text-sm font-semibold text-white truncate max-w-[160px]">
                {activeChat.title}
              </h2>
            </div>
          </div>
          <button
            onClick={clearActiveChat}
            disabled={activeChat.messages.length === 0}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 disabled:opacity-30 transition-all"
            title="Clear conversation"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </header>

        {/* Chat title bar (desktop) */}
        <div className="hidden lg:flex items-center justify-between px-6 py-3 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-2">
            <FiMessageSquare className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-white truncate max-w-xs">{activeChat.title}</span>
            <span className="text-[10px] text-slate-500 font-mono ml-1">
              {activeChat.messages.filter(m => m.role !== 'system').length} messages
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className={`w-1.5 h-1.5 rounded-full ${engine ? 'bg-green-400' : (isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-red-400')}`} />
            <span>{currentModelInfo?.label || activeChat.model.split('-')[0]}</span>
          </div>
        </div>

        {/* Conversation Area */}
        <div id="messages-container" className="flex-1 w-full overflow-y-auto px-4 py-6 space-y-4 custom-scroll">
          {activeChat.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-2xl mx-auto">
              <div className="p-4 rounded-3xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-white/10 mb-6 glow-indigo animate-pulse">
                <RiSparkling2Line className="text-5xl text-indigo-400" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Welcome to LLM Studio</h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Run state-of-the-art language models directly on your graphics hardware, fully private and entirely inside your browser using WebGPU.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(prompt)}
                    className="p-4 rounded-2xl glass-card text-left text-sm text-slate-300 hover:text-white hover:border-indigo-500/40 hover:bg-indigo-600/5 transition-all cursor-pointer border border-white/5"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-5">
              {activeChat.messages.filter(m => m.role !== 'system').map((msg, index) => (
                <div
                  key={index}
                  className={`flex w-full gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role !== 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md border border-white/10 shrink-0">
                      <RiRobot2Line className="text-sm text-white" />
                    </div>
                  )}
                  <div
                    className={`group relative max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed text-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-br from-indigo-600 to-indigo-700/80 text-white rounded-tr-none shadow-md border border-indigo-500/20'
                        : 'glass-card text-slate-100 rounded-tl-none border border-white/5 shadow-sm'
                    }`}
                  >
                    <div
                      className="prose prose-invert max-w-none text-slate-100 text-sm overflow-hidden"
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                    {msg.role === 'assistant' && (
                      <button
                        onClick={() => handleCopy(msg.content, index)}
                        className="absolute -bottom-2 -right-2 p-1.5 rounded-lg bg-slate-900/90 border border-white/10 text-slate-400 hover:text-white transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 shadow-md cursor-pointer"
                        title="Copy response"
                      >
                        {copiedIndex === index ? <FiCheck className="text-green-400 w-3 h-3" /> : <FiCopy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center border border-white/10 shrink-0 shadow-sm">
                      <RiUser3Line className="text-sm text-slate-300" />
                    </div>
                  )}
                </div>
              ))}

              {isTyping && (
                <div className="flex w-full gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center border border-white/10 shrink-0 shadow-md">
                    <RiRobot2Line className="text-sm text-white" />
                  </div>
                  <div className="glass-card rounded-2xl px-4 py-3 border border-white/5 shadow-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="w-full max-w-4xl mx-auto px-4 pb-6 mt-2 shrink-0">
          <div className="glass-panel rounded-2xl p-2 flex items-end gap-2 shadow-xl border border-white/10 focus-within:border-indigo-500/50 transition-colors relative">
            <textarea
              ref={textareaRef}
              rows="1"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  sendMessageToLLM();
                  e.preventDefault();
                }
              }}
              placeholder={isLoading ? 'Loading model resources...' : 'Ask anything...'}
              disabled={isLoading}
              className="flex-1 max-h-48 min-h-[44px] p-2 bg-transparent text-white placeholder-slate-400 focus:outline-none resize-none text-sm leading-relaxed overflow-y-auto custom-scroll"
            />
            <button
              onClick={sendMessageToLLM}
              disabled={isTyping || !input.trim() || isLoading}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-30 disabled:hover:bg-indigo-600 disabled:shadow-none disabled:active:scale-100 cursor-pointer"
              title="Send Message"
            >
              {isTyping ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <FiSend className="w-4 h-4" />
              )}
            </button>
          </div>
          <div className="text-[10px] text-center text-slate-500 mt-2 flex items-center justify-center gap-1.5">
            <span>Powered by MLC Web-LLM & WebGPU. Running fully locally.</span>
          </div>
        </div>
      </div>

      {/* ── Model Loading Overlay ─────────────────────────────────────────── */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="max-w-md w-full glass-panel rounded-3xl p-6 shadow-2xl border border-white/10 glow-indigo flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mb-6"></div>
            <h3 className="text-lg font-semibold text-white mb-2">Loading Model Resources</h3>
            <div className="mb-4 flex flex-col items-center gap-1">
              <p className="text-sm font-bold text-white">{currentModelInfo?.label || activeChat.model.split('-')[0]}</p>
              <p className="text-xs text-slate-500">{currentModelInfo?.desc || ''}</p>
            </div>
            <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed max-w-[280px] h-12 overflow-hidden text-ellipsis">
              {progressText || 'Downloading engine components...'}
            </p>
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
              <div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300 ease-out"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-xs text-indigo-400 font-bold">{progressPercentage}% Complete</span>
            <p className="text-[10px] text-slate-500 mt-4 italic">
              First download might take a few minutes depending on connection speeds. Weights will be cached in browser storage for future instant loads.
            </p>
          </div>
        </div>
      )}

      {/* ── WebGPU Not Supported Overlay ─────────────────────────────────── */}
      {!isWebGPUSupported && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
          <div className="max-w-md w-full glass-panel rounded-3xl p-6 shadow-2xl border border-red-500/20 glow-purple flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
              <FiAlertCircle className="text-3xl text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">WebGPU Not Supported</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              LLM Studio requires WebGPU acceleration to run models locally in your browser. Your current browser or hardware does not appear to support it.
            </p>
            <div className="text-left w-full bg-slate-900/50 rounded-xl p-4 border border-white/5 mb-6 text-xs text-slate-300 space-y-2">
              <p className="font-semibold text-white">Recommended Actions:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Ensure you are using the latest version of Chrome, Edge, or Opera.</li>
                <li>If using Chrome on macOS/Linux, verify hardware acceleration is enabled in browser settings.</li>
                <li>Make sure your system has compatible graphics hardware and drivers installed.</li>
              </ul>
            </div>
            <p className="text-xs text-slate-500">For more information, visit <a href="https://webgpu.io" target="_blank" className="text-indigo-400 underline">webgpu.io</a>.</p>
          </div>
        </div>
      )}

      {/* ── Init Error Overlay ───────────────────────────────────────────── */}
      {initError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="max-w-md w-full glass-panel rounded-3xl p-6 shadow-2xl border border-red-500/20 glow-purple flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-6">
              <FiAlertCircle className="text-3xl text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Model</h3>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed font-medium">
              An error occurred while downloading or compiling model kernels:
            </p>
            <p className="text-xs text-red-300 font-mono mb-6 bg-red-950/50 p-3 rounded-lg border border-red-900/30 w-full break-all max-h-36 overflow-y-auto">
              {initError}
            </p>
            <button
              onClick={() => {
                setInitError(null);
                setLoadedModel(null);
                setEngine(null);
              }}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg hover:shadow-indigo-500/20 active:scale-95 transition-all cursor-pointer"
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
