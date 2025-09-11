/**
 * Astrelium vs Competitors Comparison Dashboard
 * Main webview provider for the comparison interface
 */

import * as vscode from 'vscode';
import { aiModels, metrics, marketingMessages, astreliumColors } from '../data/competitorData';

export class AstreliumVsCompetitorsProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'astrelium.comparisonDashboard';
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
        webviewView.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'showDetails':
                        this._showModelDetails(message.modelName);
                        return;
                    case 'exportData':
                        this._exportComparisonData();
                        return;
                    case 'openStandaloneView':
                        this._openStandaloneView();
                        return;
                }
            }
        );
    }

    private _showModelDetails(modelName: string): void {
        const model = aiModels.find(m => m.name === modelName);
        if (model) {
            vscode.window.showInformationMessage(
                `${model.name}: ${model.description}`,
                { modal: true }
            );
        }
    }

    private async _exportComparisonData(): Promise<void> {
        const data = {
            aiModels,
            metrics,
            marketingMessages,
            exportDate: new Date().toISOString()
        };

        const jsonData = JSON.stringify(data, null, 2);
        
        const doc = await vscode.workspace.openTextDocument({
            content: jsonData,
            language: 'json'
        });
        
        await vscode.window.showTextDocument(doc);
        vscode.window.showInformationMessage('Comparison data exported to new JSON file');
    }

    private async _openStandaloneView(): Promise<void> {
        // Create a new webview panel for standalone view
        const panel = vscode.window.createWebviewPanel(
            'astreliumComparison',
            'Astrelium vs Competitors - Full Dashboard',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        panel.webview.html = this._getStandaloneHtml(panel.webview);
        vscode.window.showInformationMessage('Opened full comparison dashboard');
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        // Get the local path to main script run in the webview, then convert it to a uri we can use in the webview.
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'out', 'webview', 'comparison.js')
        );

        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
                  style-src ${webview.cspSource} 'unsafe-inline'; 
                  script-src ${webview.cspSource} 'unsafe-inline' https://cdn.jsdelivr.net; 
                  img-src ${webview.cspSource} https:;">
            <title>Astrelium vs Competitors</title>
            <style>
                ${this._getCSSForWebview()}
            </style>
        </head>
        <body>
            <div class="dashboard-container">
                <!-- Hero Section -->
                <div class="hero-section">
                    <div class="hero-content">
                        <h1 class="hero-title">${marketingMessages.hero}</h1>
                        <p class="hero-tagline">${marketingMessages.tagline}</p>
                        <div class="hero-badges">
                            <span class="badge privacy">🔒 100% Privacy</span>
                            <span class="badge cost">💰 One-Time Cost</span>
                            <span class="badge offline">🌐 100% Offline</span>
                        </div>
                    </div>
                </div>

                <!-- Quick Stats -->
                <div class="quick-stats">
                    <div class="stat-card winner">
                        <div class="stat-icon">👑</div>
                        <div class="stat-value">100%</div>
                        <div class="stat-label">Privacy Score</div>
                    </div>
                    <div class="stat-card winner">
                        <div class="stat-icon">💰</div>
                        <div class="stat-value">$0</div>
                        <div class="stat-label">Monthly Cost</div>
                    </div>
                    <div class="stat-card winner">
                        <div class="stat-icon">🌐</div>
                        <div class="stat-value">100%</div>
                        <div class="stat-label">Offline</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-value">95%</div>
                        <div class="stat-label">VS Code</div>
                    </div>
                </div>

                <!-- Navigation Tabs -->
                <div class="nav-tabs">
                    <button class="nav-tab active" data-tab="overview">Overview</button>
                    <button class="nav-tab" data-tab="detailed">Detailed Comparison</button>
                    <button class="nav-tab" data-tab="privacy">Privacy Focus</button>
                    <button class="nav-tab" data-tab="cost">Cost Analysis</button>
                </div>

                <!-- Overview Tab -->
                <div id="overview-tab" class="tab-content active">
                    <div class="comparison-grid">
                        <!-- Radar Chart -->
                        <div class="chart-container">
                            <h3>🎯 Overall Performance Comparison</h3>
                            <canvas id="radarChart" width="400" height="400"></canvas>
                        </div>

                        <!-- Key Advantages -->
                        <div class="advantages-panel">
                            <h3>🌟 Why Choose Astrelium?</h3>
                            <div class="advantages-list">
                                ${marketingMessages.keyBenefits.map(benefit => 
                                    `<div class="advantage-item">${benefit}</div>`
                                ).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Comparison Tab -->
                <div id="detailed-tab" class="tab-content">
                    <div class="detailed-comparison">
                        <!-- Bar Charts for Each Metric -->
                        <div class="metrics-grid">
                            ${Object.entries(metrics).map(([key, metric]) => `
                                <div class="metric-chart">
                                    <h4>${metric.icon} ${metric.name}</h4>
                                    <div class="metric-bars">
                                        ${aiModels.map(model => `
                                            <div class="metric-bar-row ${model.isHero ? 'hero' : ''}">
                                                <span class="model-name">${model.name}</span>
                                                <div class="bar-container">
                                                    <div class="bar" style="width: ${(model as any)[key]}%; background: ${model.isHero ? astreliumColors.gradient : model.brandColor}20;"></div>
                                                    <span class="bar-value">${(model as any)[key]}%</span>
                                                </div>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Privacy Focus Tab -->
                <div id="privacy-tab" class="tab-content">
                    <div class="privacy-focus">
                        <div class="privacy-hero">
                            <h2>🔒 Privacy & Security Leadership</h2>
                            <p>Astrelium leads the industry with complete local processing and zero external data transmission.</p>
                        </div>
                        
                        <div class="privacy-comparison">
                            <canvas id="privacyChart" width="600" height="300"></canvas>
                        </div>

                        <div class="privacy-details">
                            <div class="privacy-card astrelium">
                                <h4>🌌 Astrelium Privacy</h4>
                                <p>${aiModels[0].privacyDetails}</p>
                                <div class="privacy-score">Score: 100%</div>
                            </div>
                            
                            <div class="privacy-warnings">
                                <h4>⚠️ Competitor Privacy Concerns</h4>
                                <ul>
                                    <li>Code sent to external servers for processing</li>
                                    <li>Data may be used for training and improvement</li>
                                    <li>Potential for data breaches and unauthorized access</li>
                                    <li>Compliance challenges in regulated industries</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Cost Analysis Tab -->
                <div id="cost-tab" class="tab-content">
                    <div class="cost-analysis">
                        <h2>💰 Total Cost of Ownership Analysis</h2>
                        
                        <div class="cost-chart-container">
                            <canvas id="costChart" width="600" height="400"></canvas>
                        </div>

                        <div class="cost-breakdown">
                            <div class="cost-card astrelium">
                                <h4>🌌 Astrelium</h4>
                                <div class="cost-details">
                                    <div class="cost-item">
                                        <span>Initial Setup:</span>
                                        <span class="cost-value">One-time</span>
                                    </div>
                                    <div class="cost-item">
                                        <span>Monthly Fee:</span>
                                        <span class="cost-value">$0</span>
                                    </div>
                                    <div class="cost-item">
                                        <span>Usage Limits:</span>
                                        <span class="cost-value">None</span>
                                    </div>
                                    <div class="cost-total">
                                        <span>3-Year Total:</span>
                                        <span class="cost-value">~$50</span>
                                    </div>
                                </div>
                            </div>

                            <div class="cost-comparison-grid">
                                ${aiModels.slice(1).map(model => `
                                    <div class="cost-card competitor">
                                        <h5>${model.name}</h5>
                                        <div class="cost-item">
                                            <span>Pricing:</span>
                                            <span class="cost-value">${model.pricingModel}</span>
                                        </div>
                                        <div class="cost-estimate">
                                            Est. 3-Year: $${this._estimateThreeYearCost(model.pricingModel)}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons">
                    <button class="action-btn primary" onclick="openStandaloneView()">
                        🚀 Open Full Dashboard
                    </button>
                    <button class="action-btn secondary" onclick="exportData()">
                        📊 Export Data
                    </button>
                    <button class="action-btn secondary" onclick="shareComparison()">
                        📤 Share Comparison
                    </button>
                </div>
            </div>

            <!-- Include Chart.js -->
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
            <script>
                ${this._getJavaScriptForWebview()}
            </script>
        </body>
        </html>`;
    }

    private _getStandaloneHtml(webview: vscode.Webview): string {
        // Similar to _getHtmlForWebview but with full-screen layout and additional features
        return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Astrelium vs Competitors - Complete Dashboard</title>
            <style>
                ${this._getCSSForWebview()}
                
                /* Full screen specific styles */
                body {
                    margin: 0;
                    padding: 20px;
                    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%);
                    min-height: 100vh;
                }
                
                .dashboard-container {
                    max-width: 1200px;
                    margin: 0 auto;
                }
                
                .full-screen-header {
                    text-align: center;
                    padding: 40px 0;
                    background: ${astreliumColors.gradient};
                    border-radius: 20px;
                    margin-bottom: 30px;
                    color: white;
                }
                
                .full-screen-header h1 {
                    font-size: 3em;
                    margin: 0;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }
                
                .comparison-matrix {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 20px;
                    margin: 30px 0;
                }
            </style>
            <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        </head>
        <body>
            <div class="dashboard-container">
                <div class="full-screen-header">
                    <h1>🌌 Astrelium vs AI Coding Assistants</h1>
                    <p>The Complete Privacy-First AI Comparison</p>
                </div>
                
                <!-- Complete comparison matrix and charts would go here -->
                <div class="comparison-matrix">
                    <!-- Feature Matrix Table -->
                    <div class="feature-matrix">
                        <h3>📋 Feature Comparison Matrix</h3>
                        <table class="comparison-table">
                            <thead>
                                <tr>
                                    <th>Feature</th>
                                    ${aiModels.map(model => `
                                        <th class="${model.isHero ? 'hero' : ''}">${model.name}</th>
                                    `).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(metrics).map(([key, metric]) => `
                                    <tr>
                                        <td class="metric-name">${metric.icon} ${metric.name}</td>
                                        ${aiModels.map(model => {
                                            const value = (model as any)[key];
                                            const isWinner = model.isHero && value >= 85;
                                            return `<td class="metric-cell ${isWinner ? 'winner' : ''} ${model.isHero ? 'hero' : ''}">
                                                ${value}%${isWinner ? ' 👑' : ''}
                                            </td>`;
                                        }).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <!-- Interactive Charts Section -->
                <div class="charts-grid">
                    <div class="chart-panel">
                        <canvas id="fullRadarChart" width="500" height="500"></canvas>
                    </div>
                    <div class="chart-panel">
                        <canvas id="fullCostChart" width="500" height="400"></canvas>
                    </div>
                </div>
            </div>
            
            <script>
                ${this._getJavaScriptForWebview()}
            </script>
        </body>
        </html>`;
    }

    private _estimateThreeYearCost(pricingModel: string): string {
        // Simple cost estimation based on pricing model
        if (pricingModel.includes('$10/month')) return '360+';
        if (pricingModel.includes('$19/month')) return '684+';
        if (pricingModel.includes('$12/month')) return '432+';
        if (pricingModel.includes('$39/month')) return '1,404+';
        if (pricingModel.includes('token')) return '300-2,000+';
        if (pricingModel.includes('Free')) return '0-300+';
        return '200-1,000+';
    }

    private _getCSSForWebview(): string {
        return `
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #1e1b4b;
                color: #f8fafc;
                line-height: 1.6;
            }

            .dashboard-container {
                padding: 20px;
                max-width: 100%;
            }

            /* Hero Section */
            .hero-section {
                background: ${astreliumColors.gradient};
                border-radius: 16px;
                padding: 30px;
                text-align: center;
                margin-bottom: 30px;
                box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3);
            }

            .hero-title {
                font-size: 2.2em;
                font-weight: 700;
                margin-bottom: 10px;
                text-shadow: 2px 2px 4px rgba(0,0,0,0.2);
            }

            .hero-tagline {
                font-size: 1.1em;
                opacity: 0.9;
                margin-bottom: 20px;
            }

            .hero-badges {
                display: flex;
                gap: 10px;
                justify-content: center;
                flex-wrap: wrap;
            }

            .badge {
                background: rgba(255,255,255,0.2);
                padding: 8px 16px;
                border-radius: 25px;
                font-size: 0.9em;
                font-weight: 600;
                backdrop-filter: blur(10px);
            }

            .badge.privacy { border: 2px solid #10b981; }
            .badge.cost { border: 2px solid #f59e0b; }
            .badge.offline { border: 2px solid #3b82f6; }

            /* Quick Stats */
            .quick-stats {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 15px;
                margin-bottom: 30px;
            }

            .stat-card {
                background: rgba(55, 65, 81, 0.8);
                border-radius: 12px;
                padding: 20px;
                text-align: center;
                border: 1px solid rgba(139, 92, 246, 0.2);
                transition: transform 0.2s, box-shadow 0.2s;
            }

            .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(139, 92, 246, 0.3);
            }

            .stat-card.winner {
                border-color: #10b981;
                background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%);
            }

            .stat-icon {
                font-size: 2em;
                margin-bottom: 10px;
            }

            .stat-value {
                font-size: 1.8em;
                font-weight: 700;
                color: ${astreliumColors.primary};
                margin-bottom: 5px;
            }

            .stat-label {
                font-size: 0.9em;
                opacity: 0.8;
            }

            /* Navigation Tabs */
            .nav-tabs {
                display: flex;
                gap: 5px;
                margin-bottom: 20px;
                background: rgba(55, 65, 81, 0.5);
                border-radius: 12px;
                padding: 5px;
            }

            .nav-tab {
                flex: 1;
                padding: 12px 16px;
                background: transparent;
                border: none;
                color: #d1d5db;
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.3s;
                font-weight: 500;
            }

            .nav-tab:hover {
                background: rgba(139, 92, 246, 0.2);
                color: white;
            }

            .nav-tab.active {
                background: ${astreliumColors.gradient};
                color: white;
                box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
            }

            /* Tab Content */
            .tab-content {
                display: none;
            }

            .tab-content.active {
                display: block;
            }

            /* Comparison Grid */
            .comparison-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 30px;
                margin-bottom: 30px;
            }

            @media (max-width: 768px) {
                .comparison-grid {
                    grid-template-columns: 1fr;
                }
            }

            .chart-container {
                background: rgba(55, 65, 81, 0.6);
                border-radius: 16px;
                padding: 25px;
                border: 1px solid rgba(139, 92, 246, 0.2);
            }

            .chart-container h3 {
                margin-bottom: 20px;
                color: ${astreliumColors.primary};
                font-size: 1.3em;
            }

            .advantages-panel {
                background: rgba(55, 65, 81, 0.6);
                border-radius: 16px;
                padding: 25px;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }

            .advantages-panel h3 {
                margin-bottom: 20px;
                color: #10b981;
                font-size: 1.3em;
            }

            .advantages-list {
                display: flex;
                flex-direction: column;
                gap: 12px;
            }

            .advantage-item {
                padding: 12px;
                background: rgba(16, 185, 129, 0.1);
                border-radius: 8px;
                border-left: 4px solid #10b981;
                font-size: 0.95em;
                line-height: 1.5;
            }

            /* Metrics Grid */
            .metrics-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
                gap: 25px;
            }

            .metric-chart {
                background: rgba(55, 65, 81, 0.6);
                border-radius: 12px;
                padding: 20px;
                border: 1px solid rgba(139, 92, 246, 0.2);
            }

            .metric-chart h4 {
                margin-bottom: 15px;
                color: ${astreliumColors.primary};
                font-size: 1.1em;
            }

            .metric-bars {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .metric-bar-row {
                display: grid;
                grid-template-columns: 120px 1fr auto;
                gap: 10px;
                align-items: center;
                padding: 6px 0;
            }

            .metric-bar-row.hero {
                background: rgba(139, 92, 246, 0.1);
                border-radius: 6px;
                padding: 8px;
                border: 1px solid rgba(139, 92, 246, 0.3);
            }

            .model-name {
                font-size: 0.85em;
                font-weight: 500;
            }

            .bar-container {
                position: relative;
                height: 20px;
                background: rgba(55, 65, 81, 0.8);
                border-radius: 10px;
                overflow: hidden;
            }

            .bar {
                height: 100%;
                border-radius: 10px;
                transition: width 0.8s ease;
                background: linear-gradient(90deg, rgba(139, 92, 246, 0.8) 0%, rgba(59, 130, 246, 0.8) 100%);
            }

            .metric-bar-row.hero .bar {
                background: ${astreliumColors.gradient};
            }

            .bar-value {
                font-size: 0.8em;
                font-weight: 600;
                min-width: 35px;
                text-align: right;
            }

            /* Privacy Focus Styles */
            .privacy-focus {
                background: rgba(55, 65, 81, 0.6);
                border-radius: 16px;
                padding: 30px;
                border: 1px solid rgba(16, 185, 129, 0.3);
            }

            .privacy-hero {
                text-align: center;
                margin-bottom: 30px;
            }

            .privacy-hero h2 {
                color: #10b981;
                margin-bottom: 15px;
                font-size: 1.8em;
            }

            .privacy-comparison {
                margin-bottom: 30px;
                text-align: center;
            }

            .privacy-details {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 25px;
            }

            @media (max-width: 768px) {
                .privacy-details {
                    grid-template-columns: 1fr;
                }
            }

            .privacy-card {
                background: rgba(16, 185, 129, 0.1);
                border: 1px solid #10b981;
                border-radius: 12px;
                padding: 20px;
            }

            .privacy-card h4 {
                color: #10b981;
                margin-bottom: 15px;
                font-size: 1.2em;
            }

            .privacy-score {
                font-size: 1.5em;
                font-weight: 700;
                color: #10b981;
                text-align: center;
                margin-top: 15px;
            }

            .privacy-warnings {
                background: rgba(239, 68, 68, 0.1);
                border: 1px solid #ef4444;
                border-radius: 12px;
                padding: 20px;
            }

            .privacy-warnings h4 {
                color: #ef4444;
                margin-bottom: 15px;
                font-size: 1.2em;
            }

            .privacy-warnings ul {
                list-style: none;
                padding: 0;
            }

            .privacy-warnings li {
                padding: 8px 0;
                padding-left: 20px;
                position: relative;
            }

            .privacy-warnings li::before {
                content: '⚠️';
                position: absolute;
                left: 0;
            }

            /* Cost Analysis */
            .cost-analysis {
                background: rgba(55, 65, 81, 0.6);
                border-radius: 16px;
                padding: 30px;
                border: 1px solid rgba(245, 158, 11, 0.3);
            }

            .cost-analysis h2 {
                color: #f59e0b;
                margin-bottom: 25px;
                text-align: center;
                font-size: 1.8em;
            }

            .cost-chart-container {
                text-align: center;
                margin-bottom: 30px;
            }

            .cost-breakdown {
                display: grid;
                grid-template-columns: 1fr 2fr;
                gap: 25px;
            }

            @media (max-width: 768px) {
                .cost-breakdown {
                    grid-template-columns: 1fr;
                }
            }

            .cost-card {
                background: rgba(245, 158, 11, 0.1);
                border: 1px solid #f59e0b;
                border-radius: 12px;
                padding: 20px;
            }

            .cost-card.astrelium {
                border-color: #10b981;
                background: rgba(16, 185, 129, 0.1);
            }

            .cost-card h4, .cost-card h5 {
                margin-bottom: 15px;
                font-size: 1.2em;
            }

            .cost-card.astrelium h4 {
                color: #10b981;
            }

            .cost-card.competitor h5 {
                color: #f59e0b;
            }

            .cost-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .cost-total {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 12px 0;
                margin-top: 10px;
                font-weight: 700;
                font-size: 1.1em;
                border-top: 2px solid #10b981;
            }

            .cost-value {
                font-weight: 600;
                color: ${astreliumColors.primary};
            }

            .cost-comparison-grid {
                display: grid;
                gap: 15px;
            }

            .cost-estimate {
                margin-top: 10px;
                padding: 8px;
                background: rgba(239, 68, 68, 0.1);
                border-radius: 6px;
                text-align: center;
                font-weight: 600;
                color: #ef4444;
            }

            /* Action Buttons */
            .action-buttons {
                display: flex;
                gap: 15px;
                justify-content: center;
                margin-top: 30px;
                flex-wrap: wrap;
            }

            .action-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 25px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s;
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                gap: 8px;
            }

            .action-btn.primary {
                background: ${astreliumColors.gradient};
                color: white;
                box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
            }

            .action-btn.primary:hover {
                transform: translateY(-2px);
                box-shadow: 0 6px 20px rgba(139, 92, 246, 0.6);
            }

            .action-btn.secondary {
                background: rgba(55, 65, 81, 0.8);
                color: #d1d5db;
                border: 1px solid rgba(139, 92, 246, 0.3);
            }

            .action-btn.secondary:hover {
                background: rgba(139, 92, 246, 0.2);
                color: white;
                transform: translateY(-1px);
            }

            /* Feature Matrix Table */
            .comparison-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                background: rgba(55, 65, 81, 0.6);
                border-radius: 12px;
                overflow: hidden;
            }

            .comparison-table th,
            .comparison-table td {
                padding: 12px;
                text-align: center;
                border-bottom: 1px solid rgba(255,255,255,0.1);
            }

            .comparison-table th {
                background: rgba(139, 92, 246, 0.2);
                font-weight: 600;
                color: ${astreliumColors.primary};
            }

            .comparison-table th.hero {
                background: ${astreliumColors.gradient};
                color: white;
            }

            .metric-name {
                text-align: left !important;
                font-weight: 500;
            }

            .metric-cell {
                font-weight: 600;
            }

            .metric-cell.hero {
                background: rgba(139, 92, 246, 0.1);
                color: ${astreliumColors.primary};
            }

            .metric-cell.winner {
                background: rgba(16, 185, 129, 0.2);
                color: #10b981;
            }

            /* Chart panels */
            .charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
                gap: 30px;
                margin-top: 30px;
            }

            .chart-panel {
                background: rgba(55, 65, 81, 0.6);
                border-radius: 16px;
                padding: 25px;
                border: 1px solid rgba(139, 92, 246, 0.2);
                text-align: center;
            }

            /* Responsive Design */
            @media (max-width: 480px) {
                .hero-title {
                    font-size: 1.8em;
                }
                
                .quick-stats {
                    grid-template-columns: repeat(2, 1fr);
                }
                
                .nav-tab {
                    padding: 8px 12px;
                    font-size: 0.9em;
                }
                
                .comparison-grid {
                    grid-template-columns: 1fr;
                    gap: 20px;
                }
                
                .action-buttons {
                    flex-direction: column;
                    align-items: center;
                }
            }

            /* Animation classes */
            .fade-in {
                animation: fadeIn 0.6s ease-in;
            }

            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .slide-in-left {
                animation: slideInLeft 0.8s ease-out;
            }

            @keyframes slideInLeft {
                from { opacity: 0; transform: translateX(-50px); }
                to { opacity: 1; transform: translateX(0); }
            }
        `;
    }

    private _getJavaScriptForWebview(): string {
        return `
            const vscode = acquireVsCodeApi();
            
            // Data from TypeScript
            const aiModels = ${JSON.stringify(aiModels)};
            const metrics = ${JSON.stringify(metrics)};
            const marketingMessages = ${JSON.stringify(marketingMessages)};
            const astreliumColors = ${JSON.stringify(astreliumColors)};

            // Tab Navigation
            document.addEventListener('DOMContentLoaded', function() {
                // Tab switching
                const navTabs = document.querySelectorAll('.nav-tab');
                const tabContents = document.querySelectorAll('.tab-content');

                navTabs.forEach(tab => {
                    tab.addEventListener('click', () => {
                        const targetTab = tab.dataset.tab;
                        
                        // Update nav tabs
                        navTabs.forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        
                        // Update tab contents
                        tabContents.forEach(content => {
                            content.classList.remove('active');
                            if (content.id === targetTab + '-tab') {
                                content.classList.add('active');
                            }
                        });
                        
                        // Initialize charts for the active tab
                        setTimeout(() => {
                            if (targetTab === 'overview') {
                                initializeRadarChart();
                            } else if (targetTab === 'privacy') {
                                initializePrivacyChart();
                            } else if (targetTab === 'cost') {
                                initializeCostChart();
                            }
                        }, 100);
                    });
                });

                // Initialize overview charts by default
                setTimeout(() => {
                    initializeRadarChart();
                }, 200);

                // Add animations
                document.querySelectorAll('.stat-card').forEach((card, index) => {
                    setTimeout(() => {
                        card.classList.add('fade-in');
                    }, index * 100);
                });
            });

            function initializeRadarChart() {
                const canvas = document.getElementById('radarChart');
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                
                // Clear any existing chart
                if (window.radarChartInstance) {
                    window.radarChartInstance.destroy();
                }

                const astrelium = aiModels[0]; // Astrelium is first
                const topCompetitors = aiModels.slice(1, 4); // Top 3 competitors

                const metricLabels = Object.keys(metrics).map(key => metrics[key].name);
                
                window.radarChartInstance = new Chart(ctx, {
                    type: 'radar',
                    data: {
                        labels: metricLabels,
                        datasets: [
                            {
                                label: '🌌 Astrelium',
                                data: Object.keys(metrics).map(key => astrelium[key]),
                                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                borderColor: astreliumColors.primary,
                                borderWidth: 3,
                                pointBackgroundColor: astreliumColors.primary,
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 6
                            },
                            ...topCompetitors.map((model, index) => ({
                                label: model.name,
                                data: Object.keys(metrics).map(key => model[key]),
                                backgroundColor: model.brandColor + '20',
                                borderColor: model.brandColor,
                                borderWidth: 2,
                                pointBackgroundColor: model.brandColor,
                                pointBorderColor: '#fff',
                                pointBorderWidth: 1,
                                pointRadius: 4
                            }))
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    color: '#f8fafc',
                                    padding: 20,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            title: {
                                display: true,
                                text: 'AI Coding Assistant Performance Comparison',
                                color: astreliumColors.primary,
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                },
                                padding: 20
                            }
                        },
                        scales: {
                            r: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    stepSize: 20,
                                    color: '#94a3b8',
                                    font: {
                                        size: 10
                                    }
                                },
                                grid: {
                                    color: 'rgba(148, 163, 184, 0.3)'
                                },
                                angleLines: {
                                    color: 'rgba(148, 163, 184, 0.3)'
                                },
                                pointLabels: {
                                    color: '#e2e8f0',
                                    font: {
                                        size: 11,
                                        weight: '500'
                                    }
                                }
                            }
                        },
                        interaction: {
                            intersect: false,
                            mode: 'point'
                        }
                    }
                });
            }

            function initializePrivacyChart() {
                const canvas = document.getElementById('privacyChart');
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                
                if (window.privacyChartInstance) {
                    window.privacyChartInstance.destroy();
                }

                const privacyData = aiModels.map(model => ({
                    name: model.name,
                    privacy: model.privacy,
                    isHero: model.isHero
                })).sort((a, b) => b.privacy - a.privacy);

                window.privacyChartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: privacyData.map(d => d.name),
                        datasets: [{
                            label: 'Privacy Score (%)',
                            data: privacyData.map(d => d.privacy),
                            backgroundColor: privacyData.map(d => 
                                d.isHero ? astreliumColors.primary : 'rgba(239, 68, 68, 0.6)'
                            ),
                            borderColor: privacyData.map(d => 
                                d.isHero ? astreliumColors.primary : '#ef4444'
                            ),
                            borderWidth: 2,
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            title: {
                                display: true,
                                text: '🔒 Privacy & Security Comparison',
                                color: '#10b981',
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 100,
                                ticks: {
                                    color: '#94a3b8',
                                    callback: function(value) {
                                        return value + '%';
                                    }
                                },
                                grid: {
                                    color: 'rgba(148, 163, 184, 0.2)'
                                }
                            },
                            x: {
                                ticks: {
                                    color: '#e2e8f0',
                                    maxRotation: 45,
                                    minRotation: 45
                                },
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
            }

            function initializeCostChart() {
                const canvas = document.getElementById('costChart');
                if (!canvas) return;

                const ctx = canvas.getContext('2d');
                
                if (window.costChartInstance) {
                    window.costChartInstance.destroy();
                }

                // Calculate 3-year costs
                const costData = aiModels.map(model => {
                    let threeYearCost = 0;
                    
                    if (model.name === 'Astrelium') {
                        threeYearCost = 50; // One-time setup
                    } else if (model.pricingModel.includes('$10/month')) {
                        threeYearCost = 360;
                    } else if (model.pricingModel.includes('$19/month')) {
                        threeYearCost = 684;
                    } else if (model.pricingModel.includes('$12/month')) {
                        threeYearCost = 432;
                    } else if (model.pricingModel.includes('$39/month')) {
                        threeYearCost = 1404;
                    } else if (model.pricingModel.includes('token')) {
                        threeYearCost = 800; // Estimated average
                    } else if (model.pricingModel.includes('Free')) {
                        threeYearCost = 100; // Estimated for limitations
                    } else {
                        threeYearCost = 500; // Default estimate
                    }

                    return {
                        name: model.name,
                        cost: threeYearCost,
                        isHero: model.isHero
                    };
                });

                window.costChartInstance = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: costData.map(d => d.name),
                        datasets: [{
                            label: '3-Year Total Cost ($)',
                            data: costData.map(d => d.cost),
                            backgroundColor: costData.map(d => 
                                d.isHero ? '#10b981' : 'rgba(239, 68, 68, 0.6)'
                            ),
                            borderColor: costData.map(d => 
                                d.isHero ? '#10b981' : '#ef4444'
                            ),
                            borderWidth: 2,
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: false
                            },
                            title: {
                                display: true,
                                text: '💰 3-Year Total Cost Comparison',
                                color: '#f59e0b',
                                font: {
                                    size: 16,
                                    weight: 'bold'
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    color: '#94a3b8',
                                    callback: function(value) {
                                        return '$' + value;
                                    }
                                },
                                grid: {
                                    color: 'rgba(148, 163, 184, 0.2)'
                                }
                            },
                            x: {
                                ticks: {
                                    color: '#e2e8f0',
                                    maxRotation: 45,
                                    minRotation: 45
                                },
                                grid: {
                                    display: false
                                }
                            }
                        }
                    }
                });
            }

            // Global functions for buttons
            window.openStandaloneView = function() {
                vscode.postMessage({ command: 'openStandaloneView' });
            };

            window.exportData = function() {
                vscode.postMessage({ command: 'exportData' });
            };

            window.shareComparison = function() {
                // Copy comparison summary to clipboard
                const summary = \`🌌 Astrelium vs AI Coding Assistants Comparison

🔒 Privacy: Astrelium 100% vs Competitors avg 30%
💰 Cost: Astrelium $0/month vs Competitors $10-39/month
🌐 Offline: Astrelium 100% vs Competitors avg 15%
🎯 VS Code: Astrelium 95% vs Competitors avg 70%

Why choose Astrelium?
✅ 100% local processing - your code never leaves your machine
✅ One-time setup cost - no recurring subscriptions
✅ Complete offline operation - code anywhere, anytime
✅ Native VS Code integration built specifically for developers

Learn more about the privacy-first AI coding assistant!\`;

                navigator.clipboard.writeText(summary).then(() => {
                    vscode.postMessage({ 
                        command: 'showMessage', 
                        text: 'Comparison summary copied to clipboard!' 
                    });
                });
            };

            // Handle model details
            document.addEventListener('click', function(e) {
                if (e.target.classList.contains('model-name')) {
                    const modelName = e.target.textContent;
                    vscode.postMessage({ 
                        command: 'showDetails', 
                        modelName: modelName 
                    });
                }
            });

            // Add hover effects for interactive elements
            document.addEventListener('mouseover', function(e) {
                if (e.target.classList.contains('metric-bar-row')) {
                    e.target.style.transform = 'scale(1.02)';
                    e.target.style.transition = 'transform 0.2s';
                }
            });

            document.addEventListener('mouseout', function(e) {
                if (e.target.classList.contains('metric-bar-row')) {
                    e.target.style.transform = 'scale(1)';
                }
            });
        `;
    }
}