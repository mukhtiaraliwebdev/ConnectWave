
"use client";

import Image from 'next/image';
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, MessageSquare, Send, Loader2, MoreHorizontal, Edit3, Trash2, Save, CornerUpLeft, X } from "lucide-react";
import type { Post, Comment as CommentType } from "@/types";
import { formatDistanceToNow } from 'date-fns';
import { ShareOptions } from './share-options';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, increment, collection, addDoc, serverTimestamp, query, orderBy, getDocs, Timestamp, deleteDoc } from 'firebase/firestore';
import { useState, useEffect, useMemo } from 'react';
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogClose,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';

interface PostCardProps {
  post: Post;
  onPostUpdate?: (updatedPost: Post) => void;
  onPostDelete?: (postId: string) => void;
}

export function PostCard({ post: initialPost, onPostUpdate, onPostDelete }: PostCardProps) {
  const { currentUser, appUser } = useAuth();
  const { toast } = useToast();
  
  const [post, setPost] = useState<Post>(initialPost);
  const [isLiking, setIsLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [modalMediaUrl, setModalMediaUrl] = useState<string | null>(null);
  const [modalMediaType, setModalMediaType] = useState<'image' | 'video' | null>(null);

  const [replyingToCommentInfo, setReplyingToCommentInfo] = useState<{ id: string; authorName: string; rootParentId: string | null } | null>(null);


  useEffect(() => {
    setPost(initialPost);
    if (isEditing) {
      setEditedContent(initialPost.content);
    }
  }, [initialPost, isEditing]);
  
  const authorDisplayName = post.authorName || "Unknown User";
  const authorUsernameDisplay = post.authorUsername ? `@${post.authorUsername}` : "";
  const authorAvatarUrl = post.authorAvatarUrl || "https://placehold.co/40x40.png";
  const avatarFallback = authorDisplayName.substring(0, 2).toUpperCase();

  const hasLiked = currentUser ? post.likedBy?.includes(currentUser.uid) : false;
  const isAuthor = currentUser ? currentUser.uid === post.authorId : false;

  const handleLikeToggle = async () => {
    if (!currentUser || !appUser || isLiking) return;
    setIsLiking(true);
    const postRef = doc(db, "posts", post.id);
    const wasLiked = hasLiked; 

    try {
      let updatedLikedBy: string[];
      let updatedLikes: number;
      if (wasLiked) {
        updatedLikedBy = post.likedBy.filter(uid => uid !== currentUser.uid);
        updatedLikes = Math.max(0, post.likes - 1);
        await updateDoc(postRef, { likes: increment(-1), likedBy: arrayRemove(currentUser.uid) });
      } else {
        updatedLikedBy = [...(post.likedBy || []), currentUser.uid];
        updatedLikes = (post.likes || 0) + 1;
        await updateDoc(postRef, { likes: increment(1), likedBy: arrayUnion(currentUser.uid) });

        if (post.authorId !== currentUser.uid) {
          const notificationsRef = collection(db, "notifications");
          await addDoc(notificationsRef, {
            recipientId: post.authorId,
            senderId: currentUser.uid,
            senderName: appUser.name || "A user",
            senderAvatarUrl: appUser.avatarUrl || "",
            type: 'like',
            postId: post.id,
            postContentPreview: post.content.substring(0, 50) + (post.content.length > 50 ? "..." : ""),
            read: false,
            createdAt: serverTimestamp(),
          });
        }
      }
      const updatedPostState = { ...post, likedBy: updatedLikedBy, likes: updatedLikes };
      setPost(updatedPostState);
      if (onPostUpdate) onPostUpdate(updatedPostState);
    } catch (error) {
      console.error("Error toggling like:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not update like." });
    } finally {
      setIsLiking(false);
    }
  };

  const fetchComments = async () => {
    if (!post.id) return;
    setIsLoadingComments(true);
    try {
      const commentsRef = collection(db, "posts", post.id, "comments");
      const q = query(commentsRef, orderBy("createdAt", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedComments: CommentType[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedComments.push({ 
          id: docSnap.id, 
          ...data,
          createdAt: (data.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as CommentType);
      });
      setComments(fetchedComments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load comments." });
    } finally {
      setIsLoadingComments(false);
    }
  };

  useEffect(() => {
    if (showComments && post.id) { 
      fetchComments();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showComments, post.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !appUser || !newComment.trim() || isPostingComment) return;
    setIsPostingComment(true);

    const postRef = doc(db, "posts", post.id);
    const commentsColRef = collection(db, "posts", post.id, "comments");
    const trimmedComment = newComment.trim();

    try {
      const commentData: Omit<CommentType, 'id' | 'createdAt'> & { createdAt: any; parentId?: string | null; replyingToUsername?: string; } = {
        authorId: currentUser.uid,
        authorName: appUser.name || "Anonymous",
        authorAvatarUrl: appUser.avatarUrl || `https://placehold.co/32x32.png?text=${(appUser.name || "A").substring(0,1)}`,
        text: trimmedComment,
        createdAt: serverTimestamp(),
      };

      if (replyingToCommentInfo) {
        commentData.parentId = replyingToCommentInfo.rootParentId || replyingToCommentInfo.id; // Use rootParentId if available (meaning replying to a reply), else the direct comment's ID
        commentData.replyingToUsername = replyingToCommentInfo.authorName;
      } else {
        commentData.parentId = null; 
        // replyingToUsername will be omitted naturally if replyingToCommentInfo is null
      }
      
      const newCommentDoc = await addDoc(commentsColRef, commentData);
      await updateDoc(postRef, { comments: increment(1) });

      if (post.authorId !== currentUser.uid) {
        const notificationsRef = collection(db, "notifications");
        await addDoc(notificationsRef, {
          recipientId: post.authorId,
          senderId: currentUser.uid,
          senderName: appUser.name || "A user",
          senderAvatarUrl: appUser.avatarUrl || "",
          type: 'comment',
          postId: post.id,
          postContentPreview: post.content.substring(0, 50) + (post.content.length > 50 ? "..." : ""),
          commentTextPreview: trimmedComment.substring(0, 50) + (trimmedComment.length > 50 ? "..." : ""),
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      const addedComment: CommentType = {
        ...commentData,
        id: newCommentDoc.id,
        createdAt: new Date().toISOString(),
      };
      setComments(prevComments => [...prevComments, addedComment].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      const updatedPostState = { ...post, comments: (post.comments || 0) + 1 };
      setPost(updatedPostState);
      if (onPostUpdate) onPostUpdate(updatedPostState);
      setNewComment('');
      setReplyingToCommentInfo(null);
      toast({ title: replyingToCommentInfo ? "Reply Added!" : "Comment Added!" });
    } catch (error) {
      console.error("Error adding comment/reply:", error);
      toast({ variant: "destructive", title: "Error", description: `Could not add comment/reply. ${(error as Error).message}` });
    } finally {
      setIsPostingComment(false);
    }
  };

  const handleEditPost = () => {
    setIsEditing(true);
    setEditedContent(post.content);
  };

  const handleSaveEdit = async () => {
    if (!currentUser || !isAuthor || isSavingEdit) return;
    if (editedContent.trim() === "" || editedContent.trim() === post.content) {
      setIsEditing(false);
      if(editedContent.trim() === "") toast({ variant: "destructive", title: "Error", description: "Post content cannot be empty." });
      return;
    }
    setIsSavingEdit(true);
    const postRef = doc(db, "posts", post.id);
    try {
      const updateData: Partial<Post> = { content: editedContent.trim(), updatedAt: serverTimestamp() };
      await updateDoc(postRef, updateData);
      
      const updatedPostState = { ...post, content: editedContent.trim(), updatedAt: new Date().toISOString() };
      setPost(updatedPostState);
      if (onPostUpdate) onPostUpdate(updatedPostState);
      setIsEditing(false);
      toast({ title: "Post Updated", description: "Your post has been successfully updated." });
    } catch (error) {
      console.error("Error updating post:", error);
      toast({ variant: "destructive", title: "Update Failed", description: `Could not update your post. ${(error as Error).message}` });
    } finally {
      setIsSavingEdit(false);
    }
  };
  const handleCancelEdit = () => setIsEditing(false);

  const handleDeletePost = async () => {
    if (!isAuthor) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You can only delete your own posts." });
      return;
    }
    setIsDeleting(true);
    let mediaDeletedBackend = true; 
  
    try {
      if (post.imageUrl || post.videoUrl) {
        const mediaPath = post.imageUrl || post.videoUrl;
        if (mediaPath && mediaPath.startsWith('/')) { 
          try {
            const deleteResponse = await fetch('/api/delete-media', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filePath: mediaPath }),
            });
            if (!deleteResponse.ok) {
              const errorData = await deleteResponse.json();
              console.warn("Failed to delete media from server:", errorData.error || deleteResponse.statusText);
              toast({ variant: "destructive", title: "Media Deletion Issue", description: `Could not delete associated media: ${errorData.error || deleteResponse.statusText}. The post will still be deleted.` });
              mediaDeletedBackend = false; 
            }
          } catch (apiError) {
             console.warn("API error deleting media:", apiError);
             toast({ variant: "destructive", title: "Media Deletion API Error", description: `Error calling delete media API. The post will still be deleted.` });
             mediaDeletedBackend = false; 
          }
        }
      }
  
      await deleteDoc(doc(db, "posts", post.id));
      toast({ title: "Post Deleted", description: "Your post has been successfully deleted." + (!mediaDeletedBackend ? " Media deletion encountered an issue." : "") });
      if (onPostDelete) onPostDelete(post.id);
  
    } catch (error) { 
      console.error("Error deleting post from Firestore:", error);
      toast({ variant: "destructive", title: "Delete Failed", description: `Could not delete your post from Firestore. ${(error as Error).message}` });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMediaClick = (url: string, type: 'image' | 'video') => {
    setModalMediaUrl(url);
    setModalMediaType(type);
    setIsMediaModalOpen(true);
  };

  const commentsToDisplay = useMemo(() => {
    const topLevelComments = comments.filter(comment => !comment.parentId);
    const repliesMap = comments.reduce((acc, comment) => {
      if (comment.parentId) {
        if (!acc[comment.parentId]) {
          acc[comment.parentId] = [];
        }
        acc[comment.parentId].push(comment);
      }
      return acc;
    }, {} as Record<string, CommentType[]>);

    return topLevelComments.map(comment => ({
      ...comment,
      replies: (repliesMap[comment.id] || []).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }));
  }, [comments]);

  const renderComment = (comment: CommentType & { replies?: CommentType[] }, isReply = false, rootParentId: string | null = null) => (
    <div key={comment.id} className={cn("flex items-start gap-2", isReply && "ml-6 mt-2")}>
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.authorAvatarUrl} alt={comment.authorName} data-ai-hint="profile avatar small" />
        <AvatarFallback>{comment.authorName?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
      </Avatar>
      <div className="flex-1 rounded-md bg-muted/50 p-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">{comment.authorName}</p>
          <p className="text-xs text-muted-foreground">
            {comment.createdAt ? formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true }) : 'Just now'}
          </p>
        </div>
        <p className="text-sm text-foreground">
          {comment.replyingToUsername && isReply && <span className="font-medium text-primary">@{comment.replyingToUsername} </span>}
          {comment.text}
        </p>
        <div className="mt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-0 text-xs text-muted-foreground hover:text-primary"
            onClick={() => {
                // If this comment (comment.id) is a reply, its rootParentId is its own parentId.
                // If this comment is top-level, its rootParentId for its replies will be its own id.
                const effectiveRootParentId = comment.parentId || comment.id;
                setReplyingToCommentInfo({ id: comment.id, authorName: comment.authorName, rootParentId: effectiveRootParentId });
                setShowComments(true); 
            }}
            disabled={!currentUser}
          >
            <CornerUpLeft className="mr-1 h-3 w-3" /> Reply
          </Button>
        </div>
        {comment.replies && comment.replies.map(reply => renderComment(reply, true, comment.id))}
      </div>
    </div>
  );


  return (
    <>
      <Card className="mb-6 overflow-hidden rounded-lg shadow-lg transition-shadow hover:shadow-xl">
        <CardHeader className="flex flex-row items-start justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={authorAvatarUrl} alt={authorDisplayName} data-ai-hint="profile avatar" />
              <AvatarFallback>{avatarFallback}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-card-foreground">{authorDisplayName}</p>
              <p className="text-xs text-muted-foreground">
                {authorUsernameDisplay && <span className="mr-1">{authorUsernameDisplay}</span>}
                &middot; {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : 'Just now'}
                {post.updatedAt && post.updatedAt !== post.createdAt && (
                  <span className="italic text-muted-foreground/80"> (edited)</span>
                )}
              </p>
            </div>
          </div>
          {isAuthor && !isEditing && (
            <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Post options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleEditPost}>
                    <Edit3 className="mr-2 h-4 w-4" />
                    Edit Post
                  </DropdownMenuItem>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Post
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your post and any associated media.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </CardHeader>
        <CardContent className="p-4 pt-0">
          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="min-h-[100px] w-full resize-none rounded-md border p-2"
                disabled={isSavingEdit}
                placeholder="Edit your post..."
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCancelEdit} disabled={isSavingEdit}>Cancel</Button>
                <Button onClick={handleSaveEdit} disabled={isSavingEdit || editedContent.trim() === "" || editedContent.trim() === post.content}>
                  {isSavingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <p className="mb-4 whitespace-pre-wrap text-card-foreground">{post.content}</p>
          )}
          {!isEditing && post.imageUrl && (
            <div 
                className="relative mb-4 aspect-video w-full overflow-hidden rounded-md cursor-pointer"
                onClick={() => post.imageUrl && handleMediaClick(post.imageUrl, 'image')}
            >
              <Image 
                src={post.imageUrl} 
                alt="Post image" 
                fill 
                className="object-contain"
                data-ai-hint="social media content"
                unoptimized={post.imageUrl.startsWith('/')} 
              />
            </div>
          )}
          {!isEditing && post.videoUrl && (
            <div 
                className="relative mt-2 aspect-video w-full overflow-hidden rounded-md cursor-pointer"
                onClick={() => post.videoUrl && handleMediaClick(post.videoUrl, 'video')}
            >
              <video 
                src={post.videoUrl} 
                className="h-full w-full object-contain"
                data-ai-hint="social media video" 
                onClick={(e) => e.stopPropagation()}
                onPlay={(e) => e.stopPropagation()}
                onPause={(e) => e.stopPropagation()}
                controls
                />
            </div>
          )}
        </CardContent>
        {!isEditing && (
          <CardFooter className="flex flex-col items-start gap-2 border-t p-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`flex items-center gap-1 text-muted-foreground hover:text-primary ${hasLiked ? 'text-primary' : ''}`}
                  onClick={handleLikeToggle}
                  disabled={isLiking || !currentUser}
                >
                  {isLiking ? <Loader2 className="h-5 w-5 animate-spin" /> : <ThumbsUp className={`h-5 w-5 ${hasLiked ? 'fill-current' : ''}`} />}
                  <span>{post.likes || 0}</span>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>{post.comments || 0}</span>
                </Button>
              </div>
              <ShareOptions post={post} />
            </div>
            {showComments && (
              <div className="mt-4 w-full space-y-3 border-t pt-4">
                {isLoadingComments ? (
                  <div className="flex justify-center"> <Loader2 className="h-6 w-6 animate-spin text-primary" /> </div>
                ) : commentsToDisplay.length > 0 ? (
                  commentsToDisplay.map(comment => renderComment(comment, false, comment.id)) // Pass comment.id as rootParentId for top-level comments
                ) : (
                  <p className="text-sm text-muted-foreground">No comments yet. Be the first to comment!</p>
                )}
                {currentUser && (
                  <form onSubmit={handleAddComment} className="mt-4 flex flex-col gap-2">
                    {replyingToCommentInfo && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Replying to <span className="font-semibold text-primary">@{replyingToCommentInfo.authorName}</span></span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 text-destructive hover:text-destructive"
                          onClick={() => setReplyingToCommentInfo(null)}
                        >
                          <X className="mr-1 h-3 w-3" /> Cancel Reply
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                          <AvatarImage src={appUser?.avatarUrl || undefined} alt={appUser?.name} data-ai-hint="profile avatar self" />
                          <AvatarFallback>{appUser?.name?.substring(0,1).toUpperCase() || 'Y'}</AvatarFallback>
                      </Avatar>
                      <Input
                        type="text"
                        placeholder={replyingToCommentInfo ? "Write your reply..." : "Write a comment..."}
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="flex-grow"
                        disabled={isPostingComment}
                      />
                      <Button type="submit" size="icon" disabled={isPostingComment || !newComment.trim()}>
                        {isPostingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </CardFooter>
        )}
      </Card>

      <Dialog open={isMediaModalOpen} onOpenChange={setIsMediaModalOpen}>
        <DialogContent className="max-w-3xl p-2 sm:p-4 md:max-w-5xl lg:max-w-7xl xl:max-w-[90vw] h-auto max-h-[90vh] flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
          <DialogHeader className="w-full">
            <DialogTitle className="text-left sr-only">Media View</DialogTitle>
            <DialogClose className="absolute right-2 top-2 rounded-full p-1.5 bg-background/50 hover:bg-background text-foreground hover:text-destructive z-10">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
            </DialogClose>
          </DialogHeader>
          {modalMediaUrl && modalMediaType === 'image' && (
            <Image
              src={modalMediaUrl}
              alt="Full screen post image"
              width={1920}
              height={1080}
              className="max-h-[85vh] w-auto rounded-md object-contain"
              unoptimized={modalMediaUrl.startsWith('/')}
              data-ai-hint="gallery image"
            />
          )}
          {modalMediaUrl && modalMediaType === 'video' && (
            <video
              src={modalMediaUrl}
              controls
              autoPlay
              className="max-h-[85vh] w-auto rounded-md object-contain"
              data-ai-hint="gallery video"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
