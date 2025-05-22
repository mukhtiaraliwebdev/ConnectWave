
"use client"; // Added "use client"

import { useEffect } from 'react'; // Added useEffect
import { AppLayout } from "@/components/app-layout";
import { AiRecommendationEngine } from "@/components/recommendations/ai-recommendation-engine";
import { useAuth } from '@/contexts/auth-context'; // Added useAuth
import { useRouter } from 'next/navigation'; // Added useRouter
import { Loader2 } from 'lucide-react'; // Added Loader2

export default function RecommendationsPage() {
  const { currentUser, initialLoading: authInitialLoading } = useAuth(); // Used useAuth
  const router = useRouter(); // Used useRouter

  useEffect(() => {
    if (!authInitialLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authInitialLoading, router]);

  if (authInitialLoading || (!currentUser && authInitialLoading)) {
    return (
      <AppLayout>
        <div className="flex h-[calc(100vh-15rem)] items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }
  
  if (!currentUser) {
      return (
          <AppLayout>
              <div className="container mx-auto py-4 text-center">
                  <p>Please log in to see recommendations.</p>
              </div>
          </AppLayout>
      );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-4">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-foreground">AI-Powered Suggestions</h1>
          <p className="text-muted-foreground">Let our AI help you find content and users tailored to your tastes.</p>
        </header>
        <AiRecommendationEngine />
      </div>
    </AppLayout>
  );
}
