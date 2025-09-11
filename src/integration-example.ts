// Example integration of the AI Model Comparison Chart with existing Astrelium extension

import * as vscode from 'vscode';
import { ChartWebviewProvider } from './components/ChartWebviewProvider';

/**
 * Example of how to integrate the chart component with the existing extension
 * Add this to your extension.ts file
 */

export function activateChartFeatures(context: vscode.ExtensionContext) {
    // Register the chart webview provider
    const chartProvider = new ChartWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(
            ChartWebviewProvider.viewType,
            chartProvider
        )
    );

    // Register command to show model comparison
    const showChartCommand = vscode.commands.registerCommand('astrelium.showModelComparison', () => {
        // Focus the chart view if it exists
        vscode.commands.executeCommand('astrelium.chartView.focus');
    });
    context.subscriptions.push(showChartCommand);

    // Register command to update chart with specific data
    const updateChartCommand = vscode.commands.registerCommand('astrelium.updateChart', (models?: any[], metric?: string) => {
        chartProvider.updateChartData(models || [], metric);
    });
    context.subscriptions.push(updateChartCommand);

    return chartProvider;
}

/**
 * Example of extending the existing ChatViewProvider to include chart functionality
 */
export function enhanceChatViewWithChart(chatHtml: string): string {
    // Add chart button to existing chat interface
    const chartButton = `
        <button id="show-chart-btn" class="chart-button" onclick="showModelChart()">
            📊 Compare AI Models
        </button>
    `;

    const chartScript = `
        <script>
            function showModelChart() {
                // Send message to extension to show chart
                vscode.postMessage({
                    type: 'showChart',
                    data: 'model-comparison'
                });
            }
            
            // Listen for chart data updates from the main extension
            window.addEventListener('message', event => {
                const message = event.data;
                if (message.type === 'chartData') {
                    // Handle chart data if needed
                    console.log('Chart data received:', message.data);
                }
            });
        </script>
    `;

    const chartStyles = `
        <style>
            .chart-button {
                background: var(--vscode-button-background);
                color: var(--vscode-button-foreground);
                border: none;
                padding: 8px 16px;
                border-radius: 4px;
                cursor: pointer;
                font-family: var(--vscode-font-family);
                font-size: 12px;
                margin: 8px 4px;
                transition: background 0.2s ease;
            }
            
            .chart-button:hover {
                background: var(--vscode-button-hoverBackground);
            }
            
            .chart-button:focus {
                outline: 1px solid var(--vscode-focusBorder);
                outline-offset: 2px;
            }
        </style>
    `;

    // Insert the chart components into existing HTML
    let enhancedHtml = chatHtml;
    
    // Add styles to head
    if (enhancedHtml.includes('</head>')) {
        enhancedHtml = enhancedHtml.replace('</head>', chartStyles + '</head>');
    }
    
    // Add button to body (adjust selector based on your HTML structure)
    if (enhancedHtml.includes('<div id="chat">')) {
        enhancedHtml = enhancedHtml.replace(
            '<div id="chat">',
            chartButton + '<div id="chat">'
        );
    }
    
    // Add script before closing body tag
    if (enhancedHtml.includes('</body>')) {
        enhancedHtml = enhancedHtml.replace('</body>', chartScript + '</body>');
    }
    
    return enhancedHtml;
}

/**
 * Package.json contributions for the chart view
 * Add this to your package.json "contributes" section:
 */
const packageContributions = {
    "views": {
        "astrelium-sidebar": [
            {
                "type": "webview",
                "id": "astrelium.chartView",
                "name": "AI Model Comparison",
                "when": "true"
            }
        ]
    },
    "commands": [
        {
            "command": "astrelium.showModelComparison",
            "title": "Show AI Model Comparison",
            "icon": "$(graph)"
        },
        {
            "command": "astrelium.updateChart",
            "title": "Update Chart Data"
        }
    ],
    "menus": {
        "view/title": [
            {
                "command": "astrelium.showModelComparison",
                "when": "view == astrelium.chartView",
                "group": "navigation"
            }
        ]
    }
};

// Export for documentation purposes
export { packageContributions };