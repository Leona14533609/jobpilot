import { cn } from "@/lib/utils";

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none ring-slate-300 placeholder:text-slate-400 focus:ring-2",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
