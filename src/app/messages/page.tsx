import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import MessagesPageContent from './messages-content';

export const dynamic = 'force-dynamic'; // still needed

export default function MessagesPage() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="flex h-[calc(100vh-15rem)] items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          </div>
        }
      >
        <MessagesPageContent />
      </Suspense>
    </AppLayout>
  );
}
