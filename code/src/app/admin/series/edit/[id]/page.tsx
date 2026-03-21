import { getSeriesById } from '@/lib/data.actions';
import { SeriesForm } from '@/components/admin/series-form';
import { notFound } from 'next/navigation';

interface EditSeriesPageProps {
    params: Promise<{ id: string }>;
}

export default async function EditSeriesPage({ params }: EditSeriesPageProps) {
  const { id } = await params;
  
  if (!id) {
      notFound();
  }

  const series = await getSeriesById(id);

  if (!series) {
    notFound();
  }

  return (
      <div className="space-y-6">
          <SeriesForm series={series} />
      </div>
  );
}
