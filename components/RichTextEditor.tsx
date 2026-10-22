"use client";

import { Fragment, useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  RemoveFormatting,
  Strikethrough,
  Underline,
  type LucideIcon,
} from "lucide-react";

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
}

interface RichTextEditorProps {
  ref?: Ref<RichTextEditorHandle>;
  id: string;
  labelledBy: string;
  initialHtml: string;
  placeholder: string;
  disabled?: boolean;
  onChange: (html: string) => void;
  onFocus?: () => void;
  /** Extra controls shown at the right end of the toolbar. */
  toolbarEnd?: ReactNode;
}

type Command =
  | "bold"
  | "italic"
  | "underline"
  | "strikeThrough"
  | "insertUnorderedList"
  | "insertOrderedList"
  | "justifyLeft"
  | "justifyCenter"
  | "justifyRight";

interface Tool {
  command: Command;
  label: string;
  icon: LucideIcon;
}

const TOOL_GROUPS: Tool[][] = [
  [
    { command: "bold", label: "Bold (⌘B)", icon: Bold },
    { command: "italic", label: "Italic (⌘I)", icon: Italic },
    { command: "underline", label: "Underline (⌘U)", icon: Underline },
    { command: "strikeThrough", label: "Strikethrough", icon: Strikethrough },
  ],
  [
    { command: "insertUnorderedList", label: "Bulleted list", icon: List },
    { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
  ],
  [
    { command: "justifyLeft", label: "Align left", icon: AlignLeft },
    { command: "justifyCenter", label: "Align centre", icon: AlignCenter },
    { command: "justifyRight", label: "Align right", icon: AlignRight },
  ],
];

const ALL_COMMANDS = TOOL_GROUPS.flat().map((t) => t.command);

const BLOCK_STYLES = [
  { value: "p", label: "Body" },
  { value: "h2", label: "Heading" },
  { value: "h3", label: "Subheading" },
];

const toolButton =
  "inline-flex size-8 items-center justify-center rounded-md text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg disabled:pointer-events-none disabled:opacity-50 aria-pressed:bg-surface-2 aria-pressed:text-fg";

function Divider() {
  return <span className="mx-1 h-5 w-px bg-border" aria-hidden />;
}

function isEmpty(el: HTMLElement) {
  return (el.textContent ?? "").trim() === "" && !el.querySelector("li");
}

// execCommand is deprecated but remains the only cross-browser way to drive
// contentEditable formatting with native undo/redo; it is supported everywhere.
function exec(command: string, value?: string) {
  document.execCommand(command, false, value);
}

export function RichTextEditor({
  ref,
  id,
  labelledBy,
  initialHtml,
  placeholder,
  disabled,
  onChange,
  onFocus,
  toolbarEnd,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRange = useRef<Range | null>(null);
  const [active, setActive] = useState<Command[]>([]);
  const [blockStyle, setBlockStyle] = useState("p");
  const [empty, setEmpty] = useState(!initialHtml);

  // Uncontrolled after mount: writing innerHTML on every render would move the caret.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = initialHtml;
    setEmpty(isEmpty(el));
  }, []);

  // Remember the caret so toolbar clicks and {{name}} inserts land where the user was typing.
  useEffect(() => {
    const onSelectionChange = () => {
      const el = editorRef.current;
      const selection = window.getSelection();
      if (!el || !selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!el.contains(range.commonAncestorContainer)) return;
      savedRange.current = range.cloneRange();
      setActive(ALL_COMMANDS.filter((c) => document.queryCommandState(c)));
      const block = String(document.queryCommandValue("formatBlock")).toLowerCase();
      setBlockStyle(block === "h2" || block === "h3" ? block : "p");
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  const emit = () => {
    const el = editorRef.current;
    if (!el) return;
    setEmpty(isEmpty(el));
    onChange(el.innerHTML);
  };

  const restoreSelection = () => {
    const el = editorRef.current;
    const selection = window.getSelection();
    if (!el || !selection) return;
    // Still typing in the editor: the live caret is the truth, not the saved copy.
    if (document.activeElement === el && selection.rangeCount && el.contains(selection.anchorNode)) return;
    el.focus();
    selection.removeAllRanges();
    if (savedRange.current) {
      selection.addRange(savedRange.current);
    } else {
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      selection.addRange(range);
    }
  };

  const run = (command: string, value?: string) => {
    restoreSelection();
    exec(command, value);
    emit();
  };

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => run("insertText", text),
  }));

  return (
    <div>
      <div
        role="toolbar"
        aria-label="Formatting"
        aria-controls={id}
        className="flex flex-wrap items-center gap-0.5 border-b border-border px-3 py-1.5"
      >
        <select
          aria-label="Paragraph style"
          value={blockStyle}
          disabled={disabled}
          onChange={(e) => run("formatBlock", `<${e.target.value}>`)}
          className="h-8 rounded-md bg-transparent pr-1 pl-2 text-sm text-fg transition-colors duration-150 hover:bg-surface-2 disabled:opacity-50"
        >
          {BLOCK_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {TOOL_GROUPS.map((group, i) => (
          <Fragment key={i}>
            <Divider />
            {group.map((tool) => (
              <button
                key={tool.command}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                aria-pressed={active.includes(tool.command)}
                disabled={disabled}
                className={toolButton}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => run(tool.command)}
              >
                <tool.icon className="size-4" aria-hidden />
              </button>
            ))}
          </Fragment>
        ))}

        <Divider />
        <button
          type="button"
          title="Clear formatting"
          aria-label="Clear formatting"
          disabled={disabled}
          className={toolButton}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => run("removeFormat")}
        >
          <RemoveFormatting className="size-4" aria-hidden />
        </button>

        {toolbarEnd && <div className="ml-auto pl-2">{toolbarEnd}</div>}
      </div>

      <div
        ref={editorRef}
        id={id}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelledBy}
        aria-disabled={disabled || undefined}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-empty={empty}
        data-placeholder={placeholder}
        onInput={emit}
        onFocus={onFocus}
        onPaste={(e) => {
          // Paste as plain text so Word/Docs styling doesn't leak into the email.
          e.preventDefault();
          exec("insertText", e.clipboardData.getData("text/plain"));
          emit();
        }}
        onDrop={(e) => {
          // Files dropped here are recipient lists; the compose window handles them.
          if (e.dataTransfer.files.length) e.preventDefault();
        }}
        className="rich-text min-h-[22rem] px-5 py-4 text-[15px] leading-relaxed text-fg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/30 focus-visible:ring-inset"
      />
    </div>
  );
}
