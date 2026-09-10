export type TimeColor = 'red' | 'black'

export interface RouletteResult{
    id: string
    // Instante (epoch ms) en que se registró el resultado -- crudo, NO un string ya formateado,
    // para poder calcular "hace Xm"/"NOW" en el momento de mostrarlo (ver useRelativeTime) en vez
    // de congelar un formato fijo al recibir el dato.
    timestamp: number
    drawNumber: string
    winningNumber: number
    timeColor: TimeColor
}