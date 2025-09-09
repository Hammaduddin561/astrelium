# Contributing to Astrelium

Thank you for your interest in contributing to Astrelium! We welcome contributions from the community.

## 🤝 How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues to avoid duplicates. When creating a bug report, include:

- **Clear description** of the issue
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots** if applicable
- **Environment details** (OS, VS Code version, Node.js version)
- **Console logs** if relevant

### Suggesting Features

Feature requests are welcome! Please:

1. Check if the feature already exists or has been requested
2. Clearly describe the feature and its benefits
3. Provide examples of how it would be used
4. Consider implementation complexity

### Pull Requests

1. **Fork** the repository
2. **Create a branch** for your feature (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following the coding standards below
4. **Test thoroughly** - ensure all existing tests pass
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request** with a clear description

## 🛠️ Development Setup

### Prerequisites

- Node.js 16.0 or higher
- npm or yarn
- VS Code
- Git

### Local Development

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/astrelium.git
cd astrelium

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run in development mode
# Press F5 in VS Code to start Extension Development Host
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run watch-tests
```

## 📝 Coding Standards

### TypeScript Guidelines

- Use **TypeScript** for all new code
- Follow **strict mode** settings
- Use **interfaces** for type definitions
- Write **JSDoc comments** for public functions
- Use **async/await** instead of Promises when possible

### Code Style

- Use **4 spaces** for indentation
- Follow **camelCase** for variables and functions
- Follow **PascalCase** for classes and interfaces
- Use **UPPER_CASE** for constants
- Maximum line length: **120 characters**

### File Structure

```
src/
├── extension.ts          # Main extension file
├── types/               # Type definitions
├── utils/               # Utility functions
├── services/            # Service classes
└── test/               # Test files
```

### Commit Messages

Use conventional commit format:

```
feat: add new AI function for code review
fix: resolve fetch API issue with Ollama
docs: update README with installation steps
test: add unit tests for workspace analysis
refactor: improve error handling in chat provider
```

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for all public APIs
- Include code examples for new features
- Update CHANGELOG.md for releases

## 🧪 Testing Guidelines

### Unit Tests

- Write tests for all new functions
- Use descriptive test names
- Test both success and error cases
- Mock external dependencies

### Integration Tests

- Test extension activation
- Test webview functionality
- Test Ollama integration
- Test file operations

### Manual Testing

Before submitting:

1. Test extension activation/deactivation
2. Test all major features
3. Test error scenarios
4. Test on different file types
5. Verify UI responsiveness

## 🐛 Debugging

### VS Code Extension Debugging

1. Open project in VS Code
2. Press `F5` to start Extension Development Host
3. Use `console.log()` for debugging
4. Check Developer Console: `Help > Toggle Developer Tools`

### Common Issues

- **Extension not loading**: Check `package.json` activation events
- **Webview not working**: Verify CSP settings and resource paths
- **Ollama connection fails**: Ensure Ollama is running on port 11434
- **TypeScript errors**: Run `npm run compile` to check for issues

## 📄 License

By contributing to Astrelium, you agree that your contributions will be licensed under the Apache License 2.0.

## 🙏 Recognition

Contributors will be recognized in:

- README.md contributors section
- Release notes
- Project documentation

Thank you for making Astrelium better! 🚀
