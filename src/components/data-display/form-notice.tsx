import { cn } from "@/lib/utils";

type FormNoticeProps = {
  tone: "error" | "success" | "info";
  message: string;
};

const toneClasses: Record<FormNoticeProps["tone"], string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-emerald-200 bg-emerald-50 text-emerald-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function FormNotice({ tone, message }: FormNoticeProps) {
  return <div className={cn("rounded-md border px-3 py-2 text-sm", toneClasses[tone])}>{message}</div>;
}
