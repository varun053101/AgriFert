import { useLocation, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sprout,
  Droplets,
  Leaf,
  TrendingUp,
  Lightbulb,
  ArrowLeft,
  Beaker,
  CheckCircle,
} from 'lucide-react';
import { useEffect } from 'react';
import type { Recommendation, SoilCropData } from '@/lib/api';

const ResultSkeleton = () => (
  <Layout>
    <div className="container py-8 md:py-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="text-center space-y-3">
          <Skeleton className="h-16 w-16 rounded-full mx-auto" />
          <Skeleton className="h-10 w-72 mx-auto" />
          <Skeleton className="h-5 w-56 mx-auto" />
        </div>
        <Skeleton className="h-56 w-full rounded-xl" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    </div>
  </Layout>
);

interface LocationState {
  recommendation?: Recommendation;
  inputData?: SoilCropData;
}

const Results = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { recommendation, inputData } = (location.state as LocationState) || {};

  useEffect(() => {
    if (!recommendation) {
      navigate('/analyze');
    }
  }, [recommendation, navigate]);

  if (!recommendation) {
    return <ResultSkeleton />;
  }

  const rec = recommendation;
  const maxNPK = Math.max(
    rec.fertilizer.quantity.nitrogen,
    rec.fertilizer.quantity.phosphorus,
    rec.fertilizer.quantity.potassium,
  );

  const cropLabel = inputData?.cropType
    ? inputData.cropType.charAt(0).toUpperCase() + inputData.cropType.slice(1)
    : '';

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-success/10 animate-scale-in">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl animate-fade-in">
              Your Fertilizer Recommendation
            </h1>
            <p
              className="text-lg text-muted-foreground animate-fade-in"
              style={{ animationDelay: '0.1s' }}
            >
              Based on your soil analysis{cropLabel ? ` for ${cropLabel}` : ''}
            </p>
            {rec.modelConfidence != null && (
              <span className="mt-2 inline-block rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
                Model confidence: {(rec.modelConfidence * 100).toFixed(1)}%
              </span>
            )}
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Recommended Fertilizer */}
            <Card
              variant="elevated"
              className="md:col-span-2 animate-fade-in"
              style={{ animationDelay: '0.2s' }}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-hero">
                    <Beaker className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{rec.fertilizer.name}</CardTitle>
                    <CardDescription className="text-base">Recommended Fertilizer</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-6 flex items-center justify-center gap-2 rounded-xl bg-muted p-6">
                  <span className="text-4xl font-bold text-primary md:text-5xl">
                    {rec.fertilizer.totalQuantity}
                  </span>
                  <span className="text-xl text-muted-foreground">{rec.fertilizer.unit}</span>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-foreground">NPK Ratio Breakdown</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">Nitrogen (N)</span>
                        <span className="text-muted-foreground">
                          {rec.fertilizer.quantity.nitrogen} kg
                        </span>
                      </div>
                      <Progress
                        value={maxNPK ? (rec.fertilizer.quantity.nitrogen / maxNPK) * 100 : 0}
                        className="h-3 bg-muted [&>div]:bg-primary"
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">Phosphorus (P)</span>
                        <span className="text-muted-foreground">
                          {rec.fertilizer.quantity.phosphorus} kg
                        </span>
                      </div>
                      <Progress
                        value={maxNPK ? (rec.fertilizer.quantity.phosphorus / maxNPK) * 100 : 0}
                        className="h-3 bg-muted [&>div]:bg-accent"
                      />
                    </div>
                    <div>
                      <div className="mb-1 flex justify-between text-sm">
                        <span className="font-medium">Potassium (K)</span>
                        <span className="text-muted-foreground">
                          {rec.fertilizer.quantity.potassium} kg
                        </span>
                      </div>
                      <Progress
                        value={maxNPK ? (rec.fertilizer.quantity.potassium / maxNPK) * 100 : 0}
                        className="h-3 bg-muted [&>div]:bg-soil"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Yield Improvement */}
            <Card
              variant="gradient"
              className="animate-fade-in"
              style={{ animationDelay: '0.3s' }}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <TrendingUp className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <CardTitle>Yield Improvement</CardTitle>
                    <CardDescription>Expected increase in production</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="mb-2 text-5xl font-bold text-success">
                    +{rec.yieldImprovement.percentage}%
                  </div>
                  {rec.yieldImprovement.bushelsPerAcre && (
                    <p className="text-lg text-muted-foreground">
                      ~{rec.yieldImprovement.bushelsPerAcre} bushels per acre
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Input Summary */}
            <Card
              variant="gradient"
              className="animate-fade-in"
              style={{ animationDelay: '0.4s' }}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-water/10">
                    <Droplets className="h-5 w-5 text-water" />
                  </div>
                  <div>
                    <CardTitle>Your Soil Data</CardTitle>
                    <CardDescription>Analysis input summary</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="rounded-lg bg-muted p-3">
                    <span className="text-muted-foreground">Crop Type</span>
                    <p className="text-lg font-semibold">{inputData?.cropType ?? '—'}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <span className="text-muted-foreground">Soil Type</span>
                    <p className="text-lg font-semibold">{inputData?.soilType ?? '—'}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <span className="text-muted-foreground">Moisture</span>
                    <p className="text-lg font-semibold">{inputData?.soilMoisture ?? '—'}%</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <span className="text-muted-foreground">Temperature</span>
                    <p className="text-lg font-semibold">{inputData?.temperature ?? '—'}°C</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <span className="text-muted-foreground">Humidity</span>
                    <p className="text-lg font-semibold">{inputData?.humidity ?? '—'}%</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <span className="text-muted-foreground">N / P / K</span>
                    <p className="text-lg font-semibold">
                      {inputData?.nitrogen ?? '—'} / {inputData?.phosphorus ?? '—'} / {inputData?.potassium ?? '—'}
                    </p>
                  </div>
                </div>
              </CardContent>

            </Card>

            {/* Soil Health Tips */}
            {rec.soilHealthTips?.length > 0 && (
              <Card
                variant="elevated"
                className="md:col-span-2 animate-fade-in"
                style={{ animationDelay: '0.5s' }}
              >
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/20">
                      <Lightbulb className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <CardTitle>Soil Health Tips</CardTitle>
                      <CardDescription>AI-generated sustainable farming practices</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {rec.soilHealthTips.map((tip, index) => (
                      <li key={index} className="flex gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <p className="text-muted-foreground">{tip}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate('/analyze')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              New Analysis
            </Button>
            <Button
              variant="hero"
              size="lg"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <Sprout className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Results;
