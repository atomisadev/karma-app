import { AzureOpenAI } from "openai";
import { env } from "@backend/config";

const apiVersion = "2025-04-01-preview";
const client = new AzureOpenAI({
  endpoint: env.AZURE_OPENAI_ENDPOINT,
  apiKey: env.AZURE_OPENAI_API_KEY,
  deployment: env.AZURE_OPENAI_DEPLOYMENT,
  apiVersion,
});

export async function getFinancialInsight(inputPrompt: string) {
  try {
    const response = await client.responses.create({
      model: env.AZURE_OPENAI_DEPLOYMENT,
      instructions:
        "You are a helpful and expert financial assistant. Analyze the user's financial data and provide concise, actionable insights. Your tone should be encouraging. If the user asks for a budget in JSON format, you must respond with ONLY the valid JSON object and nothing else.",
      input: inputPrompt,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    });

    if (!response.output_text) {
      throw new Error("No output text received from OpenAI");
    }

    return { insight: response.output_text };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new Error("Failed to generate financial insight.");
  }
}
