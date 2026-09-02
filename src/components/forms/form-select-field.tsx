import type { FieldValues, Path } from "react-hook-form";
import type { FieldError } from "react-hook-form";

type FormSelectFieldProps<T extends FieldValues> = {
  name: Path<T>;
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  wide?: boolean;
  error?: FieldError | undefined;
};

export function FormSelectField<T extends FieldValues>({
  name,
  label,
  options,
  value,
  onChange,
  placeholder = `Select ${label.toLowerCase()}`,
  wide = false,
  error,
}: FormSelectFieldProps<T>) {
  return (
    <label
      className={`grid gap-2 text-sm ${wide ? "sm:col-span-2" : ""}`}
      htmlFor={name}
    >
      {label}

      <select
        id={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        className="glass-control rounded-xl px-4 py-3 outline-none focus-visible:ring-2 focus-visible:ring-[#3051a0]"
      >
        <option value="">{placeholder}</option>

        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {error && (
        <span className="text-xs text-red-700" role="alert">
          {error.message}
        </span>
      )}
    </label>
  );
}