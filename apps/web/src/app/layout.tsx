import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "App Sorteos · República Dominicana", template: "%s | App Sorteos" },
  description: "Conoce App Sorteos. Cantidad a tu elección, números asignados por el servidor y verificación manual del pago.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="es-DO"><body><ToastProvider>{children}</ToastProvider></body></html>;
}
