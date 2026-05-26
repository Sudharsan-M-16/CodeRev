"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, FileCode2, Tag, Brain, Plus, Loader2 } from "lucide-react";
import "./command-palette.css";

type SearchResult = {
  id: string;
  type: "PROBLEM" | "TAG";
  title: string;
  relevance: number;
};

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const router = useRouter();

  // Toggle the menu when ⌘K is pressed
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Debounced Search
  React.useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.results) {
          setResults(data.results);
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  if (!open) return null;

  const problems = results.filter((r) => r.type === "PROBLEM");
  const tags = results.filter((r) => r.type === "TAG");

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] sm:pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm transition-opacity" 
        onClick={() => setOpen(false)}
      />

      <Command 
        className="relative z-50 w-full max-w-xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950 mx-4"
        loop
        shouldFilter={false} // We handle filtering server-side
      >
        <div className="flex items-center border-b border-zinc-200 px-3 dark:border-zinc-800">
          <Search className="mr-2 h-5 w-5 shrink-0 text-zinc-500" />
          <Command.Input 
            autoFocus 
            value={query}
            onValueChange={setQuery}
            className="flex h-12 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-zinc-500 dark:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Search problems, tags, or type a command..." 
          />
          {isLoading && <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />}
        </div>

        <Command.List className="max-h-[400px] overflow-y-auto overflow-x-hidden p-2">
          {query.length > 1 && !isLoading && results.length === 0 && (
            <Command.Empty className="py-6 text-center text-sm text-zinc-500">
              No results found for &quot;{query}&quot;.
            </Command.Empty>
          )}

          {problems.length > 0 && (
            <Command.Group heading="Problems" className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-2 py-1.5">
              {problems.map((prob) => (
                <Command.Item
                  key={`prob-${prob.id}`}
                  onSelect={() => runCommand(() => router.push(`/problems/${prob.id}`))}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/50"
                >
                  <FileCode2 className="mr-2 h-4 w-4 text-blue-500" />
                  <span>{prob.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {tags.length > 0 && (
            <Command.Group heading="Tags" className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-2 py-1.5">
              {tags.map((tag) => (
                <Command.Item
                  key={`tag-${tag.id}`}
                  onSelect={() => runCommand(() => router.push(`/tags/${tag.id}`))}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/50"
                >
                  <Tag className="mr-2 h-4 w-4 text-purple-500" />
                  <span>{tag.title}</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {results.length === 0 && (
            <>
              <Command.Group heading="Quick Actions" className="text-xs font-medium text-zinc-500 dark:text-zinc-400 px-2 py-1.5">
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/problems/new"))}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Create New Problem</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/drills"))}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/50"
                >
                  <Brain className="mr-2 h-4 w-4" />
                  <span>Start Drill Session</span>
                </Command.Item>
              </Command.Group>

              <Command.Group heading="Navigation" className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400 px-2 py-1.5">
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/problems"))}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/50"
                >
                  <FileCode2 className="mr-2 h-4 w-4" />
                  <span>View All Problems</span>
                </Command.Item>
                <Command.Item 
                  onSelect={() => runCommand(() => router.push("/tags"))}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800/50"
                >
                  <Tag className="mr-2 h-4 w-4" />
                  <span>Browse Algorithm Tags</span>
                </Command.Item>
              </Command.Group>
            </>
          )}
        </Command.List>
      </Command>
    </div>
  );
}
