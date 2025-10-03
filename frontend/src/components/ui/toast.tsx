import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

export interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  duration?: number;
  onDismiss: (id: string) => void;
}

export const Toast = ({ id, title, description, variant = 'default', onDismiss }: ToastProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-destructive text-destructive-foreground border-destructive';
      case 'success':
        return 'bg-green-600 text-white border-green-700';
      case 'warning':
        return 'bg-yellow-600 text-white border-yellow-700';
      default:
        return 'bg-background text-foreground border-border';
    }
  };

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50 max-w-sm w-full
        border rounded-lg shadow-lg p-4 transition-all duration-300
        ${getVariantStyles()}
        ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'}
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-semibold">{title}</h4>
          {description && (
            <p className="text-sm mt-1 opacity-90">{description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDismiss(id)}
          className="ml-2 h-6 w-6 p-0 hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
