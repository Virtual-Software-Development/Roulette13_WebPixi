export function parseApiDateTime(datetime: string): Date {
  return new Date(datetime.replace(' ', 'T'))
}
