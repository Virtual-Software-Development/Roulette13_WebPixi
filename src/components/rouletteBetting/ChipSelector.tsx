import { useTranslation } from 'react-i18next'
import { CHIP_DENOMINATIONS } from '../../data/betChipMockData'
import { useBetSlipStore } from '../../store/useBetSlipStore'
import './chipSelector.css'

export function ChipSelector() {
  const { t } = useTranslation()
  const selectedChipValue = useBetSlipStore((state) => state.selectedChipValue)
  const setSelectedChipValue = useBetSlipStore((state) => state.setSelectedChipValue)

  return (
    <div className="chip-selector">
      <span className="chip-selector-title">{t('bettingView.chipSelector.label')}</span>
      <div className="chip-selector-row">
        {CHIP_DENOMINATIONS.map((value) => (
          <button
            key={value}
            type="button"
            className="chip-selector-chip"
            data-selected={value === selectedChipValue}
            aria-pressed={value === selectedChipValue}
            onClick={() => setSelectedChipValue(value)}
          >
            ${value}
          </button>
        ))}
      </div>
    </div>
  )
}
