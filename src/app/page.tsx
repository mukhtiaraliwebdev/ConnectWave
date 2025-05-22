import { AppLayout } from '@/components/app-layout';
import FeedPage from '@/app/feed/page'; // Use the FeedPage component directly

export default function HomePage() {
  return (
    <AppLayout>
      <FeedPage />
    </AppLayout>
  );
}
