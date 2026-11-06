import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, expect, test, vi } from "vitest";
import { OrderActions } from "@/features/admin/order-actions";
import { AdminClientError, adminFetch, adminMessage } from "@/features/admin/client";
import { localTransferTime, parseMinor, type AdminOrder } from "@/features/admin/types";
import { readAdminEnvironment } from "@/lib/config";
import { LoginForm } from "@/features/admin/auth";
vi.mock("@/lib/use-hydrated", () => ({ useHydrated: () => false }));
vi.mock("@/features/admin/client", async importOriginal => ({ ...await importOriginal<typeof import("@/features/admin/client")>(), adminFetch: vi.fn() }));
const order = { id: "11111111-1111-4111-8111-111111111111", orderCode: "RF-TEST-PRIVATE", status: "PENDING_REVIEW", version: 7, totalMinor: 10025, quantity: 1, duplicateReferenceCount: 0, duplicateReceiptCount: 0 } as AdminOrder;
beforeAll(() => { HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); }; HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); }; });

test("login diferencia indisponibilidad y red de credenciales incorrectas", () => {
  expect(adminMessage("SERVICE_UNAVAILABLE")).toContain("API administrativa");
  expect(adminMessage("NETWORK_ERROR")).toContain("conectar");
  expect(adminMessage("INTERNAL_ERROR")).toContain("verificar el acceso");
  expect(adminMessage("INVALID_CREDENTIALS")).toContain("esos datos");
});

test("configuración administrativa rechaza secretos, URLs con credenciales y Auth HTTP fuera de test", () => {
  const valid = { APP_ENV: "development", SUPABASE_URL: "https://project.example.test", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture" };
  expect(readAdminEnvironment(valid)?.url).toBe("https://project.example.test");
  expect(readAdminEnvironment({ ...valid, API_MODE: "mock" })).toBeUndefined();
  for (const key of ["sb_secret_private", "service_role", "legacy.jwt.token"]) expect(() => readAdminEnvironment({ ...valid, SUPABASE_PUBLISHABLE_KEY: key })).toThrow();
  for (const url of ["http://127.0.0.1:9000", "https://user:password@project.example.test", "https://project.example.test/path"]) expect(() => readAdminEnvironment({ ...valid, SUPABASE_URL: url })).toThrow();
  expect(readAdminEnvironment({ ...valid, APP_ENV: "test", SUPABASE_URL: "http://127.0.0.1:9000" })?.url).toBe("http://127.0.0.1:9000");
});
test("login no acepta credenciales antes de hidratación y nunca usa GET para la contraseña", () => {
  render(<LoginForm canResume={false} />);
  expect(screen.getByLabelText("Correo administrativo")).toBeDisabled();
  expect(screen.getByLabelText("Contraseña")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeDisabled();
  expect(screen.getByLabelText("Contraseña").closest("form")).toHaveAttribute("method", "post");
});

test("importes bancarios se convierten exactamente a centavos y rechazan precisión o rangos inseguros", () => {
  expect(parseMinor("100.25")).toBe(10025); expect(parseMinor("100,2")).toBe(10020);
  expect(parseMinor("90071992547409.91")).toBe(Number.MAX_SAFE_INTEGER);
  for (const invalid of ["1.001", "1e5", "-1", "0", "90071992547409.92", " 10", "1,000.00"]) expect(() => parseMinor(invalid)).toThrow();
});
test("fecha bancaria usa Santo Domingo aunque el dispositivo tenga otra zona", () => {
  expect(localTransferTime("2026-11-05T08:30")).toBe("2026-11-05T12:30:00.000Z");
  expect(() => localTransferTime("2026-11-05")).toThrow();
});
test("revisor ADMIN no recibe acciones financieras de OWNER", () => {
  render(<OrderActions order={order} role="ADMIN" onReload={vi.fn()} />);
  expect(screen.queryByRole("button", { name: "Aprobar pago" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Resolver y cancelar" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Requiere resolución" })).toBeVisible();
});
test("órdenes finales no ofrecen nuevas decisiones de revisión", () => {
  render(<OrderActions order={{ ...order, status: "PAID" }} role="OWNER" onReload={vi.fn()} />);
  expect(screen.queryByRole("button", { name: "Aprobar pago" })).not.toBeInTheDocument();
  expect(screen.getByText(/decisión final/)).toBeVisible();
});
test("confirmación, doble clic y pérdida de respuesta conservan payload y clave del mismo intento", async () => {
  const reload = vi.fn().mockResolvedValue(undefined), call = vi.mocked(adminFetch);
  call.mockRejectedValueOnce(new AdminClientError("NETWORK_ERROR", 0)).mockResolvedValueOnce({ status: "UNDER_REVIEW" });
  render(<OrderActions order={order} role="OWNER" onReload={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "Marcar en revisión" }));
  fireEvent.click(screen.getByRole("button", { name: "Revisar decisión" })); expect(call).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Confirmar decisión" }));
  await screen.findByRole("button", { name: "Reintentar misma decisión" });
  const first = call.mock.calls[0]!;
  fireEvent.click(screen.getByRole("button", { name: "Reintentar misma decisión" }));
  await waitFor(() => expect(reload).toHaveBeenCalledOnce());
  expect(call).toHaveBeenCalledTimes(2); expect(call.mock.calls[1]).toEqual(first);
  expect(JSON.parse(String(first[1]?.body))).toEqual({ expectedVersion: 7 });
});
test("conflicto de versión bloquea un nuevo intento hasta actualizar el detalle", async () => {
  const reload = vi.fn().mockResolvedValue(undefined), call = vi.mocked(adminFetch); call.mockReset();
  call.mockRejectedValueOnce(new AdminClientError("CONCURRENT_MODIFICATION", 409));
  render(<OrderActions order={order} role="OWNER" onReload={reload} />);
  fireEvent.click(screen.getByRole("button", { name: "Marcar en revisión" }));fireEvent.click(screen.getByRole("button", { name: "Revisar decisión" }));fireEvent.click(screen.getByRole("button", { name: "Confirmar decisión" }));
  await screen.findByText(/Otro administrador modificó/); expect(screen.getByRole("button", { name: "Reintentar misma decisión" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Actualizar detalle antes de decidir" }));await waitFor(() => expect(reload).toHaveBeenCalledOnce());expect(call).toHaveBeenCalledOnce();
});
