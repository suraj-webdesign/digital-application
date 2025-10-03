import { useToast } from '@/hooks/use-toast';
import { Toast } from './toast';

export const Toaster = () => {
  const { toasts, dismiss } = useToast();

  return (
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onDismiss={dismiss}
        />
      ))}
    </>
  );
};
