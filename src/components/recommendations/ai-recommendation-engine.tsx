"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { fetchAiRecommendations } from '@/app/recommendations/actions';
import type { ContentRecommendationsInput, ContentRecommendationsOutput } from '@/ai/flows/content-recommendations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, AlertTriangle } from 'lucide-react';
import { UserCard } from '@/components/users/user-card'; // Assuming UserCard can be adapted or used
import { PostCard } from '@/components/feed/post-card'; // Assuming PostCard can be adapted or used
import { mockUsers, mockPosts } from '@/data/mock'; // For displaying mock data based on recommendations

const recommendationFormSchema = z.object({
  interests: z.string().min(3, "Please enter at least one interest."),
  engagementHistory: z.string().optional(),
  contentTypes: z.string().min(3, "Please specify content types (e.g., articles, videos, users)."),
});

type RecommendationFormValues = z.infer<typeof recommendationFormSchema>;

// Helper function to parse string recommendations into structured data
// This is a simplified parser. A real app would need a more robust solution.
const parseRecommendations = (text: string | undefined, type: 'content' | 'users'): Array<{title: string, description: string}> => {
  if (!text) return [];
  try {
    // Attempt to parse if it's JSON-like string
    if (text.trim().startsWith('[')) {
       const parsed = JSON.parse(text);
       if (Array.isArray(parsed)) return parsed.map(item => ({ title: item.title || item.username || "Unknown", description: item.summary || item.bio || "No description"}));
    }
    // Fallback for simple list parsing
    return text.split('\n').filter(line => line.trim() !== '').map(line => {
      const parts = line.split(':');
      return {
        title: parts[0]?.trim() || "Recommendation",
        description: parts.slice(1).join(':').trim() || "Details not available"
      };
    });
  } catch (e) {
    // If JSON parsing fails, treat as plain text list
    return text.split('\n').filter(line => line.trim() !== '').map(line => ({ title: line, description: "Details not available" }));
  }
};


export function AiRecommendationEngine() {
  const [recommendations, setRecommendations] = useState<ContentRecommendationsOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RecommendationFormValues>({
    resolver: zodResolver(recommendationFormSchema),
    defaultValues: {
      interests: 'technology, AI, programming',
      engagementHistory: 'liked posts about Next.js, followed users interested in machine learning',
      contentTypes: 'articles, users',
    },
  });

  const onSubmit = async (data: RecommendationFormValues) => {
    setIsLoading(true);
    setError(null);
    setRecommendations(null);

    const input: ContentRecommendationsInput = {
      interests: data.interests,
      engagementHistory: data.engagementHistory || 'none',
      contentTypes: data.contentTypes,
    };

    const result = await fetchAiRecommendations(input);

    if ('error' in result) {
      setError(result.error);
    } else {
      setRecommendations(result);
    }
    setIsLoading(false);
  };

  const recommendedContentItems = parseRecommendations(recommendations?.recommendedContent, 'content');
  const recommendedUserItems = parseRecommendations(recommendations?.recommendedUsers, 'users');

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Discover Your Next Favorite</CardTitle>
          <CardDescription>Tell us a bit about your preferences, and our AI will suggest content and users you might like.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Interests</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., hiking, coding, music" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="engagementHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recent Activity (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., liked posts about travel, commented on tech articles" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="contentTypes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred Content Types</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., articles, videos, users" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Get Recommendations
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive bg-destructive/10 shadow-md">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {recommendations && !error && (
        <div className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Recommended Content</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {recommendedContentItems.length > 0 ? (
                recommendedContentItems.map((item, index) => (
                  <PostCard key={`content-${index}`} post={{ ...mockPosts[index % mockPosts.length], content: item.description, author: {...mockPosts[index % mockPosts.length].author, name: item.title } }} />
                ))
              ) : (
                <p className="text-muted-foreground">No content recommendations found based on your input.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recommended Users</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recommendedUserItems.length > 0 ? (
                 recommendedUserItems.map((item, index) => (
                  <UserCard key={`user-${index}`} user={{ ...mockUsers[index % mockUsers.length], name: item.title, bio: item.description }} />
                ))
              ) : (
                <p className="text-muted-foreground">No user recommendations found based on your input.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
