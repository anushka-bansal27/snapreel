'use client';

import { useState, useEffect } from 'react';
import { useSettings } from '@/lib/settings-provider';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export function LicenseActivationPrompt() {
  const settings = useSettings();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // settings can be null initially while loading.
    // We show the prompt if isLicenseActive is explicitly false.
    // If it's undefined, we wait, as settings might still be loading or not set.
    if (settings && settings.isLicenseActive === false) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [settings]);

  // Don't render the dialog server-side, and don't show it if not triggered
  if (!showPrompt) {
    return null;
  }

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive" />
            License Activation Required
          </DialogTitle>
          <DialogDescription>
            Please activate your product license in the admin panel to ensure full functionality.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button asChild>
            <Link href="/admin/settings/general">Go to Admin Panel</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
