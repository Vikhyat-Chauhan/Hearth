import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

// The "$"-prefixed amount field shared by BillForm, ExpenseForm, SettlementForm.
// Parent owns the value/parsing (parseDollarsToCents); this only renders the field.
const CurrencyInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function CurrencyInput({ className, ...props }, ref) {
    return (
      <div className="relative">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400"
        >
          $
        </span>
        <input
          ref={ref}
          inputMode="decimal"
          placeholder="0.00"
          className={cn(
            "w-full rounded-lg border border-gray-300 bg-white py-2 pl-7 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none disabled:opacity-60",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);

export default CurrencyInput;
