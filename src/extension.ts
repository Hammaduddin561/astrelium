import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import fetch from 'node-fetch';

const execAsync = promisify(exec);

export function activate(context: vscode.ExtensionContext) {
    const provider = new ChatViewProvider(context.extensionUri);
    
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, provider)
    );
    
    // Auto-analyze workspace when files change
    context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument((document) => {
            provider.analyzeWorkspaceChange(document);
        }),
        vscode.workspace.onDidOpenTextDocument(() => {
            provider.analyzeWorkspace();
        }),
        vscode.window.onDidChangeActiveTextEditor(() => {
            // Re-analyze when switching files to get current context
            provider.analyzeWorkspace();
        })
    );
    
    // Auto-analyze when workspace folders change
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(() => {
            provider.analyzeWorkspace();
        })
    );
}

export function deactivate() {}

class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'astrelium.chatView';
    private _view?: vscode.WebviewView;
    private _chatHistory: Array<{role: string, content: string, timestamp: number}> = [];
    private _workspaceAnalysis: any = {};
    private _projectContext: string = '';

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.loadChatHistory();
        this.analyzeWorkspace();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview();

        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'message':
                        try {
                            // Save user message to history
                            this.addToHistory('user', message.text);
                            
                            // First check for advanced commands
                            const advancedResponse = await this.handleAdvancedCommands(message.text);
                            if (advancedResponse) {
                                // This is an advanced command, handle it specially
                                this.addToHistory('assistant', advancedResponse);
                                webviewView.webview.postMessage({ type: 'response', text: advancedResponse });
                                return;
                            }
                            
                            // Check if this is a code creation request
                            const isCodeRequest = this.detectCodeRequest(message.text);
                            
                            // Get comprehensive context
                            let enhancedPrompt = message.text;
                            let contextInfo = '';
                            
                            // Add project context
                            if (this._projectContext) {
                                contextInfo += `PROJECT ANALYSIS: ${this._projectContext}\n`;
                            }
                            
                            // Add current file context
                            const currentFileContext = this.getCurrentFileContext();
                            if (currentFileContext) {
                                contextInfo += currentFileContext;
                            }
                            
                            // Add workspace analysis if available
                            if (this._workspaceAnalysis) {
                                contextInfo += `\n\n=== WORKSPACE SUMMARY ===\n`;
                                contextInfo += `Project Type: ${this._workspaceAnalysis.projectType}\n`;
                                contextInfo += `Languages: ${this._workspaceAnalysis.languages.join(', ')}\n`;
                                contextInfo += `Frameworks: ${this._workspaceAnalysis.frameworks.join(', ')}\n`;
                                contextInfo += `Files: ${this._workspaceAnalysis.file_count}\n`;
                                if (this._workspaceAnalysis.entry_points.length > 0) {
                                    contextInfo += `Entry Points: ${this._workspaceAnalysis.entry_points.join(', ')}\n`;
                                }
                            }
                            
                            if (contextInfo) {
                                enhancedPrompt = `${contextInfo}\n\n=== USER REQUEST ===\n${message.text}`;
                            }
                            
                            // Show thinking indicator
                            webviewView.webview.postMessage({ 
                                type: 'thinking', 
                                text: '🤔 Analyzing your request...'
                            });

                            const response = await fetch('http://localhost:11434/api/generate', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    model: 'gpt-oss:20b',
                                    prompt: `You are Astrelium, an intelligent coding assistant. Be concise and helpful.

${isCodeRequest ? `TASK: Code modification/creation request.
- Read current file context carefully  
- Provide specific, working code
- Use format: FILE: filename.ext with code blocks
- Include brief explanations` : ''}

Context: ${enhancedPrompt}

Respond directly and efficiently.`,
                                    stream: false,
                                    options: {
                                        temperature: 0.2,
                                        top_p: 0.8,
                                        num_predict: 512,
                                        num_ctx: 2048,
                                        stop: ["User:", "Human:", "\n\n\n"]
                                    }
                                })
                            });

                            if (response.ok) {
                                const data = await response.json() as any;
                                const reply = data.response || 'No response received';
                                
                                // Save AI response to history
                                this.addToHistory('assistant', reply);
                                
                                if (isCodeRequest) {
                                    // Process the AI response to extract files and commands
                                    await this.processCodeCreationResponse(reply, webviewView);
                                } else {
                                    // Send single response for regular messages
                                    webviewView.webview.postMessage({ 
                                        type: 'complete_response', 
                                        text: reply 
                                    });
                                }
                            } else {
                                const errorMsg = `❌ Error: ${response.status}. Make sure gpt-oss:20b is running!`;
                                this.addToHistory('system', errorMsg);
                                webviewView.webview.postMessage({ 
                                    type: 'response', 
                                    text: errorMsg
                                });
                            }
                        } catch (error) {
                            const errorMsg = `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}. Make sure Ollama is running!`;
                            this.addToHistory('system', errorMsg);
                            webviewView.webview.postMessage({ 
                                type: 'response', 
                                text: errorMsg
                            });
                        }
                        break;
                        
                    case 'loadHistory':
                        this.sendHistoryToWebview(webviewView);
                        break;
                        
                    case 'clearHistory':
                        this.clearHistory();
                        webviewView.webview.postMessage({ type: 'historyCleared' });
                        break;
                }
            }
        );
    }

    public async analyzeWorkspace() {
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders) {
                this._projectContext = 'No workspace folder open';
                return;
            }

            const analysis = await this.performDeepWorkspaceAnalysis(workspaceFolders[0].uri.fsPath);
            this._workspaceAnalysis = analysis;
            this._projectContext = this.generateProjectContext(analysis);
            
            // Notify webview about workspace analysis
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'workspaceAnalyzed',
                    analysis: analysis
                });
            }
        } catch (error) {
            console.log('Workspace analysis failed:', error);
        }
    }

    public analyzeWorkspaceChange(document: vscode.TextDocument) {
        // Re-analyze workspace when important files change
        const importantFiles = ['package.json', 'requirements.txt', 'pom.xml', 'Cargo.toml', 'go.mod'];
        const fileName = path.basename(document.fileName);
        
        if (importantFiles.includes(fileName)) {
            this.analyzeWorkspace();
        }
    }

    private async performDeepWorkspaceAnalysis(workspacePath: string): Promise<any> {
        const analysis: any = {
            projectType: 'Unknown',
            languages: [] as string[],
            frameworks: [] as string[],
            dependencies: {} as any,
            structure: {} as any,
            configs: [] as string[],
            scripts: {} as any,
            entry_points: [] as string[],
            test_files: [] as string[],
            documentation: [] as string[],
            git_info: {} as any,
            file_count: 0,
            total_lines: 0,
            main_files: [] as string[]
        };

        try {
            // Analyze project structure
            analysis.structure = await this.analyzeProjectStructure(workspacePath);
            
            // Detect project type and languages
            const detectedInfo = await this.detectProjectTypeAndLanguages(workspacePath);
            analysis.projectType = detectedInfo.type;
            analysis.languages = detectedInfo.languages;
            analysis.frameworks = detectedInfo.frameworks;
            
            // Analyze dependencies
            analysis.dependencies = await this.analyzeDependencies(workspacePath);
            
            // Find configuration files
            analysis.configs = await this.findConfigFiles(workspacePath);
            
            // Analyze scripts and commands
            analysis.scripts = await this.analyzeScripts(workspacePath);
            
            // Find entry points
            analysis.entry_points = await this.findEntryPoints(workspacePath);
            
            // Find test files
            analysis.test_files = await this.findTestFiles(workspacePath);
            
            // Find documentation
            analysis.documentation = await this.findDocumentation(workspacePath);
            
            // Get Git information
            analysis.git_info = await this.getGitInfo(workspacePath);
            
            // Calculate project statistics
            const stats = await this.calculateProjectStats(workspacePath);
            analysis.file_count = stats.fileCount;
            analysis.total_lines = stats.totalLines;
            analysis.main_files = stats.mainFiles;

        } catch (error) {
            console.log('Deep analysis error:', error);
        }

        return analysis;
    }

    private async analyzeProjectStructure(workspacePath: string): Promise<any> {
        const structure: any = {};
        
        try {
            const items = fs.readdirSync(workspacePath);
            for (const item of items) {
                if (item.startsWith('.') && item !== '.env' && item !== '.gitignore') continue;
                
                const itemPath = path.join(workspacePath, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                    structure[item] = { type: 'directory', files: [] as string[] };
                    try {
                        const subItems = fs.readdirSync(itemPath);
                        structure[item].files = subItems.slice(0, 10); // Limit for performance
                    } catch (e) {
                        // Permission error, skip
                    }
                } else {
                    structure[item] = { type: 'file', size: stat.size };
                }
            }
        } catch (error) {
            console.log('Structure analysis error:', error);
        }
        
        return structure;
    }

    private async detectProjectTypeAndLanguages(workspacePath: string): Promise<{type: string, languages: string[], frameworks: string[]}> {
        const languages = new Set<string>();
        const frameworks = new Set<string>();
        let projectType = 'Unknown';
        
        try {
            const files = fs.readdirSync(workspacePath);
            
            // Check for specific project indicators
            if (files.includes('package.json')) {
                projectType = 'Node.js/JavaScript';
                languages.add('JavaScript');
                
                const packageJson = JSON.parse(fs.readFileSync(path.join(workspacePath, 'package.json'), 'utf8'));
                if (packageJson.dependencies) {
                    if (packageJson.dependencies.react) frameworks.add('React');
                    if (packageJson.dependencies.vue) frameworks.add('Vue.js');
                    if (packageJson.dependencies.angular || packageJson.dependencies['@angular/core']) frameworks.add('Angular');
                    if (packageJson.dependencies.express) frameworks.add('Express.js');
                    if (packageJson.dependencies.next) frameworks.add('Next.js');
                    if (packageJson.dependencies.typescript || packageJson.devDependencies?.typescript) {
                        languages.add('TypeScript');
                        projectType = 'Node.js/TypeScript';
                    }
                }
            }
            
            if (files.includes('requirements.txt') || files.includes('setup.py') || files.includes('pyproject.toml')) {
                projectType = 'Python';
                languages.add('Python');
                
                if (files.includes('requirements.txt')) {
                    const requirements = fs.readFileSync(path.join(workspacePath, 'requirements.txt'), 'utf8');
                    if (requirements.includes('django')) frameworks.add('Django');
                    if (requirements.includes('flask')) frameworks.add('Flask');
                    if (requirements.includes('fastapi')) frameworks.add('FastAPI');
                    if (requirements.includes('streamlit')) frameworks.add('Streamlit');
                }
            }
            
            if (files.includes('pom.xml') || files.includes('build.gradle')) {
                projectType = 'Java';
                languages.add('Java');
                
                if (files.includes('pom.xml')) {
                    const pom = fs.readFileSync(path.join(workspacePath, 'pom.xml'), 'utf8');
                    if (pom.includes('spring')) frameworks.add('Spring');
                }
            }
            
            if (files.includes('Cargo.toml')) {
                projectType = 'Rust';
                languages.add('Rust');
            }
            
            if (files.includes('go.mod')) {
                projectType = 'Go';
                languages.add('Go');
            }
            
            if (files.includes('composer.json')) {
                projectType = 'PHP';
                languages.add('PHP');
                
                const composer = JSON.parse(fs.readFileSync(path.join(workspacePath, 'composer.json'), 'utf8'));
                if (composer.require && composer.require['laravel/framework']) frameworks.add('Laravel');
            }
            
            // Scan for file extensions
            this.scanForLanguagesByExtension(workspacePath, languages);
            
        } catch (error) {
            console.log('Project type detection error:', error);
        }
        
        return {
            type: projectType,
            languages: Array.from(languages),
            frameworks: Array.from(frameworks)
        };
    }

    private scanForLanguagesByExtension(dirPath: string, languages: Set<string>, depth: number = 0): void {
        if (depth > 2) return; // Limit recursion depth
        
        try {
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
                if (item.startsWith('.')) continue;
                
                const itemPath = path.join(dirPath, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory() && !['node_modules', 'venv', '__pycache__', 'target', 'build'].includes(item)) {
                    this.scanForLanguagesByExtension(itemPath, languages, depth + 1);
                } else if (stat.isFile()) {
                    const ext = path.extname(item).toLowerCase();
                    switch (ext) {
                        case '.js': languages.add('JavaScript'); break;
                        case '.ts': languages.add('TypeScript'); break;
                        case '.py': languages.add('Python'); break;
                        case '.java': languages.add('Java'); break;
                        case '.cpp': case '.cc': case '.cxx': languages.add('C++'); break;
                        case '.c': languages.add('C'); break;
                        case '.cs': languages.add('C#'); break;
                        case '.rs': languages.add('Rust'); break;
                        case '.go': languages.add('Go'); break;
                        case '.php': languages.add('PHP'); break;
                        case '.rb': languages.add('Ruby'); break;
                        case '.swift': languages.add('Swift'); break;
                        case '.kt': languages.add('Kotlin'); break;
                        case '.html': languages.add('HTML'); break;
                        case '.css': languages.add('CSS'); break;
                        case '.scss': case '.sass': languages.add('SCSS/Sass'); break;
                    }
                }
            }
        } catch (error) {
            // Permission error, skip
        }
    }

    private async analyzeDependencies(workspacePath: string): Promise<any> {
        const dependencies: any = {};
        
        try {
            // Node.js dependencies
            const packageJsonPath = path.join(workspacePath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                dependencies['npm'] = {
                    dependencies: packageJson.dependencies || {},
                    devDependencies: packageJson.devDependencies || {},
                    scripts: packageJson.scripts || {}
                };
            }
            
            // Python dependencies
            const requirementsPath = path.join(workspacePath, 'requirements.txt');
            if (fs.existsSync(requirementsPath)) {
                const requirements = fs.readFileSync(requirementsPath, 'utf8');
                dependencies['pip'] = requirements.split('\n').filter(line => line.trim() && !line.startsWith('#'));
            }
            
            // Java dependencies (Maven)
            const pomPath = path.join(workspacePath, 'pom.xml');
            if (fs.existsSync(pomPath)) {
                dependencies['maven'] = 'Found pom.xml - Maven project detected';
            }
            
            // Rust dependencies
            const cargoPath = path.join(workspacePath, 'Cargo.toml');
            if (fs.existsSync(cargoPath)) {
                const cargo = fs.readFileSync(cargoPath, 'utf8');
                dependencies['cargo'] = 'Found Cargo.toml - Rust project detected';
            }
            
        } catch (error) {
            console.log('Dependencies analysis error:', error);
        }
        
        return dependencies;
    }

    private async findConfigFiles(workspacePath: string): Promise<string[]> {
        const configFiles = [];
        const configPatterns = [
            '.env', '.env.local', '.env.production',
            'config.json', 'config.yaml', 'config.yml',
            'tsconfig.json', 'jsconfig.json',
            '.eslintrc.*', '.prettierrc.*',
            'webpack.config.js', 'vite.config.*',
            'docker-compose.yml', 'Dockerfile',
            '.gitignore', '.editorconfig'
        ];
        
        try {
            const files = fs.readdirSync(workspacePath);
            for (const file of files) {
                for (const pattern of configPatterns) {
                    if (pattern.includes('*')) {
                        const regex = new RegExp(pattern.replace('*', '.*'));
                        if (regex.test(file)) {
                            configFiles.push(file);
                        }
                    } else if (file === pattern) {
                        configFiles.push(file);
                    }
                }
            }
        } catch (error) {
            console.log('Config files search error:', error);
        }
        
        return configFiles;
    }

    private async analyzeScripts(workspacePath: string): Promise<any> {
        const scripts: any = {};
        
        try {
            // NPM scripts
            const packageJsonPath = path.join(workspacePath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                if (packageJson.scripts) {
                    scripts['npm'] = packageJson.scripts;
                }
            }
            
            // Python scripts
            const setupPyPath = path.join(workspacePath, 'setup.py');
            if (fs.existsSync(setupPyPath)) {
                scripts['python'] = 'Found setup.py';
            }
            
            // Makefile
            const makefilePath = path.join(workspacePath, 'Makefile');
            if (fs.existsSync(makefilePath)) {
                scripts['make'] = 'Found Makefile';
            }
            
        } catch (error) {
            console.log('Scripts analysis error:', error);
        }
        
        return scripts;
    }

    private async findEntryPoints(workspacePath: string): Promise<string[]> {
        const entryPoints = [];
        const entryPatterns = [
            'main.py', 'app.py', '__main__.py',
            'index.js', 'main.js', 'app.js', 'server.js',
            'index.ts', 'main.ts', 'app.ts', 'server.ts',
            'Main.java', 'App.java',
            'main.go',
            'main.rs',
            'index.html'
        ];
        
        try {
            for (const pattern of entryPatterns) {
                const filePath = path.join(workspacePath, pattern);
                if (fs.existsSync(filePath)) {
                    entryPoints.push(pattern);
                }
            }
            
            // Check src directory
            const srcPath = path.join(workspacePath, 'src');
            if (fs.existsSync(srcPath)) {
                for (const pattern of entryPatterns) {
                    const filePath = path.join(srcPath, pattern);
                    if (fs.existsSync(filePath)) {
                        entryPoints.push(`src/${pattern}`);
                    }
                }
            }
        } catch (error) {
            console.log('Entry points search error:', error);
        }
        
        return entryPoints;
    }

    private async findTestFiles(workspacePath: string): Promise<string[]> {
        const testFiles: string[] = [];
        
        try {
            this.scanForTestFiles(workspacePath, testFiles);
        } catch (error) {
            console.log('Test files search error:', error);
        }
        
        return testFiles;
    }

    private scanForTestFiles(dirPath: string, testFiles: string[], basePath: string = ''): void {
        try {
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
                if (item.startsWith('.') || item === 'node_modules') continue;
                
                const itemPath = path.join(dirPath, item);
                const relativePath = basePath ? `${basePath}/${item}` : item;
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory() && ['test', 'tests', '__tests__', 'spec'].includes(item)) {
                    testFiles.push(relativePath);
                } else if (stat.isFile()) {
                    if (item.includes('test') || item.includes('spec') || 
                        item.endsWith('.test.js') || item.endsWith('.test.ts') ||
                        item.endsWith('.spec.js') || item.endsWith('.spec.ts') ||
                        item.endsWith('_test.py') || item.endsWith('test_.py')) {
                        testFiles.push(relativePath);
                    }
                } else if (stat.isDirectory() && testFiles.length < 20) {
                    this.scanForTestFiles(itemPath, testFiles, relativePath);
                }
            }
        } catch (error) {
            // Permission error, skip
        }
    }

    private async findDocumentation(workspacePath: string): Promise<string[]> {
        const docFiles = [];
        const docPatterns = [
            'README.md', 'README.txt', 'README.rst',
            'CHANGELOG.md', 'CHANGELOG.txt',
            'LICENSE', 'LICENSE.md', 'LICENSE.txt',
            'CONTRIBUTING.md', 'CONTRIBUTING.txt',
            'docs', 'documentation', 'wiki'
        ];
        
        try {
            const files = fs.readdirSync(workspacePath);
            for (const file of files) {
                if (docPatterns.includes(file) || docPatterns.includes(file.toLowerCase())) {
                    docFiles.push(file);
                }
            }
        } catch (error) {
            console.log('Documentation search error:', error);
        }
        
        return docFiles;
    }

    private async getGitInfo(workspacePath: string): Promise<any> {
        const gitInfo: any = {};
        
        try {
            const gitPath = path.join(workspacePath, '.git');
            if (fs.existsSync(gitPath)) {
                gitInfo['hasGit'] = true;
                
                // Try to get git information
                try {
                    const { stdout: branch } = await execAsync('git branch --show-current', { cwd: workspacePath });
                    gitInfo['currentBranch'] = branch.trim();
                } catch (e) {
                    gitInfo['currentBranch'] = 'unknown';
                }
                
                try {
                    const { stdout: status } = await execAsync('git status --porcelain', { cwd: workspacePath });
                    gitInfo['hasChanges'] = status.trim().length > 0;
                } catch (e) {
                    gitInfo['hasChanges'] = false;
                }
            } else {
                gitInfo['hasGit'] = false;
            }
        } catch (error) {
            console.log('Git info error:', error);
            gitInfo['hasGit'] = false;
        }
        
        return gitInfo;
    }

    private async calculateProjectStats(workspacePath: string): Promise<{fileCount: number, totalLines: number, mainFiles: string[]}> {
        const stats = { fileCount: 0, totalLines: 0, mainFiles: [] };
        
        try {
            this.calculateStatsRecursive(workspacePath, stats, 0);
        } catch (error) {
            console.log('Stats calculation error:', error);
        }
        
        return stats;
    }

    private calculateStatsRecursive(dirPath: string, stats: any, depth: number): void {
        if (depth > 3) return; // Limit depth
        
        try {
            const items = fs.readdirSync(dirPath);
            for (const item of items) {
                if (item.startsWith('.') || ['node_modules', 'venv', '__pycache__', 'target', 'build', 'dist'].includes(item)) continue;
                
                const itemPath = path.join(dirPath, item);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                    this.calculateStatsRecursive(itemPath, stats, depth + 1);
                } else if (stat.isFile()) {
                    stats.fileCount++;
                    
                    // Count lines for text files
                    const ext = path.extname(item).toLowerCase();
                    if (['.js', '.ts', '.py', '.java', '.cpp', '.c', '.cs', '.rs', '.go', '.php', '.rb', '.html', '.css'].includes(ext)) {
                        try {
                            const content = fs.readFileSync(itemPath, 'utf8');
                            const lines = content.split('\n').length;
                            stats.totalLines += lines;
                            
                            // Track main files
                            if (lines > 50 && stats.mainFiles.length < 10) {
                                const relativePath = path.relative(dirPath.split(path.sep)[0], itemPath);
                                stats.mainFiles.push(`${item} (${lines} lines)`);
                            }
                        } catch (e) {
                            // Binary file or permission error
                        }
                    }
                }
            }
        } catch (error) {
            // Permission error, skip
        }
    }

    private generateProjectContext(analysis: any): string {
        let context = `PROJECT ANALYSIS:\n`;
        context += `Type: ${analysis.projectType}\n`;
        context += `Languages: ${analysis.languages.join(', ')}\n`;
        
        if (analysis.frameworks.length > 0) {
            context += `Frameworks: ${analysis.frameworks.join(', ')}\n`;
        }
        
        context += `Files: ${analysis.file_count} files, ${analysis.total_lines} lines of code\n`;
        
        if (analysis.entry_points.length > 0) {
            context += `Entry Points: ${analysis.entry_points.join(', ')}\n`;
        }
        
        if (analysis.test_files.length > 0) {
            context += `Tests: ${analysis.test_files.length} test files found\n`;
        }
        
        if (analysis.git_info.hasGit) {
            context += `Git: Repository on branch ${analysis.git_info.currentBranch}\n`;
        }
        
        if (analysis.dependencies.npm) {
            const deps = Object.keys(analysis.dependencies.npm.dependencies || {});
            if (deps.length > 0) {
                context += `NPM Dependencies: ${deps.slice(0, 10).join(', ')}\n`;
            }
        }
        
        return context;
    }

    // Generate response using Ollama API
    private async generateResponse(prompt: string): Promise<string> {
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-oss:20b',
                    prompt: prompt,
                    stream: false,
                    options: {
                        temperature: 0.7,
                        num_predict: 2000
                    }
                })
            });

            if (response.ok) {
                const data = await response.json() as any;
                return data.response || 'No response received';
            } else {
                return `Error: ${response.status} ${response.statusText}`;
            }
        } catch (error) {
            return `Error generating response: ${error}`;
        }
    }

    // Apply code changes directly to the current file
    private async applyCodeToCurrentFile(code: string, webviewView: vscode.WebviewView): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            webviewView.webview.postMessage({
                type: 'response',
                text: '❌ No active file to modify. Please open a file first.'
            });
            return;
        }

        try {
            // Create backup
            const originalContent = activeEditor.document.getText();
            const backupPath = activeEditor.document.fileName + '.backup';
            fs.writeFileSync(backupPath, originalContent);

            // Apply the code
            await activeEditor.edit(editBuilder => {
                const fullRange = new vscode.Range(
                    activeEditor.document.positionAt(0),
                    activeEditor.document.positionAt(originalContent.length)
                );
                editBuilder.replace(fullRange, code);
            });

            webviewView.webview.postMessage({
                type: 'response',
                text: `✅ Code applied to ${path.basename(activeEditor.document.fileName)}\n💾 Backup created: ${path.basename(backupPath)}`
            });

            // Save the file
            await activeEditor.document.save();

        } catch (error) {
            webviewView.webview.postMessage({
                type: 'response',
                text: `❌ Error applying code: ${error}`
            });
        }
    }

    // Helper method for advanced functions to create files without webview dependency
    private async createFilesFromResponse(response: string): Promise<void> {
        try {
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                return;
            }

            // Try to extract files from response
            const files = this.extractFilesFromResponse(response);
            
            if (files.length === 0) {
                // Try alternative format
                const alternativeFiles = this.extractAlternativeFormat(response);
                if (alternativeFiles.length > 0) {
                    files.push(...alternativeFiles);
                }
            }
            
            if (files.length === 0) {
                // Try code blocks
                const codeBlocks = this.extractCodeBlocks(response);
                for (const block of codeBlocks) {
                    const ext = this.getExtensionForLanguage(block.language);
                    const fileName = `generated_${Date.now()}${ext}`;
                    files.push({
                        path: fileName,
                        content: block.content
                    });
                }
            }

            // Create files
            for (const file of files) {
                const filePath = path.join(workspaceFolder.uri.fsPath, file.path);
                const dirPath = path.dirname(filePath);
                
                // Create directory if it doesn't exist
                if (!fs.existsSync(dirPath)) {
                    fs.mkdirSync(dirPath, { recursive: true });
                }
                
                // Write file
                fs.writeFileSync(filePath, file.content);
            }
        } catch (error) {
            console.log('Error creating files from response:', error);
        }
    }

    // Advanced AI Assistant Functions
    private async performCodeReview(filePath: string): Promise<string> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const reviewPrompt = `Please review this code for:\n1. Code quality and best practices\n2. Potential bugs or security issues\n3. Performance improvements\n4. Maintainability suggestions\n\nCode:\n${content}`;
            
            return await this.generateResponse(reviewPrompt);
        } catch (error) {
            return `Error reviewing code: ${error}`;
        }
    }

    private async suggestArchitecturalImprovements(): Promise<string> {
        if (!this._workspaceAnalysis) {
            await this.analyzeWorkspace();
        }
        
        const prompt = `Based on this project analysis:\n${JSON.stringify(this._workspaceAnalysis, null, 2)}\n\nSuggest architectural improvements, design patterns, and best practices for this ${this._workspaceAnalysis.projectType} project.`;
        
        return await this.generateResponse(prompt);
    }

    private async generateTestSuites(filePath: string): Promise<string> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const testPrompt = `Generate comprehensive test suites for this code. Include unit tests, integration tests, and edge cases:\n\n${content}`;
            
            const response = await this.generateResponse(testPrompt);
            
            // Try to create test files automatically
            await this.createFilesFromResponse(response);
            
            return response;
        } catch (error) {
            return `Error generating tests: ${error}`;
        }
    }

    private async optimizeCode(filePath: string): Promise<string> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const optimizePrompt = `Optimize this code for better performance, readability, and maintainability:\n\n${content}`;
            
            const response = await this.generateResponse(optimizePrompt);
            
            // Backup original file
            const backupPath = filePath + '.backup';
            fs.writeFileSync(backupPath, content);
            
            // Try to apply optimizations
            await this.createFilesFromResponse(response);
            
            return response;
        } catch (error) {
            return `Error optimizing code: ${error}`;
        }
    }

    private async explainCode(filePath: string): Promise<string> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const explainPrompt = `Explain this code in detail - what it does, how it works, and the logic behind each part:\n\n${content}`;
            
            return await this.generateResponse(explainPrompt);
        } catch (error) {
            return `Error explaining code: ${error}`;
        }
    }

    private async generateDocumentation(): Promise<string> {
        if (!this._workspaceAnalysis) {
            await this.analyzeWorkspace();
        }
        
        const prompt = `Generate comprehensive documentation for this project:\n${JSON.stringify(this._workspaceAnalysis, null, 2)}\n\nInclude README.md, API documentation, setup instructions, and user guides.`;
        
        const response = await this.generateResponse(prompt);
        
        // Try to create documentation files
        await this.createFilesFromResponse(response);
        
        return response;
    }

    private async refactorCode(filePath: string, refactorType: string): Promise<string> {
        try {
            const content = fs.readFileSync(filePath, 'utf8');
            const refactorPrompt = `Refactor this code using ${refactorType} pattern/approach:\n\n${content}`;
            
            const response = await this.generateResponse(refactorPrompt);
            
            // Backup original file
            const backupPath = filePath + '.backup';
            fs.writeFileSync(backupPath, content);
            
            // Apply refactoring
            await this.createFilesFromResponse(response);
            
            return response;
        } catch (error) {
            return `Error refactoring code: ${error}`;
        }
    }

    private async checkSecurity(): Promise<string> {
        if (!this._workspaceAnalysis) {
            await this.analyzeWorkspace();
        }
        
        const prompt = `Perform a security audit of this project. Check for:\n1. Common vulnerabilities\n2. Dependency security issues\n3. Configuration problems\n4. Data exposure risks\n\nProject details:\n${JSON.stringify(this._workspaceAnalysis, null, 2)}`;
        
        return await this.generateResponse(prompt);
    }

    private async generateMigrationPlan(fromTech: string, toTech: string): Promise<string> {
        if (!this._workspaceAnalysis) {
            await this.analyzeWorkspace();
        }
        
        const prompt = `Create a detailed migration plan to migrate this ${fromTech} project to ${toTech}:\n\nCurrent project:\n${JSON.stringify(this._workspaceAnalysis, null, 2)}\n\nInclude steps, code examples, and potential challenges.`;
        
        return await this.generateResponse(prompt);
    }

    private async analyzePerformance(): Promise<string> {
        if (!this._workspaceAnalysis) {
            await this.analyzeWorkspace();
        }
        
        // Find main files to analyze
        const mainFiles = this._workspaceAnalysis.entry_points || [];
        let codeContent = '';
        
        for (const file of mainFiles.slice(0, 3)) { // Analyze first 3 main files
            try {
                const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspacePath) {
                    const filePath = path.join(workspacePath, file);
                    if (fs.existsSync(filePath)) {
                        codeContent += `\n\n=== ${file} ===\n${fs.readFileSync(filePath, 'utf8')}`;
                    }
                }
            } catch (error) {
                console.log(`Error reading ${file}:`, error);
            }
        }
        
        const prompt = `Analyze the performance of this code and suggest optimizations:\n\nProject type: ${this._workspaceAnalysis.projectType}\nMain files:${codeContent}`;
        
        return await this.generateResponse(prompt);
    }

    private async generateAPIDocumentation(): Promise<string> {
        if (!this._workspaceAnalysis) {
            await this.analyzeWorkspace();
        }
        
        // Find API-related files
        const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        let apiContent = '';
        
        if (workspacePath) {
            // Look for common API file patterns
            const apiPatterns = ['app.js', 'server.js', 'main.py', 'app.py', 'routes', 'controllers', 'api'];
            
            for (const pattern of apiPatterns) {
                try {
                    const filePath = path.join(workspacePath, pattern);
                    if (fs.existsSync(filePath)) {
                        if (fs.statSync(filePath).isFile()) {
                            apiContent += `\n\n=== ${pattern} ===\n${fs.readFileSync(filePath, 'utf8')}`;
                        }
                    }
                } catch (error) {
                    continue;
                }
            }
        }
        
        const prompt = `Generate comprehensive API documentation for this project:\n\nProject: ${this._workspaceAnalysis.projectType}\nAPI Code:${apiContent}\n\nInclude endpoints, parameters, responses, examples, and OpenAPI/Swagger specifications.`;
        
        const response = await this.generateResponse(prompt);
        
        // Try to create API documentation files
        await this.createFilesFromResponse(response);
        
        return response;
    }

    // Get current file context for enhanced responses
    private getCurrentFileContext(): string {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            return '\n\n=== NO FILE OPEN ===\nNo file is currently open in the editor.\n';
        }

        const fileName = path.basename(activeEditor.document.fileName);
        const fullPath = activeEditor.document.fileName;
        const fileContent = activeEditor.document.getText();
        const language = activeEditor.document.languageId;
        const lineCount = activeEditor.document.lineCount;
        const selection = activeEditor.selection;
        const cursorPosition = activeEditor.selection.active;
        
        let context = `\n\n=== CURRENT FILE CONTEXT ===\n`;
        context += `File: ${fileName}\n`;
        context += `Full Path: ${fullPath}\n`;
        context += `Language: ${language}\n`;
        context += `Lines: ${lineCount}\n`;
        context += `Cursor Position: Line ${cursorPosition.line + 1}, Column ${cursorPosition.character + 1}\n`;
        
        // Check if file is modified
        if (activeEditor.document.isDirty) {
            context += `Status: ⚠️ File has unsaved changes\n`;
        } else {
            context += `Status: ✅ File is saved\n`;
        }
        
        // Analyze file structure
        const imports = this.extractImports(fileContent, language);
        const functions = this.extractFunctions(fileContent, language);
        const classes = this.extractClasses(fileContent, language);
        
        if (imports.length > 0) {
            context += `Imports: ${imports.slice(0, 5).join(', ')}${imports.length > 5 ? ` (and ${imports.length - 5} more)` : ''}\n`;
        }
        
        if (functions.length > 0) {
            context += `Functions: ${functions.slice(0, 5).join(', ')}${functions.length > 5 ? ` (and ${functions.length - 5} more)` : ''}\n`;
        }
        
        if (classes.length > 0) {
            context += `Classes: ${classes.slice(0, 3).join(', ')}${classes.length > 3 ? ` (and ${classes.length - 3} more)` : ''}\n`;
        }
        
        if (!selection.isEmpty) {
            const selectedText = activeEditor.document.getText(selection);
            context += `\nSelected Text (lines ${selection.start.line + 1}-${selection.end.line + 1}):\n\`\`\`${language}\n${selectedText}\n\`\`\`\n`;
        }
        
        // Include relevant file content
        if (fileContent.length < 8000) {
            context += `\nFull File Content:\n\`\`\`${language}\n${fileContent}\n\`\`\`\n`;
        } else {
            // For large files, include context around cursor
            const lines = fileContent.split('\n');
            const cursorLine = cursorPosition.line;
            const startLine = Math.max(0, cursorLine - 25);
            const endLine = Math.min(lines.length, cursorLine + 25);
            const contextLines = lines.slice(startLine, endLine);
            
            context += `\nFile Content (around cursor, lines ${startLine + 1}-${endLine}):\n\`\`\`${language}\n${contextLines.join('\n')}\n\`\`\`\n`;
            
            if (startLine > 0) {
                context += `\n(File continues above...)\n`;
            }
            if (endLine < lines.length) {
                context += `\n(File continues below...)\n`;
            }
        }
        
        return context;
    }

    // Helper methods for code analysis
    private extractImports(content: string, language: string): string[] {
        const imports: string[] = [];
        const lines = content.split('\n');
        
        for (const line of lines.slice(0, 50)) { // Check first 50 lines
            const trimmed = line.trim();
            if (language === 'typescript' || language === 'javascript') {
                if (trimmed.startsWith('import ') && trimmed.includes('from')) {
                    const match = trimmed.match(/from\s+['"`]([^'"`]+)['"`]/);
                    if (match) imports.push(match[1]);
                } else if (trimmed.startsWith('const ') && trimmed.includes('require(')) {
                    const match = trimmed.match(/require\(['"`]([^'"`]+)['"`]\)/);
                    if (match) imports.push(match[1]);
                }
            } else if (language === 'python') {
                if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
                    imports.push(trimmed.replace(/^(import|from)\s+/, '').split(' ')[0]);
                }
            }
        }
        
        return [...new Set(imports)]; // Remove duplicates
    }

    private extractFunctions(content: string, language: string): string[] {
        const functions: string[] = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (language === 'typescript' || language === 'javascript') {
                const funcMatch = trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
                const arrowMatch = trimmed.match(/^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\(/);
                if (funcMatch) functions.push(funcMatch[1]);
                if (arrowMatch) functions.push(arrowMatch[1]);
            } else if (language === 'python') {
                const match = trimmed.match(/^def\s+(\w+)/);
                if (match) functions.push(match[1]);
            }
        }
        
        return functions;
    }

    private extractClasses(content: string, language: string): string[] {
        const classes: string[] = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (language === 'typescript' || language === 'javascript') {
                const match = trimmed.match(/^(?:export\s+)?class\s+(\w+)/);
                if (match) classes.push(match[1]);
            } else if (language === 'python') {
                const match = trimmed.match(/^class\s+(\w+)/);
                if (match) classes.push(match[1]);
            }
        }
        
        return classes;
    }

    // Enhanced message handling with advanced functions
    private async handleAdvancedCommands(message: string): Promise<string | null> {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('review code') || lowerMessage.includes('code review')) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                return await this.performCodeReview(activeEditor.document.fileName);
            } else {
                return "Please open a file to review.";
            }
        }
        
        if (lowerMessage.includes('suggest architecture') || lowerMessage.includes('architectural improvements')) {
            return await this.suggestArchitecturalImprovements();
        }
        
        if (lowerMessage.includes('generate tests') || lowerMessage.includes('create tests')) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                return await this.generateTestSuites(activeEditor.document.fileName);
            } else {
                return "Please open a file to generate tests for.";
            }
        }
        
        if (lowerMessage.includes('optimize code') || lowerMessage.includes('optimize this')) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                return await this.optimizeCode(activeEditor.document.fileName);
            } else {
                return "Please open a file to optimize.";
            }
        }
        
        if (lowerMessage.includes('explain code') || lowerMessage.includes('explain this')) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                return await this.explainCode(activeEditor.document.fileName);
            } else {
                return "Please open a file to explain.";
            }
        }
        
        if (lowerMessage.includes('generate documentation') || lowerMessage.includes('create docs')) {
            return await this.generateDocumentation();
        }
        
        if (lowerMessage.includes('refactor')) {
            const activeEditor = vscode.window.activeTextEditor;
            if (activeEditor) {
                // Extract refactor type from message
                let refactorType = 'clean code principles';
                if (lowerMessage.includes('mvc')) refactorType = 'MVC';
                if (lowerMessage.includes('singleton')) refactorType = 'Singleton';
                if (lowerMessage.includes('factory')) refactorType = 'Factory';
                if (lowerMessage.includes('observer')) refactorType = 'Observer';
                
                return await this.refactorCode(activeEditor.document.fileName, refactorType);
            } else {
                return "Please open a file to refactor.";
            }
        }
        
        if (lowerMessage.includes('security audit') || lowerMessage.includes('check security')) {
            return await this.checkSecurity();
        }
        
        if (lowerMessage.includes('migrate') || lowerMessage.includes('migration plan')) {
            // Extract technologies from message
            let fromTech = this._workspaceAnalysis?.projectType || 'current project';
            let toTech = 'target technology';
            
            // Simple extraction - can be improved
            if (lowerMessage.includes('to react')) toTech = 'React';
            if (lowerMessage.includes('to vue')) toTech = 'Vue.js';
            if (lowerMessage.includes('to angular')) toTech = 'Angular';
            if (lowerMessage.includes('to python')) toTech = 'Python';
            if (lowerMessage.includes('to node')) toTech = 'Node.js';
            
            return await this.generateMigrationPlan(fromTech, toTech);
        }
        
        if (lowerMessage.includes('analyze performance') || lowerMessage.includes('performance analysis')) {
            return await this.analyzePerformance();
        }
        
        if (lowerMessage.includes('api documentation') || lowerMessage.includes('api docs')) {
            return await this.generateAPIDocumentation();
        }
        
        return null; // Not an advanced command, proceed with normal processing
    }

    private loadChatHistory() {
        try {
            const globalState = vscode.workspace.getConfiguration();
            const history = globalState.get('astrelium.chatHistory') as Array<{role: string, content: string, timestamp: number}>;
            if (history) {
                this._chatHistory = history;
            }
        } catch (error) {
            console.log('Failed to load chat history:', error);
        }
    }

    private saveChatHistory() {
        try {
            const globalState = vscode.workspace.getConfiguration();
            globalState.update('astrelium.chatHistory', this._chatHistory, vscode.ConfigurationTarget.Global);
        } catch (error) {
            console.log('Failed to save chat history:', error);
        }
    }

    private addToHistory(role: string, content: string) {
        this._chatHistory.push({
            role,
            content,
            timestamp: Date.now()
        });
        
        // Keep only last 50 messages
        if (this._chatHistory.length > 50) {
            this._chatHistory = this._chatHistory.slice(-50);
        }
        
        this.saveChatHistory();
    }

    private sendHistoryToWebview(webviewView: vscode.WebviewView) {
        webviewView.webview.postMessage({
            type: 'chatHistory',
            history: this._chatHistory
        });
    }

    private clearHistory() {
        this._chatHistory = [];
        this.saveChatHistory();
    }

    private detectCodeRequest(text: string): boolean {
        const codeKeywords = [
            'create', 'make', 'build', 'write', 'generate', 'develop', 'code',
            'project', 'app', 'application', 'website', 'script', 'program',
            'function', 'class', 'component', 'module', 'file', 'folder',
            'python', 'javascript', 'typescript', 'html', 'css', 'java', 'cpp', 'c++',
            'react', 'node', 'express', 'flask', 'django', 'vue', 'angular', 'api',
            'add', 'insert', 'modify', 'update', 'fix', 'implement', 'refactor'
        ];
        
        const lowerText = text.toLowerCase();
        
        // Check for explicit code modification requests
        const fileModificationPatterns = [
            /add.*function/i,
            /add.*method/i,
            /add.*class/i,
            /add.*variable/i,
            /modify.*file/i,
            /update.*code/i,
            /fix.*bug/i,
            /implement.*feature/i,
            /add.*to.*file/i,
            /insert.*function/i,
            /create.*function/i,
            /write.*function/i,
            /add.*display/i,
            /in this file/i,
            /to this file/i,
            /current file/i,
            /this code/i,
            /refactor.*code/i,
            /improve.*code/i,
            /optimize.*code/i,
            /add.*import/i,
            /add.*export/i
        ];
        
        // Check for project creation patterns
        const projectPatterns = [
            /create.*app/i,
            /make.*program/i,
            /build.*project/i,
            /write.*code/i,
            /generate.*file/i,
            /develop.*application/i,
            /new.*project/i,
            /start.*project/i
        ];
        
        // Check if any pattern matches
        const hasFileModification = fileModificationPatterns.some(pattern => pattern.test(text));
        const hasProjectCreation = projectPatterns.some(pattern => pattern.test(text));
        const hasCodeKeywords = codeKeywords.some(keyword => lowerText.includes(keyword));
        
        return hasFileModification || hasProjectCreation || hasCodeKeywords;
    }

    private async processCodeCreationResponse(response: string, webviewView: vscode.WebviewView) {
        try {
            const activeEditor = vscode.window.activeTextEditor;
            const hasActiveFile = activeEditor !== undefined;
            
            // Check if this looks like a modification to the current file
            const isFileModification = hasActiveFile && (
                response.includes('display function') ||
                response.includes('add function') ||
                response.includes('modify') ||
                response.includes('update') ||
                response.includes('insert') ||
                (response.includes('function') && response.length < 2000) // Short function responses
            );

            if (isFileModification) {
                // Extract just the code from the response
                const codeBlocks = this.extractCodeBlocks(response);
                if (codeBlocks.length > 0) {
                    const mainCode = codeBlocks[0]; // Use the first code block
                    await this.applyCodeToCurrentFile(mainCode.content, webviewView);
                    
                    webviewView.webview.postMessage({ 
                        type: 'complete_response', 
                        text: response 
                    });
                    return;
                }
            }

            // Extract files from the AI response
            const files = this.extractFilesFromResponse(response);
            const commands = this.extractCommandsFromResponse(response);
            
            // If no structured files found, try to parse differently
            if (files.length === 0) {
                const alternativeFiles = this.extractAlternativeFormat(response);
                if (alternativeFiles.length > 0) {
                    files.push(...alternativeFiles);
                }
            }
            
            if (files.length === 0) {
                // Try to create files from code blocks
                const codeBlocks = this.extractCodeBlocks(response);
                if (codeBlocks.length > 0) {
                    await this.createFilesFromCodeBlocks(codeBlocks, webviewView);
                }
                
                webviewView.webview.postMessage({ 
                    type: 'complete_response', 
                    text: response 
                });
                return;
            }

            // Get workspace folder
            const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
            if (!workspaceFolder) {
                webviewView.webview.postMessage({ 
                    type: 'response', 
                    text: '❌ **Error**: Please open a workspace folder first.' 
                });
                return;
            }

            webviewView.webview.postMessage({ 
                type: 'response', 
                text: `📁 **Creating ${files.length} file(s)...**` 
            });

            let createdFiles: string[] = [];
            
            // Create files
            for (const file of files) {
                try {
                    const filePath = path.join(workspaceFolder.uri.fsPath, file.path);
                    const dirPath = path.dirname(filePath);
                    
                    // Create directory if it doesn't exist
                    if (!fs.existsSync(dirPath)) {
                        fs.mkdirSync(dirPath, { recursive: true });
                    }
                    
                    // Write file
                    fs.writeFileSync(filePath, file.content);
                    createdFiles.push(file.path);
                    
                    webviewView.webview.postMessage({ 
                        type: 'response', 
                        text: `✅ **Created**: \`${file.path}\`` 
                    });
                    
                    // Open the first file in VS Code
                    if (createdFiles.length === 1) {
                        const document = await vscode.workspace.openTextDocument(filePath);
                        await vscode.window.showTextDocument(document);
                    }
                    
                } catch (error) {
                    webviewView.webview.postMessage({ 
                        type: 'response', 
                        text: `❌ **Error creating** \`${file.path}\`: ${error}` 
                    });
                }
            }

            if (createdFiles.length > 0) {
                webviewView.webview.postMessage({ 
                    type: 'response', 
                    text: `🎉 **Successfully created**: ${createdFiles.join(', ')}\n\n🔧 **Running build commands...**` 
                });

                // Execute commands if any
                if (commands.compile) {
                    await this.executeCommand('Compiling', commands.compile, workspaceFolder.uri.fsPath, webviewView);
                }
                
                if (commands.run) {
                    await this.executeCommand('Running', commands.run, workspaceFolder.uri.fsPath, webviewView);
                }
                
                if (commands.test) {
                    await this.executeCommand('Testing', commands.test, workspaceFolder.uri.fsPath, webviewView);
                }
            }

            // Send the original AI response
            webviewView.webview.postMessage({ 
                type: 'response', 
                text: `\n\n**Original Response:**\n${response}` 
            });

        } catch (error) {
            webviewView.webview.postMessage({ 
                type: 'response', 
                text: `❌ **Error processing code creation**: ${error}` 
            });
        }
    }

    private extractAlternativeFormat(response: string): Array<{path: string, content: string}> {
        const files: Array<{path: string, content: string}> = [];
        
        // Look for filename.ext followed by code block
        const regex = /([a-zA-Z0-9_.-]+\.[a-zA-Z]+)\s*[\r\n]+```[\w]*[\r\n]+([\s\S]*?)[\r\n]+```/g;
        let match;
        
        while ((match = regex.exec(response)) !== null) {
            files.push({
                path: match[1],
                content: match[2].trim()
            });
        }
        
        return files;
    }

    private extractCodeBlocks(response: string): Array<{language: string, content: string}> {
        const blocks: Array<{language: string, content: string}> = [];
        const regex = /```(\w+)?\s*\n([\s\S]*?)\n```/g;
        let match;
        
        while ((match = regex.exec(response)) !== null) {
            blocks.push({
                language: match[1] || 'text',
                content: match[2].trim()
            });
        }
        
        return blocks;
    }

    private async createFilesFromCodeBlocks(codeBlocks: Array<{language: string, content: string}>, webviewView: vscode.WebviewView) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) return;

        for (let i = 0; i < codeBlocks.length; i++) {
            const block = codeBlocks[i];
            const extension = this.getExtensionForLanguage(block.language);
            const filename = `generated_${i + 1}.${extension}`;
            
            try {
                const filePath = path.join(workspaceFolder.uri.fsPath, filename);
                fs.writeFileSync(filePath, block.content);
                
                webviewView.webview.postMessage({ 
                    type: 'response', 
                    text: `✅ **Created**: \`${filename}\` (${block.language})` 
                });
                
                if (i === 0) {
                    const document = await vscode.workspace.openTextDocument(filePath);
                    await vscode.window.showTextDocument(document);
                }
            } catch (error) {
                webviewView.webview.postMessage({ 
                    type: 'response', 
                    text: `❌ **Error creating** \`${filename}\`: ${error}` 
                });
            }
        }
    }

    private getExtensionForLanguage(language: string): string {
        const extensions: {[key: string]: string} = {
            'javascript': 'js',
            'typescript': 'ts',
            'python': 'py',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'html': 'html',
            'css': 'css',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yml',
            'sh': 'sh',
            'bash': 'sh',
            'powershell': 'ps1'
        };
        
        return extensions[language.toLowerCase()] || 'txt';
    }

    private extractFilesFromResponse(response: string): Array<{path: string, content: string}> {
        const files: Array<{path: string, content: string}> = [];
        const lines = response.split('\n');
        
        let currentFile: string | null = null;
        let currentContent: string[] = [];
        let inCodeBlock = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Check for FILE: declaration
            if (line.startsWith('FILE:')) {
                // Save previous file if exists
                if (currentFile && currentContent.length > 0) {
                    files.push({
                        path: currentFile,
                        content: currentContent.join('\n')
                    });
                }
                
                currentFile = line.substring(5).trim();
                currentContent = [];
                inCodeBlock = false;
            }
            // Check for code block start
            else if (line.startsWith('```') && currentFile) {
                if (inCodeBlock) {
                    // End of code block
                    inCodeBlock = false;
                } else {
                    // Start of code block
                    inCodeBlock = true;
                }
            }
            // Collect content inside code blocks
            else if (inCodeBlock && currentFile) {
                currentContent.push(lines[i]);
            }
        }
        
        // Save last file
        if (currentFile && currentContent.length > 0) {
            files.push({
                path: currentFile,
                content: currentContent.join('\n')
            });
        }
        
        return files;
    }

    private extractCommandsFromResponse(response: string): {compile?: string, run?: string, test?: string} {
        const commands: {compile?: string, run?: string, test?: string} = {};
        const lines = response.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('COMPILE:')) {
                commands.compile = trimmed.substring(8).trim();
            } else if (trimmed.startsWith('RUN:')) {
                commands.run = trimmed.substring(4).trim();
            } else if (trimmed.startsWith('TEST:')) {
                commands.test = trimmed.substring(5).trim();
            }
        }
        
        return commands;
    }

    private async executeCommand(type: string, command: string, cwd: string, webviewView: vscode.WebviewView) {
        try {
            webviewView.webview.postMessage({ 
                type: 'response', 
                text: `🔧 ${type.toUpperCase()}: ${command}` 
            });

            const { stdout, stderr } = await execAsync(command, { cwd });
            
            if (stdout) {
                webviewView.webview.postMessage({ 
                    type: 'response', 
                    text: `✅ ${type.toUpperCase()} Output:\n\`\`\`\n${stdout}\n\`\`\`` 
                });
            }
            
            if (stderr) {
                webviewView.webview.postMessage({ 
                    type: 'response', 
                    text: `⚠️ ${type.toUpperCase()} Warnings:\n\`\`\`\n${stderr}\n\`\`\`` 
                });
                
                // If there are errors, try to debug
                if (type === 'compile' && stderr.includes('error')) {
                    await this.attemptDebug(stderr, cwd, webviewView);
                }
            }
            
        } catch (error: any) {
            webviewView.webview.postMessage({ 
                type: 'response', 
                text: `❌ ${type.toUpperCase()} Error: ${error.message}` 
            });
            
            // Try to debug compilation errors
            if (type === 'compile') {
                await this.attemptDebug(error.message, cwd, webviewView);
            }
        }
    }

    private async attemptDebug(errorMessage: string, cwd: string, webviewView: vscode.WebviewView) {
        try {
            webviewView.webview.postMessage({ 
                type: 'response', 
                text: '🔍 Analyzing errors and attempting to fix...' 
            });

            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'gpt-oss:20b',
                    prompt: `You are a debugging expert. Analyze this error and provide a fix:

Error: ${errorMessage}

Provide a specific solution to fix this error. If it's a code issue, provide the corrected code with clear instructions on which file to modify and what changes to make.`,
                    stream: false,
                    options: {
                        temperature: 0.3,
                        num_predict: 800
                    }
                })
            });

            if (response.ok) {
                const data = await response.json() as any;
                const debugSuggestion = data.response || 'No debug suggestion received';
                
                webviewView.webview.postMessage({ 
                    type: 'response', 
                    text: `🛠️ Debug Suggestion:\n${debugSuggestion}` 
                });
            }
        } catch (error) {
            webviewView.webview.postMessage({ 
                type: 'response', 
                text: `❌ Debug analysis failed: ${error}` 
            });
        }
    }

    private _getHtmlForWebview(): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Astrelium Chat</title>
                <style>
                    * {
                        box-sizing: border-box;
                    }
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        color: var(--vscode-foreground);
                        background: linear-gradient(135deg, var(--vscode-editor-background) 0%, var(--vscode-sideBar-background) 100%);
                        padding: 12px;
                        margin: 0;
                        line-height: 1.6;
                        height: 100vh;
                        display: flex;
                        flex-direction: column;
                        overflow: hidden;
                    }
                    .header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 12px;
                        padding: 10px 14px;
                        background: rgba(255, 255, 255, 0.08);
                        backdrop-filter: blur(20px);
                        border-radius: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
                        flex-shrink: 0;
                    }
                    .logo {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .astronaut-logo {
                        width: 28px;
                        height: 28px;
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .astronaut-helmet {
                        width: 24px;
                        height: 24px;
                        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 50%, #dee2e6 100%);
                        border-radius: 50%;
                        position: relative;
                        border: 2px solid rgba(255, 255, 255, 0.9);
                        box-shadow: 
                            0 2px 8px rgba(0, 0, 0, 0.15),
                            inset 0 1px 0 rgba(255, 255, 255, 0.8);
                    }
                    .astronaut-visor {
                        width: 16px;
                        height: 16px;
                        background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%);
                        border-radius: 50%;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        border: 1px solid rgba(255, 255, 255, 0.2);
                        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
                    }
                    .astronaut-reflection {
                        width: 4px;
                        height: 6px;
                        background: linear-gradient(45deg, rgba(255, 255, 255, 0.8) 0%, rgba(255, 255, 255, 0.3) 100%);
                        border-radius: 2px;
                        position: absolute;
                        top: 4px;
                        left: 4px;
                    }
                    .astronaut-logo::after {
                        content: '';
                        width: 30px;
                        height: 30px;
                        border: 1px solid rgba(102, 126, 234, 0.3);
                        border-radius: 50%;
                        position: absolute;
                        animation: glow 3s ease-in-out infinite alternate;
                    }
                    @keyframes glow {
                        from { 
                            box-shadow: 0 0 5px rgba(102, 126, 234, 0.2);
                            transform: scale(1);
                        }
                        to { 
                            box-shadow: 0 0 15px rgba(102, 126, 234, 0.4);
                            transform: scale(1.05);
                        }
                    }
                    .logo h2 {
                        margin: 0;
                        font-size: 18px;
                        font-weight: 700;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        -webkit-background-clip: text;
                        -webkit-text-fill-color: transparent;
                        background-clip: text;
                    }
                    .status-badge {
                        font-size: 10px;
                        padding: 3px 8px;
                        border-radius: 10px;
                        background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
                        color: white;
                        font-weight: 600;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        box-shadow: 0 2px 8px rgba(86, 171, 47, 0.3);
                    }
                    .chat-container {
                        flex: 1;
                        border: none;
                        border-radius: 12px;
                        padding: 12px;
                        margin-bottom: 10px;
                        overflow-y: auto;
                        background: rgba(255, 255, 255, 0.04);
                        backdrop-filter: blur(20px);
                        box-shadow: 
                            0 8px 32px rgba(0, 0, 0, 0.12),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1);
                        scroll-behavior: smooth;
                        position: relative;
                        border: 1px solid rgba(255, 255, 255, 0.08);
                        min-height: 0;
                    }
                    .chat-container::-webkit-scrollbar {
                        width: 5px;
                    }
                    .chat-container::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .chat-container::-webkit-scrollbar-thumb {
                        background: rgba(255, 255, 255, 0.2);
                        border-radius: 3px;
                    }
                    .chat-container::-webkit-scrollbar-thumb:hover {
                        background: rgba(255, 255, 255, 0.3);
                    }
                    .input-container {
                        position: relative;
                        margin-bottom: 8px;
                        flex-shrink: 0;
                    }
                    .input-row {
                        display: flex;
                        gap: 8px;
                        align-items: flex-end;
                    }
                    .input-wrapper {
                        flex: 1;
                        position: relative;
                        display: flex;
                        background: rgba(255, 255, 255, 0.06);
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        border-radius: 10px;
                        overflow: hidden;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        backdrop-filter: blur(10px);
                    }
                    .input-wrapper:focus-within {
                        border-color: rgba(102, 126, 234, 0.6);
                        box-shadow: 
                            0 0 0 3px rgba(102, 126, 234, 0.15),
                            0 4px 16px rgba(0, 0, 0, 0.15);
                        transform: translateY(-1px);
                    }
                    .file-buttons {
                        display: flex;
                        gap: 4px;
                    }
                    .file-btn {
                        width: 36px;
                        height: 36px;
                        min-height: 36px;
                        padding: 0;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background: rgba(255, 255, 255, 0.08);
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        color: var(--vscode-foreground);
                        transition: all 0.2s ease;
                    }
                    .file-btn:hover {
                        background: rgba(255, 255, 255, 0.12);
                        transform: translateY(-1px);
                        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
                    }
                    .file-input {
                        display: none;
                    }
                    .file-preview {
                        margin: 8px 0;
                        padding: 8px 12px;
                        background: rgba(255, 255, 255, 0.06);
                        border-radius: 8px;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        font-size: 11px;
                        display: none;
                    }
                    .file-preview.show {
                        display: block;
                    }
                    .file-item {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        margin-bottom: 4px;
                    }
                    .file-item:last-child {
                        margin-bottom: 0;
                    }
                    .file-remove {
                        background: none;
                        border: none;
                        color: #ff6b6b;
                        cursor: pointer;
                        padding: 2px;
                        border-radius: 4px;
                        min-height: auto;
                        width: auto;
                        font-size: 12px;
                    }
                    .file-remove:hover {
                        background: rgba(255, 107, 107, 0.1);
                        transform: none;
                        box-shadow: none;
                    }
                    input[type="text"] {
                        flex: 1;
                        padding: 14px 16px;
                        margin: 0;
                        background: transparent;
                        color: var(--vscode-input-foreground);
                        border: none;
                        font-size: 13px;
                        font-family: inherit;
                        outline: none;
                    }
                    input[type="text"]::placeholder {
                        color: rgba(255, 255, 255, 0.5);
                    }
                    .send-btn {
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.8) 0%, rgba(118, 75, 162, 0.8) 100%);
                        border: none;
                        color: white;
                        padding: 8px 12px;
                        cursor: pointer;
                        font-size: 14px;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-width: 40px;
                    }
                    .send-btn:hover {
                        background: linear-gradient(135deg, rgba(102, 126, 234, 1) 0%, rgba(118, 75, 162, 1) 100%);
                        transform: scale(1.05);
                    }
                    .button-grid {
                        display: flex;
                        gap: 8px;
                        margin-top: 8px;
                        flex-shrink: 0;
                    }
                    button {
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.9) 100%);
                        color: white;
                        border: none;
                        padding: 10px 14px;
                        border-radius: 10px;
                        cursor: pointer;
                        font-size: 12px;
                        font-weight: 600;
                        font-family: inherit;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 6px;
                        min-height: 36px;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        position: relative;
                        overflow: hidden;
                        text-transform: none;
                        letter-spacing: 0.3px;
                        box-shadow: 
                            0 4px 12px rgba(102, 126, 234, 0.25),
                            0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    button::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: -100%;
                        width: 100%;
                        height: 100%;
                        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                        transition: left 0.5s;
                    }
                    button:hover {
                        transform: translateY(-2px);
                        box-shadow: 
                            0 6px 20px rgba(102, 126, 234, 0.35),
                            0 4px 8px rgba(0, 0, 0, 0.15);
                    }
                    button:hover::before {
                        left: 100%;
                    }
                    button:active {
                        transform: translateY(-1px);
                    }
                    button .emoji {
                        font-size: 14px;
                        filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
                    }
                    .button-secondary {
                        background: linear-gradient(135deg, rgba(86, 171, 47, 0.9) 0%, rgba(168, 230, 207, 0.9) 100%);
                        box-shadow: 
                            0 4px 12px rgba(86, 171, 47, 0.25),
                            0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .button-secondary:hover {
                        box-shadow: 
                            0 6px 20px rgba(86, 171, 47, 0.35),
                            0 4px 8px rgba(0, 0, 0, 0.15);
                    }
                    .button-history {
                        background: linear-gradient(135deg, rgba(255, 193, 7, 0.9) 0%, rgba(255, 152, 0, 0.9) 100%);
                        box-shadow: 
                            0 4px 12px rgba(255, 193, 7, 0.25),
                            0 2px 4px rgba(0, 0, 0, 0.1);
                    }
                    .button-history:hover {
                        box-shadow: 
                            0 6px 20px rgba(255, 193, 7, 0.35),
                            0 4px 8px rgba(0, 0, 0, 0.15);
                    }
                    .history-panel {
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.8);
                        backdrop-filter: blur(10px);
                        z-index: 1000;
                        display: none;
                        align-items: center;
                        justify-content: center;
                    }
                    .history-panel.show {
                        display: flex;
                    }
                    .history-content {
                        background: var(--vscode-editor-background);
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        border-radius: 12px;
                        padding: 20px;
                        max-width: 90%;
                        max-height: 80%;
                        overflow-y: auto;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                    }
                    .history-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 16px;
                        padding-bottom: 12px;
                        border-bottom: 1px solid rgba(255, 255, 255, 0.12);
                    }
                    .history-item {
                        margin-bottom: 12px;
                        padding: 8px 12px;
                        border-radius: 8px;
                        font-size: 12px;
                        border: 1px solid rgba(255, 255, 255, 0.08);
                    }
                    .history-item.user {
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
                    }
                    .history-item.assistant {
                        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                    }
                    .history-close {
                        background: none;
                        border: none;
                        color: #ff6b6b;
                        cursor: pointer;
                        font-size: 16px;
                        padding: 4px;
                        border-radius: 4px;
                        min-height: auto;
                        width: auto;
                    }
                    .history-close:hover {
                        background: rgba(255, 107, 107, 0.1);
                        transform: none;
                        box-shadow: none;
                    }
                    @keyframes slideIn {
                        from {
                            opacity: 0;
                            transform: translateY(10px);
                        }
                        to {
                            opacity: 1;
                            transform: translateY(0);
                        }
                    }
                    @keyframes thinkingDots {
                        0%, 20% { opacity: 0.2; }
                        50% { opacity: 1; }
                        100% { opacity: 0.2; }
                    }
                    @keyframes typingBounce {
                        0%, 60%, 100% { transform: translateY(0); }
                        30% { transform: translateY(-10px); }
                    }
                    @keyframes pulse {
                        0%, 100% { opacity: 0.6; }
                        50% { opacity: 1; }
                    }
                    .thinking-dots span {
                        animation: thinkingDots 1.4s ease-in-out infinite;
                        display: inline-block;
                    }
                    .thinking-dots span:nth-child(1) { animation-delay: 0s; }
                    .thinking-dots span:nth-child(2) { animation-delay: 0.2s; }
                    .thinking-dots span:nth-child(3) { animation-delay: 0.4s; }
                    
                    .typing-indicator {
                        display: inline-flex;
                        align-items: center;
                        gap: 3px;
                        margin-left: 8px;
                    }
                    .typing-indicator span {
                        width: 4px;
                        height: 4px;
                        border-radius: 50%;
                        background: var(--vscode-foreground);
                        animation: typingBounce 1.4s ease-in-out infinite;
                        opacity: 0.6;
                    }
                    .typing-indicator span:nth-child(1) { animation-delay: 0s; }
                    .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
                    .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
                    
                    .message.streaming {
                        border-left: 3px solid rgba(102, 126, 234, 0.8);
                        animation: pulse 2s ease-in-out infinite;
                    }
                    .message.thinking {
                        background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 235, 59, 0.1) 100%);
                        border: 1px solid rgba(255, 193, 7, 0.3);
                    }
                    .typing-cursor {
                        animation: blink 1s infinite;
                        color: rgba(102, 126, 234, 0.8);
                        font-weight: bold;
                    }
                    @keyframes blink {
                        0%, 50% { opacity: 1; }
                        51%, 100% { opacity: 0; }
                    }
                    .message {
                        animation: slideIn 0.3s ease-out;
                        margin-bottom: 12px;
                        padding: 12px 16px;
                        border-radius: 12px;
                        position: relative;
                        max-width: 100%;
                    }
                    .message.user {
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
                        border: 1px solid rgba(102, 126, 234, 0.3);
                        margin-left: 16px;
                    }
                    .message.ai {
                        background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 100%);
                        border: 1px solid rgba(255, 255, 255, 0.15);
                        margin-right: 16px;
                    }
                    .message.system {
                        background: linear-gradient(135deg, rgba(86, 171, 47, 0.15) 0%, rgba(168, 230, 207, 0.15) 100%);
                        border: 1px solid rgba(86, 171, 47, 0.3);
                        text-align: center;
                    }
                    .message-header {
                        font-size: 11px;
                        font-weight: 600;
                        margin-bottom: 6px;
                        opacity: 0.7;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .message-header .avatar {
                        font-size: 16px;
                        width: 20px;
                        height: 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        border-radius: 50%;
                        background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
                    }
                    .message-header .name {
                        font-weight: 700;
                        color: var(--vscode-foreground);
                    }
                    .message-content {
                        font-size: 13px;
                        line-height: 1.5;
                        color: var(--vscode-foreground);
                    }
                    pre {
                        background: rgba(0, 0, 0, 0.3);
                        border: 1px solid rgba(255, 255, 255, 0.1);
                        border-radius: 8px;
                        padding: 12px;
                        overflow-x: auto;
                        margin: 8px 0;
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        font-size: 12px;
                        line-height: 1.4;
                    }
                    code {
                        background: rgba(0, 0, 0, 0.2);
                        border-radius: 4px;
                        padding: 2px 6px;
                        font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                        font-size: 11px;
                    }
                    pre code {
                        background: transparent;
                        padding: 0;
                        border-radius: 0;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="logo">
                        <div class="astronaut-logo">
                            <div class="astronaut-helmet">
                                <div class="astronaut-visor">
                                    <div class="astronaut-reflection"></div>
                                </div>
                            </div>
                        </div>
                        <h2>Astrelium</h2>
                    </div>
                    <div class="status-badge">AI Ready</div>
                </div>
                
                <div class="chat-container" id="chatContainer">
                    <div style="text-align: center; padding: 16px; opacity: 0.8;">
                        <div style="font-size: 32px; margin-bottom: 8px;">👨‍🚀</div>
                        <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 15px;">Welcome to Astrelium</h3>
                        <p style="margin: 0; opacity: 0.7; font-size: 12px;">Your intelligent coding companion</p>
                        <div style="margin-top: 12px; padding: 8px; background: rgba(102, 126, 234, 0.1); border-radius: 6px; font-size: 10px; opacity: 0.8;">
                            <div style="margin-bottom: 4px; font-weight: 600;">🚀 I can help you:</div>
                            <div>• Create projects and write code</div>
                            <div>• Compile and test automatically</div>
                            <div>• Debug and fix errors</div>
                            <div>• Answer coding questions</div>
                        </div>
                    </div>
                </div>
                
                <div class="input-container">
                    <div class="file-preview" id="filePreview"></div>
                    <div class="input-row">
                        <div class="input-wrapper">
                            <input type="text" id="messageInput" placeholder="Ask me anything about coding..." autocomplete="off" />
                            <button id="sendButton" class="send-btn" title="Send Message">
                                ➤
                            </button>
                        </div>
                        <div class="file-buttons">
                            <button class="file-btn" onclick="document.getElementById('fileInput').click()" title="Upload Any File">
                                📎
                            </button>
                        </div>
                    </div>
                    <input type="file" id="fileInput" class="file-input" multiple />
                </div>
                
                <div class="button-grid">
                    <button onclick="clearChat()" class="button-secondary">
                        <span class="emoji">🧹</span>Clear Chat
                    </button>
                    <button onclick="toggleHistory()" class="button-history">
                        <span class="emoji">📚</span>History
                    </button>
                </div>
                
                <div class="history-panel" id="historyPanel">
                    <div class="history-content">
                        <div class="history-header">
                            <h3 style="margin: 0; font-size: 16px;">📚 Chat History</h3>
                            <div>
                                <button onclick="clearAllHistory()" class="button-secondary" style="margin-right: 8px; padding: 6px 12px; font-size: 10px;">
                                    Clear All
                                </button>
                                <button onclick="toggleHistory()" class="history-close">✕</button>
                            </div>
                        </div>
                        <div id="historyList">
                            <p style="text-align: center; opacity: 0.7;">Loading history...</p>
                        </div>
                    </div>
                </div>
                
                <script>
                    const vscode = acquireVsCodeApi();
                    const chatContainer = document.getElementById('chatContainer');
                    const messageInput = document.getElementById('messageInput');
                    const sendButton = document.getElementById('sendButton');
                    const filePreview = document.getElementById('filePreview');
                    const fileInput = document.getElementById('fileInput');
                    
                    // Debug: Check if elements are found
                    console.log('messageInput found:', messageInput);
                    console.log('sendButton found:', sendButton);
                    console.log('chatContainer found:', chatContainer);
                    
                    if (!messageInput) {
                        console.error('messageInput element not found!');
                    }
                    if (!sendButton) {
                        console.error('sendButton element not found!');
                    }
                    
                    let uploadedFiles = [];

                    function parseMarkdown(text) {
                        // Basic markdown parsing
                        text = text.replace(/\`\`\`([\\w]*)[\\n]?([\\s\\S]*?)\`\`\`/g, '<pre><code>$2</code></pre>');
                        text = text.replace(/\`([^\`]+)\`/g, '<code>$1</code>');
                        text = text.replace(/\\n/g, '<br>');
                        return text;
                    }

                    function clearChat() {
                        chatContainer.innerHTML = \`
                            <div style="text-align: center; padding: 16px; opacity: 0.8;">
                                <div style="font-size: 32px; margin-bottom: 8px;">🧹</div>
                                <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 15px;">Chat Cleared</h3>
                                <p style="margin: 0; opacity: 0.7; font-size: 12px;">Ready for a fresh conversation!</p>
                                <div style="margin-top: 8px; font-size: 10px; opacity: 0.6;">
                                    Try: "Create a Python web app" or "Make a React component"
                                </div>
                            </div>
                        \`;
                    }

                    function getFileIcon(fileName, fileType) {
                        const ext = fileName.split('.').pop()?.toLowerCase();
                        
                        // Image files
                        if (fileType.startsWith('image/')) return '🖼️';
                        
                        // Document files
                        if (ext === 'pdf') return '📄';
                        if (['doc', 'docx'].includes(ext)) return '📝';
                        if (['xls', 'xlsx'].includes(ext)) return '📊';
                        if (['ppt', 'pptx'].includes(ext)) return '📺';
                        
                        // Code files
                        if (['js', 'ts', 'jsx', 'tsx'].includes(ext)) return '⚡';
                        if (['py'].includes(ext)) return '🐍';
                        if (['java'].includes(ext)) return '☕';
                        if (['cpp', 'c', 'h'].includes(ext)) return '⚙️';
                        if (['html', 'htm'].includes(ext)) return '🌐';
                        if (['css', 'scss', 'sass'].includes(ext)) return '🎨';
                        if (['json', 'xml', 'yaml', 'yml'].includes(ext)) return '📋';
                        
                        // Archive files
                        if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
                        
                        // Text files
                        if (['txt', 'md', 'log'].includes(ext)) return '📄';
                        
                        // Default
                        return '📁';
                    }

                    function updateFilePreview() {
                        if (uploadedFiles.length === 0) {
                            filePreview.classList.remove('show');
                            return;
                        }
                        
                        filePreview.classList.add('show');
                        filePreview.innerHTML = uploadedFiles.map((file, index) => \`
                            <div class="file-item">
                                <span>\${getFileIcon(file.name, file.type)} \${file.name} (\${(file.size / 1024).toFixed(1)}KB)</span>
                                <button class="file-remove" onclick="removeFile(\${index})">✕</button>
                            </div>
                        \`).join('');
                    }
                    
                    function removeFile(index) {
                        uploadedFiles.splice(index, 1);
                        updateFilePreview();
                    }
                    
                    function handleFileUpload(files) {
                        for (let file of files) {
                            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                                addMessage('System', \`File "\${file.name}" is too large. Maximum size is 10MB.\`, 'system');
                                continue;
                            }
                            uploadedFiles.push(file);
                        }
                        updateFilePreview();
                    }
                    
                    fileInput.addEventListener('change', (e) => {
                        handleFileUpload(e.target.files);
                        e.target.value = '';
                    });

                    function addMessage(sender, message, type, useTyping = false) {
                        const messageElement = document.createElement('div');
                        messageElement.className = 'message ' + type;
                        
                        const headerElement = document.createElement('div');
                        headerElement.className = 'message-header';
                        
                        if (type === 'user') {
                            headerElement.innerHTML = '👤 <span style="color: rgba(102, 126, 234, 0.8);">You</span>';
                        } else if (type === 'ai') {
                            headerElement.innerHTML = '🤖 <span style="color: rgba(118, 75, 162, 0.8);">Astrelium</span>';
                        } else {
                            headerElement.innerHTML = '⚙️ <span style="color: rgba(86, 171, 47, 0.8);">System</span>';
                        }
                        
                        const contentElement = document.createElement('div');
                        contentElement.className = 'message-content';
                        
                        messageElement.appendChild(headerElement);
                        messageElement.appendChild(contentElement);
                        chatContainer.appendChild(messageElement);
                        
                        if (useTyping && type === 'ai') {
                            // Add typing animation for AI responses
                            typeText(contentElement, message);
                        } else {
                            const formattedMessage = type === 'ai' ? parseMarkdown(message) : message;
                            contentElement.innerHTML = formattedMessage;
                        }
                        
                        chatContainer.scrollTop = chatContainer.scrollHeight;
                        return messageElement;
                    }
                    
                    function typeText(element, text, speed = 30) {
                        element.innerHTML = '';
                        let i = 0;
                        const formattedText = parseMarkdown(text);
                        
                        // Create a temporary element to get plain text from HTML
                        const tempDiv = document.createElement('div');
                        tempDiv.innerHTML = formattedText;
                        const plainText = tempDiv.textContent || tempDiv.innerText || '';
                        
                        function typeChar() {
                            if (i < plainText.length) {
                                // Calculate how much text to show
                                const currentText = plainText.substring(0, i + 1);
                                
                                // Find the corresponding HTML by matching text length
                                const tempDiv2 = document.createElement('div');
                                tempDiv2.innerHTML = formattedText;
                                const walker = document.createTreeWalker(
                                    tempDiv2,
                                    NodeFilter.SHOW_TEXT,
                                    null,
                                    false
                                );
                                
                                let charCount = 0;
                                let lastNode = null;
                                while (walker.nextNode()) {
                                    const node = walker.currentNode;
                                    if (charCount + node.textContent.length >= i + 1) {
                                        // Truncate this text node
                                        const truncateAt = (i + 1) - charCount;
                                        node.textContent = node.textContent.substring(0, truncateAt);
                                        break;
                                    }
                                    charCount += node.textContent.length;
                                    lastNode = node;
                                }
                                
                                // Remove any remaining nodes
                                const allNodes = tempDiv2.querySelectorAll('*');
                                let shouldRemove = false;
                                for (let node of allNodes) {
                                    if (shouldRemove) {
                                        node.remove();
                                    }
                                    if (node.contains(walker.currentNode)) {
                                        shouldRemove = true;
                                    }
                                }
                                
                                element.innerHTML = tempDiv2.innerHTML + '<span class="typing-cursor">|</span>';
                                i++;
                                
                                chatContainer.scrollTop = chatContainer.scrollHeight;
                                setTimeout(typeChar, speed + Math.random() * 20);
                            } else {
                                // Typing complete
                                element.innerHTML = formattedText;
                                chatContainer.scrollTop = chatContainer.scrollHeight;
                            }
                        }
                        
                        typeChar();
                    }

                    async function sendMessage() {
                        const message = messageInput.value.trim();
                        if (!message && uploadedFiles.length === 0) return;
                        
                        let fullMessage = message;
                        
                        // Process uploaded files
                        if (uploadedFiles.length > 0) {
                            const fileContents = [];
                            
                            for (let file of uploadedFiles) {
                                if (file.type.startsWith('image/')) {
                                    fileContents.push(\`[Image: \${file.name} - \${file.type}]\`);
                                } else if (file.type === 'application/pdf') {
                                    fileContents.push(\`[PDF Document: \${file.name} - Cannot read PDF content, but file is attached]\`);
                                } else if (file.type.includes('document') || file.type.includes('word') || file.type.includes('excel') || file.type.includes('powerpoint')) {
                                    fileContents.push(\`[Document: \${file.name} - \${file.type} - Cannot read binary document content, but file is attached]\`);
                                } else {
                                    try {
                                        const text = await file.text();
                                        if (text.trim()) {
                                            fileContents.push(\`[File: \${file.name}]\\n\${text}\`);
                                        } else {
                                            fileContents.push(\`[File: \${file.name} - File appears to be empty or binary]\`);
                                        }
                                    } catch (error) {
                                        fileContents.push(\`[File: \${file.name} - Could not read content (binary file)]\`);
                                    }
                                }
                            }
                            
                            if (fileContents.length > 0) {
                                fullMessage = fullMessage + '\\n\\n' + fileContents.join('\\n\\n');
                            }
                        }
                        
                        const displayMessage = message + (uploadedFiles.length > 0 ? \` (+\${uploadedFiles.length} file\${uploadedFiles.length > 1 ? 's' : ''})\` : '');
                        addMessage('You', displayMessage, 'user');
                        
                        vscode.postMessage({ type: 'message', text: fullMessage });
                        messageInput.value = '';
                        uploadedFiles = [];
                        updateFilePreview();
                    }

                    // Setup event listeners with direct inline handlers
                    console.log('Setting up input event listeners...');
                    console.log('messageInput found:', !!messageInput);
                    console.log('sendButton found:', !!sendButton);
                    
                    if (!messageInput || !sendButton) {
                        console.error('Critical elements missing!');
                        return;
                    }
                    
                    // Direct event listener for Enter key
                    messageInput.addEventListener('keydown', function(event) {
                        console.log('Keydown event:', event.key, 'Shift:', event.shiftKey);
                        if (event.key === 'Enter' && !event.shiftKey) {
                            console.log('Enter pressed - preventing default and sending message');
                            event.preventDefault();
                            event.stopPropagation();
                            
                            // Call sendMessage directly
                            const message = messageInput.value.trim();
                            console.log('Message to send:', message);
                            if (message || uploadedFiles.length > 0) {
                                sendMessage();
                            } else {
                                console.log('No message to send');
                            }
                        }
                    });
                    
                    // Direct event listener for send button
                    sendButton.addEventListener('click', function(event) {
                        console.log('Send button clicked');
                        event.preventDefault();
                        event.stopPropagation();
                        
                        const message = messageInput.value.trim();
                        console.log('Message to send:', message);
                        if (message || uploadedFiles.length > 0) {
                            sendMessage();
                        } else {
                            console.log('No message to send');
                        }
                    });
                    
                    // Focus the input when page loads
                    setTimeout(() => {
                        messageInput.focus();
                        console.log('Input focused and ready');
                    }, 100);

                    let currentTypingMessage = null;
                    let typingTimeout = null;

                    window.addEventListener('message', event => {
                        const message = event.data;
                        
                        if (message.type === 'thinking') {
                            // Show thinking indicator with animation
                            const thinkingDiv = document.createElement('div');
                            thinkingDiv.className = 'message ai thinking';
                            thinkingDiv.innerHTML = \`
                                <div class="message-header">
                                    <div class="avatar">🤖</div>
                                    <div class="name">Astrelium</div>
                                    <div class="thinking-dots">
                                        <span>.</span><span>.</span><span>.</span>
                                    </div>
                                </div>
                                <div class="message-content">\${message.text}</div>
                            \`;
                            messagesContainer.appendChild(thinkingDiv);
                            messagesContainer.scrollTop = messagesContainer.scrollHeight;
                            currentTypingMessage = thinkingDiv;
                            
                        } else if (message.type === 'complete_response' || message.type === 'response') {
                            // Remove thinking indicator if present
                            if (currentTypingMessage) {
                                currentTypingMessage.remove();
                                currentTypingMessage = null;
                            }
                            
                            // Add message with typing effect for better UX
                            addMessage('Astrelium', message.text, 'ai', true);
                        }
                    });
                </script>
            </body>
            </html>`;
    }
}
