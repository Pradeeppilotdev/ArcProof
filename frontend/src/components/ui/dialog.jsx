import { cn } from "../../lib/utils";

export function Dialog({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-xl shadow-lg max-w-lg w-full max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogHeader({ className, ...props }) {
  return (
    <div className={cn("flex flex-col space-y-1.5 p-6 pb-2", className)} {...props} />
  );
}

export function DialogTitle({ className, ...props }) {
  return (
    <div className={cn("text-lg font-semibold leading-none tracking-tight", className)} {...props} />
  );
}

export function DialogDescription({ className, ...props }) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export function DialogContent({ className, ...props }) {
  return <div className={cn("p-6 pt-2", className)} {...props} />;
}

export function DialogFooter({ className, ...props }) {
  return (
    <div className={cn("flex items-center justify-end gap-2 p-6 pt-0", className)} {...props} />
  );
}
