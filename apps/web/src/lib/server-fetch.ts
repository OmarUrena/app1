import { Agent } from "undici";

const agents = new Map<4 | 6, Agent>();
// Imported only by the server-only admin module. Never disable certificate validation.
export function fetchFromServer(input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]): ReturnType<typeof fetch> {
  const configured = process.env.HTTP_DNS_FAMILY;
  if (!configured || configured === "auto") return fetch(input, init);
  if (configured !== "4" && configured !== "6") throw new Error("HTTP_DNS_FAMILY debe ser auto, 4 o 6.");
  const family = configured === "4" ? 4 : 6;
  let dispatcher = agents.get(family);
  if (!dispatcher) { dispatcher = new Agent({ connect: { family } }); agents.set(family, dispatcher); }
  return fetch(input, { ...init, dispatcher } as RequestInit & { dispatcher: Agent });
}
