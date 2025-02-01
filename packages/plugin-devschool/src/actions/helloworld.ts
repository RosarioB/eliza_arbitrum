import {
    ActionExample,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";

export const helloWorldAction: Action = {
    name: "HELLO_WORLD",
    similes: ["HELLO"],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Make a cool Hello World ASCII art.",
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State, // current state of the application. All recent messages
        _options: { [key: string]: unknown },
        _callback: HandlerCallback
    ): Promise<boolean> => {
        const helloWorld = `
        THIS IS DEFINITELY WORKING!!!!!
        _   _      _ _         __        __         _     _ _
        | | | |    | | |        \\ \\      / /        | |   | | |
        | |_| | ___| | | ___     \\ \\_/\\_/ /__  _   _| |__ | | |
        |  _  |/ _ \\ | |/ _ \\     \\ \\ /\\ / / _ \\| | | | '_ \\| | |
        | | | |  __/ | | (_) |     \\ V  V / (_) | |_| | | | |_|_|
        \\_| |_/\\___|_|_|\\___( )     \\_/\\_/ \\___/ \\__,_|_| |_(_|_)|/`;

        _callback({
            text: helloWorld,
        });
        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "Can you show me a hello world?" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "I want to see a hello world" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Show me hello world" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Print hello world" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Display hello world" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "HELLO_WORLD" },
            },
        ],
    ] as ActionExample[][],
} as Action;