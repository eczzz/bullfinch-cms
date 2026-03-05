import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Link from '@tiptap/extension-link';
import Youtube from '@tiptap/extension-youtube';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, Code, Code2,
  Heading1, Heading2, Heading3,
  List, ListOrdered,
  AlignLeft, AlignCenter, AlignRight,
  Quote, Minus, Table as TableIcon, Image as ImageIcon,
  Youtube as YoutubeIcon, Link as LinkIcon, Unlink,
  Type, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { useCMS } from '../provider';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: 'small' | 'medium' | 'large';
}

const heightMap = { small: '150px', medium: '250px', large: '350px' };

function ToolbarButton({ onClick, isActive = false, disabled = false, title, children }: {
  onClick: () => void; isActive?: boolean; disabled?: boolean; title: string; children: React.ReactNode;
}) {
  return (
    <button
      type="button" onClick={onClick} disabled={disabled} title={title}
      className={`bcms-p-1.5 bcms-rounded bcms-transition ${
        isActive ? 'bcms-bg-blue-100 bcms-text-blue-600' : 'bcms-text-gray-500 hover:bcms-bg-gray-100 hover:bcms-text-gray-700'
      } ${disabled ? 'bcms-opacity-40 bcms-cursor-not-allowed' : 'bcms-cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  value, onChange, placeholder = 'Start writing...', className = '', minHeight = 'medium',
}: RichTextEditorProps) {
  const { config } = useCMS();
  const [isHtmlMode, setIsHtmlMode] = useState(false);
  const [htmlSource, setHtmlSource] = useState(value);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const isSettingContent = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline, Superscript, Subscript, TextStyle,
      Color, Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Link.configure({ openOnClick: false }),
      Image.configure({ HTMLAttributes: { class: 'bcms-rounded-lg bcms-max-w-full bcms-h-auto' } }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Youtube.configure({ HTMLAttributes: { class: 'bcms-rounded-lg bcms-overflow-hidden' } }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content: value || '',
    onUpdate: ({ editor: ed }) => {
      if (!isSettingContent.current) onChange(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor || isHtmlMode) return;
    const currentHTML = editor.getHTML();
    if (value !== currentHTML) {
      isSettingContent.current = true;
      editor.commands.setContent(value || '', { emitUpdate: false });
      isSettingContent.current = false;
    }
  }, [value]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;

    if (config.storage) {
      try {
        const { url } = await config.storage.upload(file);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } catch (err) {
        console.error('Image upload failed:', err);
        alert('Failed to upload image');
      }
    } else {
      // Fallback: prompt for URL
      const url = prompt('Enter image URL:');
      if (url) editor.chain().focus().setImage({ src: url, alt: '' }).run();
    }
    if (imageInputRef.current) imageInputRef.current.value = '';
  }, [editor, config.storage]);

  const handleSetLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes('link').href || '';
    const url = prompt('Enter URL:', prev);
    if (url === null) return;
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const handleYouTubeEmbed = useCallback(() => {
    if (!editor) return;
    const url = prompt('Enter YouTube URL:');
    if (url) editor.commands.setYoutubeVideo({ src: url, width: 640, height: 360 });
  }, [editor]);

  const toggleHtmlMode = useCallback(() => {
    if (isHtmlMode) {
      onChange(htmlSource);
      if (editor) { isSettingContent.current = true; editor.commands.setContent(htmlSource, { emitUpdate: false }); isSettingContent.current = false; }
    } else {
      if (editor) setHtmlSource(editor.getHTML());
    }
    setIsHtmlMode(!isHtmlMode);
  }, [isHtmlMode, htmlSource, editor, onChange]);

  if (!editor) {
    return <div className="bcms-border bcms-border-gray-300 bcms-rounded-lg bcms-p-8 bcms-text-center bcms-text-gray-400">Loading editor...</div>;
  }

  if (isHtmlMode) {
    return (
      <div className={`bcms-tiptap-editor ${className}`}>
        <div className="bcms-border bcms-border-gray-300 bcms-rounded-lg bcms-overflow-hidden">
          <div className="bcms-bg-gray-50 bcms-border-b bcms-border-gray-300 bcms-px-3 bcms-py-2 bcms-flex bcms-items-center bcms-justify-between">
            <span className="bcms-text-xs bcms-font-medium bcms-text-gray-500">HTML Source</span>
            <button type="button" onClick={toggleHtmlMode} className="bcms-flex bcms-items-center bcms-gap-1.5 bcms-px-3 bcms-py-1 bcms-text-xs bcms-font-medium bcms-bg-blue-600 bcms-text-white bcms-rounded">
              <Code className="bcms-w-3.5 bcms-h-3.5" /> Visual
            </button>
          </div>
          <textarea value={htmlSource} onChange={(e) => { setHtmlSource(e.target.value); onChange(e.target.value); }} placeholder={placeholder} className="bcms-w-full bcms-px-4 bcms-py-3 bcms-font-mono bcms-text-sm bcms-bg-gray-50 bcms-text-gray-900 bcms-outline-none bcms-resize-y" style={{ minHeight: heightMap[minHeight] }} />
        </div>
      </div>
    );
  }

  return (
    <div className={`bcms-tiptap-editor ${className}`}>
      <div className="bcms-border bcms-border-gray-300 bcms-rounded-lg bcms-overflow-hidden focus-within:bcms-border-blue-500 focus-within:bcms-ring-2 focus-within:bcms-ring-blue-200 bcms-transition-all">
        {/* Toolbar */}
        <div className="bcms-bg-gray-50 bcms-border-b bcms-border-gray-300 bcms-px-2 bcms-py-1.5 bcms-flex bcms-flex-wrap bcms-items-center bcms-gap-0.5">
          {/* Headings */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Heading1 className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Heading2 className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <Heading3 className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>

          <div className="bcms-w-px bcms-h-6 bcms-bg-gray-300 bcms-mx-1" />

          {/* Formatting */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
            <Bold className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
            <Italic className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
            <UnderlineIcon className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>

          <div className="bcms-w-px bcms-h-6 bcms-bg-gray-300 bcms-mx-1" />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
            <List className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List">
            <ListOrdered className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>

          <div className="bcms-w-px bcms-h-6 bcms-bg-gray-300 bcms-mx-1" />

          {/* Alignment */}
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
            <AlignLeft className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
            <AlignCenter className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
            <AlignRight className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>

          <div className="bcms-w-px bcms-h-6 bcms-bg-gray-300 bcms-mx-1" />

          {/* Block elements */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">
            <Quote className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
            <Minus className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Block">
            <Code2 className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>

          <div className="bcms-w-px bcms-h-6 bcms-bg-gray-300 bcms-mx-1" />

          {/* Link */}
          <ToolbarButton onClick={handleSetLink} isActive={editor.isActive('link')} title="Insert Link">
            <LinkIcon className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          {editor.isActive('link') && (
            <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link">
              <Unlink className="bcms-w-4 bcms-h-4" />
            </ToolbarButton>
          )}

          <div className="bcms-w-px bcms-h-6 bcms-bg-gray-300 bcms-mx-1" />

          {/* Table */}
          {!editor.isActive('table') ? (
            <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
              <TableIcon className="bcms-w-4 bcms-h-4" />
            </ToolbarButton>
          ) : (
            <>
              <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column">
                <ArrowRight className="bcms-w-4 bcms-h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row">
                <ArrowDown className="bcms-w-4 bcms-h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table">
                <Trash2 className="bcms-w-4 bcms-h-4" />
              </ToolbarButton>
            </>
          )}

          <div className="bcms-w-px bcms-h-6 bcms-bg-gray-300 bcms-mx-1" />

          {/* Media */}
          <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Insert Image">
            <ImageIcon className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={handleYouTubeEmbed} title="Embed YouTube">
            <YoutubeIcon className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>

          <div className="bcms-flex-1" />

          {/* HTML toggle */}
          <ToolbarButton onClick={toggleHtmlMode} title="HTML Source">
            <Code className="bcms-w-4 bcms-h-4" />
          </ToolbarButton>
        </div>

        {/* Editor Content */}
        <EditorContent editor={editor} className="bcms-tiptap-content bcms-prose bcms-max-w-none" style={{ minHeight: heightMap[minHeight] }} />

        {/* Word count */}
        <div className="bcms-bg-gray-50 bcms-border-t bcms-border-gray-300 bcms-px-3 bcms-py-1.5 bcms-flex bcms-items-center bcms-gap-3 bcms-text-xs bcms-text-gray-400">
          <span>{editor.storage.characterCount.words()} words</span>
          <span>{editor.storage.characterCount.characters()} characters</span>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="bcms-hidden" />
    </div>
  );
}
