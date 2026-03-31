'use client';

import { useRef, useState, useEffect } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (userIds: string[]) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  users: any[];
  placeholder?: string;
  maxLength?: number;
  rows?: number;
  className?: string;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
}

export function MentionTextarea({
  value,
  onChange,
  onMentionsChange,
  onKeyDown,
  users,
  placeholder = 'Write a comment...',
  maxLength,
  rows = 3,
  className,
  textareaRef: externalRef,
}: MentionTextareaProps) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const textareaRef = (externalRef as React.RefObject<HTMLTextAreaElement>) || internalRef;

  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);

  // Filter users for mention dropdown
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(mentionQuery.toLowerCase()) &&
      !mentionedUserIds.includes(u.uid)
  );

  // Handle text changes and detect @ mentions
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    onChange(text);

    // Detect if user is typing after @
    const lastAtIndex = text.lastIndexOf('@');
    const cursorPos = e.target.selectionStart;

    if (lastAtIndex !== -1 && lastAtIndex < cursorPos) {
      const textAfterAt = text.substring(lastAtIndex + 1, cursorPos);
      // Only show dropdown if they've typed something or just typed @
      if (textAfterAt.length < 20 && /^[\w]*$/.test(textAfterAt)) {
        setMentionQuery(textAfterAt);
        setMentionIndex(lastAtIndex);
        setShowMentionDropdown(true);
        return;
      }
    }

    setShowMentionDropdown(false);
  };

  // Insert mention
  const insertMention = (user: any) => {
    if (!textareaRef.current) return;

    const text = value;
    const beforeAt = text.substring(0, mentionIndex);
    const afterQuery = text.substring(mentionIndex + 1 + mentionQuery.length);

    const newText = `${beforeAt}@${user.name} ${afterQuery}`;
    onChange(newText);

    const newMentionedIds = [...mentionedUserIds, user.uid];
    setMentionedUserIds(newMentionedIds);
    onMentionsChange(newMentionedIds);

    setShowMentionDropdown(false);
    setMentionQuery('');

    // Focus textarea and move cursor
    setTimeout(() => {
      if (textareaRef && 'current' in textareaRef && textareaRef.current) {
        const newCursorPos = beforeAt.length + user.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown) {
      if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        e.preventDefault();
      }
      return;
    }

    // Call parent's onKeyDown if provided
    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        className={cn(
          'w-full px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring',
          className
        )}
        rows={rows}
      />

      {showMentionDropdown && filteredUsers.length > 0 && (
        <div className="absolute bottom-full left-0 mb-1 w-full bg-popover border border-border rounded-md shadow-md z-50 max-h-[200px] overflow-y-auto">
          {filteredUsers.map((user) => (
            <button
              key={user.uid}
              type="button"
              onClick={() => insertMention(user)}
              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors text-sm flex items-center gap-2"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                style={{ backgroundColor: user.color }}
              >
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span>{user.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
