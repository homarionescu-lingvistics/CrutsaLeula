import { type ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
};

export function Button({
  variant = "primary",
  className = "",
  ...props
}: Props) {
  const styles =
    variant === "primary"
      ? "bg-emerald-500 text-white hover:bg-emerald-400"
      : "bg-transparent text-zinc-700 hover:bg-zinc-200";

  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold transition disabled:opacity-50 ${styles} ${className}`}
      {...props}
    />
  );
}
