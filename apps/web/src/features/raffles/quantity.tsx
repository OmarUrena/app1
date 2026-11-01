"use client";

import { useId, useState } from "react";
import { Icon } from "@/components/ui/icon";

export function PurchaseQuantity({ min, max, disabled = false }: { min: number; max: number; disabled?: boolean }) {
  const id = useId();
  const [raw, setRaw] = useState(String(min));
  const value = Number(raw);
  const valid = raw.trim() !== "" && Number.isSafeInteger(value) && value >= min && value <= max;
  const change = (direction: number) => setRaw(String(Math.min(max, Math.max(min, (valid ? value : min) + direction))));
  return <div className="quantity-field"><label htmlFor={id}>Cantidad de boletos</label><div className="quantity-row"><button type="button" className="quantity-button" aria-label="Reducir cantidad" disabled={disabled || (valid && value <= min)} onClick={() => change(-1)}><Icon name="minus" /></button><input id={id} type="number" inputMode="numeric" min={min} max={max} step="1" value={raw} disabled={disabled} onChange={event => setRaw(event.target.value)} aria-invalid={!valid} aria-describedby={`${id}-hint${!valid ? ` ${id}-error` : ""}`} /><button type="button" className="quantity-button" aria-label="Aumentar cantidad" disabled={disabled || (valid && value >= max)} onClick={() => change(1)}><Icon name="plus" /></button></div><p id={`${id}-hint`} className="field-hint">De {min} a {max} boletos. No eliges los números.</p>{!valid && <p id={`${id}-error`} className="field-error" role="alert">Introduce una cantidad entera entre {min} y {max}.</p>}<p className="quantity-preview" role="status">{disabled ? "Esta rifa no admite participación." : valid ? `Vista previa: ${value} ${value === 1 ? "boleto" : "boletos"}. No reserva cupo.` : "Revisa la cantidad para continuar explorando."}</p></div>;
}
