export interface ModelMetrics {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
}

export interface AIModel {
    id: string;
    name: string;
    company: string;
    category: 'coding' | 'general' | 'multimodal';
    metrics: ModelMetrics;
    color: string;
    description?: string;
    releaseDate?: string;
}

export const sampleModelData: AIModel[] = [
    {
        id: 'gpt-4',
        name: 'GPT-4',
        company: 'OpenAI',
        category: 'general',
        metrics: {
            accuracy: 92.5,
            precision: 90.8,
            recall: 94.2,
            f1Score: 92.4
        },
        color: '#10a37f',
        description: 'Large multimodal model with strong reasoning capabilities',
        releaseDate: '2023-03'
    },
    {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        company: 'Anthropic',
        category: 'general',
        metrics: {
            accuracy: 91.8,
            precision: 89.5,
            recall: 93.1,
            f1Score: 91.3
        },
        color: '#d97706',
        description: 'Most capable model in Claude 3 family',
        releaseDate: '2024-03'
    },
    {
        id: 'gemini-pro',
        name: 'Gemini Pro',
        company: 'Google',
        category: 'multimodal',
        metrics: {
            accuracy: 89.2,
            precision: 87.6,
            recall: 90.8,
            f1Score: 89.1
        },
        color: '#4285f4',
        description: 'Multimodal AI model optimized for various tasks',
        releaseDate: '2023-12'
    },
    {
        id: 'llama-2-70b',
        name: 'LLaMA 2 70B',
        company: 'Meta',
        category: 'general',
        metrics: {
            accuracy: 87.3,
            precision: 85.2,
            recall: 88.9,
            f1Score: 87.0
        },
        color: '#1877f2',
        description: 'Open-source large language model',
        releaseDate: '2023-07'
    },
    {
        id: 'code-llama-34b',
        name: 'Code Llama 34B',
        company: 'Meta',
        category: 'coding',
        metrics: {
            accuracy: 88.7,
            precision: 91.2,
            recall: 85.4,
            f1Score: 88.2
        },
        color: '#8b5cf6',
        description: 'Specialized coding model based on LLaMA 2',
        releaseDate: '2023-08'
    },
    {
        id: 'mixtral-8x7b',
        name: 'Mixtral 8x7B',
        company: 'Mistral AI',
        category: 'general',
        metrics: {
            accuracy: 86.9,
            precision: 84.7,
            recall: 88.2,
            f1Score: 86.4
        },
        color: '#ff6b35',
        description: 'Mixture of experts model with high performance',
        releaseDate: '2023-12'
    },
    {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        company: 'OpenAI',
        category: 'general',
        metrics: {
            accuracy: 83.4,
            precision: 81.9,
            recall: 84.7,
            f1Score: 83.3
        },
        color: '#10a37f',
        description: 'Optimized version of GPT-3.5 for chat applications',
        releaseDate: '2023-03'
    },
    {
        id: 'claude-instant',
        name: 'Claude Instant',
        company: 'Anthropic',
        category: 'general',
        metrics: {
            accuracy: 81.2,
            precision: 79.8,
            recall: 82.1,
            f1Score: 80.9
        },
        color: '#d97706',
        description: 'Faster, lighter version of Claude',
        releaseDate: '2023-08'
    },
    {
        id: 'codegen2-16b',
        name: 'CodeGen2 16B',
        company: 'Salesforce',
        category: 'coding',
        metrics: {
            accuracy: 79.8,
            precision: 82.1,
            recall: 76.9,
            f1Score: 79.4
        },
        color: '#00a1e0',
        description: 'Code generation model with multilingual support',
        releaseDate: '2023-05'
    },
    {
        id: 'palm-2',
        name: 'PaLM 2',
        company: 'Google',
        category: 'general',
        metrics: {
            accuracy: 85.6,
            precision: 84.2,
            recall: 86.8,
            f1Score: 85.5
        },
        color: '#4285f4',
        description: 'Large language model with improved reasoning',
        releaseDate: '2023-05'
    }
];

export const getModelsByCategory = (category: 'coding' | 'general' | 'multimodal'): AIModel[] => {
    return sampleModelData.filter(model => model.category === category);
};

export const getTopModelsByMetric = (metric: keyof ModelMetrics, limit = 5): AIModel[] => {
    return [...sampleModelData]
        .sort((a, b) => b.metrics[metric] - a.metrics[metric])
        .slice(0, limit);
};

export const getModelById = (id: string): AIModel | undefined => {
    return sampleModelData.find(model => model.id === id);
};