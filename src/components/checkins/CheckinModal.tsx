import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CheckinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (comment: string) => Promise<void>;
}

export function CheckinModal({ open, onOpenChange, onSave }: CheckinModalProps) {
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    if (!comment.trim()) {
      toast({ title: 'Comment required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      await onSave(comment.trim());
      setComment('');
      onOpenChange(false);
      toast({ title: 'Comment added', variant: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save comment';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Check-in Comment</DialogTitle>
          <DialogDescription>
            Provide structured feedback on this achievement.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Comment</Label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe progress, blockers, or feedback..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Comment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
