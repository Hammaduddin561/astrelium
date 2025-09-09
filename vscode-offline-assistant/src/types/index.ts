export interface UserQuery {
    prompt: string;
    context?: string;
}

export interface AssistantResponse {
    response: string;
    success: boolean;
    error?: string;
}