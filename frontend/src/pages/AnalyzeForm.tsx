import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Thermometer, Droplets, Sprout, FlaskConical, MapPin, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { analyzeApi, weatherApi, SoilCropData } from '@/lib/api';

const crops = [
  { value: 'Cotton',    label: 'Cotton' },
  { value: 'Sugarcane', label: 'Sugarcane' },
  { value: 'Wheat',     label: 'Wheat' },
  { value: 'Maize',     label: 'Maize' },
  { value: 'Paddy',     label: 'Paddy' },
];

const soilTypes = [
  { value: 'Black',  label: 'Black Soil' },
  { value: 'Sandy',  label: 'Sandy Soil' },
  { value: 'Red',    label: 'Red Soil' },
  { value: 'Loamy',  label: 'Loamy Soil' },
  { value: 'Clayey', label: 'Clayey Soil' },
];

const WeatherSkeleton = () => (
  <div className="grid gap-6 md:grid-cols-2">
    <div className="space-y-2">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  </div>
);

const AnalyzeForm = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingWeather, setFetchingWeather] = useState(false);
  const [useGPS, setUseGPS] = useState(false);

  const [formData, setFormData] = useState({
    cropType: '',
    soilType: '',
    nitrogen: '',
    phosphorus: '',
    potassium: '',
    soilMoisture: '',
    temperature: '',
    humidity: '',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleGPSToggle = (checked: boolean) => {
    setUseGPS(checked);
    if (checked) {
      if (!navigator.geolocation) {
        toast.error('GPS not supported on this device.');
        setUseGPS(false);
        return;
      }
      setFetchingWeather(true);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude: lat, longitude: lng } = pos.coords;
          try {
            const response = await weatherApi.getByCoords(lat, lng);
            const { temperature, humidity, condition, city } = response.data.data;
            setFormData((prev) => ({
              ...prev,
              temperature: temperature.toString(),
              humidity: humidity.toString(),
            }));
            toast.success(`Weather fetched for ${city}: ${condition}`);
          } catch {
            toast.error('Could not fetch GPS weather. Enter values manually.');
            setUseGPS(false);
          } finally {
            setFetchingWeather(false);
          }
        },
        () => {
          toast.error('GPS access denied. Enter weather values manually.');
          setUseGPS(false);
          setFetchingWeather(false);
        },
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !formData.cropType ||
      !formData.soilType ||
      !formData.nitrogen ||
      !formData.phosphorus ||
      !formData.potassium ||
      !formData.soilMoisture
    ) {
      toast.error('Please fill in all required soil & crop fields');
      return;
    }
    if (!formData.temperature || !formData.humidity) {
      toast.error('Temperature and humidity are required');
      return;
    }

    setLoading(true);
    try {
      const data: SoilCropData = {
        cropType:     formData.cropType,
        soilType:     formData.soilType,
        soilPH:       7,                              // not used by model; default neutral
        nitrogen:     parseFloat(formData.nitrogen),
        phosphorus:   parseFloat(formData.phosphorus),
        potassium:    parseFloat(formData.potassium),
        soilMoisture: parseFloat(formData.soilMoisture),
        state:        '',
        district:     '',
        temperature:  parseFloat(formData.temperature),
        humidity:     parseFloat(formData.humidity),
        useGPS,
      };

      const response = await analyzeApi.submit(data);
      navigate('/results', {
        state: { recommendation: response.data.data, inputData: data },
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Analysis failed. Please try again.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container py-8 md:py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="mb-3 text-3xl font-bold text-foreground md:text-4xl">
              Soil &amp; Crop Analysis
            </h1>
            <p className="text-lg text-muted-foreground">
              Enter your soil and crop details to get personalized fertilizer recommendations
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Crop Selection */}
            <Card variant="gradient">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Sprout className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle>Select Your Crop</CardTitle>
                    <CardDescription>Choose the crop you are growing</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.cropType}
                  onValueChange={(v) => handleInputChange('cropType', v)}
                >
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder="Select a crop" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {crops.map((crop) => (
                      <SelectItem key={crop.value} value={crop.value} className="text-lg py-3">
                        {crop.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Soil Type Selection */}
            <Card variant="gradient">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soil/10">
                    <Layers className="h-5 w-5 text-soil" />
                  </div>
                  <div>
                    <CardTitle>Select Soil Type</CardTitle>
                    <CardDescription>Choose the soil type at your farm</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Select
                  value={formData.soilType}
                  onValueChange={(v) => handleInputChange('soilType', v)}
                >
                  <SelectTrigger className="h-14 text-lg">
                    <SelectValue placeholder="Select a soil type" />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {soilTypes.map((soil) => (
                      <SelectItem key={soil.value} value={soil.value} className="text-lg py-3">
                        {soil.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Soil Data — no pH, matches backend model */}
            <Card variant="gradient">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soil/10">
                    <FlaskConical className="h-5 w-5 text-soil" />
                  </div>
                  <div>
                    <CardTitle>Soil Information</CardTitle>
                    <CardDescription>Enter your soil test results</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="soilMoisture">Soil Moisture (%)</Label>
                    <Input
                      id="soilMoisture"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g., 45"
                      value={formData.soilMoisture}
                      onChange={(e) => handleInputChange('soilMoisture', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nitrogen">Nitrogen (N) kg/ha</Label>
                    <Input
                      id="nitrogen"
                      type="number"
                      min="0"
                      max="500"
                      placeholder="e.g., 40"
                      value={formData.nitrogen}
                      onChange={(e) => handleInputChange('nitrogen', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phosphorus">Phosphorus (P) kg/ha</Label>
                    <Input
                      id="phosphorus"
                      type="number"
                      min="0"
                      max="500"
                      placeholder="e.g., 30"
                      value={formData.phosphorus}
                      onChange={(e) => handleInputChange('phosphorus', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="potassium">Potassium (K) kg/ha</Label>
                    <Input
                      id="potassium"
                      type="number"
                      min="0"
                      max="500"
                      placeholder="e.g., 35"
                      value={formData.potassium}
                      onChange={(e) => handleInputChange('potassium', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Weather — manual entry by default, GPS toggle to auto-fill */}
            <Card variant="gradient">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                      <Thermometer className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <CardTitle>Weather Conditions</CardTitle>
                      <CardDescription>
                        {fetchingWeather
                          ? 'Fetching GPS weather…'
                          : useGPS
                          ? 'Auto-filled from GPS location'
                          : 'Enter current weather at your farm'}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <Label htmlFor="gps-weather" className="text-sm cursor-pointer">
                      Use GPS
                    </Label>
                    <Switch
                      id="gps-weather"
                      checked={useGPS}
                      onCheckedChange={handleGPSToggle}
                      disabled={fetchingWeather}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {fetchingWeather ? (
                  <WeatherSkeleton />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="temperature" className="flex items-center gap-2">
                        <Thermometer className="h-4 w-4" />
                        Temperature (°C)
                      </Label>
                      <Input
                        id="temperature"
                        type="number"
                        min="-60"
                        max="60"
                        placeholder="e.g., 28"
                        value={formData.temperature}
                        onChange={(e) => handleInputChange('temperature', e.target.value)}
                        readOnly={useGPS}
                        className={useGPS ? 'bg-muted/50 cursor-default' : ''}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="humidity" className="flex items-center gap-2">
                        <Droplets className="h-4 w-4" />
                        Humidity (%)
                      </Label>
                      <Input
                        id="humidity"
                        type="number"
                        min="0"
                        max="100"
                        placeholder="e.g., 65"
                        value={formData.humidity}
                        onChange={(e) => handleInputChange('humidity', e.target.value)}
                        readOnly={useGPS}
                        className={useGPS ? 'bg-muted/50 cursor-default' : ''}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button
              type="submit"
              variant="hero"
              size="xl"
              className="w-full"
              disabled={loading || fetchingWeather}
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing…
                </>
              ) : (
                <>
                  <FlaskConical className="h-5 w-5" />
                  Analyze Soil &amp; Crop
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyzeForm;
