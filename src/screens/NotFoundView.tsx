import { useTranslation } from 'react-i18next'
import { ErrorView } from './ErrorView'
import { navigateToPreview } from '../utils/navigatePreview'

// Capa de "detección" para el caso 404 (ver ErrorView.tsx: esa vista no sabe qué significa 404,
// solo presenta lo que le pasan). Usada por main.tsx cuando ?preview= trae un valor que no
// coincide con ninguna pantalla conocida -- navigateToPreview(null) es el mismo mecanismo que ya
// usa el logo del Header para volver a la pantalla principal (ver navigatePreview.ts).
export function NotFoundView() {
  const { t } = useTranslation()
  return (
    <ErrorView
      code={404}
      title={t('errorView.notFound.title')}
      description={t('errorView.notFound.description')}
      actionLabel={t('errorView.goBackHome')}
      onAction={() => navigateToPreview(null)}
    />
  )
}
