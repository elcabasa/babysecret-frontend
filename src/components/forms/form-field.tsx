import type { FieldValues, Path, UseFormRegister } from "react-hook-form";
import type { FieldError } from "react-hook-form";

type FormFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  type?: string;
  wide?: boolean;
  register: UseFormRegister<T>;
  error?: FieldError | undefined;
};

export function FormField<T extends FieldValues>({
  name,
  label,
  type = "text",
  wide = false,
  register,
  error,
}: FormFieldProps<T>) {
  return (
    <label
      className={`grid gap-2 text-sm ${wide ? "sm:col-span-2" : ""}`}
      htmlFor={name}
    >
      {label}

      <input
        id={name}
        type={type}
        {...register(name)}
        aria-invalid={Boolean(error)}
        className="glass-control rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3051a0]"
      />

      {error && (
        <span className="text-xs text-red-700" role="alert">
          {error.message}
        </span>
      )}
    </label>
  );
}