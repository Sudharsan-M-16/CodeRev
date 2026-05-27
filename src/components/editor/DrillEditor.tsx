"use client";

import React, { useEffect, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import "highlight.js/styles/github-dark.css";
import { cn } from "@/lib/utils/cn";
import { useEditorTelemetry } from "@/hooks/useEditorTelemetry";
import { Bold, Italic, Code, Quote, List, Loader2 } from "lucide-react";

const lowlight = createLowlight(common);

interface DrillEditorProps {
  drillSessionId: string;
  initialContent?: string;
  className?: string;
}

/**
 * Replay-Linked Drill Editor
 * 
 * This is not a simple text box. This is a high-performance telemetry emitter.
 * Every keystroke is buffered and synced to the Event-Sourced Postgres schema via BullMQ.
 */
export function DrillEditor({ drillSessionId, initialContent = "", className }: DrillEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Placeholder.configure({
        placeholder: "Type '/' for commands, or just start writing your mental model...",
        emptyEditorClass: 'is-editor-empty',
      }),
      CodeBlockLowlight.configure({ lowlight }),
    ],
    content: initialContent,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[250px] p-4",
          "prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:p-4 prose-pre:rounded-md"
        ),
      },
    }
  });

  // Attach Telemetry Emitter (Flushes AST diffs every 3s)
  useEditorTelemetry(editor, { drillSessionId, flushIntervalMs: 3000 });

  if (!editor) {
    return (
      <div className="flex h-[250px] items-center justify-center border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-zinc-950">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
      </div>
    );
  }

  return (
    <div className={cn("border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-950 shadow-sm", className)}>
      {/* Minimal Floating Toolbar / Menu */}
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 p-1.5 px-3">
        <MenuButton isActive={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} icon={<Bold className="w-4 h-4" />} />
        <MenuButton isActive={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} icon={<Italic className="w-4 h-4" />} />
        <div className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />
        <MenuButton isActive={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} icon={<Code className="w-4 h-4" />} />
        <MenuButton isActive={editor.isActive("codeBlock")} onClick={() => editor.chain().focus().toggleCodeBlock().run()} icon={<span className="text-xs font-mono font-bold">{"</>"}</span>} />
        <div className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />
        <MenuButton isActive={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} icon={<List className="w-4 h-4" />} />
        <MenuButton isActive={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} icon={<Quote className="w-4 h-4" />} />
        
        <div className="flex-1" />
        <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Syncing to Timeline
        </span>
      </div>
      
      <div className="w-full relative">
        <EditorContent editor={editor} className="w-full" />
      </div>
    </div>
  );
}

function MenuButton({ icon, isActive, onClick }: { icon: React.ReactNode; isActive?: boolean; onClick: () => void; }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "p-1.5 rounded-md text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
        isActive && "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm"
      )}
    >
      {icon}
    </button>
  );
}
