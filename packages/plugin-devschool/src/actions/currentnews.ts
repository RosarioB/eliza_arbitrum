import { ModelClass } from "@elizaos/core";
import {
    ActionExample,
    composeContext,
    Content,
    generateText,
    HandlerCallback,
    IAgentRuntime,
    Memory,
    State,
    type Action,
} from "@elizaos/core";
import "dotenv/config";
import { Runtime } from "tslog";

async function getCurrentNews(searchTerm: string) {
    // call newsapi.ord api with searchTerm
    // return the first 5 results
    const response = await fetch(
        `https://newsapi.org/v2/everything?q=${searchTerm}&apikey=${process.env.NEWS_API_KEY}`
    );
    const data = await response.json();
    return data.articles
        .slice(0, 5)
        .map(
            (article) =>
                `${article.title}\n${article.description}\n${article.url}\n${article.content.slice(0, 1000)}`
        )
        .join("\n");
}

export const currentNewsAction: Action = {
    name: "CURRENT_NEWS",
    similes: ["NEWS", "GET_NEWS", "GET_CURRENT_NEWS"],
    validate: async (_runtime: IAgentRuntime, _message: Memory) => {
        return true;
    },
    description: "Get the current news for a search term if asked by the user.",
    handler: async (
        _runtime: IAgentRuntime,
        _message: Memory,
        _state: State, // current state of the application. All recent messages
        _options: { [key: string]: unknown },
        _callback: HandlerCallback
    ): Promise<boolean> => {
        // TODO: extract the search term from the message
        const context = `Extract the search term from the user's message. The message is:
        ${_message.content.text}
        Only respond with the search term, do not include any other text.`;

        // Get the search term from the conversation
        const searchTerm = await generateText({
            runtime: _runtime,
            context,
            modelClass: ModelClass.SMALL,
            stop: ["\n"],
        });

        //Gets the news
        const currentNews = await getCurrentNews(searchTerm);

        const responseText = `The currect news for the search term ${searchTerm} are:\n${currentNews}`;

        // Creates a new memory/message object
        const newMemory: Memory = {
            userId: _message.agentId,
            agentId: _message.agentId,
            roomId: _message.roomId,
            content: {
                text: responseText,
                action: "CURRENT_NEWS_RESPONSE",
                source: _message.content?.source,
            } as Content,
        };

        // Saves that memory into the runtime message manager. So it's part of the message state forever. Now the agent can talk about what he respondended in the chat.
        // Without this the agent will not remember this.
        await _runtime.messageManager.createMemory(newMemory);

        // Sends the response in the chat
        _callback(newMemory.content);

        return true;
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Can you show me the current news for ai16z?",
                },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "I want to see the latest news about ai16z" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Show me the news for ai16z" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Get the current news for ai16z" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: { text: "Display the latest news about ai16z" },
            },
            {
                user: "{{user2}}",
                content: { text: "", action: "CURRENT_NEWS" },
            },
        ],
    ] as ActionExample[][],
} as Action;
