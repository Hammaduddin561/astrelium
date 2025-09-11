/**
 * Comprehensive data structure for AI coding assistant comparison
 * Positions Astrelium as the hero with competitive advantages
 */

export interface AIModel {
    name: string;
    company: string;
    description: string;
    privacy: number;          // 0-100% - Data privacy and local processing
    cost: number;            // 0-100% - Cost effectiveness (100% = free/one-time)
    offline: number;         // 0-100% - Offline capability
    vscodeIntegration: number; // 0-100% - VS Code integration quality
    codeAccuracy: number;    // 0-100% - Code generation accuracy
    speed: number;           // 0-100% - Response speed and performance
    resourceEfficiency: number; // 0-100% - Resource usage efficiency
    isHero: boolean;         // Identifies Astrelium as the main subject
    brandColor: string;      // Primary brand color
    features: string[];      // Key features list
    limitations: string[];   // Known limitations
    pricingModel: string;    // Pricing description
    privacyDetails: string;  // Privacy implementation details
}

export const aiModels: AIModel[] = [
    // ASTRELIUM - THE HERO 🌌
    {
        name: "Astrelium",
        company: "Astrelium",
        description: "The Privacy-First AI Coding Assistant - Complete local processing with enterprise-grade AI assistance",
        privacy: 100,
        cost: 100,
        offline: 100,
        vscodeIntegration: 95,
        codeAccuracy: 85,
        speed: 88,
        resourceEfficiency: 90,
        isHero: true,
        brandColor: "#8B5CF6", // Purple gradient primary
        features: [
            "🔒 100% Local Processing - Your code never leaves your machine",
            "💰 One-Time Setup - No recurring subscriptions or API fees",
            "🌐 Complete Offline Operation - Code anywhere, anytime",
            "🎯 Native VS Code Integration - Built specifically for VS Code",
            "⚡ Lightning-Fast Local AI - No network latency",
            "🛡️ Enterprise Security - Zero external data transmission",
            "♻️ Resource Optimized - Efficient local hardware usage",
            "🚀 Unlimited Usage - No token limits or usage restrictions"
        ],
        limitations: [
            "Requires initial local model setup",
            "Hardware-dependent performance"
        ],
        pricingModel: "One-time setup cost - Pay once, use forever",
        privacyDetails: "Complete local processing with no external server communication. All AI inference runs on your local machine via Ollama or compatible local LLM servers. Zero telemetry, zero data collection."
    },

    // COMPETITORS
    {
        name: "GitHub Copilot",
        company: "GitHub/Microsoft",
        description: "AI pair programmer powered by OpenAI Codex with cloud-based processing",
        privacy: 20,
        cost: 30,
        offline: 0,
        vscodeIntegration: 85,
        codeAccuracy: 90,
        speed: 75,
        resourceEfficiency: 85,
        isHero: false,
        brandColor: "#24292e",
        features: [
            "Strong code completion",
            "Multiple IDE support",
            "Large training dataset"
        ],
        limitations: [
            "Sends code to external servers",
            "Requires internet connection",
            "Monthly subscription required",
            "Usage limitations and filtering"
        ],
        pricingModel: "$10/month individual, $19/month business",
        privacyDetails: "Code snippets sent to Microsoft/GitHub servers for processing. Data may be used for service improvement."
    },

    {
        name: "OpenAI Codex/GPT-4",
        company: "OpenAI",
        description: "Advanced language model with coding capabilities via cloud API",
        privacy: 15,
        cost: 25,
        offline: 0,
        vscodeIntegration: 70,
        codeAccuracy: 92,
        speed: 65,
        resourceEfficiency: 80,
        isHero: false,
        brandColor: "#412991",
        features: [
            "Highly accurate code generation",
            "Natural language to code",
            "Multiple programming languages"
        ],
        limitations: [
            "All code sent to OpenAI servers",
            "Pay-per-token pricing",
            "Requires internet connection",
            "Rate limits and usage caps"
        ],
        pricingModel: "Pay-per-token: $0.01-0.06 per 1K tokens",
        privacyDetails: "Code sent to OpenAI servers. Data retention for 30 days, may be used for training with opt-out."
    },

    {
        name: "Google Gemini Code",
        company: "Google",
        description: "Google's AI model with coding capabilities integrated into development tools",
        privacy: 20,
        cost: 40,
        offline: 0,
        vscodeIntegration: 60,
        codeAccuracy: 87,
        speed: 70,
        resourceEfficiency: 75,
        isHero: false,
        brandColor: "#4285F4",
        features: [
            "Google ecosystem integration",
            "Multimodal capabilities",
            "Strong reasoning abilities"
        ],
        limitations: [
            "Code processed by Google servers",
            "Limited offline capability",
            "Subscription or pay-per-use",
            "Data privacy concerns"
        ],
        pricingModel: "Tiered pricing: Free tier limited, Pro plans $20+/month",
        privacyDetails: "Code processed on Google Cloud. Data may be used for service improvement and training."
    },

    {
        name: "Anthropic Claude-3.5",
        company: "Anthropic",
        description: "Constitutional AI with advanced reasoning capabilities for coding tasks",
        privacy: 25,
        cost: 35,
        offline: 0,
        vscodeIntegration: 50,
        codeAccuracy: 89,
        speed: 68,
        resourceEfficiency: 78,
        isHero: false,
        brandColor: "#FF6B35",
        features: [
            "Strong reasoning and explanation",
            "Constitutional AI approach",
            "Good code understanding"
        ],
        limitations: [
            "Cloud-based processing only",
            "No native VS Code integration",
            "Pay-per-token model",
            "Usage limitations"
        ],
        pricingModel: "Pay-per-token: $0.015-0.075 per 1K tokens",
        privacyDetails: "Code sent to Anthropic servers for processing. 90-day data retention policy."
    },

    {
        name: "Codeium",
        company: "Codeium",
        description: "Free AI-powered code completion with some local processing capabilities",
        privacy: 30,
        cost: 70,
        offline: 10,
        vscodeIntegration: 80,
        codeAccuracy: 82,
        speed: 78,
        resourceEfficiency: 85,
        isHero: false,
        brandColor: "#09B6A2",
        features: [
            "Free tier available",
            "Good VS Code integration",
            "Multiple language support"
        ],
        limitations: [
            "Limited local processing",
            "Freemium model with restrictions",
            "Some cloud dependency",
            "Premium features require subscription"
        ],
        pricingModel: "Free tier with limits, Pro plans $12+/month",
        privacyDetails: "Hybrid approach - some local processing, some cloud-based. Code may be processed on Codeium servers."
    },

    {
        name: "Tabnine",
        company: "Tabnine",
        description: "AI code completion with both cloud and on-premise deployment options",
        privacy: 60,
        cost: 50,
        offline: 30,
        vscodeIntegration: 85,
        codeAccuracy: 80,
        speed: 82,
        resourceEfficiency: 88,
        isHero: false,
        brandColor: "#4A90E2",
        features: [
            "On-premise option available",
            "Team training capabilities",
            "Good IDE integration"
        ],
        limitations: [
            "On-premise requires enterprise plan",
            "Free tier very limited",
            "Complex setup for local deployment",
            "Higher cost for privacy features"
        ],
        pricingModel: "Free tier limited, Pro $12/month, Enterprise $39/month",
        privacyDetails: "Cloud version sends code snippets to servers. On-premise version available for enterprise customers only."
    },

    {
        name: "Meta CodeLlama",
        company: "Meta",
        description: "Open-source code generation model that can run locally with proper setup",
        privacy: 80,
        cost: 80,
        offline: 70,
        vscodeIntegration: 40,
        codeAccuracy: 78,
        speed: 70,
        resourceEfficiency: 75,
        isHero: false,
        brandColor: "#1877F2",
        features: [
            "Open source model",
            "Can run locally",
            "No usage restrictions",
            "Customizable"
        ],
        limitations: [
            "Requires technical setup",
            "Limited VS Code integration",
            "Needs significant hardware resources",
            "No official support or interface"
        ],
        pricingModel: "Free (open source) but requires self-hosting",
        privacyDetails: "Can be fully local when self-hosted. No external data transmission when properly configured."
    },

    {
        name: "Amazon CodeWhisperer",
        company: "Amazon Web Services",
        description: "AWS-integrated AI coding assistant with cloud-based processing",
        privacy: 20,
        cost: 60,
        offline: 0,
        vscodeIntegration: 75,
        codeAccuracy: 83,
        speed: 72,
        resourceEfficiency: 80,
        isHero: false,
        brandColor: "#FF9900",
        features: [
            "AWS ecosystem integration",
            "Security scanning",
            "Enterprise features"
        ],
        limitations: [
            "Code sent to AWS servers",
            "Requires AWS account",
            "Limited offline capability",
            "Subscription required for full features"
        ],
        pricingModel: "Free tier with limits, Professional $19/month",
        privacyDetails: "Code snippets sent to AWS servers for processing. Data used for service improvement unless opted out."
    }
];

// Metric definitions for the dashboard
export const metrics = {
    privacy: {
        name: "Privacy & Security",
        description: "Data privacy, local processing, and security measures",
        icon: "🔒",
        weight: 1.0,
        astreliumAdvantage: "100% local processing - your code never leaves your machine"
    },
    cost: {
        name: "Cost Effectiveness", 
        description: "Total cost of ownership and pricing model fairness",
        icon: "💰",
        weight: 0.9,
        astreliumAdvantage: "One-time setup cost - pay once, use forever with no limits"
    },
    offline: {
        name: "Offline Capability",
        description: "Ability to function without internet connection",
        icon: "🌐", 
        weight: 0.8,
        astreliumAdvantage: "Complete offline operation - code anywhere, anytime"
    },
    vscodeIntegration: {
        name: "VS Code Integration",
        description: "Quality of VS Code integration and developer experience",
        icon: "🎯",
        weight: 0.9,
        astreliumAdvantage: "Native VS Code extension built specifically for VS Code developers"
    },
    codeAccuracy: {
        name: "Code Accuracy",
        description: "Quality and accuracy of generated code",
        icon: "📊",
        weight: 1.0,
        astreliumAdvantage: "Competitive AI performance with context-aware suggestions"
    },
    speed: {
        name: "Speed & Performance",
        description: "Response time and overall performance",
        icon: "⚡",
        weight: 0.8,
        astreliumAdvantage: "Lightning-fast local AI with no network latency"
    },
    resourceEfficiency: {
        name: "Resource Efficiency",
        description: "System resource usage and efficiency",
        icon: "⚙️",
        weight: 0.7,
        astreliumAdvantage: "Optimized for local hardware with smart resource management"
    }
};

// Marketing messages highlighting Astrelium's advantages
export const marketingMessages = {
    hero: "🌌 Astrelium: The Privacy-First AI Coding Assistant",
    tagline: "Your Code, Your Machine, Your Rules",
    keyBenefits: [
        "🔒 **Complete Privacy**: 100% local processing - your code never leaves your machine",
        "💰 **Cost Effective**: One-time setup, no recurring fees or usage limits", 
        "🌐 **Always Available**: Works completely offline - code anywhere, anytime",
        "🎯 **VS Code Native**: Built specifically for VS Code developers",
        "⚡ **Lightning Fast**: Local AI with zero network latency",
        "🛡️ **Enterprise Ready**: Zero external dependencies or data transmission"
    ],
    competitiveAdvantages: [
        "No subscriptions or recurring costs",
        "No usage limits or token restrictions",
        "No external server communication",
        "No internet dependency",
        "No data collection or telemetry",
        "Complete local control and ownership"
    ],
    targetAudiences: {
        privacyConscious: "Keep your proprietary code secure with 100% local processing",
        costConscious: "Eliminate recurring AI subscription costs with one-time setup", 
        offlineWorkers: "Perfect for secure environments and remote development"
    }
};

// Color scheme for Astrelium branding
export const astreliumColors = {
    primary: "#8B5CF6",      // Purple
    secondary: "#3B82F6",    // Blue  
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #3B82F6 100%)",
    success: "#10B981",      // Green
    warning: "#F59E0B",      // Yellow
    danger: "#EF4444",       // Red
    background: "#1F2937",   // Dark gray
    surface: "#374151",      // Medium gray
    text: "#F9FAFB",         // Light gray
    textSecondary: "#D1D5DB" // Medium light gray
};