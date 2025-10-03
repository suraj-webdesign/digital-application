import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'card' | 'text' | 'avatar' | 'button';
  size?: 'sm' | 'md' | 'lg';
}

const Skeleton = ({ 
  className, 
  variant = 'default', 
  size = 'md',
  ...props 
}: SkeletonProps) => {
  const baseClasses = "animate-pulse bg-gray-200 dark:bg-gray-700";
  
  const variantClasses = {
    default: "rounded-lg",
    card: "rounded-xl h-48",
    text: "rounded h-4",
    avatar: "rounded-full",
    button: "rounded-lg h-10"
  };
  
  const sizeClasses = {
    sm: "h-3",
    md: "h-4", 
    lg: "h-6"
  };
  
  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        size === 'md' && variant === 'text' ? sizeClasses[size] : '',
        className
      )}
      {...props}
    />
  );
};

// Pre-built skeleton components for common use cases
export const SkeletonCard = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-4 p-6", className)} {...props}>
    <div className="flex items-center space-x-4">
      <Skeleton variant="avatar" className="h-12 w-12" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  </div>
);

export const SkeletonTable = ({ rows = 5, className, ...props }: { rows?: number } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-3", className)} {...props}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex space-x-4">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-1/6" />
        <Skeleton className="h-4 w-1/4" />
      </div>
    ))}
  </div>
);

export const SkeletonList = ({ items = 3, className, ...props }: { items?: number } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-4", className)} {...props}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className="flex items-center space-x-3">
        <Skeleton variant="avatar" className="h-10 w-10" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    ))}
  </div>
);

export const SkeletonForm = ({ fields = 3, className, ...props }: { fields?: number } & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-6", className)} {...props}>
    {Array.from({ length: fields }).map((_, i) => (
      <div key={i} className="space-y-2">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    ))}
    <Skeleton className="h-12 w-full rounded-lg" />
  </div>
);

export default Skeleton;
