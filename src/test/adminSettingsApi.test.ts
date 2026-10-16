import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAdminSettings, parseRecipients, saveAdminSettings } from '../api/adminSettings'

const apiSettings = {
  general: { timezone: 'America/Santo_Domingo', defaultLanguage: 'en', adminLanguage: 'en', itemsPerPage: 25, dateFormat: 'YYYY-MM-DD', maintenanceMode: false },
  notifications: {
    emailEnabled: true,
    recipients: ['ops@example.com', 'alerts@example.com'],
    events: [
      { code: 'RTP_OUT_OF_BAND', enabled: true },
      { code: 'LARGE_WIN', enabled: false },
      { code: 'SOMETHING_NEW', enabled: true },
    ],
  },
}

function mockFetch() {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ current: apiSettings, defaults: apiSettings }), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('admin settings API', () => {
  it('maps the backend response to the page shape, ignoring unknown events', async () => {
    mockFetch()
    const { current } = await fetchAdminSettings()
    expect(current.general.timezone).toBe('America/Santo_Domingo')
    expect(current.notificationChannels.email).toBe(true)
    expect(current.emailNotifications.recipients).toBe('ops@example.com, alerts@example.com')
    expect(current.notificationEvents).toEqual({ rtpOutOfBand: true, largeWin: false })
  })

  it('sends recipients as a list and events by backend code', async () => {
    const fetchMock = mockFetch()
    const { current } = await fetchAdminSettings()
    await saveAdminSettings({ ...current, emailNotifications: { recipients: 'a@example.com,  b@example.com;c@example.com ' } })

    const [url, init] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(url).toBe('/api/admin-settings')
    expect(init.method).toBe('PUT')
    expect(JSON.parse(init.body as string).notifications).toEqual({
      emailEnabled: true,
      recipients: ['a@example.com', 'b@example.com', 'c@example.com'],
      events: [
        { code: 'RTP_OUT_OF_BAND', enabled: true },
        { code: 'LARGE_WIN', enabled: false },
      ],
    })
  })

  it('surfaces the backend error message on a failed save', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'email inválido: x' }), { status: 400 })))
    const settings = {
      general: apiSettings.general,
      notificationChannels: { email: true },
      emailNotifications: { recipients: 'x' },
      notificationEvents: {},
    }
    await expect(saveAdminSettings(settings)).rejects.toThrow('email inválido: x')
  })

  it('parses recipients separated by commas, semicolons or spaces', () => {
    expect(parseRecipients(' a@x.com, ,b@x.com;c@x.com d@x.com ')).toEqual(['a@x.com', 'b@x.com', 'c@x.com', 'd@x.com'])
    expect(parseRecipients('')).toEqual([])
  })
})
