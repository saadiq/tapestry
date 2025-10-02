interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-base-200">
      <div className="flex flex-col items-center gap-4">
        <span className="loading loading-spinner loading-lg text-primary"></span>
        <p className="text-base-content/70">{message}</p>
      </div>
    </div>
  );
}
