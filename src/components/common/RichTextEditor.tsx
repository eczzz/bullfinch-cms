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
      className={`p-1.5 rounded transition-all duration-150 ${
        isActive
          ? 'bg-gray-200 text-blue-600'
          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
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
      Image.configure({ HTMLAttributes: { class: 'rounded-lg max-w-full h-auto' } }),
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Youtube.configure({ HTMLAttributes: { class: 'rounded-lg overflow-hidden' } }),
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
      editor.commands.setContent(value || '', false);
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
      if (editor) { isSettingContent.current = true; editor.commands.setContent(htmlSource, false); isSettingContent.current = false; }
    } else {
      if (editor) setHtmlSource(editor.getHTML());
    }
    setIsHtmlMode(!isHtmlMode);
  }, [isHtmlMode, htmlSource, editor, onChange]);

  if (!editor) {
    return (
      <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-400 text-sm">
        Loading editor...
      </div>
    );
  }

  if (isHtmlMode) {
    return (
      <div className={`tiptap-editor ${className}`}>
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
          <div className="bg-gray-50 border-b border-gray-200 px-3 py-2 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">HTML Source</span>
            <button
              type="button"
              onClick={toggleHtmlMode}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-all duration-150"
            >
              <Code className="w-3.5 h-3.5" /> Visual
            </button>
          </div>
          <textarea
            value={htmlSource}
            onChange={(e) => { setHtmlSource(e.target.value); onChange(e.target.value); }}
            placeholder={placeholder}
            className="w-full px-4 py-3 font-mono text-sm bg-white text-gray-900 outline-none resize-y border-0 focus:ring-0"
            style={{ minHeight: heightMap[minHeight] }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`tiptap-editor ${className}`}>
      <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all duration-150">
        {/* Toolbar */}
        <div className="bg-gray-50 border-b border-gray-200 px-2 py-1.5 flex flex-wrap items-center gap-0.5">
          {/* Headings */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} title="Heading 1">
            <Heading1 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} title="Heading 2">
            <Heading2 className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} title="Heading 3">
            <Heading3 className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Formatting */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} title="Bold">
            <Bold className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} title="Italic">
            <Italic className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} title="Underline">
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')} title="Strikethrough">
            <Strikethrough className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Lists */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} title="Bullet List">
            <List className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} title="Ordered List">
            <ListOrdered className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Alignment */}
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} title="Align Left">
            <AlignLeft className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} title="Align Center">
            <AlignCenter className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} title="Align Right">
            <AlignRight className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Block elements */}
          <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} isActive={editor.isActive('blockquote')} title="Blockquote">
            <Quote className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal Rule">
            <Minus className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()} isActive={editor.isActive('codeBlock')} title="Code Block">
            <Code2 className="w-4 h-4" />
          </ToolbarButton>

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Link */}
          <ToolbarButton onClick={handleSetLink} isActive={editor.isActive('link')} title="Insert Link">
            <LinkIcon className="w-4 h-4" />
          </ToolbarButton>
          {editor.isActive('link') && (
            <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()} title="Remove Link">
              <Unlink className="w-4 h-4" />
            </ToolbarButton>
          )}

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Table */}
          {!editor.isActive('table') ? (
            <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} title="Insert Table">
              <TableIcon className="w-4 h-4" />
            </ToolbarButton>
          ) : (
            <>
              <ToolbarButton onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add Column">
                <ArrowRight className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().addRowAfter().run()} title="Add Row">
                <ArrowDown className="w-4 h-4" />
              </ToolbarButton>
              <ToolbarButton onClick={() => editor.chain().focus().deleteTable().run()} title="Delete Table">
                <Trash2 className="w-4 h-4" />
              </ToolbarButton>
            </>
          )}

          <div className="w-px h-5 bg-gray-200 mx-1" />

          {/* Media */}
          <ToolbarButton onClick={() => imageInputRef.current?.click()} title="Insert Image">
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
          <ToolbarButton onClick={handleYouTubeEmbed} title="Embed YouTube">
            <YoutubeIcon className="w-4 h-4" />
          </ToolbarButton>

          <div className="flex-1" />

          {/* HTML toggle */}
          <ToolbarButton onClick={toggleHtmlMode} title="HTML Source">
            <Code className="w-4 h-4" />
          </ToolbarButton>
        </div>

        {/* Editor Content */}
        <div className="bg-white">
          <EditorContent editor={editor} className="tiptap-content prose max-w-none" style={{ minHeight: heightMap[minHeight] }} />
        </div>

        {/* Word count */}
        <div className="bg-gray-50 border-t border-gray-200 px-3 py-1.5 flex items-center gap-3 text-xs text-gray-400">
          <span>{editor.storage.characterCount.words()} words</span>
          <span>{editor.storage.characterCount.characters()} characters</span>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
    </div>
  );
}
