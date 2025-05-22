'use server';

/**
 * @fileOverview AI-driven content and user recommendations based on user interests and engagement.
 *
 * - getContentRecommendations - A function that provides content and user recommendations.
 * - ContentRecommendationsInput - The input type for the getContentRecommendations function.
 * - ContentRecommendationsOutput - The return type for the getContentRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ContentRecommendationsInputSchema = z.object({
  interests: z
    .string()
    .describe('A comma-separated list of the user\u2019s interests.'),
  engagementHistory: z
    .string()
    .describe(
      'A summary of the user\u2019s past engagement with content and users on the platform.'
    ),
  contentTypes: z
    .string()
    .describe('A comma-separated list of content types to consider (e.g., articles, videos, users).'),
});
export type ContentRecommendationsInput = z.infer<
  typeof ContentRecommendationsInputSchema
>;

const ContentRecommendationsOutputSchema = z.object({
  recommendedContent: z
    .string()
    .describe('A list of recommended content items with descriptions.'),
  recommendedUsers: z
    .string()
    .describe('A list of recommended users with descriptions.'),
});
export type ContentRecommendationsOutput = z.infer<
  typeof ContentRecommendationsOutputSchema
>;

export async function getContentRecommendations(
  input: ContentRecommendationsInput
): Promise<ContentRecommendationsOutput> {
  return contentRecommendationsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'contentRecommendationsPrompt',
  input: {schema: ContentRecommendationsInputSchema},
  output: {schema: ContentRecommendationsOutputSchema},
  prompt: `You are an AI-powered recommendation system for a social media platform.

  Based on the user's interests, engagement history, and preferred content types, provide recommendations for content and users.

  Interests: {{{interests}}}
  Engagement History: {{{engagementHistory}}}
  Content Types: {{{contentTypes}}}

  Format your response as a JSON object with 'recommendedContent' and 'recommendedUsers' fields.
  Each field should contain a list of recommendations with brief descriptions.

  For content, include the title and a short summary.
  For users, include their username and a short bio.
  `,
});

const contentRecommendationsFlow = ai.defineFlow(
  {
    name: 'contentRecommendationsFlow',
    inputSchema: ContentRecommendationsInputSchema,
    outputSchema: ContentRecommendationsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
