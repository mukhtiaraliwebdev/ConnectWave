"use client";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Copy, Image as ImageIcon, Share2, MessageSquare } from "lucide-react"; // Added MessageSquare for comments
import type { Post } from "@/types";

interface ShareOptionsProps {
  post: Post;
}

export function ShareOptions({ post }: ShareOptionsProps) {
  const { toast } = useToast();

  const handleCopyText = () => {
    navigator.clipboard.writeText(post.content)
      .then(() => toast({ title: "Content Copied!", description: "Post content copied to clipboard." }))
      .catch(() => toast({ title: "Error", description: "Failed to copy content.", variant: "destructive" }));
  };

  const handleGenerateImage = () => {
    toast({ title: "Feature Coming Soon", description: "Generating an image for sharing is not yet implemented." });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary">
          <Share2 className="h-5 w-5" />
          <span className="sr-only">Share Post</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleCopyText}>
          <Copy className="mr-2 h-4 w-4" />
          <span>Copy Text</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleGenerateImage}>
          <ImageIcon className="mr-2 h-4 w-4" />
          <span>Share as Image</span>
        </DropdownMenuItem>
        {/* Mock share to other platforms */}
        <DropdownMenuItem onClick={() => toast({title: "Mock Share", description: "Shared to Twitter (mock)"})}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 lucide lucide-twitter"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
          <span>Share to X (Twitter)</span>
        </DropdownMenuItem>
         <DropdownMenuItem onClick={() => toast({title: "Mock Share", description: "Shared to Facebook (mock)"})}>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 lucide lucide-facebook"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          <span>Share to Facebook</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
