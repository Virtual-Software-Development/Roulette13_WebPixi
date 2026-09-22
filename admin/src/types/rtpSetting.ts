// Mirrors the Go backend's gameconfig.RTPSetting (internal/gameconfig/model.go) exactly --
// GET /rtp-settings/{juego} returns this shape (404 when no config exists yet for that game),
// POST /rtp-settings inserts a new dated row (never mutates one in place).
export interface RtpSettingApi {
  id: number
  juego: string
  targetRtp: number
  minBand: number
  maxBand: number
  ventanaMedicionEventos: number
  topeCorreccionEventoPct: number
  factorSuavizado: number
  // yyyy-mm-dd, plain date (no time component) -- unlike the admin UI's datetime-local fields.
  effectiveDate: string
}
