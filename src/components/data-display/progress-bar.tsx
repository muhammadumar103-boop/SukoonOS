type ProgressBarProps = {
  value: number;
};

export function ProgressBar({ value }: ProgressBarProps) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${value}%` }} />
    </div>
  );
}
