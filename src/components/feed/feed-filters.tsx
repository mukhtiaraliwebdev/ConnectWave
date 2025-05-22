"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import { useState } from "react";

interface FeedFiltersProps {
  onFilterChange: (filters: Record<string, boolean>) => void;
}

export function FeedFilters({ onFilterChange }: FeedFiltersProps) {
  const [showImages, setShowImages] = useState(true);
  const [showVideos, setShowVideos] = useState(true);
  const [showTextOnly, setShowTextOnly] = useState(true);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<boolean>>, value: boolean, filterKey: string) => {
    setter(value);
    onFilterChange({
      images: filterKey === 'images' ? value : showImages,
      videos: filterKey === 'videos' ? value : showVideos,
      textOnly: filterKey === 'textOnly' ? value : showTextOnly,
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-1">
          <Filter className="h-4 w-4" />
          <span>Filter Feed</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Content Type</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem
          checked={showImages}
          onCheckedChange={(checked) => handleFilterChange(setShowImages, !!checked, 'images')}
        >
          Show Images
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showVideos}
          onCheckedChange={(checked) => handleFilterChange(setShowVideos, !!checked, 'videos')}
          disabled // Video support not fully implemented in PostCard
        >
          Show Videos (Soon)
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem
          checked={showTextOnly}
          onCheckedChange={(checked) => handleFilterChange(setShowTextOnly, !!checked, 'textOnly')}
        >
          Show Text-Only Posts
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
