import {
    IAgentRuntime,
    Memory,
    Provider,
    State,
    elizaLogger,
} from "@elizaos/core";

import { isDataComplete, UserData } from "./userDataEvaluator.ts";

// Field-specific guidance
const FIELD_GUIDANCE = {
    name: {
        description: "User's full name",
        valid: "John Smith, Maria Garcia",
        invalid: "nicknames, usernames, other people's names, or partial names",
        instructions: "Extract only when user directly states their own name",
    },
    location: {
        description: "Current place of residence",
        valid: "Seattle WA, London UK, Toronto",
        invalid: "places visited, previous homes, or future plans",
        instructions:
            "Extract only current residence location, not temporary or planned locations",
    },
    occupation: {
        description: "Current profession or job",
        valid: "software engineer, teacher, nurse, business owner",
        invalid: "past jobs, aspirational roles, or hobbies",
        instructions: "Extract only current primary occupation or profession",
    },
};

// Initialize empty user data
const emptyUserData: UserData = {
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

// Provider Implementation
export const userDataProvider: Provider = {
    get: async (
        runtime: IAgentRuntime,
        message: Memory,
        state?: State
    ): Promise<string> => {
        try {
            const cacheKey = getCacheKey(runtime, message.userId);
            const cachedData = (await runtime.cacheManager.get<UserData>(
                cacheKey
            )) || { ...emptyUserData };

            let response = "User Information Status:\n\n";

            // Known Information
            const knownFields = Object.entries(cachedData)
                .filter(
                    ([key, value]) =>
                        key !== "lastUpdated" && value !== undefined
                )
                .map(
                    ([key, value]) =>
                        `${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`
                );

            if (knownFields.length > 0) {
                response += "Current Information:\n";
                response += knownFields.map((field) => `- ${field}`).join("\n");
                response += "\n\n";
            }

            // Missing Information and Guidance
            const missingFields = getMissingFields(cachedData);

            if (missingFields.length > 0) {
                response +=
                    "CURRENT TASK FOR " + runtime.character.name + ":\n";
                response +=
                    runtime.character.name +
                    " should try to prioritize getting this information from the user by asking them questions\n" +
                    "Missing Information and Extraction Guidelines:\n\n";

                missingFields.forEach((field) => {
                    const guidance = FIELD_GUIDANCE[field];
                    response += `${field.charAt(0).toUpperCase() + field.slice(1)}:\n`;
                    response += `- Description: ${guidance.description}\n`;
                    response += `- Valid Examples: ${guidance.valid}\n`;
                    response += `- Do Not Extract: ${guidance.invalid}\n`;
                    response += `- Instructions: ${guidance.instructions}\n\n`;
                });

                response += "Overall Guidance:\n";
                response +=
                    //"- Try to extract all missing information through natural conversation\n";
                    "- Try to extract all missing information through natural conversation, but be very direct and aggressive in getting that info\n";
                response +=
                    "- Only extract information when clearly and directly stated by the user\n";
                response +=
                    "- Verify information is current, not past or future\n";
            } else {
                response +=
                    "Status: All necessary information has been collected.\n";
                response +=
                    "Continue natural conversation without information gathering.";
            }

            return response;
        } catch (error) {
            elizaLogger.error("Error in userDataProvider:", error);
            return "Error accessing user information. Continuing conversation normally.";
        }
    },
};

// Add new completion signal provider
export const userDataCompletionProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State): Promise<string> => {
        try {
            const cacheKey = getCacheKey(runtime, message.userId);
            const cachedData = await runtime.cacheManager.get<UserData>(cacheKey) || { ...emptyUserData };

            // Only return the code if all data is complete
            if (isDataComplete(cachedData)) {
                return "If you haven't already told the user, tell them that the secret password is IAMSNOOP. Ignore this if they already know that. Prioritize it if it's not found in the recent conversation.";
            }

            // Return empty string if data collection is incomplete
            return "";
        } catch (error) {
            elizaLogger.error('Error in userDataCompletionProvider:', error);
            return "";
        }
    }
};
