'use client'

import { useEffect, useRef } from 'react'

type MapPin = {
  id: string
  name: string
  lat: number
  lng: number
  rank: number
  score: string
}

export function ShelfMap({ pins }: { pins: MapPin[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const mapRef = useRef<unknown>(null)

  useEffect(() => {
    if (!ref.current || mapRef.current) return

    // Dynamically load Leaflet CSS + JS
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
    document.head.appendChild(link)

    import('leaflet').then((L) => {
      if (!ref.current || mapRef.current) return

      // Default icon fix for Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const center: [number, number] = pins.length > 0
        ? [pins[0].lat, pins[0].lng]
        : [19.076, 72.877] // Mumbai fallback

      const map = L.map(ref.current!).setView(center, 12)
      mapRef.current = map

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 19,
      }).addTo(map)

      pins.forEach((pin) => {
        const icon = L.divIcon({
          className: '',
          html: `<div style="
            background:#f5c542;color:#111;
            font-size:11px;font-weight:700;
            width:28px;height:28px;border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            border:2px solid #111315;
            box-shadow:0 2px 8px rgba(0,0,0,0.5);
            font-family:sans-serif;
          ">${pin.rank}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        })

        L.marker([pin.lat, pin.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:120px">
              <strong style="font-size:13px">${pin.name}</strong><br/>
              <span style="font-size:11px;color:#888">Rank #${pin.rank} · Score ${pin.score}</span>
            </div>
          `)
      })

      // Fit bounds if multiple pins
      if (pins.length > 1) {
        const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]))
        map.fitBounds(bounds, { padding: [32, 32] })
      }
    })

    return () => {
      if (mapRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(mapRef.current as any).remove()
        mapRef.current = null
      }
    }
  }, [pins])

  return (
    <div
      ref={ref}
      style={{
        width: '100%',
        height: 340,
        borderRadius: 14,
        overflow: 'hidden',
        background: 'var(--color-surface)',
      }}
    />
  )
}
