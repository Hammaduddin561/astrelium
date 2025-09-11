import { aiModelComparison, AIModel, ComparisonData } from './aiModelData';

export interface ChartOptions {
    type?: 'bar' | 'radar' | 'scatter' | 'table';
    highlightModel?: string;
    metrics?: string[];
    theme?: 'light' | 'dark' | 'vscode';
    showLegend?: boolean;
    responsive?: boolean;
    animation?: boolean;
}

export class ComparisonChartComponent {
    private container: HTMLElement;
    private data: ComparisonData;
    private currentChart: any = null;

    constructor(container: HTMLElement, options: ChartOptions = {}) {
        this.container = container;
        this.data = aiModelComparison;
        this.init(options);
    }

    private init(options: ChartOptions) {
        // Add Chart.js if not already loaded
        if (typeof window !== 'undefined' && !(window as any).Chart) {
            this.loadChartJS().then(() => {
                this.render(options);
            });
        } else {
            this.render(options);
        }
    }

    private async loadChartJS(): Promise<void> {
        return new Promise((resolve) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.min.js';
            script.onload = () => resolve();
            document.head.appendChild(script);
        });
    }

    private render(options: ChartOptions) {
        // Clear container
        this.container.innerHTML = '';

        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'ai-comparison-wrapper';
        wrapper.innerHTML = this.getWrapperHTML();
        this.container.appendChild(wrapper);

        // Apply theme
        this.applyTheme(options.theme || 'vscode');

        // Render chart based on type
        switch (options.type) {
            case 'bar':
                this.renderBarChart(options);
                break;
            case 'radar':
                this.renderRadarChart(options);
                break;
            case 'scatter':
                this.renderScatterChart(options);
                break;
            case 'table':
                this.renderTable(options);
                break;
            default:
                this.renderBarChart(options);
        }

        // Add event listeners
        this.addEventListeners(options);
    }

    private getWrapperHTML(): string {
        return `
            <div class="ai-comparison-header">
                <div class="header-content">
                    <h2 class="comparison-title">
                        <span class="astrelium-logo">🚀</span>
                        AI Coding Assistant Comparison
                    </h2>
                    <p class="comparison-subtitle">
                        Discover why Astrelium leads in privacy and cost-effectiveness
                    </p>
                </div>
                <div class="header-controls">
                    <div class="chart-type-selector">
                        <button class="chart-btn active" data-type="bar">📊 Bar Chart</button>
                        <button class="chart-btn" data-type="radar">🎯 Radar Chart</button>
                        <button class="chart-btn" data-type="scatter">📈 Scatter Plot</button>
                        <button class="chart-btn" data-type="table">📋 Table</button>
                    </div>
                </div>
            </div>
            <div class="chart-container">
                <canvas id="comparisonChart" width="800" height="400"></canvas>
                <div id="tableContainer" class="table-container" style="display: none;"></div>
            </div>
            <div class="astrelium-highlights">
                <div class="highlight-header">
                    <h3>🌟 Why Choose Astrelium?</h3>
                </div>
                <div class="highlights-grid">
                    <div class="highlight-card privacy">
                        <div class="highlight-icon">🔒</div>
                        <div class="highlight-content">
                            <h4>100% Privacy</h4>
                            <p>Your code never leaves your machine. Complete local processing ensures maximum security.</p>
                        </div>
                    </div>
                    <div class="highlight-card cost">
                        <div class="highlight-icon">💰</div>
                        <div class="highlight-content">
                            <h4>Zero Recurring Costs</h4>
                            <p>Free and open source. No monthly subscriptions or API fees.</p>
                        </div>
                    </div>
                    <div class="highlight-card offline">
                        <div class="highlight-icon">📡</div>
                        <div class="highlight-content">
                            <h4>Works Offline</h4>
                            <p>Code anywhere, anytime. No internet connection required.</p>
                        </div>
                    </div>
                    <div class="highlight-card integration">
                        <div class="highlight-icon">⚡</div>
                        <div class="highlight-content">
                            <h4>Native VS Code</h4>
                            <p>Seamlessly integrated extension designed specifically for VS Code.</p>
                        </div>
                    </div>
                </div>
            </div>
            <div class="model-details">
                <div class="details-header">
                    <h3>📋 Detailed Comparison</h3>
                    <p>Click on any model to see detailed information</p>
                </div>
                <div class="models-grid" id="modelsGrid">
                    ${this.generateModelsGrid()}
                </div>
            </div>
        `;
    }

    private generateModelsGrid(): string {
        return this.data.models.map(model => `
            <div class="model-card ${model.name.toLowerCase() === 'astrelium' ? 'featured' : ''}" 
                 data-model="${model.name}" 
                 style="--model-color: ${model.color}; --accent-color: ${model.accentColor}">
                <div class="model-header">
                    <h4 class="model-name">${model.name}</h4>
                    <span class="model-provider">${model.provider}</span>
                    <span class="model-category category-${model.category}">${model.category}</span>
                </div>
                <div class="model-pricing">${model.pricing}</div>
                <div class="model-description">${model.description}</div>
                <div class="model-highlights">
                    ${model.highlights.map(highlight => 
                        `<span class="highlight-tag">${highlight}</span>`
                    ).join('')}
                </div>
                <div class="model-metrics">
                    ${Object.entries(model.metrics).slice(0, 4).map(([key, value]) => `
                        <div class="metric-row">
                            <span class="metric-label">${this.data.categories[key]?.label || key}</span>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: ${value}%"></div>
                                <span class="metric-value">${value}%</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    private renderBarChart(options: ChartOptions) {
        const canvas = this.container.querySelector('#comparisonChart') as HTMLCanvasElement;
        if (!canvas || !(window as any).Chart) return;

        const Chart = (window as any).Chart;
        
        // Destroy existing chart
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const metrics = options.metrics || ['privacy', 'costEffectiveness', 'speed', 'offlineCapability'];
        const datasets = metrics.map((metric, index) => ({
            label: this.data.categories[metric]?.label || metric,
            data: this.data.models.map(model => model.metrics[metric as keyof typeof model.metrics]),
            backgroundColor: this.data.models.map(model => 
                model.name.toLowerCase() === 'astrelium' ? 
                `${model.color}CC` : `${model.color}66`
            ),
            borderColor: this.data.models.map(model => model.color),
            borderWidth: this.data.models.map(model => 
                model.name.toLowerCase() === 'astrelium' ? 3 : 1
            ),
            borderRadius: 6,
            borderSkipped: false,
        }));

        this.currentChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: this.data.models.map(model => model.name),
                datasets: datasets
            },
            options: {
                responsive: options.responsive !== false,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
                plugins: {
                    legend: {
                        display: options.showLegend !== false,
                        position: 'top' as const,
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                size: 12,
                                family: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.9)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: true,
                        callbacks: {
                            afterLabel: (context: any) => {
                                const modelName = context.label;
                                const model = this.data.models.find(m => m.name === modelName);
                                if (model && model.name.toLowerCase() === 'astrelium') {
                                    return ['🌟 Featured Model', '🔒 100% Private', '💰 $0/month'];
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
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                        },
                        ticks: {
                            callback: (value: any) => value + '%',
                            font: {
                                size: 11
                            }
                        }
                    },
                    x: {
                        grid: {
                            display: false,
                        },
                        ticks: {
                            maxRotation: 45,
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                animation: options.animation !== false ? {
                    duration: 1000,
                    easing: 'easeOutQuart'
                } : false
            }
        });
    }

    private renderRadarChart(options: ChartOptions) {
        const canvas = this.container.querySelector('#comparisonChart') as HTMLCanvasElement;
        if (!canvas || !(window as any).Chart) return;

        const Chart = (window as any).Chart;
        
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const labels = Object.values(this.data.categories).map(cat => cat.label);
        const datasets = this.data.models.map(model => ({
            label: model.name,
            data: Object.keys(this.data.categories).map(key => 
                model.metrics[key as keyof typeof model.metrics]
            ),
            backgroundColor: model.name.toLowerCase() === 'astrelium' ? 
                `${model.color}30` : `${model.color}15`,
            borderColor: model.color,
            borderWidth: model.name.toLowerCase() === 'astrelium' ? 3 : 2,
            pointBackgroundColor: model.color,
            pointBorderColor: '#fff',
            pointRadius: model.name.toLowerCase() === 'astrelium' ? 6 : 4,
            pointHoverRadius: 8,
            fill: true
        }));

        this.currentChart = new Chart(canvas, {
            type: 'radar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: options.responsive !== false,
                maintainAspectRatio: false,
                elements: {
                    line: {
                        borderWidth: 3
                    }
                },
                plugins: {
                    legend: {
                        display: options.showLegend !== false,
                        position: 'top' as const,
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: false
                        },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.2)'
                        },
                        pointLabels: {
                            font: {
                                size: 10
                            }
                        },
                        ticks: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    private renderScatterChart(options: ChartOptions) {
        const canvas = this.container.querySelector('#comparisonChart') as HTMLCanvasElement;
        if (!canvas || !(window as any).Chart) return;

        const Chart = (window as any).Chart;
        
        if (this.currentChart) {
            this.currentChart.destroy();
        }

        const datasets = [{
            label: 'AI Models',
            data: this.data.models.map(model => ({
                x: model.metrics.privacy,
                y: model.metrics.costEffectiveness,
                model: model
            })),
            backgroundColor: this.data.models.map(model => 
                model.name.toLowerCase() === 'astrelium' ? model.color : `${model.color}80`
            ),
            borderColor: this.data.models.map(model => model.color),
            borderWidth: this.data.models.map(model => 
                model.name.toLowerCase() === 'astrelium' ? 4 : 2
            ),
            pointRadius: this.data.models.map(model => 
                model.name.toLowerCase() === 'astrelium' ? 12 : 8
            ),
            pointHoverRadius: this.data.models.map(model => 
                model.name.toLowerCase() === 'astrelium' ? 16 : 12
            )
        }];

        this.currentChart = new Chart(canvas, {
            type: 'scatter',
            data: {
                datasets: datasets
            },
            options: {
                responsive: options.responsive !== false,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            title: () => '',
                            label: (context: any) => {
                                const model = context.raw.model;
                                return [
                                    `${model.name} (${model.provider})`,
                                    `Privacy: ${model.metrics.privacy}%`,
                                    `Cost Effectiveness: ${model.metrics.costEffectiveness}%`,
                                    `Pricing: ${model.pricing}`
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
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        min: 0,
                        max: 100
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Cost Effectiveness (%)',
                            font: {
                                size: 14,
                                weight: 'bold'
                            }
                        },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    private renderTable(options: ChartOptions) {
        const chartCanvas = this.container.querySelector('#comparisonChart') as HTMLCanvasElement;
        const tableContainer = this.container.querySelector('#tableContainer') as HTMLElement;
        
        if (chartCanvas) chartCanvas.style.display = 'none';
        if (tableContainer) {
            tableContainer.style.display = 'block';
            tableContainer.innerHTML = this.generateTable();
        }
    }

    private generateTable(): string {
        const metrics = ['privacy', 'costEffectiveness', 'speed', 'offlineCapability', 'vsCodeIntegration', 'codeAccuracy'];
        
        return `
            <div class="comparison-table">
                <table>
                    <thead>
                        <tr>
                            <th class="model-header">Model</th>
                            <th class="provider-header">Provider</th>
                            <th class="pricing-header">Pricing</th>
                            ${metrics.map(metric => 
                                `<th class="metric-header">${this.data.categories[metric]?.label || metric}</th>`
                            ).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.data.models.map(model => `
                            <tr class="model-row ${model.name.toLowerCase() === 'astrelium' ? 'featured-row' : ''}">
                                <td class="model-cell">
                                    <div class="model-info">
                                        <span class="model-name">${model.name}</span>
                                        ${model.name.toLowerCase() === 'astrelium' ? '<span class="featured-badge">⭐ Featured</span>' : ''}
                                    </div>
                                </td>
                                <td class="provider-cell">${model.provider}</td>
                                <td class="pricing-cell">${model.pricing}</td>
                                ${metrics.map(metric => `
                                    <td class="metric-cell">
                                        <div class="metric-display">
                                            <div class="metric-bar-small">
                                                <div class="metric-fill-small" 
                                                     style="width: ${model.metrics[metric as keyof typeof model.metrics]}%; 
                                                            background-color: ${model.color}">
                                                </div>
                                            </div>
                                            <span class="metric-value-small">${model.metrics[metric as keyof typeof model.metrics]}%</span>
                                        </div>
                                    </td>
                                `).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    private addEventListeners(options: ChartOptions) {
        // Chart type selector
        const chartButtons = this.container.querySelectorAll('.chart-btn');
        chartButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                chartButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                
                const type = button.getAttribute('data-type') as ChartOptions['type'];
                if (type) {
                    this.render({ ...options, type });
                }
            });
        });

        // Model card interactions
        const modelCards = this.container.querySelectorAll('.model-card');
        modelCards.forEach(card => {
            card.addEventListener('click', () => {
                const modelName = card.getAttribute('data-model');
                if (modelName) {
                    this.highlightModel(modelName);
                }
            });
        });
    }

    private highlightModel(modelName: string) {
        // Add highlighting logic here
        const modelCards = this.container.querySelectorAll('.model-card');
        modelCards.forEach(card => {
            card.classList.remove('highlighted');
            if (card.getAttribute('data-model') === modelName) {
                card.classList.add('highlighted');
            }
        });
    }

    private applyTheme(theme: 'light' | 'dark' | 'vscode') {
        this.container.classList.remove('theme-light', 'theme-dark', 'theme-vscode');
        this.container.classList.add(`theme-${theme}`);
    }

    // Public methods
    public updateData(newData: ComparisonData) {
        this.data = newData;
    }

    public switchChart(type: ChartOptions['type']) {
        this.render({ type });
    }

    public exportChart(format: 'png' | 'svg' = 'png') {
        if (this.currentChart) {
            const canvas = this.currentChart.canvas;
            const link = document.createElement('a');
            link.download = `ai-model-comparison.${format}`;
            link.href = canvas.toDataURL(`image/${format}`);
            link.click();
        }
    }
}