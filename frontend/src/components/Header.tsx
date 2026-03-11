import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Sprout, LayoutDashboard, Menu, X, LogIn, LogOut, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Home', icon: Sprout },
    { path: '/analyze', label: 'Analyze Soil', icon: Sprout },
    ...(user?.role === 'admin'
      ? [{ path: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard }]
      : []),
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Avatar initials from user name
  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '';

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between md:h-20">
        <Link to="/" className="flex items-center gap-2 md:gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-hero md:h-12 md:w-12">
            <Sprout className="h-5 w-5 text-primary-foreground md:h-6 md:w-6" />
          </div>
          <span className="text-lg font-bold text-foreground md:text-xl">
            {import.meta.env.VITE_APP_NAME ?? 'AgriFertAI'}
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden items-center gap-2 md:flex">
          {navLinks.map((link) => (
            <Link key={link.path} to={link.path}>
              <Button
                variant={isActive(link.path) ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}

          {/* Auth section */}
          <div className="ml-2 flex items-center gap-2">
            {isAuthenticated ? (
              <>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground select-none">
                  {initials}
                </div>
                <span className="hidden text-sm font-medium text-foreground lg:block">
                  {user?.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Link to="/auth">
                <Button variant="default" size="sm" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          'absolute left-0 right-0 border-b bg-background md:hidden transition-all duration-300 overflow-hidden',
          mobileMenuOpen ? 'max-h-80 py-4' : 'max-h-0 py-0',
        )}
      >
        <nav className="container flex flex-col gap-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
            >
              <Button
                variant={isActive(link.path) ? 'default' : 'ghost'}
                className="w-full justify-start gap-3"
              >
                <link.icon className="h-5 w-5" />
                {link.label}
              </Button>
            </Link>
          ))}

          {/* Mobile auth */}
          {isAuthenticated ? (
            <div className="mt-2 flex items-center gap-3 border-t pt-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initials}
              </div>
              <span className="flex-1 text-sm font-medium text-foreground">{user?.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground"
                onClick={() => { setMobileMenuOpen(false); handleLogout(); }}
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <Link to="/auth" onClick={() => setMobileMenuOpen(false)} className="mt-2 border-t pt-3">
              <Button variant="default" className="w-full justify-start gap-3">
                <User className="h-5 w-5" />
                Sign In / Register
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
