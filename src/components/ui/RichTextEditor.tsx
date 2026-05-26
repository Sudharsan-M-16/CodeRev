"use client";

import React, { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import { common, createLowlight } from "lowlight";
import "highlight.js/styles/github-dark.css";
import { 
  Bold, Italic, Strikethrough, Code, List, 
  ListOrdered, Quote, Undo, Redo 
} from "lucide-react";
import { cn } from "@/lib/utils/cn"; // Assumes you have a standard cn / tailwind-merge utility

// Setup syntax highlighting for code blocks
const lowlight = createLowlight(common);

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ content, onChange, placeholder = "Start typing...", className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We use the lowlight extension instead
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
    ],
    content,
    editorProps: {
      attributes: {
        class: cn(
          "prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[150px] p-4",
          "prose-pre:bg-zinc-900 prose-pre:text-zinc-100 prose-pre:p-4 prose-pre:rounded-md"
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync external content changes (e.g. initial load)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content, false);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn("border border-zinc-200 dark:border-zinc-800 rounded-md overflow-hidden bg-white dark:bg-zinc-950", className)}>
      <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-2">
        <MenuButton
          isActive={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
          icon={<Bold className="w-4 h-4" />}
        />
        <MenuButton
          isActive={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          icon={<Italic className="w-4 h-4" />}
        />
        <MenuButton
          isActive={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          icon={<Strikethrough className="w-4 h-4" />}
        />
        <div className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />
        <MenuButton
          isActive={editor.isActive("code")}
          onClick={() => editor.chain().focus().toggleCode().run()}
          icon={<Code className="w-4 h-4" />}
        />
        <MenuButton
          isActive={editor.isActive("codeBlock")}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          icon={<span className="text-xs font-mono font-bold">{"</>"}</span>}
        />
        <div className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-700 mx-1" />
        <MenuButton
          isActive={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          icon={<List className="w-4 h-4" />}
        />
        <MenuButton
          isActive={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          icon={<ListOrdered className="w-4 h-4" />}
        />
        <MenuButton
          isActive={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          icon={<Quote className="w-4 h-4" />}
        />
        <div className="flex-1" />
        <MenuButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          icon={<Undo className="w-4 h-4" />}
        />
        <MenuButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          icon={<Redo className="w-4 h-4" />}
        />
      </div>
      <EditorContent editor={editor} className="w-full" />
    </div>
  );
}

function MenuButton({ 
  icon, 
  isActive, 
  onClick, 
  disabled 
}: { 
  icon: React.ReactNode; 
  isActive?: boolean; 
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-1.5 rounded-md text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors",
        isActive && "bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {icon}
    </button>
  );
}
