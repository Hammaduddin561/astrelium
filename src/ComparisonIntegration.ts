import * as vscode from 'vscode';
import { aiModelComparison, ComparisonData } from './aiModelData';

export class ComparisonViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'astrelium.comparisonView';
    private _view?: vscode.WebviewView;
    private _extensionUri: vscode.Uri;

    constructor(extensionUri: vscode.Uri) {
        this._extensionUri = extensionUri;
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this.getWebviewContent();

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.type) {
                case 'openExternal':
                    if (message.url) {
                        vscode.env.openExternal(vscode.Uri.parse(message.url));
                    }
                    break;
                case 'exportChart':
                    this.exportChartData(message.data);
                    break;
            }
        });
    }

    private exportChartData(data: any) {
        const jsonData = JSON.stringify(data, null, 2);
        vscode.workspace.openTextDocument({
            content: jsonData,
            language: 'json'
        }).then(doc => {
            vscode.window.showTextDocument(doc);
        });
    }

    private getWebviewContent(): string {
        // Get CSS content
        const cssContent = this.getCSS();
        
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AI Model Comparison</title>
            <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js"></script>
            <style>
                ${cssContent}
                
                /* VS Code specific adjustments */
                body {
                    margin: 0;
                    padding: 8px;
                    background: var(--vscode-editor-background);
                    color: var(--vscode-foreground);
                    font-family: var(--vscode-font-family);
                    font-size: var(--vscode-font-size);
                }
                
                .comparison-container {
                    background: var(--vscode-editor-background);
                    border-radius: 8px;
                    overflow: hidden;
                }
                
                .comparison-header {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 16px;
                    color: white;
                }
                
                .comparison-title {
                    font-size: 18px;
                    font-weight: 600;
                    margin: 0 0 8px 0;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .comparison-subtitle {
                    font-size: 12px;
                    margin: 0 0 12px 0;
                    opacity: 0.9;
                }
                
                .chart-tabs {
                    display: flex;
                    gap: 4px;
                    flex-wrap: wrap;
                }
                
                .chart-tab {
                    background: rgba(255, 255, 255, 0.15);
                    border: none;
                    color: white;
                    padding: 6px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 11px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }
                
                .chart-tab:hover {
                    background: rgba(255, 255, 255, 0.25);
                }
                
                .chart-tab.active {
                    background: rgba(255, 255, 255, 0.9);
                    color: #667eea;
                }
                
                .chart-content {
                    padding: 16px 12px;
                    background: var(--vscode-editor-background);
                }
                
                .chart-canvas {
                    width: 100% !important;
                    height: 300px !important;
                }
                
                .highlights-section {
                    padding: 12px;
                    background: var(--vscode-sideBar-background, #252526);
                    border-top: 1px solid var(--vscode-panel-border, #3e3e42);
                }
                
                .highlights-title {
                    font-size: 14px;
                    font-weight: 600;
                    margin: 0 0 12px 0;
                    color: var(--vscode-foreground);
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }
                
                .highlight-items {
                    display: grid;
                    gap: 8px;
                }
                
                .highlight-item {
                    background: var(--vscode-input-background, #3c3c3c);
                    border: 1px solid var(--vscode-input-border, #3e3e42);
                    border-radius: 6px;
                    padding: 8px 10px;
                    font-size: 11px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    transition: all 0.2s ease;
                }
                
                .highlight-item:hover {
                    background: var(--vscode-list-hoverBackground, #2a2d2e);
                }
                
                .highlight-icon {
                    font-size: 16px;
                    flex-shrink: 0;
                }
                
                .highlight-text {
                    flex: 1;
                }
                
                .highlight-text h5 {
                    margin: 0 0 2px 0;
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }
                
                .highlight-text p {
                    margin: 0;
                    font-size: 10px;
                    color: var(--vscode-descriptionForeground, #999);
                    line-height: 1.3;
                }
                
                .models-summary {
                    padding: 12px;
                    background: var(--vscode-editor-background);
                    border-top: 1px solid var(--vscode-panel-border, #3e3e42);
                }
                
                .models-title {
                    font-size: 13px;
                    font-weight: 600;
                    margin: 0 0 10px 0;
                    color: var(--vscode-foreground);
                }
                
                .model-item {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 6px 8px;
                    border-radius: 4px;
                    margin-bottom: 4px;
                    font-size: 10px;
                    background: var(--vscode-input-background, #3c3c3c);
                    border: 1px solid var(--vscode-input-border, #3e3e42);
                }
                
                .model-item.featured {
                    background: linear-gradient(135deg, 
                        rgba(102, 126, 234, 0.15), 
                        rgba(118, 75, 162, 0.15));
                    border-color: #667eea;
                }
                
                .model-name {
                    font-weight: 600;
                    color: var(--vscode-foreground);
                }
                
                .model-score {
                    font-size: 9px;
                    background: #667eea;
                    color: white;
                    padding: 2px 6px;
                    border-radius: 10px;
                    font-weight: 600;
                }
                
                .action-buttons {
                    display: flex;
                    gap: 6px;
                    margin-top: 12px;
                }
                
                .action-btn {
                    flex: 1;
                    background: var(--vscode-button-background, #0e639c);
                    color: var(--vscode-button-foreground, white);
                    border: none;
                    padding: 8px 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 10px;
                    font-weight: 500;
                    transition: all 0.2s ease;
                    font-family: inherit;
                }
                
                .action-btn:hover {
                    background: var(--vscode-button-hoverBackground, #1177bb);
                }
                
                .action-btn.secondary {
                    background: var(--vscode-button-secondaryBackground, #3c3c3c);
                    color: var(--vscode-button-secondaryForeground, #cccccc);
                }
                
                .action-btn.secondary:hover {
                    background: var(--vscode-button-secondaryHoverBackground, #464647);
                }
                
                /* Scrollbar styling */
                ::-webkit-scrollbar {
                    width: 6px;
                }
                
                ::-webkit-scrollbar-track {
                    background: transparent;
                }
                
                ::-webkit-scrollbar-thumb {
                    background: var(--vscode-scrollbarSlider-background, rgba(121, 121, 121, 0.4));
                    border-radius: 3px;
                }
                
                ::-webkit-scrollbar-thumb:hover {
                    background: var(--vscode-scrollbarSlider-hoverBackground, rgba(100, 100, 100, 0.7));
                }
            </style>
        </head>
        <body>
            <div class="comparison-container">
                <div class="comparison-header">
                    <h3 class="comparison-title">
                        <span>🚀</span>
                        AI Model Comparison
                    </h3>
                    <p class="comparison-subtitle">
                        See how Astrelium compares to other AI coding assistants
                    </p>
                    <div class="chart-tabs">
                        <button class="chart-tab active" data-type="bar">📊 Bar</button>
                        <button class="chart-tab" data-type="radar">🎯 Radar</button>
                        <button class="chart-tab" data-type="scatter">📈 Scatter</button>
                    </div>
                </div>
                
                <div class="chart-content">
                    <canvas id="comparisonChart" class="chart-canvas"></canvas>
                </div>
                
                <div class="highlights-section">
                    <h4 class="highlights-title">
                        <span>🌟</span>
                        Astrelium Advantages
                    </h4>
                    <div class="highlight-items">
                        <div class="highlight-item">
                            <div class="highlight-icon">🔒</div>
                            <div class="highlight-text">
                                <h5>100% Privacy</h5>
                                <p>Complete local processing</p>
                            </div>
                        </div>
                        <div class="highlight-item">
                            <div class="highlight-icon">💰</div>
                            <div class="highlight-text">
                                <h5>$0 Monthly Cost</h5>
                                <p>Free and open source</p>
                            </div>
                        </div>
                        <div class="highlight-item">
                            <div class="highlight-icon">📡</div>
                            <div class="highlight-text">
                                <h5>Works Offline</h5>
                                <p>No internet required</p>
                            </div>
                        </div>
                        <div class="highlight-item">
                            <div class="highlight-icon">⚡</div>
                            <div class="highlight-text">
                                <h5>Native Integration</h5>
                                <p>Built for VS Code</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="models-summary">
                    <h4 class="models-title">Model Rankings</h4>
                    <div id="modelsList"></div>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="exportData()">Export Data</button>
                        <button class="action-btn secondary" onclick="openDemo()">View Demo</button>
                    </div>
                </div>
            </div>
            
            <script>
                ${this.getJavaScript()}
            </script>
        </body>
        </html>`;
    }

    private getCSS(): string {
        // Return the minified version of our CSS for the webview
        return `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: var(--vscode-font-family, 'Segoe UI', sans-serif); }
        `;
    }

    private getJavaScript(): string {
        return `
            // AI Model Data (embedded)
            const aiModelData = ${JSON.stringify(aiModelComparison, null, 2)};
            
            let currentChart = null;
            let currentType = 'bar';
            
            // Initialize chart
            function initChart() {
                const canvas = document.getElementById('comparisonChart');
                if (!canvas || !window.Chart) {
                    setTimeout(initChart, 100);
                    return;
                }
                
                renderChart(currentType);
                renderModelsList();
            }
            
            function renderChart(type) {
                const canvas = document.getElementById('comparisonChart');
                if (!canvas) return;
                
                if (currentChart) {
                    currentChart.destroy();
                }
                
                const ctx = canvas.getContext('2d');
                const isDark = document.body.style.backgroundColor === 'rgb(30, 30, 30)' || 
                              getComputedStyle(document.body).backgroundColor.includes('30, 30, 30');
                
                const textColor = isDark ? '#cccccc' : '#333333';
                const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                
                switch (type) {
                    case 'radar':
                        renderRadarChart(ctx, textColor, gridColor);
                        break;
                    case 'scatter':
                        renderScatterChart(ctx, textColor, gridColor);
                        break;
                    default:
                        renderBarChart(ctx, textColor, gridColor);
                }
            }
            
            function renderBarChart(ctx, textColor, gridColor) {
                const metrics = ['privacy', 'costEffectiveness', 'speed', 'offlineCapability'];
                const datasets = metrics.map(metric => ({
                    label: aiModelData.categories[metric]?.label || metric,
                    data: aiModelData.models.map(model => model.metrics[metric]),
                    backgroundColor: aiModelData.models.map(model => 
                        model.name.toLowerCase() === 'astrelium' ? model.color + 'CC' : model.color + '66'
                    ),
                    borderColor: aiModelData.models.map(model => model.color),
                    borderWidth: aiModelData.models.map(model => 
                        model.name.toLowerCase() === 'astrelium' ? 3 : 1
                    ),
                    borderRadius: 4,
                }));
                
                currentChart = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: aiModelData.models.map(model => model.name),
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: true,
                                position: 'top',
                                labels: {
                                    usePointStyle: true,
                                    padding: 10,
                                    font: { size: 9 },
                                    color: textColor
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.9)',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                cornerRadius: 6,
                                callbacks: {
                                    afterLabel: (context) => {
                                        const model = aiModelData.models.find(m => m.name === context.label);
                                        if (model?.name.toLowerCase() === 'astrelium') {
                                            return ['🌟 Featured', '🔒 Private', '💰 Free'];
                                        }
                                        return [];
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                grid: { color: gridColor },
                                ticks: {
                                    callback: (value) => value + '%',
                                    color: textColor,
                                    font: { size: 8 }
                                }
                            },
                            x: {
                                grid: { display: false },
                                ticks: {
                                    maxRotation: 45,
                                    color: textColor,
                                    font: { size: 8 }
                                }
                            }
                        }
                    }
                });
            }
            
            function renderRadarChart(ctx, textColor, gridColor) {
                const labels = Object.values(aiModelData.categories).slice(0, 6).map(cat => cat.label);
                const datasets = aiModelData.models.slice(0, 4).map(model => ({
                    label: model.name,
                    data: Object.keys(aiModelData.categories).slice(0, 6).map(key => 
                        model.metrics[key]
                    ),
                    backgroundColor: model.name.toLowerCase() === 'astrelium' ? 
                        model.color + '30' : model.color + '15',
                    borderColor: model.color,
                    borderWidth: model.name.toLowerCase() === 'astrelium' ? 3 : 2,
                    pointRadius: 3,
                    fill: true
                }));
                
                currentChart = new Chart(ctx, {
                    type: 'radar',
                    data: { labels, datasets },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: {
                                    font: { size: 8 },
                                    color: textColor
                                }
                            }
                        },
                        scales: {
                            r: {
                                angleLines: { display: false },
                                suggestedMin: 0,
                                suggestedMax: 100,
                                grid: { color: gridColor },
                                pointLabels: {
                                    font: { size: 7 },
                                    color: textColor
                                },
                                ticks: { display: false }
                            }
                        }
                    }
                });
            }
            
            function renderScatterChart(ctx, textColor, gridColor) {
                currentChart = new Chart(ctx, {
                    type: 'scatter',
                    data: {
                        datasets: [{
                            label: 'AI Models',
                            data: aiModelData.models.map(model => ({
                                x: model.metrics.privacy,
                                y: model.metrics.costEffectiveness,
                                model: model
                            })),
                            backgroundColor: aiModelData.models.map(model => 
                                model.name.toLowerCase() === 'astrelium' ? model.color : model.color + '80'
                            ),
                            borderColor: aiModelData.models.map(model => model.color),
                            borderWidth: 2,
                            pointRadius: aiModelData.models.map(model => 
                                model.name.toLowerCase() === 'astrelium' ? 8 : 5
                            )
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { display: false },
                            tooltip: {
                                callbacks: {
                                    title: () => '',
                                    label: (context) => {
                                        const model = context.raw.model;
                                        return [
                                            model.name + ' (' + model.provider + ')',
                                            'Privacy: ' + model.metrics.privacy + '%',
                                            'Cost: ' + model.metrics.costEffectiveness + '%'
                                        ];
                                    }
                                }
                            }
                        },
                        scales: {
                            x: {
                                title: {
                                    display: true,
                                    text: 'Privacy Score (%)',
                                    color: textColor,
                                    font: { size: 10 }
                                },
                                min: 0, max: 100,
                                ticks: { color: textColor, font: { size: 8 } },
                                grid: { color: gridColor }
                            },
                            y: {
                                title: {
                                    display: true,
                                    text: 'Cost Effectiveness (%)',
                                    color: textColor,
                                    font: { size: 10 }
                                },
                                min: 0, max: 100,
                                ticks: { color: textColor, font: { size: 8 } },
                                grid: { color: gridColor }
                            }
                        }
                    }
                });
            }
            
            function renderModelsList() {
                const container = document.getElementById('modelsList');
                if (!container) return;
                
                // Calculate overall scores (average of key metrics)
                const keyMetrics = ['privacy', 'costEffectiveness', 'speed', 'offlineCapability'];
                const modelsWithScores = aiModelData.models.map(model => {
                    const score = keyMetrics.reduce((sum, metric) => sum + model.metrics[metric], 0) / keyMetrics.length;
                    return { ...model, overallScore: Math.round(score) };
                }).sort((a, b) => b.overallScore - a.overallScore);
                
                container.innerHTML = modelsWithScores.slice(0, 5).map(model => \`
                    <div class="model-item \${model.name.toLowerCase() === 'astrelium' ? 'featured' : ''}">
                        <span class="model-name">\${model.name}</span>
                        <span class="model-score">\${model.overallScore}%</span>
                    </div>
                \`).join('');
            }
            
            // Event listeners
            document.addEventListener('DOMContentLoaded', () => {
                // Chart type tabs
                const tabs = document.querySelectorAll('.chart-tab');
                tabs.forEach(tab => {
                    tab.addEventListener('click', (e) => {
                        tabs.forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        currentType = tab.getAttribute('data-type');
                        renderChart(currentType);
                    });
                });
                
                initChart();
            });
            
            // Global functions for buttons
            function exportData() {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    type: 'exportChart',
                    data: aiModelData
                });
            }
            
            function openDemo() {
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    type: 'openExternal',
                    url: 'https://github.com/Hammaduddin561/astrelium/blob/main/demo/ai-model-comparison-demo.html'
                });
            }
        `;
    }

    public showComparison() {
        if (this._view) {
            this._view.show?.(true);
        }
    }
}

// Command to open the comparison view
export function registerComparisonCommands(context: vscode.ExtensionContext) {
    const comparisonProvider = new ComparisonViewProvider(context.extensionUri);
    
    // Register the webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ComparisonViewProvider.viewType, 
            comparisonProvider
        )
    );
    
    // Register command to show comparison
    const showComparisonCommand = vscode.commands.registerCommand(
        'astrelium.showComparison', 
        () => {
            comparisonProvider.showComparison();
        }
    );
    
    context.subscriptions.push(showComparisonCommand);
    
    // Register command to open demo
    const openDemoCommand = vscode.commands.registerCommand(
        'astrelium.openComparisonDemo',
        () => {
            const demoPath = vscode.Uri.joinPath(context.extensionUri, 'demo', 'ai-model-comparison-demo.html');
            vscode.env.openExternal(demoPath);
        }
    );
    
    context.subscriptions.push(openDemoCommand);
}