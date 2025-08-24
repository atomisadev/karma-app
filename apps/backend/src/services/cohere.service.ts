import { AzureOpenAI } from "openai";
import { env } from "@backend/config";
import type { Transaction } from "@backend/schemas/transaction.schema";
import { CohereClient } from "cohere-ai";

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
      throw new Error("No output text received from OpenAI");
    }

    let text = response.text.trim();

    if (text.startsWith("```")) {
      text = text.replace(/^```[a-z]*\s*/i, "");
      const fenceIdx = text.lastIndexOf("```");
      if (fenceIdx !== -1) text = text.slice(0, fenceIdx).trim();
    }

    const tryParse = (s: string) => {
      try {
        return JSON.parse(s);
      } catch {
        return undefined;
      }
    };

    let parsed = tryParse(text);
    return { insight: response.text };
  } catch (error) {
    console.error("Error calling OpenAI API:", error);
    throw new Error("Failed to generate financial insight.");
  }
}

export async function isIndulgence(
  transactionName: string,
  transactionCategory: string[] | undefined
): Promise<boolean> {
  try {
    const prompt = `Is the following transaction typically considered an "indulgence" or a non-essential purchase?
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

export async function getSuggestedChallenge(
  recentTransactions: Transaction[],
  indulgenceCategory: string
): Promise<string | null> {
  try {
    const transactionHistory = recentTransactions
      .map((tx) => `- ${tx.name} (${tx.category?.[0] || "Uncategorized"})`)
      .join("\n");
    const prompt = `Given the user's recent spending history and a recent indulgence:
    Recent Transactions:
    ${transactionHistory}

    Recent Indulgence Category: ${indulgenceCategory}

    Based on this history, what is ONE specific, non-essential spending category that the user could be challenged to avoid for one day? The suggested category should be a common, recurring expense.
    Respond with only the category name, without any other text or punctuation. For example, "Coffee Shop" or "Fast Food".`;

    const response = await cohere.chat({
      model: env.COHERE_MODEL_ID,
      preamble:
        "You are a financial coach. Your task is to analyze a list of transactions and suggest a single, specific category for the user to avoid. Respond with only the category name.",
      message: prompt,
    });
    const suggestedCategory = response.text?.trim();
    return suggestedCategory || null;
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
