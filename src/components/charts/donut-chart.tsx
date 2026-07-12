type DonutChartProps = {
  value: number;
  label: string;
};

export function DonutChart({ value, label }: DonutChartProps) {
  return (
    <div className="flex items-center gap-5">
      <div
        className="grid size-28 place-items-center rounded-full"
        style={{
          background: `conic-gradient(#047857 ${value * 3.6}deg, #d9f99d ${value * 3.6}deg 360deg)`,
        }}
      >
        <div className="grid size-20 place-items-center rounded-full bg-white">
          <span className="text-xl font-semibold text-slate-950">{value}%</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-950">{label}</p>
        <p className="mt-1 text-sm leading-6 text-slate-500">Fund utilization across active programs.</p>
      </div>
    </div>
  );
}
