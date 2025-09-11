import { AIModel, ModelMetrics, sampleModelData, getModelsByCategory, getTopModelsByMetric } from '../data/modelData';

// Chart.js will be loaded via CDN in the HTML file
declare const Chart: any;

export interface ChartConfig {
    containerId: string;
    models?: AIModel[];
    metric?: keyof ModelMetrics;
    chartType?: 'bar' | 'line' | 'radar';
    theme?: 'light' | 'dark' | 'auto';
    showLegend?: boolean;
    showAnimation?: boolean;
    responsive?: boolean;
}

export class ModelComparisonChart {
    private container: HTMLElement;
    private chart: any;
    private config: Required<ChartConfig>;
    private canvas!: HTMLCanvasElement;

    constructor(config: ChartConfig) {
        this.config = {
            containerId: config.containerId,
            models: config.models || sampleModelData.slice(0, 6),
            metric: config.metric || 'accuracy',
            chartType: config.chartType || 'bar',
            theme: config.theme || 'auto',
            showLegend: config.showLegend ?? true,
            showAnimation: config.showAnimation ?? true,
            responsive: config.responsive ?? true
        };

        this.container = document.getElementById(this.config.containerId)!;
        if (!this.container) {
            throw new Error(`Container with id "${this.config.containerId}" not found`);
        }

        this.init();
    }

    private init(): void {
        this.createCanvas();
        this.createChart();
        this.setupEventListeners();
    }

    private createCanvas(): void {
        // Clear existing content
        this.container.innerHTML = '';
        
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.id = `${this.config.containerId}-canvas`;
        
        // Apply theme-based styling
        this.applyTheme();
        
        this.container.appendChild(this.canvas);
    }

    private applyTheme(): void {
        const theme = this.getEffectiveTheme();
        const container = this.container;
        
        container.className = `model-chart-container ${theme}-theme`;
        
        // Set CSS custom properties for theme colors
        if (theme === 'dark') {
            container.style.setProperty('--bg-color', '#1e1e1e');
            container.style.setProperty('--text-color', '#cccccc');
            container.style.setProperty('--grid-color', '#404040');
            container.style.setProperty('--tooltip-bg', '#2d2d30');
        } else {
            container.style.setProperty('--bg-color', '#ffffff');
            container.style.setProperty('--text-color', '#333333');
            container.style.setProperty('--grid-color', '#e0e0e0');
            container.style.setProperty('--tooltip-bg', '#ffffff');
        }
    }

    private getEffectiveTheme(): 'light' | 'dark' {
        if (this.config.theme === 'auto') {
            // Try to detect VS Code theme
            const isDark = document.body.classList.contains('vscode-dark') || 
                          window.matchMedia('(prefers-color-scheme: dark)').matches;
            return isDark ? 'dark' : 'light';
        }
        return this.config.theme as 'light' | 'dark';
    }

    private createChart(): void {
        const ctx = this.canvas.getContext('2d')!;
        const theme = this.getEffectiveTheme();
        
        const textColor = theme === 'dark' ? '#cccccc' : '#333333';
        const gridColor = theme === 'dark' ? '#404040' : '#e0e0e0';

        let chartData;
        let chartOptions;

        if (this.config.chartType === 'radar') {
            chartData = this.createRadarData();
            chartOptions = this.createRadarOptions(textColor, gridColor);
        } else {
            chartData = this.createBarLineData();
            chartOptions = this.createBarLineOptions(textColor, gridColor);
        }

        this.chart = new Chart(ctx, {
            type: this.config.chartType === 'radar' ? 'radar' : this.config.chartType,
            data: chartData,
            options: chartOptions
        });
    }

    private createBarLineData(): any {
        const labels = this.config.models.map(model => model.name);
        const data = this.config.models.map(model => model.metrics[this.config.metric]);
        const colors = this.config.models.map(model => model.color);
        
        return {
            labels,
            datasets: [{
                label: `${this.getMetricLabel(this.config.metric)} (%)`,
                data,
                backgroundColor: colors.map(color => color + '80'), // Add transparency
                borderColor: colors,
                borderWidth: 2,
                tension: this.config.chartType === 'line' ? 0.4 : 0
            }]
        };
    }

    private createRadarData(): any {
        const metrics: (keyof ModelMetrics)[] = ['accuracy', 'precision', 'recall', 'f1Score'];
        const labels = metrics.map(metric => this.getMetricLabel(metric));
        
        const datasets = this.config.models.map(model => ({
            label: model.name,
            data: metrics.map(metric => model.metrics[metric]),
            backgroundColor: model.color + '20',
            borderColor: model.color,
            borderWidth: 2,
            pointBackgroundColor: model.color,
            pointBorderColor: model.color,
            pointRadius: 4
        }));

        return { labels, datasets };
    }

    private createBarLineOptions(textColor: string, gridColor: string): any {
        return {
            responsive: this.config.responsive,
            maintainAspectRatio: false,
            animation: {
                duration: this.config.showAnimation ? 1000 : 0,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: this.config.showLegend,
                    labels: {
                        color: textColor,
                        font: {
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: `AI Model Comparison - ${this.getMetricLabel(this.config.metric)}`,
                    color: textColor,
                    font: {
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                tooltip: {
                    backgroundColor: this.getEffectiveTheme() === 'dark' ? '#2d2d30' : '#ffffff',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: gridColor,
                    borderWidth: 1,
                    cornerRadius: 8,
                    displayColors: true,
                    callbacks: {
                        afterLabel: (context: any) => {
                            const model = this.config.models[context.dataIndex];
                            return [
                                `Company: ${model.company}`,
                                `Category: ${model.category}`,
                                model.description ? `${model.description}` : ''
                            ].filter(Boolean);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: textColor,
                        callback: (value: any) => value + '%'
                    },
                    grid: {
                        color: gridColor,
                        lineWidth: 1
                    },
                    title: {
                        display: true,
                        text: `${this.getMetricLabel(this.config.metric)} (%)`,
                        color: textColor,
                        font: {
                            size: 14
                        }
                    }
                },
                x: {
                    ticks: {
                        color: textColor,
                        maxRotation: 45
                    },
                    grid: {
                        color: gridColor,
                        lineWidth: 1
                    },
                    title: {
                        display: true,
                        text: 'AI Models',
                        color: textColor,
                        font: {
                            size: 14
                        }
                    }
                }
            },
            onHover: (event: any, elements: any[]) => {
                event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
            }
        };
    }

    private createRadarOptions(textColor: string, gridColor: string): any {
        return {
            responsive: this.config.responsive,
            maintainAspectRatio: false,
            animation: {
                duration: this.config.showAnimation ? 1000 : 0,
                easing: 'easeOutQuart'
            },
            plugins: {
                legend: {
                    display: this.config.showLegend,
                    position: 'bottom',
                    labels: {
                        color: textColor,
                        font: {
                            family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                            size: 12
                        }
                    }
                },
                title: {
                    display: true,
                    text: 'AI Model Metrics Comparison',
                    color: textColor,
                    font: {
                        family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                        size: 16,
                        weight: 'bold'
                    },
                    padding: 20
                },
                tooltip: {
                    backgroundColor: this.getEffectiveTheme() === 'dark' ? '#2d2d30' : '#ffffff',
                    titleColor: textColor,
                    bodyColor: textColor,
                    borderColor: gridColor,
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        afterLabel: (context: any) => {
                            const model = this.config.models[context.datasetIndex];
                            return [
                                `Company: ${model.company}`,
                                `Category: ${model.category}`,
                                model.description ? `${model.description}` : ''
                            ].filter(Boolean);
                        }
                    }
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: textColor,
                        callback: (value: any) => value + '%'
                    },
                    grid: {
                        color: gridColor
                    },
                    pointLabels: {
                        color: textColor,
                        font: {
                            size: 12
                        }
                    }
                }
            }
        };
    }

    private getMetricLabel(metric: keyof ModelMetrics): string {
        const labels: Record<keyof ModelMetrics, string> = {
            accuracy: 'Accuracy',
            precision: 'Precision',
            recall: 'Recall',
            f1Score: 'F1 Score'
        };
        return labels[metric];
    }

    private setupEventListeners(): void {
        // Listen for theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', () => {
            if (this.config.theme === 'auto') {
                this.applyNewTheme();
            }
        });

        // Resize listener
        window.addEventListener('resize', () => {
            if (this.config.responsive) {
                this.chart.resize();
            }
        });
    }

    // Public methods for updating the chart
    public updateModels(models: AIModel[]): void {
        this.config.models = models;
        this.updateChart();
    }

    public updateMetric(metric: keyof ModelMetrics): void {
        this.config.metric = metric;
        this.updateChart();
    }

    public updateChartType(chartType: 'bar' | 'line' | 'radar'): void {
        this.config.chartType = chartType;
        this.destroy();
        this.init();
    }

    public updateTheme(theme: 'light' | 'dark' | 'auto'): void {
        this.config.theme = theme;
        this.applyNewTheme();
    }

    private updateChart(): void {
        if (this.config.chartType === 'radar') {
            this.chart.data = this.createRadarData();
        } else {
            this.chart.data = this.createBarLineData();
        }
        this.chart.update('active');
    }

    private applyNewTheme(): void {
        this.applyTheme();
        this.destroy();
        this.init();
    }

    public destroy(): void {
        if (this.chart) {
            this.chart.destroy();
        }
    }

    // Static utility methods
    public static createWithTopModels(containerId: string, metric: keyof ModelMetrics, limit = 5): ModelComparisonChart {
        const topModels = getTopModelsByMetric(metric, limit);
        return new ModelComparisonChart({
            containerId,
            models: topModels,
            metric
        });
    }

    public static createByCategoryComparison(containerId: string, category: 'coding' | 'general' | 'multimodal'): ModelComparisonChart {
        const categoryModels = getModelsByCategory(category);
        return new ModelComparisonChart({
            containerId,
            models: categoryModels,
            chartType: 'radar'
        });
    }
}