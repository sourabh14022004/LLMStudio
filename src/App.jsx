import React, { useState, useRef, useEffect } from 'react';
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
  FiExternalLink 
} from 'react-icons/fi';
import { RiSparkling2Line, RiRobot2Line, RiUser3Line } from 'react-icons/ri';

const App = () => {
  // Input and Chat States
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("llm_messages");
    return saved ? JSON.parse(saved) : [];
  });
  
  // Model Configuration
  const [model, setModel] = useState("Llama-3.2-1B-Instruct-q4f32_1-MLC");
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful, respectful, and honest assistant. Answer as briefly and accurately as possible.'
  );
  
  // Engine and Progress States
  const [engine, setEngine] = useState(null);
  const [progressText, setProgressText] = useState('');
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [isWebGPUSupported, setIsWebGPUSupported] = useState(true);
  const [initError, setInitError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // UI States
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const availableModels = [
    "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    "RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC"
  ];

  const samplePrompts = [
    "Explain quantum physics in simple terms.",
    "Write a JavaScript script to fetch data from an API.",
    "Compose a short poem about space exploration.",
    "How does WebGPU run models locally in the browser?"
  ];

  // Save messages to LocalStorage
  useEffect(() => {
    localStorage.setItem("llm_messages", JSON.stringify(messages));
  }, [messages]);

  // Check WebGPU Support
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.gpu) {
      setIsWebGPUSupported(false);
    }
  }, []);

  // Initialize MLC Engine
  useEffect(() => {
    if (!model || !isWebGPUSupported) return;
    
    let active = true;
    setIsLoading(true);
    setInitError(null);
    setProgressPercentage(0);
    setProgressText('Initializing...');
    setEngine(null);

    webllm.CreateMLCEngine(model, {
      initProgressCallback: (report) => {
        if (!active) return;
        console.log("initProgress", report);
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
      setIsLoading(false);
    })
    .catch((error) => {
      if (!active) return;
      console.error("Failed to load engine:", error);
      setInitError(error.message || "Failed to initialize the MLC Web Engine.");
      setIsLoading(false);
    });

    return () => {
      active = false;
    };
  }, [model, isWebGPUSupported]);

  // Handle Textarea Auto-Resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 192)}px`;
    }
  }, [input]);

  // Scroll to Bottom when Messages Update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send Message function
  async function sendMessageToLLM() {
    if (!input.trim() || !engine || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    const chatHistory = messages.filter(m => m.role !== 'system');
    
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...chatHistory,
      userMessage
    ];

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const reply = await engine.chat.completions.create({
        messages: fullMessages,
      });
      const response = reply.choices[0].message.content; 
      const assistantMessage = {
        role: 'assistant',
        content: response,
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "⚠️ Error: Could not get a response. Please check your WebGPU status and try reloading.",
      }]);
    }

    setIsTyping(false);
  }

  // Copy helper
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Clear chat
  const clearHistory = () => {
    setMessages([]);
  };

  // Formatter for Markdown
  function formatMessage(text) {
    if (!text) return "";
    
    // Escape HTML to prevent XSS
    let escaped = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
      
    return escaped
      // Code blocks
      .replace(/```([\s\S]*?)```/gim, (match, code) => {
        return `<pre class="bg-slate-950/80 p-3 rounded-lg border border-white/10 text-xs font-mono overflow-x-auto my-2 custom-scroll text-pink-300"><code>${code}</code></pre>`;
      })
      // Inline code
      .replace(/`([^`]+)`/gim, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-xs font-mono text-purple-300">$1</code>')
      // Headings
      .replace(/^### (.*$)/gim, '<h3 class="font-bold text-base mt-3 mb-1 text-white">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="font-bold text-lg mt-4 mb-1 text-white">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="font-bold text-xl mt-5 mb-2 text-white">$1</h1>')
      // Bold and Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong class="font-semibold text-white">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em class="italic text-slate-200">$1</em>')
      // Bullet lists
      .replace(/(?:^|\n)[-*]\s+(.+)/g, (match, item) => {
        return `<li class="ml-4 list-disc text-slate-300">${item}</li>`;
      })
      // Numbered lists
      .replace(/(?:^|\n)\d+\.\s+(.+)/g, (match, item) => {
        return `<li class="ml-4 list-decimal text-slate-300">${item}</li>`;
      })
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" class="text-indigo-400 hover:text-indigo-300 underline transition-colors">$1</a>')
      // Images
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" class="rounded-lg max-w-full my-2 border border-white/10 shadow-lg" />')
      // Tables
      .replace(/^\|(.+)\|\n\|([-:\s|]+)\|\n((\|.*\|\n)*)/gim, (match, header, divider, rows) => {
        const headers = header.split('|').map(h => `<th class="border border-white/10 px-3 py-1.5 bg-white/5 font-semibold text-white">${h.trim()}</th>`).join('');
        const rowHtml = rows.trim().split('\n').map(row => {
          const cells = row.split('|').map(c => `<td class="border border-white/10 px-3 py-1.5">${c.trim()}</td>`).join('');
          return `<tr class="hover:bg-white/5 transition-colors">${cells}</tr>`;
        }).join('');
        return `<div class="overflow-x-auto my-2 rounded-lg border border-white/10"><table class="table-auto w-full border-collapse text-left text-sm"><thead><tr>${headers}</tr></thead><tbody>${rowHtml}</tbody></table></div>`;
      })
      // Line breaks
      .replace(/\n/g, '<br>');
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#030014] text-slate-300 font-sans antialiased">
      {/* Background Neon Glows */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute -top-[40%] -left-[20%] w-[80%] h-[80%] rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="absolute -bottom-[40%] -right-[20%] w-[80%] h-[80%] rounded-full bg-purple-500/10 blur-[150px]" />
      </div>

      {/* Sidebar Panel */}
      <div className={`fixed inset-y-0 left-0 z-40 w-80 glass-panel border-r border-white/10 flex flex-col transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative`}>
        {/* Sidebar Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 glow-indigo">
              <RiSparkling2Line className="text-xl text-white animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">LLM Studio</h1>
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${engine ? 'bg-green-400 animate-pulse' : (isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-red-400')}`} />
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
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scroll">
          {/* Model Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Model</label>
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full flex items-center justify-between p-3 rounded-xl glass-input text-sm text-left font-medium hover:bg-white/5 transition-all text-white"
              >
                <div className="flex items-center gap-2">
                  <FiCpu className="text-indigo-400" />
                  <span className="truncate max-w-[180px]">{model.split('-')[0]}</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {dropdownOpen && (
                <div className="absolute left-0 right-0 mt-2 rounded-xl glass-dropdown z-50 overflow-hidden shadow-2xl border border-white/10">
                  {availableModels.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setModel(m);
                        setDropdownOpen(false);
                      }}
                      className={`w-full p-3 text-left text-sm hover:bg-indigo-600/20 transition-colors flex items-center gap-2 ${model === m ? 'bg-indigo-600/30 text-white font-semibold' : 'text-slate-300'}`}
                    >
                      <div className={`w-2 h-2 rounded-full ${model === m ? 'bg-indigo-400' : 'bg-transparent'}`} />
                      <span className="truncate">{m.split('-')[0]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Settings Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Config</label>
            <div className="glass-card rounded-xl p-3 border border-white/5 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-slate-300 font-medium">System Prompt</span>
                </div>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows="4"
                  className="w-full p-2.5 rounded-lg bg-black/20 border border-white/5 text-xs text-slate-300 focus:outline-none focus:border-indigo-500/40 resize-none leading-relaxed overflow-y-auto custom-scroll"
                  placeholder="Configure assistant personality..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Footer */}
        <div className="p-5 border-t border-white/10 space-y-3 bg-[#07051a]/40">
          <button
            onClick={clearHistory}
            disabled={messages.length === 0}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 text-xs font-medium text-slate-300 hover:text-red-200 disabled:opacity-30 disabled:pointer-events-none transition-all cursor-pointer"
          >
            <FiTrash2 className="w-3.5 h-3.5" />
            Clear Conversation
          </button>
          <div className="text-[10px] text-slate-500 text-center flex justify-between px-1">
            <span>v0.2.78 (WebLLM)</span>
            <a href="https://github.com/mlc-ai/web-llm" target="_blank" className="hover:underline flex items-center gap-0.5 text-indigo-400">
              Docs <FiExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header for Mobile/Tablet */}
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
              <h2 className="text-sm font-semibold text-white truncate max-w-[150px]">{model.split('-')[0]}</h2>
            </div>
          </div>
          
          <button
            onClick={clearHistory}
            disabled={messages.length === 0}
            className="p-1.5 rounded-lg hover:bg-red-500/10 text-slate-400 hover:text-red-400 disabled:opacity-30 transition-all"
            title="Clear conversation"
          >
            <FiTrash2 className="w-4 h-4" />
          </button>
        </header>

        {/* Conversation Area */}
        <div id="messages-container" className="flex-1 w-full overflow-y-auto px-4 py-6 space-y-4 custom-scroll">
          {messages.length === 0 ? (
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
              {messages.filter(m => m.role !== 'system').map((msg, index) => (
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
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  sendMessageToLLM();
                  e.preventDefault();
                }
              }}
              placeholder={isLoading ? "Loading model resources..." : "Ask anything..."}
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

      {/* Model Loading Dialog Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="max-w-md w-full glass-panel rounded-3xl p-6 shadow-2xl border border-white/10 glow-indigo flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/30 border-t-indigo-500 animate-spin mb-6"></div>
            <h3 className="text-lg font-semibold text-white mb-2">Loading Model Resources</h3>
            <p className="text-xs text-indigo-300 font-mono mb-4 px-3 py-1 bg-indigo-500/10 rounded-lg border border-indigo-500/20 max-w-full truncate">{model.split('-')[0]}</p>
            <p className="text-sm text-slate-400 mb-6 font-medium leading-relaxed max-w-[280px] h-12 overflow-hidden text-ellipsis">{progressText || "Downloading engine components..."}</p>
            
            {/* Progress bar container */}
            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden mb-2">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300 ease-out" 
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <span className="text-xs text-indigo-400 font-bold">{progressPercentage}% Complete</span>
            
            <p className="text-[10px] text-slate-500 mt-4 italic">First download might take a few minutes depending on connection speeds. Weights will be cached in browser storage for future instant loads.</p>
          </div>
        </div>
      )}

      {/* WebGPU Warnings Dialog Overlay */}
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

      {/* Init Error Dialog Overlay */}
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
                const currentModel = model;
                setModel('');
                setTimeout(() => setModel(currentModel), 10);
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
