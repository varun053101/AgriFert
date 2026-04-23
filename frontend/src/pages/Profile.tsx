import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { userApi, type PredictionRecord } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  User,
  Mail,
  ShieldCheck,
  Calendar,
  FlaskConical,
  TrendingUp,
  Leaf,
  Sprout,
  ChevronLeft,
  ChevronRight,
  Thermometer,
  Droplets,
  BarChart3,
  Activity,
} from 'lucide-react';

// ─── Skeleton ────────────────────────────────────────────────────────────────
const ProfileSkeleton = () => (
  <Layout>
    <div className="container py-8 md:py-12">
      <div className="mx-auto max-w-5xl space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  </Layout>
);

// ─── Stat Tile ───────────────────────────────────────────────────────────────
interface StatTileProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  iconClass?: string;
  bgClass?: string;
  delay?: string;
}

const StatTile = ({
  icon: Icon,
  label,
  value,
  sub,
  iconClass = 'text-primary',
  bgClass = 'bg-primary/10',
  delay = '0s',
}: StatTileProps) => (
  <Card
    className="animate-fade-in hover:shadow-elevated transition-shadow duration-200"
    style={{ animationDelay: delay }}
  >
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="mt-1 truncate text-xl font-bold text-foreground sm:text-2xl">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bgClass}`}>
          <Icon className={`h-5 w-5 ${iconClass}`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

// ─── Mobile History Card ──────────────────────────────────────────────────────
const HistoryCard = ({ rec }: { rec: PredictionRecord }) => {
  const dateStr = new Date(rec.createdAt).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 shadow-soft transition-shadow hover:shadow-elevated">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold capitalize text-foreground">{rec.input.cropType || '—'}</p>
          <p className="text-xs text-muted-foreground">{rec.input.soilType || '—'} soil</p>
        </div>
        <Badge variant="outline" className="shrink-0 text-xs font-medium">
          {rec.output.fertilizerName}
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-muted p-2">
          <p className="text-[10px] text-muted-foreground">Quantity</p>
          <p className="mt-0.5 text-sm font-semibold">{rec.output.totalQty ?? '—'} <span className="text-[10px] font-normal">kg/ac</span></p>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <p className="text-[10px] text-muted-foreground">Yield +</p>
          <p className="mt-0.5 text-sm font-semibold text-success">
            {rec.output.yieldImprovement != null ? `+${rec.output.yieldImprovement}%` : '—'}
          </p>
        </div>
        <div className="rounded-lg bg-muted p-2">
          <p className="text-[10px] text-muted-foreground">Confidence</p>
          <p className="mt-0.5 text-sm font-semibold">
            {rec.output.modelConfidence != null
              ? `${(rec.output.modelConfidence * 100).toFixed(0)}%`
              : '—'}
          </p>
        </div>
      </div>
      <p className="mt-2 text-right text-[11px] text-muted-foreground">{dateStr}</p>
    </div>
  );
};

// ─── Desktop History Row ──────────────────────────────────────────────────────
const HistoryRow = ({ rec }: { rec: PredictionRecord }) => {
  const date = new Date(rec.createdAt);
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  return (
    <tr className="border-b border-border/40 transition-colors hover:bg-muted/40">
      <td className="px-4 py-3">
        <p className="font-medium capitalize text-foreground">{rec.input.cropType || '—'}</p>
        <p className="text-xs text-muted-foreground">{rec.input.soilType || '—'} soil</p>
      </td>
      <td className="px-4 py-3">
        <Badge variant="outline" className="whitespace-nowrap font-medium">{rec.output.fertilizerName}</Badge>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-semibold">{rec.output.totalQty ?? '—'}</span>
        <span className="ml-1 text-xs text-muted-foreground">kg/ac</span>
      </td>
      <td className="px-4 py-3 text-right font-semibold text-success">
        {rec.output.yieldImprovement != null ? `+${rec.output.yieldImprovement}%` : '—'}
      </td>
      <td className="px-4 py-3 text-right text-sm">
        {rec.output.modelConfidence != null
          ? `${(rec.output.modelConfidence * 100).toFixed(1)}%`
          : '—'}
      </td>
      <td className="px-4 py-3 text-right">
        <p className="text-sm">{dateStr}</p>
        <p className="text-xs text-muted-foreground">{timeStr}</p>
      </td>
    </tr>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const LIMIT = 10;

const Profile = () => {
  const { user: authUser } = useAuth();
  const [page, setPage] = useState(1);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await userApi.getProfile();
      return res.data.data;
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['profile-history', page],
    queryFn: async () => {
      const res = await userApi.getHistory(page, LIMIT);
      return res.data.data;
    },
    placeholderData: (prev) => prev,
  });

  if (profileLoading) return <ProfileSkeleton />;

  const user  = profileData?.user ?? authUser;
  const stats = profileData?.stats;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
    : '—';

  const pagination  = historyData?.pagination;
  const predictions = historyData?.predictions ?? [];

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-5xl space-y-6">

          {/* ── Page Title ── */}
          <div className="animate-fade-in">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl md:text-4xl">My Profile</h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Your account overview and analysis history
            </p>
          </div>

          {/* ── Hero Profile Card ── */}
          <Card
            className="animate-fade-in overflow-hidden"
            style={{ animationDelay: '0.05s' }}
          >
            {/* Top gradient strip */}
            <div className="h-3 w-full bg-gradient-hero" />

            <CardContent className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-6">
                {/* Avatar */}
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-hero text-3xl font-bold text-primary-foreground shadow-elevated ring-4 ring-background">
                  {initials}
                </div>

                {/* Name + role + meta */}
                <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-foreground sm:text-2xl">
                      {user?.name ?? '—'}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <Badge
                        variant={user?.role === 'admin' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {user?.role === 'admin' && <ShieldCheck className="mr-1 h-3 w-3" />}
                        {user?.role ?? 'user'}
                      </Badge>
                      {stats?.totalAnalyses != null && (
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                          {stats.totalAnalyses} analyses
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Contact + date */}
                  <div className="flex flex-col gap-1.5 text-sm text-muted-foreground sm:items-end">
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="break-all">{user?.email ?? '—'}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      Member since {memberSince}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Stat Tiles ── */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatTile
              icon={FlaskConical}
              label="Total Analyses"
              value={stats?.totalAnalyses ?? 0}
              sub="soil submissions"
              iconClass="text-primary"
              bgClass="bg-primary/10"
              delay="0.1s"
            />
            <StatTile
              icon={TrendingUp}
              label="Avg. Yield Gain"
              value={stats?.avgYieldImprovement != null ? `+${stats.avgYieldImprovement}%` : '—'}
              sub="across all analyses"
              iconClass="text-success"
              bgClass="bg-success/10"
              delay="0.15s"
            />
            <StatTile
              icon={Leaf}
              label="Top Fertilizer"
              value={stats?.topFertilizer ?? '—'}
              sub="most recommended"
              iconClass="text-accent-foreground"
              bgClass="bg-accent/20"
              delay="0.2s"
            />
            <StatTile
              icon={Sprout}
              label="Favourite Crop"
              value={
                stats?.topCrop
                  ? stats.topCrop.charAt(0).toUpperCase() + stats.topCrop.slice(1)
                  : '—'
              }
              sub="most analysed"
              iconClass="text-soil"
              bgClass="bg-soil/10"
              delay="0.25s"
            />
          </div>

          {/* ── Model Confidence Bar ── */}
          {stats?.avgModelConfidence != null && stats.avgModelConfidence > 0 && (
            <Card className="animate-fade-in" style={{ animationDelay: '0.28s' }}>
              <CardContent className="flex items-center gap-4 p-4 sm:p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground">Avg. model confidence</p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="absolute left-0 top-0 h-full rounded-full bg-gradient-hero transition-all duration-700"
                        style={{ width: `${(stats.avgModelConfidence * 100).toFixed(1)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-sm font-bold text-foreground">
                      {(stats.avgModelConfidence * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Last Analysis Inputs ── */}
          {predictions.length > 0 && (
            <Card className="animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-water/10">
                    <Thermometer className="h-5 w-5 text-water" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">Last Analysis Inputs</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Soil parameters from your most recent submission
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
                  {[
                    { label: 'Temp',       value: `${predictions[0].input.temperature}°C` },
                    { label: 'Humidity',   value: `${predictions[0].input.humidity}%` },
                    { label: 'Moisture',   value: `${predictions[0].input.moisture}%` },
                    { label: 'Nitrogen',   value: predictions[0].input.nitrogen },
                    { label: 'Phosphorus', value: predictions[0].input.phosphorous },
                    { label: 'Potassium',  value: predictions[0].input.potassium },
                  ].map(({ label, value }) => (
                    <div key={label} className="rounded-lg bg-muted p-2.5 text-center sm:p-3">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">
                        {label}
                      </p>
                      <p className="mt-1 text-sm font-bold text-foreground sm:text-base">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Analysis History ── */}
          <Card className="animate-fade-in overflow-hidden" style={{ animationDelay: '0.35s' }}>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-0">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
                  <BarChart3 className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base sm:text-lg">Analysis History</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    {pagination?.total ?? 0} total soil analyses
                  </CardDescription>
                </div>
              </div>
              {pagination && pagination.totalPages > 1 && (
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  Page {pagination.page} / {pagination.totalPages}
                </span>
              )}
            </CardHeader>

            <Separator className="mt-4" />

            {/* Loading */}
            {historyLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
              </div>
            ) : predictions.length === 0 ? (
              /* Empty state */
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <FlaskConical className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold text-foreground">No analyses yet</p>
                <p className="max-w-xs text-sm text-muted-foreground">
                  Submit your first soil analysis to see your history here.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile: cards */}
                <div className="space-y-3 p-4 md:hidden">
                  {predictions.map((rec) => (
                    <HistoryCard key={rec._id} rec={rec} />
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50 bg-muted/30">
                        {['Crop / Soil', 'Fertilizer', 'Qty', 'Yield +', 'Confidence', 'Date'].map((h, i) => (
                          <th
                            key={h}
                            className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground ${i > 1 ? 'text-right' : 'text-left'}`}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {predictions.map((rec) => (
                        <HistoryRow key={rec._id} rec={rec} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="flex flex-col items-center justify-between gap-3 border-t border-border/50 px-4 py-3 sm:flex-row">
                <span className="text-xs text-muted-foreground sm:text-sm">
                  Showing&nbsp;
                  {(pagination.page - 1) * pagination.limit + 1}–
                  {Math.min(pagination.page * pagination.limit, pagination.total)}
                  &nbsp;of {pagination.total}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    id="profile-prev-page"
                    disabled={pagination.page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    id="profile-next-page"
                    disabled={pagination.page >= pagination.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="gap-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </Card>

        </div>
      </div>
    </Layout>
  );
};

export default Profile;
