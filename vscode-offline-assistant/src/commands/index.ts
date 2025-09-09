export function registerCommands(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('vscode-offline-assistant.ask', async () => {
            const userInput = await vscode.window.showInputBox({ prompt: 'Ask your question' });
            if (userInput) {
                // Call the assistant service to get a response
                const response = await assistantService.askQuestion(userInput);
                vscode.window.showInformationMessage(response);
            }
        })
    );
}