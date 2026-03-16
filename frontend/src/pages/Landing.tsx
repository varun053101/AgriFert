import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Layout from '@/components/Layout';
import { Sprout, Droplets, Leaf, Sun, ArrowRight, CheckCircle } from 'lucide-react';
import heroImage from '@/assets/hero-farm.jpg';

const Landing = () => {
  const features = [
    {
      icon: Sprout,
      title: 'Smart Fertilizer Advice',
      description: 'Get AI-powered recommendations for the right fertilizer type and quantity for your crops.',
    },
    {
      icon: Droplets,
      title: 'Soil Analysis',
      description: 'Enter your soil pH and NPK values to get personalized recommendations.',
    },
    {
      icon: Leaf,
      title: 'Better Yields',
      description: 'Improve your crop yields with data-driven farming practices.',
    },
    {
      icon: Sun,
      title: 'Weather Integration',
      description: 'Automatic weather data helps fine-tune recommendations for your location.',
    },
  ];

  const benefits = [
    'Save money on fertilizers',
    'Increase crop production',
    'Protect soil health',
    'Sustainable farming practices',
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            alt="Beautiful farmland with crops"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/70 to-transparent" />
        </div>
        
        <div className="container relative z-10 py-20 md:py-32">
          <div className="max-w-2xl">
            <h1 className="mb-6 text-4xl font-extrabold leading-tight text-primary-foreground md:text-5xl lg:text-6xl animate-fade-in">
              AI Powered Fertilizer Recommendation Engine
            </h1>
            <p className="mb-8 text-xl text-primary-foreground/90 md:text-2xl animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Get smart fertilizer recommendations to grow healthier crops and improve your farm's yield using artificial intelligence.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <Link to="/analyze">
                <Button variant="accent" size="xl" className="gap-3 w-full sm:w-auto">
                  Get Fertilizer Recommendation
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24">
        <div className="container">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground md:text-4xl">
              How It Helps You
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Our AI system analyzes your soil and crop data to give you the best fertilizer recommendations.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature, index) => (
              <Card
                key={feature.title}
                variant="gradient"
                className="animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <CardHeader>
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
                    <feature.icon className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-secondary/50 py-16 md:py-24">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="mb-6 text-3xl font-bold text-foreground md:text-4xl">
                Why Farmers Trust Us
              </h2>
              <p className="mb-8 text-lg text-muted-foreground">
                Thousands of farmers are already using our system to make smarter decisions about fertilizers and improve their farming practices.
              </p>
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li
                    key={benefit}
                    className="flex items-center gap-3 text-lg font-medium text-foreground animate-slide-in-right"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <CheckCircle className="h-6 w-6 text-success" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <Card variant="elevated" className="p-8">
                <div className="mb-6 text-center">
                  <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gradient-hero">
                    <Sprout className="h-10 w-10 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">Start Now</h3>
                  <p className="mt-2 text-muted-foreground">
                    Get your first recommendation in under 2 minutes
                  </p>
                </div>
                <Link to="/analyze" className="block">
                  <Button variant="hero" size="lg" className="w-full">
                    Analyze Your Soil
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Landing;
