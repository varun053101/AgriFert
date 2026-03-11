import { Sprout } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="border-t bg-card py-8 mt-auto">
      <div className="container">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-hero">
              <Sprout className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-foreground">AI Powered Fertilizer Recommendation Engine</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Helping farmers make smarter decisions with AI technology
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
