// Todavía no hay router en el proyecto -- "navegar" entre pantallas top-level se resuelve
// reescribiendo ?preview= en la URL (reload completo), ver main.tsx: resolveScreen() lee ese
// query param una sola vez al montar. Extraído de Header.tsx (que lo usaba localmente) para que
// otros componentes fuera del Header (ej. BettingGamePickerModal.tsx) puedan reusar el mismo
// mecanismo sin importar un componente para llegar a una función.
export function navigateToPreview(preview: string | null) {
  const url = new URL(window.location.href)
  if (preview) {
    url.searchParams.set('preview', preview)
  } else {
    url.searchParams.delete('preview')
  }
  window.location.href = url.toString()
}
