import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Bold, Italic, Underline, List, ListOrdered, Heading2, Heading3,
  AlignRight, AlignCenter, AlignLeft, Link, Code, Undo2, Redo2, Type,
} from "lucide-react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  dir?: string;
  placeholder?: string;
}

export function RichTextEditor({ value, onChange, rows = 6, dir = "rtl", placeholder }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"visual" | "html">("visual");

  const execCommand = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    // Sync content
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  }, [onChange]);

  const handleHtmlChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/html") || e.clipboardData.getData("text/plain");
    document.execCommand("insertHTML", false, text);
    handleInput();
  }, [handleInput]);

  const insertLink = useCallback(() => {
    const url = prompt("הכנס כתובת URL:");
    if (url) {
      execCommand("createLink", url);
    }
  }, [execCommand]);

  const minHeight = Math.max(rows * 24, 120);

  return (
    <div className="border rounded-md overflow-hidden bg-background">
      <Tabs value={mode} onValueChange={(v) => setMode(v as "visual" | "html")}>
        <div className="flex items-center justify-between border-b bg-muted/30 px-1">
          {/* Toolbar */}
          <div className="flex items-center gap-0.5 flex-wrap py-1">
            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("bold")} aria-label="Bold">
              <Bold className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("italic")} aria-label="Italic">
              <Italic className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("underline")} aria-label="Underline">
              <Underline className="h-3.5 w-3.5" />
            </Toggle>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("formatBlock", "h2")} aria-label="H2">
              <Heading2 className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("formatBlock", "h3")} aria-label="H3">
              <Heading3 className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("formatBlock", "p")} aria-label="Paragraph">
              <Type className="h-3.5 w-3.5" />
            </Toggle>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("insertUnorderedList")} aria-label="Bullet list">
              <List className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("insertOrderedList")} aria-label="Numbered list">
              <ListOrdered className="h-3.5 w-3.5" />
            </Toggle>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("justifyRight")} aria-label="Align right">
              <AlignRight className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("justifyCenter")} aria-label="Align center">
              <AlignCenter className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("justifyLeft")} aria-label="Align left">
              <AlignLeft className="h-3.5 w-3.5" />
            </Toggle>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={insertLink} aria-label="Link">
              <Link className="h-3.5 w-3.5" />
            </Toggle>

            <Separator orientation="vertical" className="h-5 mx-0.5" />

            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("undo")} aria-label="Undo">
              <Undo2 className="h-3.5 w-3.5" />
            </Toggle>
            <Toggle size="sm" className="h-7 w-7 p-0" onPressedChange={() => execCommand("redo")} aria-label="Redo">
              <Redo2 className="h-3.5 w-3.5" />
            </Toggle>
          </div>

          <TabsList className="h-7 bg-transparent">
            <TabsTrigger value="visual" className="text-xs h-6 px-2">עורך</TabsTrigger>
            <TabsTrigger value="html" className="text-xs h-6 px-2 gap-1">
              <Code className="h-3 w-3" />HTML
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="visual" className="m-0">
          <div
            ref={editorRef}
            contentEditable
            dir={dir}
            className="prose prose-sm max-w-none p-3 focus:outline-none text-foreground overflow-y-auto"
            style={{ minHeight }}
            onInput={handleInput}
            onPaste={handlePaste}
            dangerouslySetInnerHTML={{ __html: value }}
            data-placeholder={placeholder}
          />
        </TabsContent>

        <TabsContent value="html" className="m-0">
          <textarea
            value={value}
            onChange={handleHtmlChange}
            dir="ltr"
            className="w-full p-3 font-mono text-xs bg-muted/20 text-foreground focus:outline-none resize-none"
            style={{ minHeight }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
