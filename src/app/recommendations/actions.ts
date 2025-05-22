"use server";

import { getContentRecommendations, type ContentRecommendationsInput, type ContentRecommendationsOutput } from '@/ai/flows/content-recommendations';

export async function fetchAiRecommendations(input: ContentRecommendationsInput): Promise<ContentRecommendationsOutput | { error: string }> {
  try {
    const recommendations = await getContentRecommendations(input);
    return recommendations;
  } catch (error) {
    console.error("Error fetching AI recommendations:", error);
    return { error: "Failed to fetch recommendations. Please try again." };
  }
}
