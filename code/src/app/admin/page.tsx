
import { MongoClient } from 'mongodb';
import { subDays, startOfDay, endOfDay, parseISO, eachDayOfInterval, format } from 'date-fns';
import { DashboardClient } from '@/components/admin/dashboard-client';
import type { AdminDashboardData, TopSeriesData, DailyStat } from '@/lib/types';
import { Suspense } from 'react';
import { Card, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export const dynamic = 'force-dynamic';

type AdminDashboardPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

async function getDashboardData(
  dateRange: { from: Date; to: Date }
): Promise<AdminDashboardData> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set.');
  }
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const db = client.db();

    const [
      newUsersCount,
      totalUsersCount,
      revenueData,
      totalSeriesCount,
      totalEpisodesCount,
      topSeriesDocs,
      dailyUsers,
      dailyRevenue
    ] = await Promise.all([
      db.collection('users').countDocuments({
        createdAt: { $gte: dateRange.from, $lte: dateRange.to },
      }),
      db.collection('users').countDocuments(),
      db
        .collection('purchases')
        .aggregate([
          { $match: { createdAt: { $gte: dateRange.from, $lte: dateRange.to } } },
          { $group: { _id: null, total: { $sum: '$price' } } },
        ])
        .toArray(),
      db.collection('series').countDocuments(),
      db.collection('episodes').countDocuments(),
      db.collection('series').find({}).sort({ views: -1 }).limit(10).toArray(),
      // Daily registrations
      db.collection('users').aggregate([
          { $match: { createdAt: { $gte: dateRange.from, $lte: dateRange.to } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
      ]).toArray(),
      // Daily revenue
      db.collection('purchases').aggregate([
          { $match: { createdAt: { $gte: dateRange.from, $lte: dateRange.to } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, total: { $sum: "$price" } } }
      ]).toArray()
    ]);

    const totalRevenue = revenueData[0]?.total || 0;
    
    const topPerformingSeries: TopSeriesData[] = topSeriesDocs.map((s: any) => ({
        id: s._id.toString(),
        title: s.title,
        views: s.views || 0,
        revenue: 0,
    }));

    // Generate full interval to ensure chart has all dates even if data is 0
    const interval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    const dailyStats: DailyStat[] = interval.map(date => {
        const dateStr = format(date, "yyyy-MM-dd");
        const userCount = dailyUsers.find(d => d._id === dateStr)?.count || 0;
        const revenueAmount = dailyRevenue.find(d => d._id === dateStr)?.total || 0;
        return {
            date: format(date, "MMM dd"),
            registrations: userCount,
            revenue: revenueAmount
        };
    });

    return {
      totalRevenue,
      newUsersCount,
      totalUsersCount,
      totalSeriesCount,
      totalEpisodesCount,
      engagementRate: 0,
      avgRevenuePerEpisode: 0,
      topPerformingSeries,
      dailyStats,
    };
  } catch (error) {
    console.error('Failed to fetch dashboard data from MongoDB:', error);
    return {
      totalRevenue: 0,
      newUsersCount: 0,
      totalUsersCount: 0,
      totalSeriesCount: 0,
      totalEpisodesCount: 0,
      engagementRate: 0,
      avgRevenuePerEpisode: 0,
      topPerformingSeries: [],
      dailyStats: [],
    };
  } finally {
    await client.close();
  }
}

function DashboardSkeleton() {
    return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-[490px]" />
        </div>
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="p-6"><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-8 w-24" /></Card>
            <Card className="p-6"><Skeleton className="h-5 w-24 mb-2" /><Skeleton className="h-8 w-16" /></Card>
            <Card className="p-6"><Skeleton className="h-5 w-24 mb-2" /><Skeleton className="h-8 w-16" /></Card>
            <Card className="p-6"><Skeleton className="h-5 w-28 mb-2" /><Skeleton className="h-8 w-16" /></Card>
            <Card className="p-6"><Skeleton className="h-5 w-32 mb-2" /><Skeleton className="h-8 w-16" /></Card>
      </div>
    </div>
    )
}

async function DashboardDataFetcher({ dateRange }: { dateRange: { from: Date; to: Date }}) {
    const data = await getDashboardData(dateRange);
    return <DashboardClient initialData={data} dateRange={dateRange} />;
}


export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const params = await searchParams;
  const fromStr = typeof params.from === 'string' ? params.from : null;
  const toStr = typeof params.to === 'string' ? params.to : null;

  const from = fromStr ? startOfDay(parseISO(fromStr)) : startOfDay(subDays(new Date(), 29));
  const to = toStr ? endOfDay(parseISO(toStr)) : endOfDay(new Date());
  const dateRange = { from, to };

  return (
    <Suspense fallback={<DashboardSkeleton />}>
        <DashboardDataFetcher dateRange={dateRange} />
    </Suspense>
  );
}
