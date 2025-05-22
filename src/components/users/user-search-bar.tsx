"use client";

import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface UserSearchBarProps {
  onSearch: (query: string) => void;
}

export function UserSearchBar({ onSearch }: UserSearchBarProps) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8 flex w-full max-w-xl items-center space-x-2 rounded-lg bg-card p-2 shadow-md">
      <Input
        type="text"
        placeholder="Search users by name or interest..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="flex-grow border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
      />
      <Button type="submit" size="icon" aria-label="Search users">
        <Search className="h-5 w-5" />
      </Button>
    </form>
  );
}
