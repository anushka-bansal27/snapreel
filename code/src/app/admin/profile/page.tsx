import { AlertCircle } from 'lucide-react';

import { AdminProfileForm } from '@/components/admin/admin-profile-form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getAdminProfile } from '@/lib/data.actions';

export default async function AdminProfilePage() {
  const adminProfile = await getAdminProfile();

  if (!adminProfile) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Profile unavailable</AlertTitle>
        <AlertDescription>The admin profile could not be loaded. Please try again.</AlertDescription>
      </Alert>
    );
  }

  return <AdminProfileForm initialProfile={adminProfile} />;
}
