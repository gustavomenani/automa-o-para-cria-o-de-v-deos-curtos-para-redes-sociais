"use client";

import { CalendarClock, Save, Wand2 } from "lucide-react";
import { useFormStatus } from "react-dom";

const icons = {
  calendar: CalendarClock,
  save: Save,
  wand: Wand2,
};

type SubmitButtonProps = {
  children: React.ReactNode;
  pendingLabel: string;
  icon?: keyof typeof icons;
  variant?: "primary" | "secondary";
  disabled?: boolean;
  name?: string;
  value?: string;
  fullWidth?: boolean;
};

const variants = {
  primary:
    "bg-teal-700 text-white hover:bg-teal-800 disabled:bg-zinc-200 disabled:text-zinc-500",
  secondary:
    "border border-stone-300 bg-white text-zinc-900 hover:bg-stone-100 disabled:border-stone-200 disabled:bg-stone-100 disabled:text-zinc-400",
};

export function SubmitButton({
  children,
  pendingLabel,
  icon,
  variant = "primary",
  disabled = false,
  name,
  value,
  fullWidth = false,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const Icon = icon ? icons[icon] : null;

  return (
    <button
      name={name}
      value={value}
      disabled={disabled || pending}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {Icon ? <Icon size={16} /> : null}
      {pending ? pendingLabel : children}
    </button>
  );
}
