export function activate(context: any) {
    console.log('🌌 Offline Assistant activated');

    // Register commands
    const command = require('./commands/index');
    context.subscriptions.push(
        context.subscriptions.push(
            command.registerCommands()
        )
    );
}

export function deactivate() {
    console.log('🛑 Offline Assistant deactivated');
}