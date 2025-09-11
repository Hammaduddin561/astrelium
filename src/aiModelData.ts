export interface AIModel {
    name: string;
    provider: string;
    category: 'local' | 'cloud' | 'hybrid';
    metrics: {
        privacy: number;
        costEffectiveness: number;
        speed: number;
        offlineCapability: number;
        vsCodeIntegration: number;
        codeAccuracy: number;
        resourceEfficiency: number;
        communitySupport: number;
        documentationQuality: number;
        easeOfSetup: number;
    };
    highlights: string[];
    pricing: string;
    description: string;
    color: string;
    accentColor: string;
}

export interface ComparisonData {
    models: AIModel[];
    categories: {
        [key: string]: {
            label: string;
            description: string;
            maxScore: number;
            unit: string;
        };
    };
}

// Comprehensive AI model comparison data
export const aiModelComparison: ComparisonData = {
    models: [
        {
            name: 'Astrelium',
            provider: 'Open Source',
            category: 'local',
            metrics: {
                privacy: 100,
                costEffectiveness: 95,
                speed: 88,
                offlineCapability: 100,
                vsCodeIntegration: 95,
                codeAccuracy: 85,
                resourceEfficiency: 90,
                communitySupport: 75,
                documentationQuality: 80,
                easeOfSetup: 85
            },
            highlights: [
                '100% Local Processing',
                'No Recurring Fees',
                'Complete Privacy',
                'Works Offline',
                'Open Source',
                'VS Code Native'
            ],
            pricing: 'Free (Open Source)',
            description: 'Privacy-first AI coding assistant that runs entirely on your local machine',
            color: '#667eea',
            accentColor: '#764ba2'
        },
        {
            name: 'GitHub Copilot',
            provider: 'Microsoft/OpenAI',
            category: 'cloud',
            metrics: {
                privacy: 25,
                costEffectiveness: 60,
                speed: 85,
                offlineCapability: 0,
                vsCodeIntegration: 98,
                codeAccuracy: 92,
                resourceEfficiency: 95,
                communitySupport: 95,
                documentationQuality: 90,
                easeOfSetup: 95
            },
            highlights: [
                'Excellent VS Code Integration',
                'High Accuracy',
                'Large Community',
                'Good Documentation'
            ],
            pricing: '$10-19/month',
            description: 'AI pair programmer powered by OpenAI Codex',
            color: '#24292f',
            accentColor: '#0969da'
        },
        {
            name: 'Codeium',
            provider: 'Codeium',
            category: 'cloud',
            metrics: {
                privacy: 30,
                costEffectiveness: 80,
                speed: 82,
                offlineCapability: 0,
                vsCodeIntegration: 85,
                codeAccuracy: 88,
                resourceEfficiency: 90,
                communitySupport: 70,
                documentationQuality: 75,
                easeOfSetup: 90
            },
            highlights: [
                'Free Tier Available',
                'Multiple IDE Support',
                'Fast Completions'
            ],
            pricing: 'Free - $12/month',
            description: 'Free AI-powered code completion tool',
            color: '#09b6a2',
            accentColor: '#00a693'
        },
        {
            name: 'Tabnine',
            provider: 'Tabnine',
            category: 'hybrid',
            metrics: {
                privacy: 60,
                costEffectiveness: 65,
                speed: 80,
                offlineCapability: 70,
                vsCodeIntegration: 80,
                codeAccuracy: 85,
                resourceEfficiency: 75,
                communitySupport: 65,
                documentationQuality: 70,
                easeOfSetup: 80
            },
            highlights: [
                'Hybrid Cloud/Local',
                'Team Training',
                'Privacy Options'
            ],
            pricing: '$12-39/month',
            description: 'AI code completion with privacy options',
            color: '#4c9aff',
            accentColor: '#0052cc'
        },
        {
            name: 'GPT-4',
            provider: 'OpenAI',
            category: 'cloud',
            metrics: {
                privacy: 20,
                costEffectiveness: 40,
                speed: 70,
                offlineCapability: 0,
                vsCodeIntegration: 60,
                codeAccuracy: 95,
                resourceEfficiency: 85,
                communitySupport: 90,
                documentationQuality: 95,
                easeOfSetup: 70
            },
            highlights: [
                'Highest Accuracy',
                'Advanced Reasoning',
                'Extensive Documentation'
            ],
            pricing: '$20/month + API costs',
            description: 'Advanced language model with superior reasoning capabilities',
            color: '#10a37f',
            accentColor: '#1a7f64'
        },
        {
            name: 'Claude-3.5',
            provider: 'Anthropic',
            category: 'cloud',
            metrics: {
                privacy: 25,
                costEffectiveness: 45,
                speed: 75,
                offlineCapability: 0,
                vsCodeIntegration: 50,
                codeAccuracy: 90,
                resourceEfficiency: 80,
                communitySupport: 70,
                documentationQuality: 85,
                easeOfSetup: 65
            },
            highlights: [
                'Safety-Focused',
                'Long Context Window',
                'Ethical AI'
            ],
            pricing: '$20/month + API costs',
            description: 'Safety-focused AI with advanced reasoning and long context',
            color: '#cc785c',
            accentColor: '#a05d42'
        },
        {
            name: 'Gemini',
            provider: 'Google',
            category: 'cloud',
            metrics: {
                privacy: 30,
                costEffectiveness: 70,
                speed: 85,
                offlineCapability: 0,
                vsCodeIntegration: 45,
                codeAccuracy: 88,
                resourceEfficiency: 85,
                communitySupport: 75,
                documentationQuality: 80,
                easeOfSetup: 75
            },
            highlights: [
                'Google Integration',
                'Multimodal Capabilities',
                'Fast Performance'
            ],
            pricing: 'Free - $20/month',
            description: 'Google\'s multimodal AI with strong performance',
            color: '#4285f4',
            accentColor: '#1a73e8'
        },
        {
            name: 'CodeLlama',
            provider: 'Meta',
            category: 'local',
            metrics: {
                privacy: 95,
                costEffectiveness: 100,
                speed: 70,
                offlineCapability: 100,
                vsCodeIntegration: 40,
                codeAccuracy: 75,
                resourceEfficiency: 60,
                communitySupport: 80,
                documentationQuality: 70,
                easeOfSetup: 50
            },
            highlights: [
                'Open Source',
                'Local Processing',
                'Free to Use',
                'No API Costs'
            ],
            pricing: 'Free (Open Source)',
            description: 'Open source code-focused language model from Meta',
            color: '#1877f2',
            accentColor: '#166fe5'
        }
    ],
    categories: {
        privacy: {
            label: 'Privacy Score',
            description: 'How well the model protects your code and data privacy',
            maxScore: 100,
            unit: '%'
        },
        costEffectiveness: {
            label: 'Cost Effectiveness',
            description: 'Value for money considering features and pricing',
            maxScore: 100,
            unit: '%'
        },
        speed: {
            label: 'Response Speed',
            description: 'How quickly the model provides code suggestions',
            maxScore: 100,
            unit: '%'
        },
        offlineCapability: {
            label: 'Offline Capability',
            description: 'Ability to work without internet connection',
            maxScore: 100,
            unit: '%'
        },
        vsCodeIntegration: {
            label: 'VS Code Integration',
            description: 'Quality of integration with Visual Studio Code',
            maxScore: 100,
            unit: '%'
        },
        codeAccuracy: {
            label: 'Code Accuracy',
            description: 'Quality and correctness of generated code',
            maxScore: 100,
            unit: '%'
        },
        resourceEfficiency: {
            label: 'Resource Efficiency',
            description: 'Efficient use of system resources',
            maxScore: 100,
            unit: '%'
        },
        communitySupport: {
            label: 'Community Support',
            description: 'Size and activity of user community',
            maxScore: 100,
            unit: '%'
        },
        documentationQuality: {
            label: 'Documentation Quality',
            description: 'Comprehensiveness and clarity of documentation',
            maxScore: 100,
            unit: '%'
        },
        easeOfSetup: {
            label: 'Ease of Setup',
            description: 'How easy it is to install and configure',
            maxScore: 100,
            unit: '%'
        }
    }
};