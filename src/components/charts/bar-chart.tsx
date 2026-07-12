type ChartPoint = {
  label: string;
  value: number;
};

type BarChartProps = {
  data: ChartPoint[];
};

export function BarChart({ data }: BarChartProps) {
  return (
    <div className="flex h-72 items-end gap-3 rounded-lg bg-gradient-to-b from-emerald-50/70 to-white p-4">
      {data.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-3">
          <div className="flex h-52 w-full items-end">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-emerald-700 to-emerald-400 shadow-sm shadow-emerald-900/15"
              style={{ height: `${item.value}%` }}
              aria-label={`${item.label}: ${item.value}%`}
            />
          </div>
          <span className="text-xs font-medium text-slate-500">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
