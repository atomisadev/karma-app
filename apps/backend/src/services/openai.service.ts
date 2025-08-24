import { AzureOpenAI } from "openai";
import { env } from "@backend/config";
import type { Transaction } from "@backend/schemas/transaction.schema";

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

export async function isIndulgence(
  transactionName: string,
  transactionCategory: string[] | undefined
): Promise<boolean> {
  try {
    const prompt = `Is the following transaction typically considered an "indulgence" or a non-essential purchase?
    Transaction Name: ${transactionName}
    Category: ${transactionCategory?.join(", ") || "N/A"}
    Answer with only "yes" or "no" in lowercase, without any other text or punctuation.`;
    const response = await client.responses.create({
      model: env.AZURE_OPENAI_DEPLOYMENT,
      instructions:
        "You are a highly specialized AI for classifying financial transactions. Your only output is 'yes' or 'no'.",
      input: prompt,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    });
    const classification = response.output_text?.trim().toLowerCase();
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

    const response = await client.responses.create({
      model: env.AZURE_OPENAI_DEPLOYMENT,
      instructions:
        "You are a financial coach. Your task is to analyze a list of transactions and suggest a single, specific category for the user to avoid. Respond with only the category name.",
      input: prompt,
      reasoning: { effort: "high" },
      text: { verbosity: "low" },
    });
    const suggestedCategory = response.output_text?.trim();
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
    const response = await client.responses.create({
      model: env.AZURE_OPENAI_DEPLOYMENT,
      instructions:
        "You are a transaction classifier. Your only output is 'yes' or 'no'.",
      input: prompt,
    });
    return response.output_text?.trim().toLowerCase() === "yes";
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

    const response = await client.responses.create({
      model: env.AZURE_OPENAI_DEPLOYMENT,
      instructions:
        "You judge if a transaction violates a challenge instruction. Output only 'violation' or 'pass'.",
      input: prompt,
      reasoning: { effort: "low" },
      text: { verbosity: "low" },
    });

    const out = response.output_text?.trim().toLowerCase();
    return out === "violation";
  } catch (error) {
    console.error("Error checking violation against instruction:", error);
    return false;
  }
}
