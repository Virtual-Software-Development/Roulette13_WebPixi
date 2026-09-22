// GET /video/missing (internal/video/handler.go: "backs the admin 'Video Library' screen's gap
// detection") -- keys are result labels ("0", "00", "1".."36"), values are how many more variants
// are needed before that result is fully covered.
export type MissingVideoVariants = Record<string, number>
