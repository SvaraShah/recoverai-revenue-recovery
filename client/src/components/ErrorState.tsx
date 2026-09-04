import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  title = "Failed to load data",
  message = "An error occurred while communicating with the server.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex min-h-[300px] w-full flex-col items-center justify-center p-6 text-center">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 max-w-sm shadow-2xs space-y-3">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-slate-900">{title}</h4>
          <p className="text-xs text-slate-600 font-medium">{message}</p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-all shadow-2xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
