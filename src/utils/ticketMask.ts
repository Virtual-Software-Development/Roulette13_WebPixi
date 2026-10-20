// A ticket's identifier as it may be shown on a screen: a fixed run of bullets and its last 6
// letters/digits in upper case -- ••••••K4821F. Same rule as the backend's internal/ticketmask
// (which masks every code it sends), for the codes this terminal itself holds, e.g. the ticket
// preview. Always 6 bullets and no separators, so the mask doesn't reveal the code's length; 6 or
// fewer characters are masked entirely (the full code cashes the prize).
const VISIBLE = 6
const BULLETS = '••••••'

export function maskTicketCode(code: string): string {
  const alnum = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return alnum.length <= VISIBLE ? BULLETS : BULLETS + alnum.slice(-VISIBLE)
}
