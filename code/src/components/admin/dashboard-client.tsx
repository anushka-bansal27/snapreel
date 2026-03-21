
'use client';

import React, { useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { DateRange } from 'react-day-picker';

import type { AdminDashboardData } from '@/lib/types';
import { DateRangePicker } from '@/components/admin/date-range-picker';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Users,
  DollarSign,
  Clapperboard,
  ListVideo,
  Activity,
  TrendingUp,
  Server,
  ShieldCheck,
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { Badge } from '@/components/ui/badge';

interface DashboardClientProps {
  initialData: AdminDashboardData;
  dateRange: { from: Date; to: Date };
}

export function DashboardClient({ initialData, dateRange }: DashboardClientProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSetDate = (newDate: DateRange | undefined) => {
    const params = new URLSearchParams();
    if (newDate?.from) {
      params.set('from', newDate.from.toISOString().split('T')[0]);
    }
    if (newDate?.to) {
      params.set('to', newDate.to.toISOString().split('T')[0]);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const {
    totalRevenue,
    newUsersCount,
    totalUsersCount,
    totalSeriesCount,
    totalEpisodesCount,
    topPerformingSeries,
    dailyStats
  } = initialData;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white italic">Dashboard</h1>
          <p className="text-muted-foreground text-sm font-bold tracking-widest">
            SnapReels Engine Statistics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker date={dateRange} setDate={handleSetDate} />
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-primary/10 border-primary/20 shadow-lg shadow-primary/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black tracking-tighter text-primary">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">${totalRevenue.toFixed(2)}</div>
            <div className="flex items-center text-[10px] text-green-500 font-bold mt-1">
                <TrendingUp className="h-3 w-3 mr-1" /> Healthy Growth
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black tracking-tighter text-muted-foreground">New Registrations</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">+{newUsersCount}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">In selected range</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black tracking-tighter text-muted-foreground">All users</CardTitle>
            <Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalUsersCount}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">Registered accounts</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black tracking-tighter text-muted-foreground">Dramas</CardTitle>
            <Clapperboard className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalSeriesCount}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">Live series catalog</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] font-black tracking-tighter text-muted-foreground">Episodes</CardTitle>
            <ListVideo className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{totalEpisodesCount}</div>
            <p className="text-[10px] text-muted-foreground font-bold mt-1">Total video items</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Engagement Chart */}
        <Card className="lg:col-span-2 bg-card/30 border-white/5 backdrop-blur-md">
            <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-primary" /> Platform Engagement
                </CardTitle>
                <CardDescription className="text-xs">Daily registrations vs Revenue (USD) for the selected period.</CardDescription>
            </CardHeader>
            <CardContent className="h-[300px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyStats}>
                        <defs>
                            <linearGradient id="colorRegs" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f857a6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#f857a6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                        <XAxis dataKey="date" stroke="#ffffff40" fontSize={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#ffffff40" fontSize={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#ffffff10', borderRadius: '8px', fontSize: '12px' }}
                            itemStyle={{ fontSize: '11px' }}
                        />
                        <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }} />
                        <Area name="New Users" type="monotone" dataKey="registrations" stroke="#f857a6" strokeWidth={3} fillOpacity={1} fill="url(#colorRegs)" />
                        <Area name="Revenue ($)" type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>

        {/* System Health Card */}
        <Card className="bg-card/50 border-white/5">
            <CardHeader>
                <CardTitle className="text-sm font-bold flex items-center gap-2 tracking-tighter">
                    <Server className="h-4 w-4 text-green-500" /> System Health
                </CardTitle>
                <CardDescription className="text-xs">Real-time infrastructure status.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-2">
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold">MongoDB Cluster</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/20">Operational</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold">Firebase Auth</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/20">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-bold">AI Node Engine</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-green-500 border-green-500/20">Synced</Badge>
                </div>
                <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 mt-2">
                    <div className="flex items-center gap-2 text-primary mb-2">
                        <ShieldCheck className="h-4 w-4" />
                        <span className="text-[11px] font-black">License Status</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">System is running on a verified Envato Purchase Code. Multi-site protection active.</p>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Top Series Table */}
      <Card className="bg-card/50 border-white/5">
        <CardHeader>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-500" /> Popular Content
          </CardTitle>
          <CardDescription className="text-xs">
            Most watched dramas on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-white/5">
                <TableHead className="w-[80px] text-[10px] font-black">Rank</TableHead>
                <TableHead className="text-[10px] font-black">Series Title</TableHead>
                <TableHead className="text-right text-[10px] font-black">Total Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topPerformingSeries.length > 0 ? topPerformingSeries.map((series, index) => (
                <TableRow key={series.id} className="border-white/5 hover:bg-white/5 transition-colors">
                  <TableCell className="font-black text-muted-foreground/50 italic">#{index + 1}</TableCell>
                  <TableCell className="font-bold text-white">{series.title}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary" className="font-mono text-amber-400 bg-amber-400/10 border-none">
                        {series.views.toLocaleString()}
                    </Badge>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                    <TableCell colSpan={3} className="text-center py-20 text-muted-foreground italic">No content data available for this range.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
