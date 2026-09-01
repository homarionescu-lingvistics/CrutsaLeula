import { type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ label, id, className = "", ...props }: Props) {
  const inputId = id ?? props.name;
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        id={inputId}
        className={`w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-zinc-900 outline-none ring-emerald-500/40 placeholder:text-zinc-400 focus:ring-2 ${className}`}
        {...props}
      />
    </label>
  );
}
