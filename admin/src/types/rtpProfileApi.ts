// Mirrors internal/rtpprofiles/model.go on the Go backend.
export interface RtpProfileApi {
  id: number
  name: string
  juego: string
  targetRtp: number
  minBand: number
  maxBand: number
  activeDays: string[]
  restrictHours: boolean
  startTime?: string | null
  endTime?: string | null
  startDate: string
  expiresDate: string
  disabled: boolean
  status: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface RtpProfileEventApi {
  id: number
  profileId: number
  profileName: string
  juego: string
  eventType: string
  changedBy?: string
  createdAt: string
  // Denormalized from the profile as of read time -- see internal/rtpprofiles/model.go.
  startDate: string
  expiresDate: string
  restrictHours: boolean
  startTime?: string | null
  endTime?: string | null
}

export interface CreateRtpProfileInput {
  name: string
  juego: string
  targetRtp: number
  minBand: number
  maxBand: number
  activeDays: string[]
  restrictHours: boolean
  startTime?: string | null
  endTime?: string | null
  startDate: string
  expiresDate: string
}
