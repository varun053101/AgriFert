import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Sprout,
  FlaskConical,
  TrendingUp,
  Brain,
  Calendar,
  Target,
  Activity,
  Thermometer,
  Droplets,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = [
  'hsl(142, 45%, 28%)',
  'hsl(42, 85%, 55%)',
  'hsl(25, 40%, 35%)',
  'hsl(200, 70%, 50%)',
  'hsl(280, 50%, 50%)',
  'hsl(10, 70%, 55%)',
];

// ─── Real response shape from stats.service.js ────────────────────────────────
interface AdminStats {
  totalSubmissions: number;
  totalUsers: number;
  cropDistribution: { name: string; value: number }[];
  fertilizerUsage: { name: string; usage: number }[];
  yieldTrends: { month: string; yield: number; count: number }[];
  modelMetrics: {
    modelVersion: string | null;
    predictions: number;
    accuracy: number | null;
    lastUpdate: string | null;
  };
  // Spread from averageSoilMetrics
  averageTemperature: number;
  averageHumidity: number;
  averageMoisture: number;
  averageNPK: { n: number; p: number; k: number };
  averageYieldImprovement: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
const StatCardSkeleton = () => (
  <Card variant="gradient">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </CardContent>
  </Card>
);

const DashboardSkeleton = () => (
  <Layout>
    <div className="container py-8 md:py-12">
      <div className="mb-8 space-y-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-5 w-96" />
      </div>
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {[300, 300].map((h, i) => (
          <Card key={i} variant="elevated">
            <CardContent className="p-6">
              <Skeleton className="w-full rounded-xl" style={{ height: h }} />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card variant="elevated">
          <CardContent className="p-6">
            <Skeleton className="w-full rounded-xl" style={{ height: 280 }} />
          </CardContent>
        </Card>
        <Card variant="elevated" className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="grid gap-6 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-xl bg-muted p-6 text-center space-y-3">
                  <Skeleton className="h-12 w-12 rounded-full mx-auto" />
                  <Skeleton className="h-8 w-20 mx-auto" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </Layout>
);

// ─── Main dashboard content ───────────────────────────────────────────────────
const DashboardContent = ({ stats }: { stats: AdminStats }) => {
  const statCards = [
    {
      title: 'Total Submissions',
      value: stats.totalSubmissions.toLocaleString(),
      icon: Users,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Registered Users',
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: 'bg-water/10 text-water',
    },
    {
      title: 'Avg NPK — Nitrogen',
      value: `${stats.averageNPK?.n ?? 0} kg/ha`,
      icon: Sprout,
      color: 'bg-success/10 text-success',
    },
    {
      title: 'Model Accuracy',
      value: stats.modelMetrics?.accuracy != null
        ? `${stats.modelMetrics.accuracy}%`
        : 'N/A',
      icon: Target,
      color: 'bg-accent/20 text-accent-foreground',
    },
  ];

  // Build "most popular crops" table from cropDistribution (sorted by value)
  const topCrops = [...(stats.cropDistribution ?? [])]
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);
  const totalCropCount = topCrops.reduce((s, c) => s + c.value, 0) || 1;

  const tooltipStyle = {
    backgroundColor: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: '8px',
  };

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-foreground md:text-4xl">
            Admin Dashboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Monitor farmer submissions and system performance
          </p>
        </div>

        {/* Overview Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <Card
              key={stat.title}
              variant="gradient"
              className="animate-fade-in"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Average Metrics Row */}
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Avg Temperature', value: `${stats.averageTemperature ?? 0}°C`, icon: Thermometer, color: 'text-warning' },
            { label: 'Avg Humidity', value: `${stats.averageHumidity ?? 0}%`, icon: Droplets, color: 'text-water' },
            { label: 'Avg Yield Improvement', value: `+${stats.averageYieldImprovement ?? 0}%`, icon: TrendingUp, color: 'text-success' },
          ].map((m) => (
            <Card key={m.label} variant="gradient" className="animate-fade-in">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <m.icon className={`h-5 w-5 ${m.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                    <p className="text-xl font-bold text-foreground">{m.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Fertilizer Usage */}
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FlaskConical className="h-5 w-5 text-primary" />
                Fertilizer Usage Frequency
              </CardTitle>
              <CardDescription>Most recommended fertilizer types</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.fertilizerUsage?.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.fertilizerUsage} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={90}
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="usage" fill="hsl(142, 45%, 28%)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground text-sm">No data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Yield Trends */}
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-success" />
                Yield Improvement Trends
              </CardTitle>
              <CardDescription>Monthly average yield improvements</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.yieldTrends?.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.yieldTrends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" />
                      <YAxis stroke="hsl(var(--muted-foreground))" />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line
                        type="monotone"
                        dataKey="yield"
                        stroke="hsl(142, 55%, 40%)"
                        strokeWidth={3}
                        dot={{ fill: 'hsl(142, 55%, 40%)', strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground text-sm">No trend data yet</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          {/* Crop Distribution Pie */}
          <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sprout className="h-5 w-5 text-primary" />
                Crop Distribution
              </CardTitle>
              <CardDescription>Percentage by crop type</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.cropDistribution?.length > 0 ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.cropDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.cropDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground text-sm">No data yet</p>
              )}
            </CardContent>
          </Card>

          {/* Model Monitoring */}
          <Card variant="elevated" className="lg:col-span-2 animate-fade-in" style={{ animationDelay: '0.7s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                Model Monitoring
              </CardTitle>
              <CardDescription>AI model performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-xl bg-muted p-6 text-center">
                  <div className="mb-2 flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-success/10">
                    <Target className="h-6 w-6 text-success" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {stats.modelMetrics?.accuracy != null ? `${stats.modelMetrics.accuracy}%` : '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">Model Accuracy</p>
                </div>
                <div className="rounded-xl bg-muted p-6 text-center">
                  <div className="mb-2 flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10">
                    <Activity className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {(stats.modelMetrics?.predictions ?? 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Predictions</p>
                </div>
                <div className="rounded-xl bg-muted p-6 text-center">
                  <div className="mb-2 flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-accent/20">
                    <Calendar className="h-6 w-6 text-accent-foreground" />
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {stats.modelMetrics?.lastUpdate
                      ? new Date(stats.modelMetrics.lastUpdate).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })
                      : '—'}
                  </p>
                  <p className="text-sm text-muted-foreground">Last Model Update</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Crops Table */}
        <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-primary" />
              Most Popular Crops
            </CardTitle>
            <CardDescription>Crops most frequently selected by farmers</CardDescription>
          </CardHeader>
          <CardContent>
            {topCrops.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 text-left font-semibold text-foreground">Rank</th>
                      <th className="pb-3 text-left font-semibold text-foreground">Crop</th>
                      <th className="pb-3 text-right font-semibold text-foreground">Count</th>
                      <th className="pb-3 text-right font-semibold text-foreground">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCrops.map((crop, index) => (
                      <tr key={crop.name} className="border-b last:border-0">
                        <td className="py-4">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-4 font-medium text-foreground capitalize">{crop.name}</td>
                        <td className="py-4 text-right text-muted-foreground">{crop.value.toLocaleString()}</td>
                        <td className="py-4 text-right text-muted-foreground">
                          {((crop.value / totalCropCount) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground text-sm">No crop data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

// ─── Admin Dashboard ──────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await adminApi.getStats();
      return res.data.data as AdminStats;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !data) {
    return (
      <Layout>
        <div className="container py-12 text-center space-y-2">
          <p className="text-lg font-semibold text-foreground">Failed to load dashboard</p>
          <p className="text-muted-foreground text-sm">Please check your connection and try refreshing.</p>
        </div>
      </Layout>
    );
  }

  return <DashboardContent stats={data} />;
};

export default AdminDashboard;
