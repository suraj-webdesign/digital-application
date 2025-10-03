import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  variant?: 'default' | 'success' | 'warning' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  showValue?: boolean;
  animated?: boolean;
}

const Progress = ({ 
  className, 
  value, 
  max = 100,
  variant = 'default',
  size = 'md',
  showValue = false,
  animated = false,
  ...props 
}: ProgressProps) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: "h-2",
    md: "h-3",
    lg: "h-4"
  };
  
  const variantClasses = {
    default: "bg-blue-600",
    success: "bg-green-600",
    warning: "bg-yellow-600", 
    destructive: "bg-red-600"
  };
  
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {showValue && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Progress</span>
          <span>{Math.round(percentage)}%</span>
        </div>
      )}
      <div className={cn("w-full bg-gray-200 rounded-full overflow-hidden", sizeClasses[size])}>
        <div
          className={cn(
            "h-full transition-all duration-500 ease-out",
            variantClasses[variant],
            animated && "animate-pulse"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Pre-built progress components for common use cases
export const ProgressCard = ({ 
  title, 
  value, 
  max = 100, 
  variant = 'default',
  className,
  ...props 
}: { 
  title: string; 
  value: number; 
  max?: number; 
  variant?: 'default' | 'success' | 'warning' | 'destructive';
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("p-4 bg-white rounded-lg border shadow-sm", className)} {...props}>
    <div className="flex justify-between items-center mb-2">
      <h3 className="font-medium text-gray-900">{title}</h3>
      <span className="text-sm text-muted-foreground">{value}/{max}</span>
    </div>
    <Progress value={value} max={max} variant={variant} showValue />
  </div>
);

export const ProgressSteps = ({ 
  steps, 
  currentStep, 
  className,
  ...props 
}: { 
  steps: string[]; 
  currentStep: number; 
} & React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("space-y-4", className)} {...props}>
    <div className="flex items-center justify-between">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
              index <= currentStep
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-500"
            )}
          >
            {index + 1}
          </div>
          <span
            className={cn(
              "ml-2 text-sm",
              index <= currentStep ? "text-blue-600 font-medium" : "text-gray-500"
            )}
          >
            {step}
          </span>
          {index < steps.length - 1 && (
            <div
              className={cn(
                "w-12 h-0.5 mx-4",
                index < currentStep ? "bg-blue-600" : "bg-gray-200"
              )}
            />
          )}
        </div>
      ))}
    </div>
  </div>
);

export default Progress;
