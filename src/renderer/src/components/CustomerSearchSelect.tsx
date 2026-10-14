import { useEffect, useRef, useState } from 'react'
import type { CustomerListItem } from '@shared/types'
import { api } from '../lib/api'

type Props = {
  value: CustomerListItem | null
  onChange: (customer: CustomerListItem | null) => void
  required?: boolean
  placeholder?: string
}

export function CustomerSearchSelect({
  value,
  onChange,
  required = false,
  placeholder = 'Αναζήτηση με όνομα ή τηλέφωνο...'
}: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CustomerListItem[]>([])
  const [open, setOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    timerRef.current = setTimeout(() => {
      void (async () => {
        try {
          const list = await api().customers.list({
            query: trimmed,
            page: 1,
            pageSize: 10,
            status: 'active'
          })
          if (list && 'items' in list) {
            setResults(list.items)
            setOpen(true)
          }
        } finally {
          setSearching(false)
        }
      })()
    }, 250)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [query])

  function selectCustomer(customer: CustomerListItem) {
    onChange(customer)
    setQuery('')
    setResults([])
    setOpen(false)
  }

  function clearSelection() {
    onChange(null)
    setQuery('')
    setResults([])
  }

  return (
    <div className="customer-search" ref={wrapRef}>
      {value ? (
        <div className="customer-search-selected">
          <div>
            <strong>{value.fullName}</strong>
            <div className="muted">
              {value.phoneDisplay} · {value.pointsBalance} πόντοι · {value.id}
            </div>
          </div>
          <button type="button" className="btn btn-secondary" onClick={clearSelection}>
            Αλλαγή
          </button>
        </div>
      ) : (
        <>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              if (results.length > 0) setOpen(true)
            }}
            placeholder={placeholder}
            autoComplete="off"
            required={required && !value}
          />
          {searching ? <div className="muted customer-search-hint">Αναζήτηση...</div> : null}
          {!searching && query.trim().length >= 2 && results.length === 0 ? (
            <div className="muted customer-search-hint">Δεν βρέθηκε πελάτισσα</div>
          ) : null}
          {open && results.length > 0 ? (
            <ul className="customer-search-results" role="listbox">
              {results.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => selectCustomer(c)}>
                    <strong>{c.fullName}</strong>
                    <span className="muted">
                      {c.phoneDisplay} · {c.pointsBalance} πόντοι
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  )
}
