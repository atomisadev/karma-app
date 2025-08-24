import { CohereClient } from "cohere-ai";
import { env } from "@backend/config";
import type { Transaction } from "@backend/schemas/transaction.schema";

const cohere = new CohereClient({
  token: env.COHERE_API_KEY,
});

export async function getFinancialInsight(inputPrompt: string) {
  try {
    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You are a helpful and expert financial assistant. Analyze the user's financial data and provide concise, actionable insights. Your tone should be encouraging. If the user asks for a budget in JSON format, you must respond with ONLY the valid JSON object and nothing else.",
      message: inputPrompt,
    });

    if (!response.text) {
      throw new Error("No output text received from Cohere");
    }

    return { insight: response.text };
  } catch (error) {
    console.error("Error calling Cohere API:", error);
    throw new Error("Failed to generate financial insight.");
  }
}

export async function isIndulgence(
  transactionName: string,
  transactionCategory: string[] | undefined
): Promise<boolean> {
  try {
    const prompt = `Is the following transaction typically considered an "indulgence" or a non-essential purchase? Indulgent purchases can range anywhere from travel purchases, clothing, electronics, dining out, snacks and treats, hobbies and media, live events, beauty and wellness, fitness.
    Transaction Name: ${transactionName}
    Category: ${transactionCategory?.join(", ") || "N/A"}
    Answer with only "yes" or "no" in lowercase, without any other text or punctuation.`;
    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You are a highly specialized AI for classifying financial transactions. Your only output is 'yes' or 'no'.",
      message: prompt,
    });
    const classification = response.text?.trim().toLowerCase();
    return classification === "yes";
  } catch (error) {
    console.error("Error classifying transaction as indulgence:", error);
    return false;
  }
}

export async function getSuggestedChallengeInstruction(
  recentTransactions: Transaction[],
  indulgentTransaction: Transaction
): Promise<string | null> {
  try {
    const indulgenceName = indulgentTransaction.name;

    const prompt = `A user just made an indulgent purchase: "${indulgenceName}".
    Based on this, create a direct, one-sentence challenge to help them save money **tomorrow**.

    Your response must follow this structure: "Since you recently spent on {indulgence}, your challenge for tomorrow is to {actionable goal}." The goal should be about **avoiding** a certain type of spending.

    Examples:
    - Indulgence: "AMC Theatres Ticket" -> "Since you recently spent on a movie, your challenge for tomorrow is to avoid dining out or ordering takeout."
    - Indulgence: "Starbucks" -> "Since you recently spent on coffee, your challenge for tomorrow is to avoid buying drinks from cafes."

    Respond with ONLY the single challenge sentence, without any quotation marks.`;

    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You are a financial coach. Your task is to analyze a transaction and suggest a justified, one-sentence challenge for the user to complete tomorrow. You must follow the user's required format exactly.",
      message: prompt,
    });

    // Clean the response to remove quotes, just in case.
    return response.text?.trim().replace(/^"|"$/g, "") || null;
  } catch (error) {
    console.error("Error getting challenge suggestion:", error);
    return null;
  }
}

export async function doesTransactionMatchCategory(
  transactionName: string,
  categoryName: string
): Promise<boolean> {
  try {
    const prompt = `Does the transaction "${transactionName}" fall under the general spending category of "${categoryName}"? Answer only "yes" or "no".`;
    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You are a transaction classifier. Your only output is 'yes' or 'no'.",
      message: prompt,
    });
    return response.text?.trim().toLowerCase() === "yes";
  } catch (error) {
    console.error("Error matching transaction to category:", error);
    return false;
  }
}

export async function doesTransactionViolateInstruction(
  instruction: string,
  tx: Transaction
): Promise<boolean> {
  try {
    const name = tx.name;
    const category = tx.category?.join(", ") || "N/A";
    const amount = tx.amount;
    const channel = tx.paymentChannel;

    const prompt = `You are judging whether a financial transaction violates the user's challenge instruction.
Challenge (natural language): ${instruction}

Transaction details:
- Name: ${name}
- Category: ${category}
- Amount: ${amount}
- Channel: ${channel}

Rules:
- Consider the semantic meaning of the transaction relative to the challenge.
- If the transaction reasonably fits what the challenge asks to avoid, output "violation".
- Otherwise output "pass".
- Output ONLY one word: "violation" or "pass".`;

    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You judge if a transaction violates a challenge instruction. Output only 'violation' or 'pass'.",
      message: prompt,
    });

    const out = response.text?.trim().toLowerCase();
    return out === "violation";
  } catch (error) {
    console.error("Error checking violation against instruction:", error);
    return false;
  }
}
