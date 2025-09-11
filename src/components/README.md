# AI Model Comparison Chart Component

A reusable, interactive chart component for comparing AI model performance metrics. Built for the Astrelium VS Code extension project.

## 🌟 Features

- **Interactive Bar Charts**: Dynamic visualization of AI model performance
- **Multiple Metrics Support**: Accuracy, Precision, Recall, F1-Score
- **Category Filtering**: Filter models by type (General, Coding, Multimodal)
- **Responsive Design**: Works on different screen sizes
- **VS Code Theme Integration**: Automatically adapts to light/dark themes
- **Smooth Animations**: Professional transitions and effects
- **Detailed Model Cards**: Comprehensive information for each AI model

## 📁 Component Structure

```
src/components/
├── ModelComparisonChart.ts          # Main TypeScript component class
├── ModelComparisonChart.css         # Comprehensive styling
├── ModelComparisonChart.html        # Standalone demo (Chart.js CDN)
├── ModelComparisonChartLocal.html   # Self-contained demo (no CDN)
├── ChartWebviewProvider.ts          # VS Code webview integration
└── README.md                        # This documentation
```

```
src/data/
└── modelData.ts                     # Sample AI model data with interfaces
```

## 🚀 Usage

### Standalone Usage

1. **Open the HTML file directly:**
   ```bash
   # Start a local server
   python3 -m http.server 8080
   
   # Open in browser
   http://localhost:8080/ModelComparisonChartLocal.html
   ```

2. **Features in standalone mode:**
   - Interactive metric switching (Accuracy, Precision, Recall, F1-Score)
   - Category filtering (All Models, General Purpose, Coding Specialized, Multimodal)
   - Ascending/Descending sort options
   - Detailed model information cards
   - Responsive design

### VS Code Extension Integration

1. **Register the chart view in package.json:**
   ```json
   {
     "contributes": {
       "views": {
         "astrelium-sidebar": [
           {
             "type": "webview",
             "id": "astrelium.chartView",
             "name": "AI Model Comparison",
             "when": "true"
           }
         ]
       }
     }
   }
   ```

2. **Register the provider in extension.ts:**
   ```typescript
   import { ChartWebviewProvider } from './components/ChartWebviewProvider';
   
   export function activate(context: vscode.ExtensionContext) {
       const chartProvider = new ChartWebviewProvider(context.extensionUri);
       context.subscriptions.push(
           vscode.window.registerWebviewViewProvider(
               ChartWebviewProvider.viewType,
               chartProvider
           )
       );
   }
   ```

3. **Update chart data programmatically:**
   ```typescript
   // Update with new model data
   chartProvider.updateChartData(newModelData, 'accuracy');
   ```

### TypeScript Component Usage

```typescript
import { ModelComparisonChart, ChartConfig } from './components/ModelComparisonChart';
import { sampleModelData } from './data/modelData';

// Create a basic chart
const chart = new ModelComparisonChart({
    containerId: 'my-chart-container',
    models: sampleModelData.slice(0, 5),
    metric: 'accuracy',
    theme: 'auto'
});

// Create specialized charts
const topPerformers = ModelComparisonChart.createWithTopModels(
    'top-chart', 
    'f1Score', 
    5
);

const codingComparison = ModelComparisonChart.createByCategoryComparison(
    'coding-chart', 
    'coding'
);
```

## 🎨 Styling & Themes

### Theme Support
- **Auto Detection**: Automatically detects VS Code theme or system preference
- **Manual Control**: `light`, `dark`, or `auto` theme options
- **CSS Variables**: Easy customization with CSS custom properties

### VS Code Integration Styles
```css
/* Automatically applied in VS Code webviews */
body.vscode-dark .model-chart-container {
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
}

body.vscode-light .model-chart-container {
    background: var(--vscode-editor-background);
    color: var(--vscode-editor-foreground);
}
```

### Custom Styling
```css
.model-chart-container {
    --bg-color: #ffffff;
    --text-color: #333333;
    --grid-color: #e0e0e0;
    --tooltip-bg: #ffffff;
}
```

## 📊 Sample Data

The component includes realistic sample data for popular AI models:

- **GPT-4** (OpenAI) - General Purpose
- **Claude 3 Opus** (Anthropic) - General Purpose  
- **Gemini Pro** (Google) - Multimodal
- **LLaMA 2 70B** (Meta) - General Purpose
- **Code Llama 34B** (Meta) - Coding Specialized
- **Mixtral 8x7B** (Mistral AI) - General Purpose
- **GPT-3.5 Turbo** (OpenAI) - General Purpose
- **CodeGen2 16B** (Salesforce) - Coding Specialized

### Data Structure
```typescript
interface AIModel {
    id: string;
    name: string;
    company: string;
    category: 'coding' | 'general' | 'multimodal';
    metrics: {
        accuracy: number;
        precision: number;
        recall: number;
        f1Score: number;
    };
    color: string;
    description?: string;
    releaseDate?: string;
}
```

## 🛠️ Customization

### Adding New Models
```typescript
import { sampleModelData } from './data/modelData';

const newModel: AIModel = {
    id: 'my-model',
    name: 'My Custom Model',
    company: 'My Company',
    category: 'general',
    metrics: {
        accuracy: 85.5,
        precision: 83.2,
        recall: 87.1,
        f1Score: 85.1
    },
    color: '#ff5722',
    description: 'Custom AI model for specific tasks'
};

sampleModelData.push(newModel);
```

### Custom Chart Types
```typescript
// Create radar chart for multi-metric comparison
const radarChart = new ModelComparisonChart({
    containerId: 'radar-container',
    models: topModels,
    chartType: 'radar',
    showLegend: true
});

// Create line chart for trend analysis
const lineChart = new ModelComparisonChart({
    containerId: 'line-container',
    models: timeSeriesModels,
    chartType: 'line',
    showAnimation: true
});
```

## 📱 Responsive Design

The component is fully responsive and includes:
- **Mobile-first CSS**: Optimized for small screens
- **Flexible Layouts**: Grid and flexbox for adaptive layouts
- **Touch-friendly Controls**: Larger touch targets on mobile
- **Reduced Motion**: Respects `prefers-reduced-motion` setting

### Breakpoints
- **Desktop**: > 768px - Full feature set
- **Tablet**: 481px - 768px - Stacked layouts  
- **Mobile**: ≤ 480px - Simplified interface

## 🎯 Performance

- **Lazy Loading**: Charts render only when visible
- **Efficient Updates**: Minimal DOM manipulation
- **Memory Management**: Proper cleanup on destroy
- **Animation Optimization**: CSS transforms and transitions
- **Bundle Size**: ~15KB minified (excluding Chart.js)

## 🔧 Development

### Building the Component
```bash
# Compile TypeScript
npm run compile

# Watch for changes
npm run watch

# Run tests (if available)
npm test
```

### Adding to Extension
1. Import the component in your extension
2. Register webview providers
3. Configure CSP for Chart.js CDN
4. Add views to package.json contributions

### Dependencies
- **Chart.js 4.x**: For chart rendering (loaded via CDN)
- **TypeScript**: For type safety
- **VS Code API**: For webview integration

## 📄 License

This component is part of the Astrelium project and follows the same Apache 2.0 license.

## 🤝 Contributing

1. **Add new model data** in `src/data/modelData.ts`
2. **Improve styling** in `ModelComparisonChart.css`
3. **Add chart types** by extending the `ModelComparisonChart` class
4. **Enhance interactivity** with new controls and filters
5. **Test responsiveness** across different screen sizes

---

**Built with ❤️ for the Astrelium VS Code Extension**