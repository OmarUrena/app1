import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { Button, Input } from "@/components/ui";
import { ToastProvider, useToast } from "@/components/ui/toast";

test("input vincula etiqueta, ayuda y error para lectores de pantalla", () => {
  render(<Input id="quantity" label="Cantidad" hint="Indica la cantidad" error="Cantidad no válida" />);
  const input = screen.getByRole("textbox", { name: "Cantidad" });
  expect(input).toHaveAttribute("aria-invalid", "true");
  expect(input).toHaveAccessibleDescription("Indica la cantidad Cantidad no válida");
});
test("botón deshabilitado no ejecuta acciones", () => {
  const onClick = vi.fn();
  render(<Button disabled onClick={onClick}>Enviar</Button>);
  fireEvent.click(screen.getByRole("button", { name: "Enviar" }));
  expect(onClick).not.toHaveBeenCalled();
});
test("toast anuncia cambios y puede cerrarse por botón", () => {
  function Trigger() { const notify = useToast(); return <Button onClick={() => notify("Información actualizada")}>Avisar</Button>; }
  render(<ToastProvider><Trigger /></ToastProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Avisar" }));
  expect(screen.getByRole("status")).toHaveTextContent("Información actualizada");
  fireEvent.click(screen.getByRole("button", { name: "Cerrar notificación" }));
  expect(screen.getByRole("status")).toBeEmptyDOMElement();
});
