import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Sprout, Eye, EyeOff, Loader2, LogIn, UserPlus, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';

// ─── Validation Schemas ───────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain an uppercase letter')
      .regex(/[0-9]/, 'Must contain a number'),
    confirmPassword: z.string(),
    adminKey: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

// ─── Field skeleton while submitting ─────────────────────────────────────────
const FieldSkeleton = () => <Skeleton className="h-12 w-full rounded-lg" />;

// ─── Login Form ───────────────────────────────────────────────────────────────
const LoginForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginData) => {
    try {
      await login(data.email, data.password);
      toast.success('Welcome back!');
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Login failed. Please check your credentials.';
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email Address</Label>
        {isSubmitting ? (
          <FieldSkeleton />
        ) : (
          <Input
            id="login-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className="h-12"
            {...register('email')}
          />
        )}
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="login-password">Password</Label>
        {isSubmitting ? (
          <FieldSkeleton />
        ) : (
          <div className="relative">
            <Input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              autoComplete="current-password"
              className="h-12 pr-11"
              {...register('password')}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        )}
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        variant="hero"
        size="lg"
        className="w-full gap-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          <>
            <LogIn className="h-4 w-4" />
            Sign In
          </>
        )}
      </Button>
    </form>
  );
};

// ─── Register Form ────────────────────────────────────────────────────────────
const RegisterForm = ({ onSuccess }: { onSuccess: () => void }) => {
  const { register: authRegister } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminKey, setShowAdminKey] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterData) => {
    try {
      await authRegister(data.name, data.email, data.password, data.adminKey || undefined);
      toast.success('Account created! Welcome to AgriFertAI 🌱');
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Registration failed. Please try again.';
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="reg-name">Full Name</Label>
        {isSubmitting ? (
          <FieldSkeleton />
        ) : (
          <Input
            id="reg-name"
            type="text"
            placeholder="Ravi Kumar"
            autoComplete="name"
            className="h-12"
            {...register('name')}
          />
        )}
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="reg-email">Email Address</Label>
        {isSubmitting ? (
          <FieldSkeleton />
        ) : (
          <Input
            id="reg-email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
            className="h-12"
            {...register('email')}
          />
        )}
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="reg-password">Password</Label>
          {isSubmitting ? (
            <FieldSkeleton />
          ) : (
            <div className="relative">
              <Input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                className="h-12 pr-11"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword((p) => !p)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="reg-confirm">Confirm Password</Label>
          {isSubmitting ? (
            <FieldSkeleton />
          ) : (
            <Input
              id="reg-confirm"
              type={showPassword ? 'text' : 'password'}
              placeholder="Repeat password"
              autoComplete="new-password"
              className="h-12"
              {...register('confirmPassword')}
            />
          )}
          {errors.confirmPassword && (
            <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      {/* Optional admin key */}
      <div className="space-y-2">
        <button
          type="button"
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowAdminKey((s) => !s)}
        >
          <KeyRound className="h-3.5 w-3.5" />
          {showAdminKey ? 'Hide admin key' : 'Have an admin key? (optional)'}
        </button>
        {showAdminKey && (
          <Input
            id="reg-adminkey"
            type="password"
            placeholder="Admin registration key"
            className="h-12"
            {...register('adminKey')}
          />
        )}
      </div>

      <Button
        type="submit"
        variant="hero"
        size="lg"
        className="w-full gap-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            Create Account
          </>
        )}
      </Button>
    </form>
  );
};

// ─── Auth Page ────────────────────────────────────────────────────────────────
const AuthPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/analyze';

  // Already logged in — redirect away
  if (isAuthenticated) {
    navigate(from, { replace: true });
    return null;
  }

  const handleSuccess = () => navigate(from, { replace: true });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Brand header */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-hero shadow-glow">
              <Sprout className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground">
              {import.meta.env.VITE_APP_NAME ?? 'AgriFertAI'}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              AI-powered fertilizer recommendations for smarter farming
            </p>
          </div>

          <Card variant="elevated">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-xl">Welcome</CardTitle>
              <CardDescription className="text-center">
                Sign in or create an account to get started
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="mb-6 grid w-full grid-cols-2">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <LoginForm onSuccess={handleSuccess} />
                </TabsContent>

                <TabsContent value="register">
                  <RegisterForm onSuccess={handleSuccess} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in you agree to our{' '}
            <span className="underline cursor-pointer hover:text-foreground transition-colors">
              Terms of Service
            </span>{' '}
            and{' '}
            <span className="underline cursor-pointer hover:text-foreground transition-colors">
              Privacy Policy
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
