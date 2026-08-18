export type TimeColor = 'red' | 'black'

export interface RouletteResult{
    id: string
    time: string
    drawNumber: string
    winningNumber: number
    timeColor: TimeColor
}