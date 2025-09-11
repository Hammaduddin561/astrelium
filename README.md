# 🌌 Astrelium: Advanced AI Coding Assistant for VS Code

<div align="center">
  <img src="https://raw.githubusercontent.com/Hammaduddin561/astrelium/main/assets/astronaut-logo.png" alt="Astrelium Logo" width="200"/>
  <h3>Your intelligent coding companion</h3>
</div>

![Astrelium Interface](https://raw.githubusercontent.com/Hammaduddin561/astrelium/main/assets/astrelium-interface.jpg)

Astrelium is a powerful, intelligent local-first coding assistant built as a VS Code extension. It connects to your own LLM (like `gpt-oss:20b` via Ollama) and provides comprehensive development capabilities including automated project creation, workspace analysis, code review, testing, debugging, and much more—all offline with no cloud dependencies.

---

## 🚀 Features

<div align="center">
  <img src="https://raw.githubusercontent.com/Hammaduddin561/astrelium/main/assets/astrelium-interface.jpg" alt="Astrelium Chat Interface" width="600"/>
  <p><em>Modern chat interface with intelligent code assistance</em></p>
</div>

### 🧠 **Smart AI Assistant**
- **Automated Project Creation**: Create complete projects with proper file structures, dependencies, and build configurations
- **Intelligent Code Generation**: Generate, compile, test, and debug code automatically
- **Real-time Error Detection**: Automatic debugging with intelligent error analysis and fixes
- **Context-Aware Responses**: Understands your project structure and provides relevant suggestions

### 📊 **Advanced Workspace Analysis**
- **Deep Project Understanding**: Automatically analyzes project type, languages, frameworks, and dependencies
- **File Structure Mapping**: Complete workspace mapping with entry points, test files, and documentation
- **Git Integration**: Tracks repository status, branches, and changes
- **Performance Metrics**: Calculates project statistics including file count, lines of code, and main files

### 🔧 **Professional Development Tools**
- **Code Review**: Comprehensive code quality analysis with best practices suggestions
- **Architectural Guidance**: Suggests improvements and design patterns for your projects
- **Test Generation**: Creates comprehensive test suites including unit, integration, and edge case tests
- **Code Optimization**: Performance optimization with before/after comparisons
- **Security Auditing**: Vulnerability scanning and security best practices enforcement

### 🛠️ **Advanced Code Operations**
- **Intelligent Refactoring**: Apply design patterns (MVC, Singleton, Factory, Observer) automatically
- **Code Explanation**: Detailed explanations of complex code logic and algorithms
- **Documentation Generation**: Create README files, API docs, and user guides automatically
- **Migration Planning**: Detailed plans for migrating between technologies (React, Vue, Python, etc.)
- **API Documentation**: Generate OpenAPI/Swagger specifications automatically

### 📁 **File Management**
- **Universal File Upload**: Share any file type (PDF, DOC, images, code files) up to 10MB
- **Smart File Analysis**: Automatic content analysis and context extraction
- **Backup Creation**: Automatic backups before code modifications
- **Multi-format Support**: Handles various programming languages and file formats

### 💬 **Enhanced Chat Interface**
- **Modern UI**: Beautiful glass morphism design with smooth animations
- **Persistent History**: Chat history saved and restored across sessions
- **Syntax Highlighting**: Proper code formatting with language-specific highlighting
- **File Preview**: Visual preview of uploaded files before processing
- **Responsive Design**: Optimized for different screen sizes

### 🔌 **Offline-First Architecture**
- **Local LLM Integration**: Works with Ollama, LM Studio, and other local models
- **No Cloud Dependencies**: Complete privacy with all processing done locally
- **Fast Performance**: Direct integration with VS Code for optimal speed
- **Secure**: No data sent to external servers

---

## 🎯 Advanced Commands

Astrelium recognizes natural language commands for advanced operations:

### Code Analysis & Review
- `"review code"` or `"code review"` - Comprehensive code quality analysis
- `"explain code"` or `"explain this"` - Detailed code explanations
- `"analyze performance"` - Performance analysis with optimization suggestions
- `"check security"` or `"security audit"` - Security vulnerability scanning

### Code Generation & Modification
- `"generate tests"` or `"create tests"` - Generate comprehensive test suites
- `"optimize code"` or `"optimize this"` - Code optimization with performance improvements
- `"refactor [pattern]"` - Apply specific design patterns (mvc, singleton, factory, observer)
- `"generate documentation"` - Create project documentation

### Project Management
- `"suggest architecture"` - Architectural improvements and design patterns
- `"api documentation"` - Generate API documentation with OpenAPI specs
- `"migrate to [technology]"` - Create migration plans between technologies

### Example Commands:
```
"Review this code for best practices"
"Generate unit tests for the current file"
"Optimize this code for better performance"
"Suggest architectural improvements for this project"
"Create API documentation"
"Refactor using MVC pattern"
"Migrate this project to React"
"Check for security vulnerabilities"
```

---

## 📦 Setup

1. **Install Ollama**: Download from [ollama.com](https://ollama.com)
2. **Install Model**: Run `ollama pull gpt-oss:20b` in terminal
3. **Start Ollama**: Run `ollama serve` or `ollama run gpt-oss:20b`
4. **Clone Repository**: `git clone https://github.com/your-repo/astrelium.git`
5. **Install Dependencies**: `cd astrelium && npm install`
6. **Compile Extension**: `npm run compile`
7. **Launch**: Press `F5` in VS Code to start Extension Development Host

---

## 📸 Screenshots

<div align="center">
  
### 🌌 Welcome Interface
<img src="https://raw.githubusercontent.com/Hammaduddin561/astrelium/main/assets/astronaut-logo.png" alt="Astrelium Logo" width="150"/>

### 💬 Chat Interface
<img src="https://raw.githubusercontent.com/Hammaduddin561/astrelium/main/assets/astrelium-interface.jpg" alt="Astrelium Chat Interface" width="500"/>
<p><em>Astrelium's intuitive chat interface with modern design and intelligent responses</em></p>

</div>

---

## 🧠 Usage

### Basic Chat
1. Open the Astrelium sidebar panel (🌌 icon)
2. Type your coding questions or requests
3. Get intelligent, context-aware responses

### Project Creation
1. Type: `"Create a [language] [project type] with [features]"`
2. Astrelium analyzes requirements and creates complete project structure
3. Automatically compiles, tests, and debugs the code
4. Opens created files in VS Code for immediate editing

### Advanced Operations
1. Open a file you want to analyze/modify
2. Use natural language commands for specific operations
3. Astrelium provides detailed analysis and automated improvements
4. Review changes and backups created automatically

### File Sharing
1. Click 📎 button to upload files (any format, up to 10MB)
2. Astrelium analyzes content and provides relevant assistance
3. Supports images, documents, code files, and more

---

## 🔗 Local Model Requirements

Ensure Ollama is running with the gpt-oss:20b model:

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull the model
ollama pull gpt-oss:20b

# Start the model
ollama run gpt-oss:20b
```

Or use other compatible local models by modifying the API endpoint in the extension settings.

---

## ⚙️ Configuration

The extension automatically detects and analyzes your workspace, but you can customize:

- **Model Settings**: Change the model name in `src/extension.ts`
- **API Endpoint**: Modify the Ollama endpoint (default: `localhost:11434`)
- **Context Window**: Adjust the number of tokens for longer conversations
- **Auto-compilation**: Enable/disable automatic compilation and testing

---

## 🎨 UI Features

- **🌌 Astronaut Theme**: Custom logo and space-themed design
- **✨ Glass Morphism**: Modern translucent UI elements
- **🎯 Smart Highlighting**: Language-specific syntax highlighting
- **📱 Responsive**: Adapts to different panel sizes
- **🔄 Smooth Animations**: Elegant transitions and loading states

---

## 🛡️ Privacy & Security

- **100% Local**: All processing happens on your machine
- **No Telemetry**: No data collection or external communication
- **Secure**: Files and conversations stay private
- **Open Source**: Full transparency with open codebase

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 🐛 Troubleshooting

### Extension Not Loading
- Ensure Ollama is running: `ollama serve`
- Check model availability: `ollama list`
- Verify VS Code version compatibility

### Model Not Responding
- Restart Ollama service
- Check model is running: `ollama ps`
- Verify network connectivity to localhost:11434

### Compilation Errors
- Run `npm install` to update dependencies
- Check TypeScript version: `tsc --version`
- Clear build cache: `npm run clean`

---

## 📄 License

Apache License 2.0 - see [LICENSE](LICENSE) file for details.

---

## 🌟 Acknowledgments

- Built with TypeScript and VS Code Extension API
- Powered by Ollama for local LLM inference
- Inspired by modern AI development workflows
- Community-driven feature development

---

**🚀 Ready to revolutionize your coding experience? Install Astrelium and unleash the power of local AI assistance!**EADME

This is the README for your extension "astrelium". After writing up a brief description, we recommend including the following sections.

## Features

Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image subfolder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow.

## Requirements

If you have any requirements or dependencies, add a section describing those and how to install and configure them.

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: Enable/disable this extension.
* `myExtension.thing`: Set to `blah` to do something.

---

## 📋 **Requirements**

- **Visual Studio Code** 1.80.0 or higher
- **Node.js** 16.0 or higher
- **Ollama** (or compatible local LLM server)
- **Local LLM Model** (recommended: `gpt-oss:20b`)

---

## 🔧 Installation

### From VS Code Marketplace (Coming Soon)
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Astrelium"
4. Click Install

### Manual Installation
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run compile` to build the extension
4. Press `F5` to launch Extension Development Host
5. The Astrelium sidebar will appear in the Activity Bar

---

## ⚙️ Setup

### 1. Install Ollama
```bash
# Install Ollama (visit https://ollama.ai for platform-specific instructions)
curl -fsSL https://ollama.ai/install.sh | sh

# Pull the recommended model
ollama pull gpt-oss:20b
```

### 2. Start Ollama Server
```bash
ollama serve
```

### 3. Configure Astrelium
- Open VS Code and look for the Astrelium icon in the sidebar
- Click to open the chat interface
- The extension will automatically connect to Ollama on `localhost:11434`

---

## 🎯 Usage

### Basic Commands
- **Create Projects**: "Create a React app with TypeScript"
- **Code Generation**: "Add a display function in this file"
- **Code Review**: "Review this code for best practices"
- **Testing**: "Generate tests for this function"
- **Documentation**: "Create documentation for this project"

### Advanced Features
- **Workspace Analysis**: Automatic project understanding and context
- **File Upload**: Drag and drop files for analysis
- **Code Refactoring**: Apply design patterns automatically
- **Security Auditing**: Scan for vulnerabilities
- **Migration Planning**: Get migration strategies between frameworks

---

## 🏗️ Architecture

Astrelium is built with:
- **TypeScript** for extension logic
- **VS Code Extension API** for editor integration
- **WebView API** for modern chat interface
- **Node.js** for file system operations
- **Ollama API** for local LLM communication

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
```bash
git clone https://github.com/mdhammaduddin/astrelium.git
cd astrelium
npm install
npm run compile
```

### Running Tests
```bash
npm test
```

---

## 📄 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

```
Copyright 2025 Md Hammaduddin

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
```

---

## 🐛 Issues & Support

- **Bug Reports**: [GitHub Issues](https://github.com/mdhammaduddin/astrelium/issues)
- **Feature Requests**: [GitHub Discussions](https://github.com/mdhammaduddin/astrelium/discussions)
- **Documentation**: [Wiki](https://github.com/mdhammaduddin/astrelium/wiki)

---

## 🙏 Acknowledgments

- Built with ❤️ using VS Code Extension API
- Powered by local LLM models via Ollama
- Inspired by the need for privacy-focused AI development tools

---

## 🔮 Roadmap

- [ ] VS Code Marketplace publication
- [ ] Support for more LLM providers (LM Studio, OpenAI-compatible APIs)
- [ ] Plugin system for custom AI functions
- [ ] Team collaboration features
- [ ] Advanced code analysis and metrics
- [ ] Integration with popular development tools

---

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/Hammaduddin561/astrelium?style=social)
![GitHub forks](https://img.shields.io/github/forks/Hammaduddin561/astrelium?style=social)
![GitHub issues](https://img.shields.io/github/issues/Hammaduddin561/astrelium)
![GitHub license](https://img.shields.io/github/license/Hammaduddin561/astrelium)
![VS Code version](https://img.shields.io/badge/VS%20Code-%3E%3D1.80.0-blue)

---

<div align="center">
  
### 🚀 Ready to revolutionize your coding experience?

<img src="https://raw.githubusercontent.com/Hammaduddin561/astrelium/main/assets/astronaut-logo.png" alt="Astrelium Astronaut" width="100"/>

**Install Astrelium and unleash the power of local AI assistance!**

*Built with ❤️ for developers who value privacy and performance*

</div>
