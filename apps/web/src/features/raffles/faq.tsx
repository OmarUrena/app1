import { Icon } from "@/components/ui/icon";

const questions = [
  ["¿Puedo elegir mis números?", "Tú eliges cuántos boletos quieres. En el flujo real, el servidor asigna números aleatoriamente al recibir la orden junto con un comprobante válido."],
  ["¿Enviar el comprobante confirma mi pago?", "La orden queda pendiente de verificación. El administrador revisa manualmente la transferencia antes de confirmar el pago."],
  ["¿Qué ocurre mientras revisan mi transferencia?", "Una vez creada la orden con comprobante, sus números permanecen reservados hasta una resolución administrativa; no se liberan automáticamente por tiempo."],
  ["¿Puedo comprar en esta demostración?", "Esta vista permite explorar el diseño. No acepta órdenes ni transferencias, no reserva boletos y no ofrece premios reales."],
];
export function FAQ({ demo = false }: { demo?: boolean }) {
  const visible = demo ? questions : [...questions.slice(0, -1), ["¿Cuándo recibo mis números?", "Después de registrar la orden junto con un comprobante válido. Quedan reservados mientras el pago se verifica manualmente."]];
  return <div className="faq-list">{visible.map(([question, answer]) => <details key={question}><summary>{question}<Icon name="plus" /></summary><p>{answer}</p></details>)}</div>;
}
