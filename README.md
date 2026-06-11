# 🧠 LLM Studio

<p align="center">
  <img src="https://img.shields.io/badge/WebGPU-Powered-blueviolet?style=flat-square" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?style=flat-square&logo=vite" />
  <img src="https://img.shields.io/badge/MLC_WebLLM-0.2.78-ff6b35?style=flat-square" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-38BDF8?style=flat-square&logo=tailwindcss" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" />
</p>

> **Run state-of-the-art language models directly in your browser — no server, no API keys, fully private.**

LLM Studio is a sleek, feature-rich chat interface that leverages **WebGPU** and **MLC Web-LLM** to execute large language models entirely on the user's GPU. Everything stays local: no data is sent to any server.

---

## ✨ Features

- 🚀 **100% Local Inference** — models run on your GPU via WebGPU; no cloud, no telemetry
- 💬 **Multi-Chat Sessions** — create, rename, delete, and switch between independent chat tabs
- 🤖 **20+ Supported Models** — Llama, DeepSeek R1, Phi, Mistral, Gemma, Qwen 2.5, SmolLM2, TinyLlama, RedPajama
- 🔄 **Per-Chat Model Selection** — each conversation can use a different model independently
- 🗂️ **Persistent History** — all chats and settings are saved in `localStorage` across sessions
- ✏️ **Custom System Prompts** — configure the assistant's personality per chat
- 📋 **Copy Responses** — one-click copy button on every assistant message
- 📝 **Auto-titling** — chats are automatically titled from your first message
- ⚡ **Streaming-ready architecture** — designed to support streamed token output
- 🎨 **Premium Dark UI** — glassmorphism design with neon accents and micro-animations
- 📱 **Responsive** — works on desktop and mobile (sidebar collapses on small screens)

---

## 🤖 Supported Models

| Family | Models | Size Range |
|--------|--------|-----------|
| 🦙 **Llama** | Llama 3.2 · 1B / 3B, Llama 3.1 · 8B, Llama 2 · 7B | 0.8 GB – 5 GB |
| 🧠 **DeepSeek R1** | DeepSeek-R1 · 7B (Qwen), DeepSeek-R1 · 8B (Llama) | ~5 GB |
| ⚡ **Phi** | Phi-3.5 Mini, Phi-3 Mini 4K | ~2.5 GB |
| 🌬️ **Mistral** | Mistral v0.3 · 7B, Hermes 2 Pro · 7B, OpenHermes 2.5 · 7B | ~4.5 GB |
| 💎 **Gemma** | Gemma 2 · 2B, Gemma 2 · 9B | 1.5 GB – 6 GB |
| 🐉 **Qwen 2.5** | 0.5B / 1.5B / 3B / 7B, Qwen Coder 1.5B / 7B | 0.4 GB – 5 GB |
| 🤏 **SmolLM2** | SmolLM2 · 135M / 360M / 1.7B | 0.3 GB – 1.1 GB |
| 🦎 **TinyLlama** | TinyLlama · 1.1B | ~0.7 GB |
| 🏕️ **RedPajama** | RedPajama · 3B | ~2 GB |

> Model weights are downloaded on first use and cached in the browser's IndexedDB for instant future loads.

---

## 🛠️ Tech Stack

| Technology | Version | Purpose |
|-----------|---------|---------|
| [React](https://react.dev) | 19 | UI framework |
| [Vite](https://vitejs.dev) | 6 | Build tool & dev server |
| [MLC Web-LLM](https://github.com/mlc-ai/web-llm) | 0.2.78 | In-browser LLM inference via WebGPU |
| [TailwindCSS](https://tailwindcss.com) | 4 | Utility-first styling |
| [react-icons](https://react-icons.github.io/react-icons/) | 5 | Icon library |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18
- A **WebGPU-capable browser**: Chrome 113+, Edge 113+, or Opera 99+ with hardware acceleration enabled
- A **discrete or integrated GPU** with sufficient VRAM for your chosen model (see size table above)

### Installation

```bash
# Clone the repository
git clone https://github.com/sourabh14022004/LLMStudio.git
cd LLMStudio

# Install dependencies
npm install

# Start the development server
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🎮 Usage

1. **Open the app** — the sidebar shows your chat history and model settings.
2. **Select a model** from the dropdown at the top of the sidebar (models are grouped by family).
3. **Wait for the model to load** — first download may take a few minutes; progress is shown on screen. Subsequent loads are instant from cache.
4. **Start chatting** — type your message and press **Enter** (or **Shift+Enter** for a new line).
5. **Manage chats** — use the **+ New Chat** button to open a new session; hover over a chat in the sidebar to rename ✏️ or delete 🗑️ it.
6. **System Prompt** — scroll down in the sidebar to customise the assistant's behaviour per chat.
7. **Copy responses** — hover over any assistant message to reveal the copy button.

---

## 📁 Project Structure

```
LLMStudio/
├── public/               # Static assets
├── src/
│   ├── App.jsx           # Main application component (chat UI, model management, state)
│   ├── index.css         # Global styles & Tailwind directives
│   └── main.jsx          # React entry point
├── index.html            # HTML shell
├── vite.config.js        # Vite configuration
├── eslint.config.js      # ESLint rules
└── package.json          # Dependencies & scripts
```

---

## ⚙️ How It Works

```
Browser (WebGPU) ──► MLC Web-LLM ──► WASM + WebGPU shaders
       │                                        │
       │          Model weights (GGUF/MLC)      │
       └──────────────────────────────────────► GPU
```

1. The app uses **`@mlc-ai/web-llm`** to create an in-browser inference engine.
2. On model selection, `CreateMLCEngine` downloads the quantised model weights and compiles WebGPU compute shaders.
3. Weights are cached in the browser's **Cache API / IndexedDB**, so they only download once.
4. Chat completions are generated by calling `engine.chat.completions.create()` — a familiar OpenAI-compatible API.
5. Each chat session stores its message history, selected model, and system prompt independently in `localStorage`.

---

## 🔒 Privacy

- **No data leaves your device.** All inference runs locally on your GPU.
- No API keys, no accounts, no telemetry.
- Chat history is stored only in your browser's `localStorage`.

---

## 🌐 Browser Compatibility

| Browser | WebGPU Support | Status |
|---------|---------------|--------|
| Chrome 113+ | ✅ | Fully supported |
| Edge 113+ | ✅ | Fully supported |
| Opera 99+ | ✅ | Fully supported |
| Firefox | ⚠️ | Experimental (flag required) |
| Safari | ⚠️ | Partial (macOS 14+ only) |

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

This project is open source under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

- [MLC AI / Web-LLM](https://github.com/mlc-ai/web-llm) for the incredible in-browser inference engine
- [WebGPU](https://gpuweb.github.io/gpuweb/) for making GPU-accelerated compute possible in the browser
- All the open-weight model creators — Meta, Mistral AI, Google, Microsoft, Alibaba, DeepSeek, and others
