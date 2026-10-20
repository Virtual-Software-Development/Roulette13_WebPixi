export interface DrawResultResponse {
  msgType: 'drawResult'
  drawNo: string
  result: number
  video: number
  // The clip every machine plays for this round, chosen by the backend: Videos/{result}/{videoFile}
  // in the local library. Missing on backends older than this field.
  videoFile?: string
}
