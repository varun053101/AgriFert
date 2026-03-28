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
  Download,
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

  const downloadReport = () => {
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>AgriFert Report</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #1a1a1a; background: #fff; padding: 40px; }
  h1 { color: #2d6a4f; font-size: 22px; border-bottom: 2px solid #2d6a4f; padding-bottom: 8px; margin-bottom: 16px; }
  h2 { color: #2d6a4f; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 20px 0 8px; }
  .meta { font-size: 13px; color: #555; margin-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin: 10px 0; }
  .box { background: #f5f5f5; padding: 10px 14px; border-radius: 6px; }
  .label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.5px; }
  .value { font-size: 15px; font-weight: 700; margin-top: 2px; }
  .highlight { background: #e9f5ee; border-left: 4px solid #2d6a4f; padding: 14px 16px; border-radius: 4px; margin: 10px 0; }
  .fert-name { font-size: 26px; font-weight: 800; color: #2d6a4f; }
  ol { padding-left: 18px; font-size: 13px; line-height: 1.8; color: #444; }
  footer { margin-top: 40px; font-size: 10px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 12px; }
  @media print { body { padding: 20px; } @page { margin: 1.5cm; } }
</style>
</head>
<body>
<h1>🌱 AgriFert – Soil Analysis Report</h1>
<p class="meta"><strong>Date:</strong> ${date}</p>

<h2>Soil Input Parameters</h2>
<div class="grid">
  <div class="box"><div class="label">Crop Type</div><div class="value">${inputData?.cropType ?? '—'}</div></div>
  <div class="box"><div class="label">Soil Type</div><div class="value">${inputData?.soilType ?? '—'}</div></div>
  <div class="box"><div class="label">Temperature</div><div class="value">${inputData?.temperature ?? '—'}°C</div></div>
  <div class="box"><div class="label">Humidity</div><div class="value">${inputData?.humidity ?? '—'}%</div></div>
  <div class="box"><div class="label">Moisture</div><div class="value">${inputData?.soilMoisture ?? '—'}%</div></div>
  <div class="box"><div class="label">N / P / K</div><div class="value">${inputData?.nitrogen ?? '—'} / ${inputData?.phosphorus ?? '—'} / ${inputData?.potassium ?? '—'}</div></div>
</div>

<h2>Model Recommendation</h2>
<div class="highlight">
  <div class="label">Recommended Fertilizer</div>
  <div class="fert-name">${rec.fertilizer.name}</div>
  <div style="margin-top:4px;font-size:13px;color:#555">Total Quantity: <strong>${rec.fertilizer.totalQuantity} ${rec.fertilizer.unit}</strong></div>
</div>
<div class="grid">
  <div class="box"><div class="label">Nitrogen (N)</div><div class="value">${rec.fertilizer.quantity.nitrogen} kg</div></div>
  <div class="box"><div class="label">Phosphorus (P)</div><div class="value">${rec.fertilizer.quantity.phosphorus} kg</div></div>
  <div class="box"><div class="label">Potassium (K)</div><div class="value">${rec.fertilizer.quantity.potassium} kg</div></div>
  <div class="box"><div class="label">Yield Improvement</div><div class="value" style="color:#22763c">+${rec.yieldImprovement.percentage}%</div></div>
  ${rec.modelConfidence != null ? `<div class="box"><div class="label">Model Confidence</div><div class="value">${(rec.modelConfidence * 100).toFixed(1)}%</div></div>` : ''}
</div>

${rec.soilHealthTips?.length ? `<h2>Soil Health Tips</h2><ol>${rec.soilHealthTips.map((t: string) => `<li>${t}</li>`).join('')}</ol>` : ''}

<footer>Generated by AgriFert AI &nbsp;·&nbsp; ${new Date().toLocaleString('en-IN')}</footer>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      win.print();
      win.addEventListener('afterprint', () => win.close());
    }, 350);
  };


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
              variant="outline"
              size="lg"
              onClick={downloadReport}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Download Report
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
