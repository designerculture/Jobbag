'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ticketStore, Ticket } from '@/lib/store'


interface UseTicketsOptions {
  designerFilter?: string
  pollInterval?: number
}

export type SyncState = 'idle' | 'syncing' | 'synced' | 'error' | 'needs-deploy'

export interface UseTicketsResult {
  tickets:    Ticket[]
  loading:    boolean
  syncState:  SyncState
  error:      string | null
  refresh:    () => void
  lastSynced: Date | null
}

// /api/tickets sudah mengembalikan Ticket object yang sudah di-transform
// Tidak perlu transform ulang di sini — langsung cast ke Ticket
function mergeFromSheets(sheetsTickets: Ticket[]): Ticket[] {
  for (const remote of sheetsTickets) {
    const existing = ticketStore.getAll().find(t => t.ticketNumber === remote.ticketNumber)
    ticketStore.upsert({
      ...remote,
      id: existing?.id || remote.ticketNumber,
      // Pertahankan attachmentName (nama file lokal) dari device submitter jika ada
      attachmentName:  existing?.attachmentName  || remote.attachmentName,
      attachmentName2: existing?.attachmentName2 || remote.attachmentName2,
      attachmentName3: existing?.attachmentName3 || remote.attachmentName3,
      // Pertahankan base64 preview lokal jika ada
      attachmentData:  existing?.attachmentData,
      attachmentData2: existing?.attachmentData2,
      attachmentData3: existing?.attachmentData3,
      // Drive URL dari Sheets selalu dipakai (override lokal)
      attachmentDriveUrl:  remote.attachmentDriveUrl  || existing?.attachmentDriveUrl,
      attachmentDriveUrl2: remote.attachmentDriveUrl2 || existing?.attachmentDriveUrl2,
      attachmentDriveUrl3: remote.attachmentDriveUrl3 || existing?.attachmentDriveUrl3,
    })
  }
  return ticketStore.getAll()
}

export function useTickets({
  designerFilter,
  pollInterval = 20_000,
}: UseTicketsOptions = {}): UseTicketsResult {
  const [tickets,    setTickets]    = useState<Ticket[]>([])
  const [loading,    setLoading]    = useState(true)
  const [syncState,  setSyncState]  = useState<SyncState>('idle')
  const [error,      setError]      = useState<string | null>(null)
  const [lastSynced, setLastSynced] = useState<Date | null>(null)
  const abortRef  = useRef<AbortController | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  const applyFilter = useCallback((all: Ticket[]) => {
    if (!designerFilter) return all
    return all.filter(t =>
      t.assignedDesigner === designerFilter ||
      (t.assignedDesigners || []).includes(designerFilter)
    )
  }, [designerFilter])

  const loadLocal = useCallback(() => {
    if (!isMounted.current) return
    const all = ticketStore.getAll()
    setTickets(applyFilter(all))
  }, [applyFilter])

  const fetchFromServer = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort()
    abortRef.current = new AbortController()
    if (isMounted.current) setSyncState('syncing')

    try {
      // Fetch via Next.js API route (server-side) — tidak ada masalah CORS/redirect
      const res = await fetch(
        `/api/tickets?t=${Date.now()}`,
        {
          method:  'GET',
          signal:  abortRef.current.signal,
          cache:   'no-store',
          headers: { 'Accept': 'application/json' },
        }
      )

      if (!isMounted.current) return

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: {
        success?: boolean
        tickets?: Record<string, string>[]
        needsDeploy?: boolean
        error?: string
      } = await res.json()

      if (data.needsDeploy) {
        if (isMounted.current) {
          setSyncState('needs-deploy')
          setError('Apps Script perlu di-deploy ulang.')
          loadLocal()
        }
        return
      }

      if (!data.success || !Array.isArray(data.tickets)) {
        throw new Error(data.error || 'Response tidak valid dari server')
      }

      // /api/tickets sudah mengembalikan Ticket[] yang sudah di-transform
      const sheetsTickets = (data.tickets as Ticket[]).filter(t => !!t.ticketNumber)
      const merged = mergeFromSheets(sheetsTickets)

      if (isMounted.current) {
        setTickets(applyFilter(merged))
        setLastSynced(new Date())
        setSyncState('synced')
        setError(null)
      }
    } catch (err: unknown) {
      if (!isMounted.current) return
      if (err instanceof Error && err.name === 'AbortError') return
      if (isMounted.current) {
        setSyncState('error')
        setError('Tidak dapat terhubung ke server. Menampilkan data lokal.')
        loadLocal()
      }
    } finally {
      if (isMounted.current) setLoading(false)
    }
  }, [applyFilter, loadLocal])

  const refresh = useCallback(() => {
    setLoading(true)
    fetchFromServer()
  }, [fetchFromServer])

  // Tampilkan data lokal dulu, langsung fetch dari server
  useEffect(() => {
    loadLocal()
    setLoading(false)
    fetchFromServer()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-poll
  useEffect(() => {
    if (!pollInterval) return
    const id = setInterval(fetchFromServer, pollInterval)
    return () => clearInterval(id)
  }, [fetchFromServer, pollInterval])

  return { tickets, loading, syncState, error, refresh, lastSynced }
}
