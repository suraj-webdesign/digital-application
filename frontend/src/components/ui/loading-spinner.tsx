import { cn } from "@/lib/utils";

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'primary' | 'white' | 'success' | 'warning' | 'destructive';
  text?: string;
}

const LoadingSpinner = ({ 
  className, 
  size = 'md', 
  variant = 'default',
  text,
  ...props 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8",
    xl: "h-12 w-12"
  };
  
  const variantClasses = {
    default: "border-gray-300 border-t-blue-600",
    primary: "border-blue-200 border-t-blue-600",
    white: "border-white/30 border-t-white",
    success: "border-green-200 border-t-green-600",
    warning: "border-yellow-200 border-t-yellow-600",
    destructive: "border-red-200 border-t-red-600"
  };
  
  return (
    <div className={cn("flex items-center justify-center", className)} {...props}>
      <div className="flex flex-col items-center space-y-3">
        <div
          className={cn(
            "animate-spin rounded-full border-2",
            sizeClasses[size],
            variantClasses[variant]
          )}
        />
        {text && (
          <p className="text-sm text-muted-foreground animate-pulse">
            {text}
          </p>
        )}
      </div>
    </div>
  );
};

// Pre-built loading states for common use cases
export const LoadingCard = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-6 space-y-4", className)} {...props}>
    <div className="flex items-center space-x-4">
      <LoadingSpinner size="sm" />
      <div className="space-y-2 flex-1">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
      </div>
    </div>
  </div>
);

export const LoadingButton = ({ 
  children, 
  loading = false, 
  className,
  ...props 
}: { 
  children: React.ReactNode; 
  loading?: boolean; 
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button
    className={cn(
      "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-300",
      "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed",
      className
    )}
    disabled={loading}
    {...props}
  >
    {loading && <LoadingSpinner size="sm" variant="white" />}
    {children}
  </button>
);

export const LoadingPage = ({ 
  text = "Loading...", 
  className,
  ...props 
}: { 
  text?: string; 
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-h-screen flex items-center justify-center", className)} {...props}>
    <div className="text-center space-y-4">
      <LoadingSpinner size="xl" text={text} />
    </div>
  </div>
);

export const LoadingOverlay = ({ 
  text = "Loading...", 
  className,
  ...props 
}: { 
  text?: string; 
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center", className)} {...props}>
    <div className="text-center space-y-4">
      <LoadingSpinner size="lg" text={text} />
    </div>
  </div>
);

export default LoadingSpinner;
