// TEMPORAL -- `npm run dev:lan`: otras máquinas de la red abren la página por la IP de esta
// (http://<ip>:4100/) para ver lo mismo. Esas máquinas son solo espectadoras: no son la terminal,
// así que no tienen MAC propia que pedirle al servidor (server/terminalInfo.js se la niega a todo lo
// que no sea localhost) ni credenciales MQTT. Para ellas no se abre la conexión MQTT y MqttGate no
// las manda al 503 por eso. La máquina que sirve la página (localhost) sigue igual que siempre.
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1'])

export const IS_LAN_VIEWER = __LAN_PREVIEW__ && !LOCAL_HOSTNAMES.has(window.location.hostname)
