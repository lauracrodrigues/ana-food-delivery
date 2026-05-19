// v1.0.0 — Input com máscara monetária BR (R$ 0,00)
// Aceita digitação livre, formata em display, retorna número decimal
import { forwardRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value?: number | null;
  onChange?: (value: number) => void;
  currency?: "BRL";
}

// Formata centavos pra "R$ 1.234,56"
function formatCents(cents: number, withSymbol = true): string {
  const reais = (cents / 100).toFixed(2);
  const [int, dec] = reais.split(".");
  const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withSymbol ? "R$ " : ""}${intFmt},${dec}`;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, placeholder = "R$ 0,00", ...props }, ref) => {
    // Estado interno em centavos pra evitar arredondamento
    const [cents, setCents] = useState<number>(() => Math.round((value ?? 0) * 100));

    // Sincroniza com prop externa (controlled)
    useEffect(() => {
      const externalCents = Math.round((value ?? 0) * 100);
      if (externalCents !== cents) setCents(externalCents);
    }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Extrai dígitos
      const digits = e.target.value.replace(/\D/g, "");
      const newCents = digits === "" ? 0 : parseInt(digits, 10);
      setCents(newCents);
      onChange?.(newCents / 100);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={cents === 0 ? "" : formatCents(cents)}
        onChange={handleChange}
        placeholder={placeholder}
        {...props}
      />
    );
  }
);
CurrencyInput.displayName = "CurrencyInput";
