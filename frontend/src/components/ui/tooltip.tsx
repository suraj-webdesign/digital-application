import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface TooltipProviderProps extends HTMLAttributes<HTMLDivElement> {}

const TooltipProvider = forwardRef<HTMLDivElement, TooltipProviderProps>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props}>
      {children}
    </div>
  )
);
TooltipProvider.displayName = "TooltipProvider";

export { TooltipProvider };
