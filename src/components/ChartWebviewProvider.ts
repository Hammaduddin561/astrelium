import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class ChartWebviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'astrelium.chartView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(data => {
            switch (data.type) {
                case 'alert':
                    vscode.window.showInformationMessage(data.value);
                    break;
                case 'log':
                    console.log('Chart:', data.value);
                    break;
            }
        });
    }

    public updateChartData(models: any[], metric?: string) {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'updateChart',
                models: models,
                metric: metric
            });
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get paths to CSS and JS files
        const stylesPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'components', 'ModelComparisonChart.css');
        const stylesUri = webview.asWebviewUri(stylesPath);

        const nonce = getNonce();

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}' https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js;">
                <link href="${stylesUri}" rel="stylesheet">
                <title>AI Model Comparison</title>
                <style>
                    body {
                        padding: 0;
                        margin: 0;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        font-family: var(--vscode-font-family);
                    }
                    .main-container {
                        padding: 16px;
                        max-width: 100%;
                        overflow-x: auto;
                    }
                    .chart-container {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 8px;
                        padding: 16px;
                        margin-bottom: 16px;
                    }
                    .chart-title {
                        color: var(--vscode-editor-foreground);
                        font-size: 14px;
                        font-weight: 600;
                        margin-bottom: 12px;
                        text-align: center;
                    }
                    .controls {
                        display: flex;
                        gap: 8px;
                        margin-bottom: 16px;
                        flex-wrap: wrap;
                    }
                    .control-group {
                        display: flex;
                        flex-direction: column;
                        gap: 4px;
                        min-width: 100px;
                    }
                    .control-group label {
                        font-size: 11px;
                        color: var(--vscode-descriptionForeground);
                        text-transform: uppercase;
                        font-weight: 600;
                    }
                    select, button {
                        padding: 4px 8px;
                        font-size: 12px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        outline: none;
                        font-family: inherit;
                    }
                    select:focus, button:focus {
                        border-color: var(--vscode-focusBorder);
                    }
                    button.active {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border-color: var(--vscode-button-background);
                    }
                    #chart-canvas {
                        width: 100% !important;
                        height: 300px !important;
                    }
                    .model-info {
                        margin-top: 16px;
                    }
                    .model-card {
                        background: var(--vscode-editor-background);
                        border: 1px solid var(--vscode-widget-border);
                        border-radius: 6px;
                        padding: 12px;
                        margin-bottom: 8px;
                        font-size: 12px;
                    }
                    .model-name {
                        font-weight: 600;
                        color: var(--vscode-editor-foreground);
                        margin-bottom: 4px;
                    }
                    .model-company {
                        color: var(--vscode-descriptionForeground);
                        font-size: 10px;
                        text-transform: uppercase;
                        margin-bottom: 8px;
                    }
                    .metrics {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 4px;
                    }
                    .metric {
                        display: flex;
                        justify-content: space-between;
                        font-size: 11px;
                    }
                    .metric-label {
                        color: var(--vscode-descriptionForeground);
                    }
                    .metric-value {
                        font-weight: 600;
                        color: var(--vscode-editor-foreground);
                    }
                </style>
            </head>
            <body>
                <div class="main-container">
                    <div class="chart-container">
                        <div class="chart-title">📊 AI Model Performance Comparison</div>
                        
                        <div class="controls">
                            <div class="control-group">
                                <label for="metric-select">Metric</label>
                                <select id="metric-select">
                                    <option value="accuracy">Accuracy</option>
                                    <option value="precision">Precision</option>
                                    <option value="recall">Recall</option>
                                    <option value="f1Score">F1 Score</option>
                                </select>
                            </div>
                            <div class="control-group">
                                <label for="category-select">Category</label>
                                <select id="category-select">
                                    <option value="all">All Models</option>
                                    <option value="general">General</option>
                                    <option value="coding">Coding</option>
                                    <option value="multimodal">Multimodal</option>
                                </select>
                            </div>
                        </div>
                        
                        <div id="chart-area">
                            <canvas id="chart-canvas"></canvas>
                        </div>
                    </div>
                    
                    <div id="model-info" class="model-info">
                        <!-- Model cards will be rendered here -->
                    </div>
                </div>

                <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.js"></script>
                <script nonce="${nonce}">
                    const vscode = acquireVsCodeApi();
                    
                    // Sample model data (same as before)
                    const modelData = [
                        {
                            id: 'gpt-4',
                            name: 'GPT-4',
                            company: 'OpenAI',
                            category: 'general',
                            metrics: { accuracy: 92.5, precision: 90.8, recall: 94.2, f1Score: 92.4 },
                            color: '#10a37f',
                            description: 'Large multimodal model with strong reasoning capabilities'
                        },
                        {
                            id: 'claude-3-opus',
                            name: 'Claude 3 Opus',
                            company: 'Anthropic',
                            category: 'general',
                            metrics: { accuracy: 91.8, precision: 89.5, recall: 93.1, f1Score: 91.3 },
                            color: '#d97706',
                            description: 'Most capable model in Claude 3 family'
                        },
                        {
                            id: 'gemini-pro',
                            name: 'Gemini Pro',
                            company: 'Google',
                            category: 'multimodal',
                            metrics: { accuracy: 89.2, precision: 87.6, recall: 90.8, f1Score: 89.1 },
                            color: '#4285f4',
                            description: 'Multimodal AI model optimized for various tasks'
                        },
                        {
                            id: 'llama-2-70b',
                            name: 'LLaMA 2 70B',
                            company: 'Meta',
                            category: 'general',
                            metrics: { accuracy: 87.3, precision: 85.2, recall: 88.9, f1Score: 87.0 },
                            color: '#1877f2',
                            description: 'Open-source large language model'
                        },
                        {
                            id: 'code-llama-34b',
                            name: 'Code Llama 34B',
                            company: 'Meta',
                            category: 'coding',
                            metrics: { accuracy: 88.7, precision: 91.2, recall: 85.4, f1Score: 88.2 },
                            color: '#8b5cf6',
                            description: 'Specialized coding model based on LLaMA 2'
                        },
                        {
                            id: 'mixtral-8x7b',
                            name: 'Mixtral 8x7B',
                            company: 'Mistral AI',
                            category: 'general',
                            metrics: { accuracy: 86.9, precision: 84.7, recall: 88.2, f1Score: 86.4 },
                            color: '#ff6b35',
                            description: 'Mixture of experts model with high performance'
                        }
                    ];

                    let chart;
                    let currentMetric = 'accuracy';
                    let currentCategory = 'all';

                    function getMetricLabel(metric) {
                        const labels = {
                            accuracy: 'Accuracy',
                            precision: 'Precision',
                            recall: 'Recall',
                            f1Score: 'F1 Score'
                        };
                        return labels[metric];
                    }

                    function filterModels(category) {
                        if (category === 'all') {
                            return modelData;
                        }
                        return modelData.filter(model => model.category === category);
                    }

                    function sortModels(models, metric) {
                        return [...models].sort((a, b) => b.metrics[metric] - a.metrics[metric]);
                    }

                    function createChart() {
                        const filteredModels = filterModels(currentCategory);
                        const sortedModels = sortModels(filteredModels, currentMetric);
                        
                        const ctx = document.getElementById('chart-canvas').getContext('2d');
                        
                        if (chart) {
                            chart.destroy();
                        }

                        const labels = sortedModels.map(model => model.name);
                        const data = sortedModels.map(model => model.metrics[currentMetric]);
                        const colors = sortedModels.map(model => model.color);
                        
                        chart = new Chart(ctx, {
                            type: 'bar',
                            data: {
                                labels,
                                datasets: [{
                                    label: getMetricLabel(currentMetric) + ' (%)',
                                    data,
                                    backgroundColor: colors.map(color => color + '80'),
                                    borderColor: colors,
                                    borderWidth: 1
                                }]
                            },
                            options: {
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: {
                                        display: false
                                    },
                                    tooltip: {
                                        callbacks: {
                                            afterLabel: (context) => {
                                                const model = sortedModels[context.dataIndex];
                                                return [
                                                    'Company: ' + model.company,
                                                    'Category: ' + model.category
                                                ];
                                            }
                                        }
                                    }
                                },
                                scales: {
                                    y: {
                                        beginAtZero: true,
                                        max: 100,
                                        ticks: {
                                            callback: (value) => value + '%'
                                        }
                                    }
                                }
                            }
                        });

                        renderModelCards(sortedModels);
                    }

                    function renderModelCards(models) {
                        const container = document.getElementById('model-info');
                        container.innerHTML = '';

                        models.slice(0, 3).forEach(model => {
                            const card = document.createElement('div');
                            card.className = 'model-card';
                            card.innerHTML = \`
                                <div class="model-name">\${model.name}</div>
                                <div class="model-company">\${model.company}</div>
                                <div class="metrics">
                                    <div class="metric">
                                        <span class="metric-label">Accuracy</span>
                                        <span class="metric-value">\${model.metrics.accuracy}%</span>
                                    </div>
                                    <div class="metric">
                                        <span class="metric-label">Precision</span>
                                        <span class="metric-value">\${model.metrics.precision}%</span>
                                    </div>
                                    <div class="metric">
                                        <span class="metric-label">Recall</span>
                                        <span class="metric-value">\${model.metrics.recall}%</span>
                                    </div>
                                    <div class="metric">
                                        <span class="metric-label">F1 Score</span>
                                        <span class="metric-value">\${model.metrics.f1Score}%</span>
                                    </div>
                                </div>
                            \`;
                            container.appendChild(card);
                        });
                    }

                    // Event listeners
                    document.getElementById('metric-select').addEventListener('change', function(e) {
                        currentMetric = e.target.value;
                        createChart();
                        vscode.postMessage({
                            type: 'log',
                            value: 'Metric changed to: ' + currentMetric
                        });
                    });

                    document.getElementById('category-select').addEventListener('change', function(e) {
                        currentCategory = e.target.value;
                        createChart();
                        vscode.postMessage({
                            type: 'log',
                            value: 'Category changed to: ' + currentCategory
                        });
                    });

                    // Handle messages from extension
                    window.addEventListener('message', event => {
                        const message = event.data;
                        switch (message.type) {
                            case 'updateChart':
                                if (message.models) {
                                    modelData.splice(0, modelData.length, ...message.models);
                                }
                                if (message.metric) {
                                    currentMetric = message.metric;
                                    document.getElementById('metric-select').value = message.metric;
                                }
                                createChart();
                                break;
                        }
                    });

                    // Initialize chart when DOM is loaded
                    if (document.readyState === 'loading') {
                        document.addEventListener('DOMContentLoaded', createChart);
                    } else {
                        createChart();
                    }
                </script>
            </body>
            </html>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}