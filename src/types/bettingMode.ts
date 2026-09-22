// Player (self-service) vs Cashier (POS) -- se fija una sola vez al montar RouletteBettingView
// (viene del ?preview= resuelto en main.tsx) y se pasa como prop hacia abajo, mismo criterio que
// Header usa para `activeTab`: es una constante de ruta, no estado mutable en caliente.
export type BettingMode = 'player' | 'cashier'
