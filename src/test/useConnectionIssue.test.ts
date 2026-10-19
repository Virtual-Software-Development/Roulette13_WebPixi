import { beforeEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useConnectionIssue } from '../hooks/useConnectionIssue'
import { useBackendStore } from '../store/useBackendStore'
import { useClockSyncStore } from '../store/useClockSyncStore'
import { useInternetStore } from '../store/useInternetStore'
import { useMqttStore } from '../store/useMqttStore'

describe('useConnectionIssue', () => {
  beforeEach(() => {
    useInternetStore.setState({ offline: false })
    useBackendStore.setState({ offline: false })
    useMqttStore.setState({ offline: false })
    useClockSyncStore.setState({ status: 'synced' })
  })

  it('reports nothing while everything is healthy', () => {
    const { result } = renderHook(() => useConnectionIssue('betting'))
    expect(result.current).toBeNull()
  })

  it('reports one cause by priority: internet, backend, MQTT, clock', () => {
    useInternetStore.setState({ offline: true })
    useBackendStore.setState({ offline: true })
    useMqttStore.setState({ offline: true })
    useClockSyncStore.setState({ status: 'failed' })
    const { result } = renderHook(() => useConnectionIssue('betting'))
    expect(result.current).toBe('noInternet')

    act(() => useInternetStore.setState({ offline: false }))
    expect(result.current).toBe('backendOffline')
    act(() => useBackendStore.setState({ offline: false }))
    expect(result.current).toBe('mqttOffline')
    act(() => useMqttStore.setState({ offline: false }))
    expect(result.current).toBe('clockUnsynced')
    act(() => useClockSyncStore.setState({ status: 'synced' }))
    expect(result.current).toBeNull()
  })

  it('only counts the clock on betting screens, and only once a sync has failed', () => {
    useClockSyncStore.setState({ status: 'pending' })
    const betting = renderHook(() => useConnectionIssue('betting'))
    const terminal = renderHook(() => useConnectionIssue('terminal'))
    expect(betting.result.current).toBeNull()

    act(() => useClockSyncStore.setState({ status: 'failed' }))
    expect(betting.result.current).toBe('clockUnsynced')
    expect(terminal.result.current).toBeNull()
  })

  it('only watches the backend on admin screens', () => {
    useInternetStore.setState({ offline: true })
    useMqttStore.setState({ offline: true })
    useClockSyncStore.setState({ status: 'failed' })
    const { result } = renderHook(() => useConnectionIssue('admin'))
    expect(result.current).toBeNull()

    act(() => useBackendStore.setState({ offline: true }))
    expect(result.current).toBe('backendOffline')
  })
})
