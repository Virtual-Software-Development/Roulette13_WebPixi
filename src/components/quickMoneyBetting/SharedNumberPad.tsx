import { useTranslation } from 'react-i18next'
import { BackspaceIcon, ClearIcon } from './icons'
import './sharedNumberPad.css'

const DIGIT_ROWS: number[][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
]

interface SharedNumberPadProps {
  onDigit: (digit: number) => void
  onBackspace: () => void
  onClear: () => void
}

// Un solo teclado para los DOS inputs de la referencia (dígitos del sorteo Y monto de apuesta) --
// no sabe nada de "hacia dónde" van los toques, eso lo decide el campo con foco activo en
// QuickMoneyBettingWorkspace (ver activeField/quickMoneyBettingTypes.ts). Mismo criterio que la
// leyenda de la imagen: "Tap a field on the right, then use this keypad".
export function SharedNumberPad({ onDigit, onBackspace, onClear }: SharedNumberPadProps) {
  const { t } = useTranslation()

  return (
    <div className="qm-numberpad">
      <h3 className="qm-numberpad-title">{t('quickMoneyBettingView.numberPad.title')}</h3>
      <p className="qm-numberpad-hint">{t('quickMoneyBettingView.numberPad.hint')}</p>

      <div className="qm-numberpad-grid">
        {DIGIT_ROWS.flat().map((digit) => (
          <button key={digit} type="button" className="qm-numberpad-key" onClick={() => onDigit(digit)}>
            {digit}
          </button>
        ))}
        <button type="button" className="qm-numberpad-key qm-numberpad-key--action" onClick={onBackspace} aria-label={t('quickMoneyBettingView.numberPad.backspace')}>
          <BackspaceIcon />
        </button>
        <button type="button" className="qm-numberpad-key" onClick={() => onDigit(0)}>
          0
        </button>
        <button type="button" className="qm-numberpad-key qm-numberpad-key--action" onClick={onClear} aria-label={t('quickMoneyBettingView.numberPad.clear')}>
          <ClearIcon />
        </button>
      </div>

      <p className="qm-numberpad-tagline">{t('quickMoneyBettingView.numberPad.tagline')}</p>
    </div>
  )
}
