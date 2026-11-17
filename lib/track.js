// Contador propio (navegador): avisa al servidor cuando alguien agrega al pedido o toca
// "Solicitar por WhatsApp". sendBeacon no bloquea la página ni el clic; si falla, se ignora.
export function track(event, data = {}) {
  try {
    navigator.sendBeacon?.("/api/m", new Blob([JSON.stringify({ e: event, ...data })], { type: "application/json" }));
  } catch {}
}
