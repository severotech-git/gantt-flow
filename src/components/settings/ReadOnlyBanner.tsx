import { Lock } from 'lucide-react';

export function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground">
      <Lock size={12} className="shrink-0" />
      Only owners and admins can change this setting.
    </div>
  );
}
