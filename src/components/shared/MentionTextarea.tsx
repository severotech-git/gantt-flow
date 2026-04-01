'use client';

import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import type { IUserConfig } from '@/types/index';

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onMentionsChange: (userIds: string[]) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  users: IUserConfig[];
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
  const [activeIndex, setActiveIndex] = useState(0);

  // Sync with parent: when parent clears pendingMentions (after comment submit), reset internal state
  const prevMentionsLengthRef = useRef<number | null>(null);
  const syncMentions = (ids: string[]) => {
    onMentionsChange(ids);
    // Parent is clearing (submitting a comment) - reset internal tracking when ids goes to 0 and we had mentions
    if (ids.length === 0 && prevMentionsLengthRef.current !== null && prevMentionsLengthRef.current > 0) {
      setMentionedUserIds([]);
    }
    prevMentionsLengthRef.current = ids.length;
  };

  // Filter users for mention dropdown
  const filteredUsers = users.filter((u) =>
    u.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Reset active index in the same render when the filtered list length changes
  const [trackedFilterLen, setTrackedFilterLen] = useState(filteredUsers.length);
  if (trackedFilterLen !== filteredUsers.length) {
    setTrackedFilterLen(filteredUsers.length);
    setActiveIndex(0);
  }

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
        setActiveIndex(0);
        return;
      }
    }

    setShowMentionDropdown(false);
  };

  // Insert mention
  const insertMention = (user: IUserConfig) => {
    if (!textareaRef.current) return;

    const text = value;
    const beforeAt = text.substring(0, mentionIndex);
    const afterQuery = text.substring(mentionIndex + 1 + mentionQuery.length);

    const newText = `${beforeAt}@${user.name} ${afterQuery}`;
    onChange(newText);

    const newMentionedIds = [...mentionedUserIds, user.uid];
    setMentionedUserIds(newMentionedIds);
    syncMentions(newMentionedIds);

    setShowMentionDropdown(false);
    setMentionQuery('');

    // Focus textarea and move cursor
    setTimeout(() => {
      const el = textareaRef?.current;
      if (el) {
        const newCursorPos = beforeAt.length + user.name.length + 2;
        el.focus();
        el.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation in dropdown
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && filteredUsers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filteredUsers.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        insertMention(filteredUsers[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionDropdown(false);
        e.preventDefault();
        return;
      }
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
          {filteredUsers.map((user, idx) => (
            <button
              key={user.uid}
              type="button"
              onClick={() => insertMention(user)}
              className={cn(
                'w-full text-left px-3 py-2 transition-colors text-sm flex items-center gap-2',
                idx === activeIndex
                  ? 'bg-muted'
                  : 'hover:bg-muted'
              )}
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
