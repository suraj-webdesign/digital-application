import React from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className="flex items-center space-x-2 hover:bg-muted/50 transition-all duration-300"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <>
          <Sun className="h-4 w-4 text-yellow-500" />
          <span className="hidden sm:inline text-sm">Light</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-blue-400" />
          <span className="hidden sm:inline text-sm">Dark</span>
        </>
      )}
    </Button>
  );
};

export default ThemeToggle;
