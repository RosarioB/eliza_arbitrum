import {
    IAgentRuntime,
    Memory,
    Evaluator,
    ModelClass,
    elizaLogger,
    generateObjectDeprecated,
} from "@elizaos/core";

// Define strict types for user data
export interface UserData {
    name: string | undefined;
    location: string | undefined;
    occupation: string | undefined;
    lastUpdated: number | undefined;
}

// Initialize empty user data
export const emptyUserData: UserData = {
    name: undefined,
    location: undefined,
    occupation: undefined,
    lastUpdated: undefined,
};

// Helper functions
const getCacheKey = (runtime: IAgentRuntime, userId: string): string => {
    return `${runtime.character.name}/${userId}/data`;
};

const getMissingFields = (
    data: UserData
): Array<keyof Omit<UserData, "lastUpdated">> => {
    const fields: Array<keyof Omit<UserData, "lastUpdated">> = [
        "name",
        "location",
        "occupation",
    ];
    return fields.filter((field) => !data[field]);
};

export const isDataComplete = (data: UserData): boolean => {
    return getMissingFields(data).length === 0;
};

// Evaluator Implementation
export const userDataEvaluator: Evaluator = {
    name: "GET_USER_DATA",
    similes: [
        "EXTRACT_USER_INFO",
        "GET_USER_INFORMATION",
        "COLLECT_USER_DATA",
        "USER_DETAILS",
    ],
    description:
        "Extract user's name, location, and occupation from conversation when clearly stated.",
    alwaysRun: true,

    validate: async (
        runtime: IAgentRuntime,
        message: Memory
    ): Promise<boolean> => {
        try {
            const cacheKey = getCacheKey(runtime, message.userId);
            const cachedData = (await runtime.cacheManager.get<UserData>(
                cacheKey
            )) || { ...emptyUserData };
            return !isDataComplete(cachedData);
        } catch (error) {
            elizaLogger.error("Error in userDataEvaluator validate:", error);
            return false;
        }
    },

    handler: async (runtime: IAgentRuntime, message: Memory): Promise<void> => {
        try {
            const cacheKey = getCacheKey(runtime, message.userId);
            const cachedData = (await runtime.cacheManager.get<UserData>(
                cacheKey
            )) || { ...emptyUserData };

            const extractionTemplate = `
		Analyze the following conversation to extract personal information.
		Only extract information when it is explicitly and clearly stated by the user about themselves.

		Conversation:
		${message.content.text}

		Return a JSON object containing only the fields where information was clearly found:
		{
			"name": "extracted full name if stated",
			"location": "extracted current residence if stated",
			"occupation": "extracted current occupation if stated"
		}

		Only include fields where information is explicitly stated and current.
		Omit fields if information is unclear, hypothetical, or about others.
		`;

            const extractedInfo = await generateObjectDeprecated({
                runtime,
                context: extractionTemplate,
                modelClass: ModelClass.SMALL,
            });

            let dataUpdated = false;

            // Update only undefined fields with new information
            for (const field of ["name", "location", "occupation"] as const) {
                if (extractedInfo[field] && cachedData[field] === undefined) {
                    cachedData[field] = extractedInfo[field];
                    dataUpdated = true;
                }
            }

            if (dataUpdated) {
                cachedData.lastUpdated = Date.now();
                await runtime.cacheManager.set(cacheKey, cachedData, {
                    expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 1 week cache
                });
            }

            if (isDataComplete(cachedData)) {
                elizaLogger.success(
                    "User data collection completed:",
                    cachedData
                );
                // DO SOME API CALL OUT TO SOMETHING ELSE HERE!!!!
            }
        } catch (error) {
            elizaLogger.error("Error in userDataEvaluator handler:", error);
        }
    },

    examples: [
        {
            context: "Initial user introduction",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Hi everyone! I'm David Chen, working as a dentist here in Chicago.",
                    },
                },
            ],
            outcome: `[{
            "name": "David Chen",
            "location": "Chicago",
            "occupation": "dentist"
    }]`,
        },
        {
            context: "Travel discussion",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "I might move to Barcelona next year, it's such a beautiful city.",
                    },
                },
            ],
            outcome: "{}",
        },
        {
            // Information about others
            context: "Family discussion",
            messages: [
                {
                    user: "{{user1}}",
                    content: { text: "My brother Tom is a lawyer in New York" },
                },
            ],
            outcome: "{}",
        },
    ],
};
