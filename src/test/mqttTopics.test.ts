import { describe, expect, it, vi } from 'vitest'
import { attachMqttSubscriber, dispatchMqttMessage, onMqttMessage } from '../mqtt/topics'

describe('mqtt topic registry', () => {
  it('subscribes to topics registered before and after connecting, and delivers parsed JSON', () => {
    const early = vi.fn()
    const offEarly = onMqttMessage('t/early', early)

    const subscribe = vi.fn()
    expect(attachMqttSubscriber(subscribe)).toContain('t/early')

    const late = vi.fn()
    onMqttMessage('t/late', late)
    expect(subscribe).toHaveBeenCalledWith('t/late')

    dispatchMqttMessage('t/early', '{"msgType":"betsSummary","ticketsCount":3}')
    expect(early).toHaveBeenCalledWith({ msgType: 'betsSummary', ticketsCount: 3 })
    expect(late).not.toHaveBeenCalled()

    offEarly()
    dispatchMqttMessage('t/early', '{}')
    expect(early).toHaveBeenCalledTimes(1)
  })

  it('ignores payloads that are not JSON and keeps other handlers running when one throws', () => {
    const ok = vi.fn()
    onMqttMessage('t/x', () => {
      throw new Error('boom')
    })
    onMqttMessage('t/x', ok)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    dispatchMqttMessage('t/x', 'not json')
    expect(ok).not.toHaveBeenCalled()
    dispatchMqttMessage('t/x', '{"a":1}')
    expect(ok).toHaveBeenCalledWith({ a: 1 })
  })
})
