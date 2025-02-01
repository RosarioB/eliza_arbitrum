import { IAgentRuntime, Memory, Provider, State } from "@elizaos/core";

const randomEmotionProvider: Provider = {
    get: async (_runtime: IAgentRuntime, _message: Memory, _state?: State) => {
        const emotions = {
            happy: _runtime.character.name + " is feeling happy.",
            sad: _runtime.character.name + " is feeling sad.",
            angry: _runtime.character.name + " is feeling angry.",
            excited: _runtime.character.name + " is feeling excited.",
            nervous: _runtime.character.name + " is feeling nervous.",
        };

        const emotionKeys = Object.keys(emotions);
        const randomKey =
            emotionKeys[Math.floor(Math.random() * emotionKeys.length)];
        return emotions[randomKey];
    },
};
export { randomEmotionProvider };
