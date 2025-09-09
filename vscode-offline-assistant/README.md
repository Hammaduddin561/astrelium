# 🌌 VS Code Offline Assistant

Astrelium is a local-first coding assistant built as a VS Code extension. It connects to your own LLM (like `gpt-oss:20b` via Ollama) and responds to prompts directly inside the editor—no cloud, no latency, just pure offline magic.

---

## 🚀 Features

- 🧠 Ask coding questions and get instant answers
- 🔌 Works with local models (Ollama, LM Studio, etc.)
- 💬 Responses appear directly in the editor
- 🛠️ Built with TypeScript + esbuild for fast development cycles

---

## 📦 Setup

1. Clone this repository  
2. Run `npm install`  
3. Run `npm run compile`  
4. Press `F5` in your IDE to launch the Extension Development Host

---

## 🧠 Usage

1. Open Command Palette (`Ctrl+Shift+P`)
2. Type `Ask Assistant`
3. Enter a prompt like:  
   `Write a Python function to reverse a string`
4. The assistant responds directly in the editor

---

## 🔗 Local Model Requirements

Make sure [Ollama](https://ollama.com) is running with a model like `gpt-oss:20b`:

```bash
ollama run gpt-oss:20b
```