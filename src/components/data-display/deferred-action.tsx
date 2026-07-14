type DeferredActionProps = {
  label: string;
};

export function DeferredAction({ label }: DeferredActionProps) {
  return (
    <button
      aria-disabled="true"
      className="h-10 rounded-md border border-slate-200 bg-slate-100 px-4 text-sm font-semibold text-slate-500"
      disabled
      title={label}
      type="button"
    >
      {label}
    </button>
  );
}
