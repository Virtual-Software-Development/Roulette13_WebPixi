import { useTranslation } from 'react-i18next'
import type { QuickMoneyGameType } from '../../types/quickMoneyBet'
import { QUICK_MONEY_DIGIT_COUNT } from '../../types/quickMoneyBet'
import type { QuickMoneyActiveField } from './quickMoneyBettingTypes'
import './digitEntryCard.css'

interface DigitEntryCardProps {
  // 1 grupo (Pick 3 o Pick 4) o 2 (pestaña "Play Both", ver decisión en el plan) -- nunca más.
  gameTypes: QuickMoneyGameType[]
  digitsByGame: Record<QuickMoneyGameType, (number | null)[]>
  activeField: QuickMoneyActiveField
  onFocusField: (gameType: QuickMoneyGameType, index: number) => void
}

// "1 ENTER NUMBERS" de la referencia -- cada casillero es un botón que fija el foco activo (ver
// activeField en el workspace); SharedNumberPad escribe en el que esté activo, con auto-advance
// al siguiente casillero cuando se llena (esa lógica vive en el workspace, acá solo se pinta el
// estado que ya llega resuelto).
export function DigitEntryCard({ gameTypes, digitsByGame, activeField, onFocusField }: DigitEntryCardProps) {
  const { t } = useTranslation()

  return (
    <div className="qm-card">
      <div className="qm-card-heading">
        <span className="qm-card-step">1</span>
        <div>
          <h3 className="qm-card-title">{t('quickMoneyBettingView.digitEntry.title')}</h3>
          <p className="qm-card-subtitle">{t('quickMoneyBettingView.digitEntry.hint')}</p>
        </div>
      </div>

      {gameTypes.map((gameType) => (
        <div key={gameType} className="qm-digit-group">
          {gameTypes.length > 1 && (
            <span className="qm-digit-group-label" data-accent={gameType}>
              {t(`quickMoneyBettingView.gameType.${gameType}`)}
            </span>
          )}
          <div className="qm-digit-boxes">
            {Array.from({ length: QUICK_MONEY_DIGIT_COUNT[gameType] }, (_, index) => {
              const digit = digitsByGame[gameType][index]
              const isActive = activeField?.kind === 'digit' && activeField.gameType === gameType && activeField.index === index
              return (
                <button
                  key={index}
                  type="button"
                  className="qm-digit-box"
                  data-accent={gameType}
                  data-active={isActive}
                  aria-label={t('quickMoneyBettingView.digitEntry.digitAria', { position: index + 1 })}
                  onClick={() => onFocusField(gameType, index)}
                >
                  {digit ?? ''}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
