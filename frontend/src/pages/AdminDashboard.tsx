import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
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
  CheckCircle,
  Clock,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { adminApi, verificationApi, type PendingVerification } from '@/lib/api';
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
  continuousLearning: {
    totalVerified: number;
    verifiedSinceLastRetrain: number;
    retrainThreshold: number;
    pendingVerifications: number;
  };
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

// ─── Pending Verifications Table ─────────────────────────────────────────────
const PendingVerificationsSection = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-pending-verifications', page],
    queryFn: async () => {
      const res = await verificationApi.getPending(page, 10);
      return res.data.data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (id: string) => verificationApi.verify(id),
    onSuccess: () => {
      toast({ title: 'Prediction verified ✓', description: 'Record saved for continuous learning.' });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: () => toast({ title: 'Verification failed', variant: 'destructive' }),
  });

  const predictions = data?.predictions ?? [];
  const pagination  = data?.pagination;

  return (
    <Card variant="elevated" className="animate-fade-in" style={{ animationDelay: '0.9s' }}>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
            <ShieldCheck className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <CardTitle>Pending Verifications</CardTitle>
            <CardDescription>Review and verify farmer predictions to improve the model</CardDescription>
          </div>
        </div>
        {pagination && pagination.totalPages > 1 && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            Page {pagination.page} / {pagination.totalPages}
          </span>
        )}
      </CardHeader>
      <Separator />

      {isLoading ? (
        <div className="space-y-2 p-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : predictions.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-center">
          <CheckCircle className="h-10 w-10 text-success" />
          <p className="font-semibold text-foreground">All caught up!</p>
          <p className="text-sm text-muted-foreground">No pending predictions to verify.</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 p-4 md:hidden">
            {predictions.map((p: PendingVerification) => (
              <div key={p._id} className="rounded-xl border border-border/60 bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold capitalize">{p.input.cropType} / {p.input.soilType}</p>
                    <p className="text-xs text-muted-foreground">{p.userId.name} · {p.userId.email}</p>
                    <Badge variant="outline" className="mt-1 text-xs">{p.output.fertilizerName}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="default"
                    className="shrink-0 gap-1"
                    disabled={verifyMutation.isPending}
                    onClick={() => verifyMutation.mutate(p._id)}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                    Verify
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {['Farmer', 'Crop / Soil', 'Fertilizer', 'Yield +', 'Confidence', 'Date', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${i === 0 || i === 1 || i === 2 ? 'text-left' : i === 6 ? 'text-right' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {predictions.map((p: PendingVerification) => (
                  <tr key={p._id} className="border-b border-border/40 transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.userId.name}</p>
                      <p className="text-xs text-muted-foreground">{p.userId.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      <p>{p.input.cropType}</p>
                      <p className="text-xs text-muted-foreground">{p.input.soilType} soil</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{p.output.fertilizerName}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-success">
                      {p.output.yieldImprovement != null ? `+${p.output.yieldImprovement}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.output.modelConfidence != null ? `${(p.output.modelConfidence * 100).toFixed(1)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                      {new Date(p.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="default"
                        className="gap-1"
                        disabled={verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(p._id)}
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Verify
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
              <span className="text-xs text-muted-foreground">
                {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={pagination.page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={pagination.page >= pagination.totalPages} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
};

// ─── Main dashboard content ───────────────────────────────────────────────────
const DashboardContent = ({ stats }: { stats: AdminStats }) => {
  const navigate = useNavigate();
  const cl = stats.continuousLearning ?? { totalVerified: 0, verifiedSinceLastRetrain: 0, retrainThreshold: 50, pendingVerifications: 0 };

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
      title: 'Verified Tests',
      value: cl.totalVerified.toLocaleString(),
      icon: CheckCircle,
      color: 'bg-success/10 text-success',
    },
    {
      title: 'Pending Verification',
      value: cl.pendingVerifications.toLocaleString(),
      icon: Clock,
      color: 'bg-accent/20 text-accent-foreground',
    },
    {
      title: 'Avg NPK — Nitrogen',
      value: `${stats.averageNPK?.n ?? 0} kg/ha`,
      icon: Sprout,
      color: 'bg-soil/10 text-soil',
    },
    {
      title: 'Model Accuracy',
      value: stats.modelMetrics?.accuracy != null ? `${stats.modelMetrics.accuracy}%` : 'N/A',
      icon: Target,
      color: 'bg-primary/10 text-primary',
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

  const [showStickyBar, setShowStickyBar] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowStickyBar(window.scrollY > 160);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Layout>
      {/* ── Sticky summary bar ─────────────────────────────────────────────── */}
      <div
        className={`fixed left-0 right-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur transition-all duration-300 ${
          showStickyBar ? 'top-16 translate-y-0 opacity-100 md:top-20' : '-top-20 -translate-y-full opacity-0'
        }`}
        style={{ transitionProperty: 'top, opacity, transform' }}
      >
        <div className="container flex h-12 items-center justify-between gap-4 overflow-x-auto">
          <span className="shrink-0 text-sm font-semibold text-foreground">Admin Dashboard</span>
          <div className="flex shrink-0 items-center gap-6 text-sm">
            {[
              { label: 'Submissions', value: stats.totalSubmissions.toLocaleString() },
              { label: 'Users',       value: stats.totalUsers.toLocaleString() },
              { label: 'Verified',    value: cl.totalVerified.toLocaleString() },
              { label: 'Pending',     value: cl.pendingVerifications.toLocaleString() },
              { label: 'Accuracy',    value: stats.modelMetrics?.accuracy != null ? `${stats.modelMetrics.accuracy}%` : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{label}:</span>
                <span className="font-semibold text-foreground">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

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
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((stat, i) => (
            <Card
              key={stat.title}
              variant="gradient"
              className="animate-fade-in"
              style={{ animationDelay: `${i * 0.08}s` }}
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

        {/* Continuous Learning Progress Card */}
        <Card variant="elevated" className="mb-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
                <Brain className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <CardTitle>Continuous Learning</CardTitle>
                <CardDescription>Verified records progress toward next model retrain</CardDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => navigate('/admin/verifications')}
            >
              <ShieldCheck className="h-4 w-4" />
              View Verifications
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {cl.verifiedSinceLastRetrain} new verified / {cl.retrainThreshold} needed
              </span>
              <span className="font-semibold text-foreground">
                {Math.min(100, Math.round((cl.verifiedSinceLastRetrain / cl.retrainThreshold) * 100))}%
              </span>
            </div>
            <div className="relative h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-hero transition-all duration-700"
                style={{ width: `${Math.min(100, (cl.verifiedSinceLastRetrain / cl.retrainThreshold) * 100)}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-3 pt-1">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Total Verified</p>
                <p className="text-lg font-bold text-foreground">{cl.totalVerified}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Since Last Retrain</p>
                <p className="text-lg font-bold text-foreground">{cl.verifiedSinceLastRetrain}</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground">Threshold</p>
                <p className="text-lg font-bold text-foreground">{cl.retrainThreshold}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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

        {/* Pending Verifications CTA */}
        <Card
          variant="elevated"
          className="mt-6 animate-fade-in cursor-pointer transition-shadow hover:shadow-elevated"
          style={{ animationDelay: '0.9s' }}
          onClick={() => navigate('/admin/verifications')}
        >
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-hero">
              <ShieldCheck className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-lg font-semibold text-foreground">
                {cl.pendingVerifications > 0
                  ? `${cl.pendingVerifications} Prediction${cl.pendingVerifications > 1 ? 's' : ''} Awaiting Verification`
                  : 'Verification Centre'}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {cl.pendingVerifications > 0
                  ? 'Review model outputs, contact farmers, and mark predictions as verified to improve the AI model.'
                  : 'All predictions are verified. Great work!'}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
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
