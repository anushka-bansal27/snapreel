import { isAppInstalled } from '@/lib/data.actions';
import { redirect } from 'next/navigation';
import { InstallWizard } from '@/components/install-wizard';

export const dynamic = 'force-dynamic';

/**
 * Server Component for /install
 * Performs an immediate server-side check to prevent "flickering" 
 * if the app is already installed.
 */
export default async function InstallPage() {
    const installed = await isAppInstalled();

    if (installed) {
        // Instant redirect before any HTML is sent to the client
        redirect('/');
    }

    return <InstallWizard />;
}
