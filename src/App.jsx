import React, { useState, useRef, useEffect } from 'react';
import * as webllm from "@mlc-ai/web-llm";
import { GrUploadOption } from "react-icons/gr";

const App = () => {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [model, setModel] = useState("Llama-3.2-1B-Instruct-q4f32_1-MLC");
  const [messages, setMessages] = useState([
    { role: 'system', content: 'Hello! How can I assist you today?' }
  ]);
  const [engine, setEngine] = useState(null);

  const textareaRef = useRef(null);
  const inputareaRef = useRef(null);
  const messagesEndRef = useRef(null);

  const availableModels = [
    "Llama-3.2-1B-Instruct-q4f32_1-MLC",
    "RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC"
  ];

  // useEffect(() => {
  //   if (!model) return;
  //   setEngine(null);
  //   webllm.CreateMLCEngine(model, {
  //     initProgressCallback: (progress) => console.log("initProgress", progress),
  //   }).then(setEngine);
  // }, [model]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
      inputareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 250) + 40}px`;
      setIsExpanded(textareaRef.current.scrollHeight > 60);
    }
  }, [input]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessageToLLM() {
    if (!input.trim() || !engine) return;

    const userMessage = { role: 'user', content: input.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    try {
      const reply = await engine.chat.completions.create({
        messages: [...messages, userMessage],
      });
      const response = reply.choices[0].message.content; 
      const assistantMessage = {
        role: 'assistant',
        content: response,
      };
      console.log("Assistant:", reply);  
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "⚠️ Error: Could not get a response.",
      }]);
    }

    setIsTyping(false);
  }

  function formatMessage(text) {
    return text
      // Headings
      .replace(/^### (.*$)/gim, '<h3 class="font-bold text-lg mt-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="font-bold text-xl mt-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="font-bold text-2xl mt-4">$1</h1>')

      // Bold and Italic
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')

      // Inline code and blocks
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-gray-900 p-2 rounded text-sm overflow-x-auto"><code>$1</code></pre>')
      .replace(/`([^`]+)`/gim, '<code class="bg-gray-800 p-1 rounded">$1</code>')

      // Links: [text](url)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" class="text-blue-400 underline">$1</a>')

      // Images: ![alt](url)
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/gim, '<img src="$2" alt="$1" class="rounded max-w-full my-2" />')

      // Basic tables (Markdown format: pipe-delimited)
      .replace(/^\|(.+)\|\n\|([-:\s|]+)\|\n((\|.*\|\n)*)/gim, (match, header, divider, rows) => {
        const headers = header.split('|').map(h => `<th class="border px-2 py-1">${h.trim()}</th>`).join('');
        const rowHtml = rows.trim().split('\n').map(row => {
          const cells = row.split('|').map(c => `<td class="border px-2 py-1">${c.trim()}</td>`).join('');
          return `<tr>${cells}</tr>`;
        }).join('');
        return `<table class="table-auto border-collapse border border-gray-700 my-2"><thead><tr>${headers}</tr></thead><tbody>${rowHtml}</tbody></table>`;
      })

      // Line breaks
      .replace(/\n/g, '<br>');
  }

  return (
    <div className="overflow-x-hidden text-stone-300 antialiased h-full w-full flex flex-col items-center justify-center">
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 z-[-2] h-screen w-screen bg-neutral-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]"></div>
      </div>

      {/* Model Selector */}
      <div className="mt-4">
        <select
          value={model}
          onChange={(e) => setModel(e.target.value)}
          className="bg-gray-800 text-white p-2 rounded-md"
        >
          {availableModels.map((m, i) => (
            <option key={i} value={m}>{m}</option>
          ))}
        </select>
      </div>

      {/* Conversation Area */}
      <div id='conversation-area' className="lg:w-8/12 w-full h-[90vh] flex flex-col items-center justify-end pb-5">
        <div id='messages' className="overflow-y-auto flex flex-col gap-2 lg:w-full sm:w-160 w-5/6 h-full p-2 custom-scroll">
          {messages.filter(m => m.role !== "system").map((msg, index) => (
            <div
              key={index}
              className={`w-fit h-fit max-w-[80%] p-2 rounded-2xl flex flex-col whitespace-pre-wrap leading-relaxed text-sm prose prose-invert prose-p:my-1 ${
                msg.role === 'user' ? 'self-end bg-gray-600' : 'self-start bg-blue-600'
              }`}
            >
              <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
            </div>
          ))}
          {isTyping && (
            <div className="self-start bg-blue-600 p-2 rounded-2xl animate-pulse">
              Typing<span className="dot-animation">...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div id="input-area" ref={inputareaRef} className="lg:w-full sm:w-160 w-5/6 min-h-[50px] flex items-center justify-center bg-gray-500 rounded-3xl p-2 gap-2">
          <textarea
            ref={textareaRef}
            className="flex-1 p-2 h-full text-white placeholder:text-stone-300 border-none 
              rounded-3xl focus:outline-none resize-none overflow-y-auto 
              max-h-[400px] bg-transparent"
            rows="1"
            placeholder="Ask anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                sendMessageToLLM();
                e.preventDefault();
              }
            }}
          ></textarea>
          <button
            onClick={sendMessageToLLM}
            disabled={isTyping}
            className={`justify-center items-center rounded-full bg-neutral-800 hover:bg-neutral-700 transition-all ${isExpanded ? 'self-end mt-2' : 'self-center'}`}
          >
            
            {isTyping ? "..." : <GrUploadOption className=' text-4xl'/>}
          </button>
        </div>
      </div>

      {/* Typing dots animation */}
      <style>{`
        .dot-animation::after {
          content: '';
          display: inline-block;
          width: 1em;
          animation: dots 1.5s steps(3, end) infinite;
        }
        @keyframes dots {
          0% { content: ''; }
          33% { content: '.'; }
          66% { content: '..'; }
          100% { content: '...'; }
        }
      `}</style>
    </div>
  );
};

export default App;
