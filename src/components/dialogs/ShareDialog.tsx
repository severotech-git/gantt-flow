'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Copy, Check, X, Trash2 } from 'lucide-react';
import type { ISharedLink, IProjectSnapshot } from '@/types';
import { formatDistanceToNow } from 'date-fns';

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
}

type Mode = 'snapshot' | 'live';
type ExpiresIn = '1h' | '24h' | '7d' | '30d';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ShareDialog({ open, onClose, projectId }: ShareDialogProps) {
  const t = useTranslations('shareDialog');

  const [emails, setEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');
  const [mode, setMode] = useState<Mode>('live');
  const [expiresIn, setExpiresIn] = useState<ExpiresIn>('7d');
  const [snapshotId, setSnapshotId] = useState<string>('');
  const [snapshots, setSnapshots] = useState<IProjectSnapshot[]>([]);
  const [loadingSnapshots, setLoadingSnapshots] = useState(false);
  const [status, setStatus] = useState<'idle' | 'creating' | 'success' | 'error'>('idle');
  const [createdUrl, setCreatedUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeShares, setActiveShares] = useState<ISharedLink[]>([]);
  const [loadingShares, setLoadingShares] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  // Load active shares when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoadingShares(true);
    fetch(`/api/projects/${projectId}/shares`)
      .then((r) => r.json())
      .then((data) => setActiveShares(Array.isArray(data) ? data : []))
      .catch(() => setActiveShares([]))
      .finally(() => setLoadingShares(false));
  }, [open, projectId]);

  // Load snapshots when snapshot mode is selected
  useEffect(() => {
    if (mode !== 'snapshot') return;
    setLoadingSnapshots(true);
    fetch(`/api/projects/${projectId}/versions`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data as IProjectSnapshot[] : [];
        setSnapshots(list);
        // Auto-select first snapshot if none selected
        if (list.length > 0 && !snapshotId) {
          setSnapshotId(list[0]._id);
        }
      })
      .catch(() => setSnapshots([]))
      .finally(() => setLoadingSnapshots(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, projectId]);

  function addEmail() {
    const val = emailInput.trim().toLowerCase();
    if (!val) return;
    if (!EMAIL_RE.test(val)) {
      setEmailError(t('invalidEmail'));
      return;
    }
    if (emails.includes(val)) {
      setEmailInput('');
      return;
    }
    setEmails((prev) => [...prev, val]);
    setEmailInput('');
    setEmailError('');
  }

  function removeEmail(email: string) {
    setEmails((prev) => prev.filter((e) => e !== email));
  }

  const canCreate = emails.length > 0 && (mode === 'live' || (mode === 'snapshot' && !!snapshotId));

  async function handleCreate() {
    if (!canCreate) return;
    setStatus('creating');
    try {
      const body: Record<string, unknown> = { mode, emails, expiresIn };
      if (mode === 'snapshot') body.snapshotId = snapshotId;

      const res = await fetch(`/api/projects/${projectId}/shares`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setStatus('error');
        return;
      }
      const data = await res.json();
      setCreatedUrl(data.url);
      setStatus('success');
      // Refresh active shares list
      fetch(`/api/projects/${projectId}/shares`)
        .then((r) => r.json())
        .then((d) => setActiveShares(Array.isArray(d) ? d : []))
        .catch(() => {});
    } catch {
      setStatus('error');
    }
  }

  async function handleRevoke(shareId: string) {
    setRevokingId(shareId);
    try {
      await fetch(`/api/projects/${projectId}/shares/${shareId}`, { method: 'DELETE' });
      setActiveShares((prev) => prev.filter((s) => s._id !== shareId));
    } finally {
      setRevokingId(null);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(createdUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleClose() {
    setEmails([]);
    setEmailInput('');
    setEmailError('');
    setStatus('idle');
    setCreatedUrl('');
    setCopied(false);
    setSnapshotId('');
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selector */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('modeLabel')}</label>
            <div className="grid grid-cols-2 gap-2">
              {(['snapshot', 'live'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setStatus('idle'); setCreatedUrl(''); }}
                  className={cn(
                    'text-left p-3 rounded-lg border text-sm transition-colors',
                    mode === m
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/40'
                  )}
                >
                  <div className="font-medium">
                    {m === 'snapshot' ? t('modeSnapshot') : t('modeLive')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {m === 'snapshot' ? t('modeSnapshotDesc') : t('modeLiveDesc')}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Snapshot version picker */}
          {mode === 'snapshot' && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{t('snapshotLabel')}</label>
              {loadingSnapshots ? (
                <p className="text-xs text-muted-foreground">Loading versions...</p>
              ) : snapshots.length === 0 ? (
                <p className="text-xs text-destructive">{t('noSnapshots')}</p>
              ) : (
                <Select value={snapshotId} onValueChange={setSnapshotId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('snapshotPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((s) => (
                      <SelectItem key={s._id} value={s._id}>
                        {s.versionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Expiration */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('expirationLabel')}</label>
            <Select value={expiresIn} onValueChange={(v) => setExpiresIn(v as ExpiresIn)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['1h', '24h', '7d', '30d'] as ExpiresIn[]).map((v) => (
                  <SelectItem key={v} value={v}>
                    {t(`expirations.${v}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Email input */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">{t('emailsLabel')}</label>
            <div className="flex gap-2">
              <Input
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setEmailError(''); }}
                placeholder={t('emailPlaceholder')}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addEmail())}
              />
              <Button variant="outline" size="sm" onClick={addEmail}>
                {t('addEmail')}
              </Button>
            </div>
            {emailError && <p className="text-xs text-destructive mt-1">{emailError}</p>}
            {emails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {emails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1 pr-1">
                    {email}
                    <button onClick={() => removeEmail(email)} className="ml-0.5 hover:text-destructive">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Success state */}
          {status === 'success' && createdUrl && (
            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500 shrink-0" />
                <p className="text-sm font-medium">{t('shareSuccess')}</p>
              </div>
              <div className="flex gap-2">
                <Input value={createdUrl} readOnly className="text-xs font-mono bg-background" />
                <Button variant="outline" size="sm" onClick={handleCopy} className="shrink-0">
                  {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              {copied && <p className="text-xs text-muted-foreground">{t('linkCopied')}</p>}
            </div>
          )}

          {status === 'error' && (
            <p className="text-sm text-destructive">{t('shareError')}</p>
          )}

          {/* Create button – hidden after success */}
          {status !== 'success' && (
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={!canCreate || status === 'creating'}
            >
              {status === 'creating' ? t('creating') : t('createButton')}
            </Button>
          )}
        </div>

        {/* Active shares */}
        <div className="border-t border-border pt-4 mt-2">
          <h4 className="text-sm font-medium mb-3">{t('activeShares')}</h4>
          {loadingShares ? (
            <p className="text-xs text-muted-foreground">Loading...</p>
          ) : activeShares.length === 0 ? (
            <p className="text-xs text-muted-foreground">{t('noActiveShares')}</p>
          ) : (
            <div className="space-y-2">
              {activeShares.map((share) => (
                <div
                  key={share._id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {share.mode === 'snapshot' && share.snapshotName
                          ? share.snapshotName
                          : share.mode}
                      </Badge>
                      {share.emails.length > 0 && (
                        <span className="text-xs text-muted-foreground truncate">
                          {share.emails.slice(0, 2).join(', ')}
                          {share.emails.length > 2 ? ` +${share.emails.length - 2}` : ''}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t('expiresIn')} {formatDistanceToNow(new Date(share.expiresAt))}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRevoke(share._id)}
                    disabled={revokingId === share._id}
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
