import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function generateProblemEmbedding(text: string): Promise<number[]> {
  try {
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
      encoding_format: "float",
    });

    return response.data[0].embedding;
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error && error.status === 429) {
      console.warn("OpenAI Rate limit exceeded, backing off...");
      // In production, implement retry logic with exponential backoff here.
    }
    throw error;
  }
}
