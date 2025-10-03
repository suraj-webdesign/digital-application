import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined' | 'glass';
  hover?: boolean;
  children: ReactNode;
}

const Card = ({ 
  className, 
  variant = 'default', 
  hover = true,
  children,
  ...props 
}: CardProps) => {
  const variantClasses = {
    default: "bg-white border border-gray-200 shadow-sm",
    elevated: "bg-white shadow-lg",
    outlined: "bg-white border-2 border-gray-200",
    glass: "bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg"
  };

  return (
    <div
      className={cn(
        "rounded-xl transition-all duration-300",
        variantClasses[variant],
        hover && "hover:shadow-xl hover:-translate-y-1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const CardHeader = ({ className, children, ...props }: CardHeaderProps) => (
  <div className={cn("p-6 pb-4", className)} {...props}>
    {children}
  </div>
);

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

const CardTitle = ({ className, children, ...props }: CardTitleProps) => (
  <h3 className={cn("text-lg font-semibold text-gray-900", className)} {...props}>
    {children}
  </h3>
);

interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

const CardDescription = ({ className, children, ...props }: CardDescriptionProps) => (
  <p className={cn("text-sm text-gray-600 mt-1", className)} {...props}>
    {children}
  </p>
);

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const CardContent = ({ className, children, ...props }: CardContentProps) => (
  <div className={cn("p-6 pt-0", className)} {...props}>
    {children}
  </div>
);

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const CardFooter = ({ className, children, ...props }: CardFooterProps) => (
  <div className={cn("p-6 pt-0", className)} {...props}>
    {children}
  </div>
);

// Specialized card components
interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
}

export const StatCard = ({ 
  title, 
  value, 
  change, 
  changeType = 'neutral',
  icon,
  className,
  ...props 
}: StatCardProps) => {
  const changeColors = {
    positive: "text-green-600",
    negative: "text-red-600", 
    neutral: "text-gray-600"
  };

  return (
    <Card className={cn("p-6", className)} {...props}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change && (
            <p className={cn("text-sm font-medium", changeColors[changeType])}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-blue-100 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

interface FeatureCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  icon: ReactNode;
  gradient?: string;
}

export const FeatureCard = ({ 
  title, 
  description, 
  icon,
  gradient = "from-blue-500 to-purple-600",
  className,
  ...props 
}: FeatureCardProps) => (
  <Card className={cn("text-center p-8", className)} {...props}>
    <div className={cn("w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-gradient-to-r", gradient)}>
      <div className="text-white text-2xl">
        {icon}
      </div>
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
    <p className="text-gray-600">{description}</p>
  </Card>
);

interface ActionCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description: string;
  action: ReactNode;
  icon?: ReactNode;
}

export const ActionCard = ({ 
  title, 
  description, 
  action,
  icon,
  className,
  ...props 
}: ActionCardProps) => (
  <Card className={cn("p-6", className)} {...props}>
    <div className="flex items-start space-x-4">
      {icon && (
        <div className="flex-shrink-0">
          {icon}
        </div>
      )}
      <div className="flex-1">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        <div>{action}</div>
      </div>
    </div>
  </Card>
);

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
};
