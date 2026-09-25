import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFocusTrap } from '../../../hooks/useFocusTrap'
import { AdminSelect, type AdminSelectOption } from '../AdminSelect'
import { useAdminVideosStore } from '../../../store/useAdminVideosStore'
import type { UploadHistoryGame } from '../../../types/adminVideos'
import { CloseIcon, UploadCloudIcon } from './icons'
import './adminVideosShared.css'

// Sin backend real de upload (ver investigación previa: cero precedente en todo el proyecto), así
// que no hay una lista de formatos/tamaño real que validar contra -- el accept del <input> sigue
// el mismo par mp4/webm que ya usa VideoLibrarySettingsCard.tsx (Settings > General).
const ACCEPTED_EXTENSIONS = '.mp4,.webm'

interface UploadVideoModalProps {
  game: UploadHistoryGame
  // true cuando se abre DESDE un tab específico (Roulette/Quick Money) -- el Game ya está decidido
  // por el contexto y no tiene sentido dejarlo cambiar (pedido explícito: "puede preseleccionar
  // Game: Roulette/Quick Money"). false solo desde Upload History, donde sí se puede elegir.
  lockGame: boolean
  // Target pre-elegido cuando se abre desde la acción "Replace File"/"Upload File" de una fila
  // puntual -- sigue siendo editable (el usuario puede cambiar de opinión y apuntar a otro asset).
  initialTargetId?: string
  onClose: () => void
  onUploaded: (game: UploadHistoryGame, targetId: string) => void
}

// Modal compartido por los 3 tabs (pedido explícito: "una única acción Upload Video", "no
// dupliques dos modales completos"). Mismo mecanismo que UserModal.tsx (backdrop + useFocusTrap +
// Escape + foco inicial + restaurar foco al cerrar). Los campos SÍ cambian según el Game
// seleccionado (Result Number/Variant para Roulette, Draw Type/Draw # para Quick Money) porque
// cada uno apunta a un modelo de datos distinto -- ver useAdminVideosStore.ts.
export function UploadVideoModal({ game: initialGame, lockGame, initialTargetId, onClose, onUploaded }: UploadVideoModalProps) {
  const { t } = useTranslation()
  const rouletteAssets = useAdminVideosStore((s) => s.rouletteAssets)
  const quickMoneyRows = useAdminVideosStore((s) => s.quickMoneyRows)
  const uploadRouletteVideo = useAdminVideosStore((s) => s.uploadRouletteVideo)
  const uploadQuickMoneyVideo = useAdminVideosStore((s) => s.uploadQuickMoneyVideo)

  const [game, setGame] = useState<UploadHistoryGame>(initialGame)
  const [targetId, setTargetId] = useState<string | undefined>(initialTargetId)
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const dialogRef = useRef<HTMLDivElement>(null)
  const previouslyFocusedRef = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useFocusTrap(dialogRef, true)

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null
    document.getElementById('upload-video-target')?.focus()
    return () => previouslyFocusedRef.current?.focus()
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  const gameOptions: AdminSelectOption<UploadHistoryGame>[] = [
    { value: 'roulette', label: t('admin.videos.shared.uploadModal.gameRoulette') },
    { value: 'quickMoney', label: t('admin.videos.shared.uploadModal.gameQuickMoney') },
  ]

  // Prioriza los assets/draws que realmente necesitan un archivo (Missing/Invalid/Failed primero)
  // -- así "Upload Video" desde el topbar (sin fila puntual) ofrece justo lo que hace falta
  // resolver arriba de la lista, en vez de un orden arbitrario.
  const targetOptions: AdminSelectOption<string>[] = useMemo(() => {
    if (game === 'roulette') {
      return [...rouletteAssets]
        .sort((a, b) => (a.status === 'missing' || a.status === 'invalid' ? -1 : 1) - (b.status === 'missing' || b.status === 'invalid' ? -1 : 1))
        .map((a) => ({
          value: a.id,
          label: `#${a.resultNumber} · ${t('admin.videos.roulette.table.variant')} ${a.variant} (${t(`admin.videos.roulette.status.${a.status}`)})`,
        }))
    }
    return [...quickMoneyRows]
      .sort((a, b) => (a.deliveryStatus === 'missing' || a.deliveryStatus === 'late' ? -1 : 1) - (b.deliveryStatus === 'missing' || b.deliveryStatus === 'late' ? -1 : 1))
      .map((r) => ({
        value: r.id,
        label: `${r.drawType === 'pick3' ? 'Pick 3' : 'Pick 4'} · #${r.drawNumber} (${t(`admin.videos.quickMoney.delivery.${r.deliveryStatus}`)})`,
      }))
  }, [game, rouletteAssets, quickMoneyRows, t])

  useEffect(() => {
    // Cambiar de Game invalida el target elegido si pertenecía al otro juego.
    if (!targetOptions.some((o) => o.value === targetId)) {
      setTargetId(undefined)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game])

  const canSubmit = !!targetId && !!file && !submitting

  const handleSubmit = () => {
    if (!targetId || !file) return
    setSubmitting(true)
    if (game === 'roulette') {
      uploadRouletteVideo(targetId, file, t('admin.videos.shared.uploadModal.currentUser'))
    } else {
      uploadQuickMoneyVideo(targetId, file, t('admin.videos.shared.uploadModal.currentUser'))
    }
    onUploaded(game, targetId)
    onClose()
  }

  return (
    <div className="admin-videos-modal-backdrop" onClick={submitting ? undefined : onClose}>
      <div ref={dialogRef} className="admin-videos-modal" role="dialog" aria-modal="true" aria-labelledby="upload-video-modal-title" onClick={(e) => e.stopPropagation()}>
        <div className="admin-videos-modal-header">
          <div>
            <h2 id="upload-video-modal-title" className="admin-videos-modal-title">
              {t('admin.videos.shared.uploadModal.title')}
            </h2>
            <p className="admin-videos-modal-subtitle">{t('admin.videos.shared.uploadModal.subtitle')}</p>
          </div>
          <button type="button" className="admin-videos-modal-close" aria-label={t('admin.videos.shared.close')} onClick={onClose} disabled={submitting}>
            <CloseIcon />
          </button>
        </div>

        <div className="admin-videos-modal-form">
          <AdminSelect
            label={t('admin.videos.shared.uploadModal.game')}
            value={game}
            options={gameOptions}
            onChange={setGame}
            disabled={lockGame}
          />

          <div className="admin-videos-modal-field">
            <span className="admin-videos-modal-field-label" id="upload-video-target-label">
              {game === 'roulette' ? t('admin.videos.shared.uploadModal.targetRoulette') : t('admin.videos.shared.uploadModal.targetQuickMoney')}
            </span>
            <AdminSelect value={targetId ?? ''} options={[{ value: '', label: t('admin.videos.shared.uploadModal.targetPlaceholder') }, ...targetOptions]} onChange={(v) => setTargetId(v || undefined)} />
          </div>

          <div className="admin-videos-modal-field">
            <span className="admin-videos-modal-field-label">{t('admin.videos.shared.uploadModal.file')}</span>
            <button type="button" className="admin-videos-upload-file-btn" onClick={() => fileInputRef.current?.click()}>
              <UploadCloudIcon />
              <span>{file ? file.name : t('admin.videos.shared.uploadModal.chooseFile')}</span>
            </button>
            <input
              ref={fileInputRef}
              id="upload-video-target"
              type="file"
              accept={ACCEPTED_EXTENSIONS}
              className="admin-videos-upload-file-input"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="admin-videos-modal-field-hint">{t('admin.videos.shared.uploadModal.fileHint')}</span>
          </div>
        </div>

        <div className="admin-videos-modal-footer">
          <button type="button" className="admin-videos-btn admin-videos-btn--ghost" disabled={submitting} onClick={onClose}>
            {t('admin.videos.shared.uploadModal.cancel')}
          </button>
          <button type="button" className="admin-videos-btn admin-videos-btn--primary" disabled={!canSubmit} onClick={handleSubmit}>
            {t('admin.videos.shared.uploadModal.submit')}
          </button>
        </div>
      </div>
    </div>
  )
}
