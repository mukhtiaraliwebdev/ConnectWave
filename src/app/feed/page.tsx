
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { PostCard } from "@/components/feed/post-card";
import { FeedFilters } from "@/components/feed/feed-filters";
import type { Post } from '@/types';
import { Button } from '@/components/ui/button';
import { Send, Loader2, Paperclip, XCircle } from 'lucide-react'; // Removed AlertTriangle
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, Timestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';
import Image from 'next/image';
// Alert components removed as the notice is being removed
// import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'; 

export default function FeedPage() {
  const { currentUser, appUser, loading: authLoading, initialLoading: authInitialLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [filters, setFilters] = useState<Record<string, boolean>>({
    images: true,
    videos: true,
    textOnly: true,
  });

  useEffect(() => {
    if (!authInitialLoading && !currentUser) {
      router.push('/login');
    }
  }, [currentUser, authInitialLoading, router]);

  const fetchPosts = useCallback(async () => {
    if (currentUser) {
      setIsLoadingPosts(true);
      try {
        const postsRef = collection(db, "posts");
        const q = query(postsRef, orderBy("createdAt", "desc"), limit(20));
        const querySnapshot = await getDocs(q);
        const fetchedPosts: Post[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedPosts.push({ 
            id: doc.id, 
            ...data,
            createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
            updatedAt: (data.updatedAt as Timestamp)?.toDate()?.toISOString() || undefined,
            likedBy: data.likedBy || [],
            authorUsername: data.authorUsername || "",
          } as Post);
        });
        setPosts(fetchedPosts);
      } catch (error) {
        console.error("Error fetching posts:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load posts." });
      } finally {
        setIsLoadingPosts(false);
      }
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setMediaFile(null);
      setMediaPreview(null);
    }
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; 
    }
  };

  const handleFilterChange = (newFilters: Record<string, boolean>) => {
    setFilters(newFilters);
  };
  
  const filteredPosts = posts.filter(post => {
    if (!filters.images && post.imageUrl) return false;
    if (!filters.videos && post.videoUrl) return false;
    if (!filters.textOnly && !post.imageUrl && !post.videoUrl) return false;
    return true;
  });

  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !mediaFile) {
      toast({ variant: "destructive", title: "Error", description: "Post content or media cannot be empty." });
      return;
    }
    if (!currentUser) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to post." });
      return;
    }
     if (!appUser) {
      toast({ 
        variant: "destructive", 
        title: "Profile Error", 
        description: "Your user profile data could not be loaded. This is needed to create a post. Please try refreshing the page or log in again." 
      });
      return;
    }

    setIsPosting(true);
    try {
      const postData: Omit<Post, 'id' | 'createdAt' | 'imageUrl' | 'videoUrl' | 'updatedAt'> & { createdAt: any; authorUsername?: string } = {
        authorId: currentUser.uid,
        authorName: appUser.name || "Anonymous",
        authorUsername: appUser.username,
        authorAvatarUrl: appUser.avatarUrl || `https://placehold.co/40x40.png?text=${(appUser.name || "A").substring(0,1)}`,
        content: newPostContent,
        likes: 0,
        likedBy: [], 
        comments: 0,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, "posts"), postData);
      let finalPostData: Post = { 
        ...postData, 
        id: docRef.id, 
        createdAt: new Date().toISOString(), 
        updatedAt: new Date().toISOString(),
        authorUsername: appUser.username,
      };

      if (mediaFile) {
        const formData = new FormData();
        formData.append('file', mediaFile);
        formData.append('type', 'post'); 

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          await deleteDoc(doc(db, "posts", docRef.id)); 
          throw new Error(errorData.error || 'Failed to upload media.');
        }
        const { url: downloadURL } = await uploadResponse.json();

        const updateData: Partial<Post> = {};
        if (mediaFile.type.startsWith('image/')) {
          updateData.imageUrl = downloadURL;
          finalPostData.imageUrl = downloadURL;
        } else if (mediaFile.type.startsWith('video/')) {
          updateData.videoUrl = downloadURL;
          finalPostData.videoUrl = downloadURL;
        }
        await updateDoc(doc(db, "posts", docRef.id), updateData);
      }
      
      setPosts(prevPosts => [finalPostData, ...prevPosts].sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())); 
      setNewPostContent('');
      removeMedia();
      toast({ title: "Post Created!", description: "Your post is live." });
    } catch (error) {
      console.error("Error creating post:", error);
      toast({ variant: "destructive", title: "Post Failed", description: `Could not create your post. ${(error as Error).message}` });
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostUpdate = (updatedPost: Post) => {
    setPosts(prevPosts => prevPosts.map(p => p.id === updatedPost.id ? updatedPost : p).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  };

  const handlePostDelete = (deletedPostId: string) => {
    setPosts(prevPosts => prevPosts.filter(p => p.id !== deletedPostId));
  };

  if (authInitialLoading) {
    return (
      <div className="flex h-[calc(100vh-15rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser && !authLoading) {
    return (
      <div className="container mx-auto max-w-3xl py-4 text-center">
        <p>Redirecting to login...</p> 
      </div>
    );
  }
  
  if (!currentUser) return null;

  return (
    <div className="container mx-auto max-w-3xl py-4">
      <h1 className="mb-6 text-3xl font-bold text-foreground">News Feed</h1>
      
      {/* Local Media Storage Notice Removed */}
      {/*
      <Alert variant="default" className="mb-6 bg-primary/10 border-primary/30">
        <AlertTriangle className="h-4 w-4 !text-primary/80" />
        <AlertTitle className="text-primary">Local Media Storage Notice</AlertTitle>
        <AlertDescription className="text-primary/90">
          Media files are stored locally. They may be lost on server restarts or redeployments if not using a persistent storage solution for production.
        </AlertDescription>
      </Alert>
      */}

      <Card className="mb-6 shadow-md">
        <CardContent className="p-4">
          <Textarea
            placeholder="What's on your mind?"
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="mb-2 min-h-[80px] resize-none rounded-md border p-2"
            disabled={isPosting || !appUser}
          />
          {mediaPreview && (
            <div className="relative mb-2 inline-block">
              {mediaFile?.type.startsWith('image/') && (
                <Image src={mediaPreview} alt="Media preview" width={100} height={100} className="h-24 w-24 rounded-md object-cover" />
              )}
              {mediaFile?.type.startsWith('video/') && (
                <video src={mediaPreview} controls className="h-24 w-auto rounded-md" />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-destructive/80 text-destructive-foreground hover:bg-destructive"
                onClick={removeMedia}
                aria-label="Remove media"
              >
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="mt-2 flex items-center justify-between">
            <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isPosting || !appUser}>
              <Paperclip className="h-5 w-5" />
              <span className="sr-only">Attach media</span>
            </Button>
            <Input 
              type="file" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*,video/*" 
              disabled={isPosting || !appUser}
            />
            <Button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !mediaFile) || isPosting || !appUser}>
              {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Send className="mr-2 h-4 w-4" /> Post
            </Button>
          </div>
           {!appUser && !authLoading && (
            <p className="mt-2 text-xs text-destructive">User profile data is not loaded. Posting is disabled.</p>
          )}
        </CardContent>
      </Card>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Recent Posts</h2>
        <FeedFilters onFilterChange={handleFilterChange} />
      </div>

      {isLoadingPosts ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : filteredPosts.length > 0 ? (
        filteredPosts.map(post => <PostCard key={post.id} post={post} onPostUpdate={handlePostUpdate} onPostDelete={handlePostDelete} />)
      ) : (
        <p className="text-center text-muted-foreground">No posts match your filters or no posts yet. Be the first to share!</p>
      )}
    </div>
  );
}
