"use client"

import { useState, useEffect } from 'react'

interface GeoData {
  countryCode: string
  country: string
  phoneCode: string
}

export function useGeo() {
  const [geoData, setGeoData] = useState<GeoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchGeoData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/geo')
        
        if (!response.ok) {
          throw new Error('Failed to fetch geo data')
        }
        
        const data = await response.json()
        setGeoData(data)
      } catch (err) {
        console.error('Error fetching geo data:', err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        // Fallback to Russia
        setGeoData({
          countryCode: 'RU',
          country: 'Russia',
          phoneCode: '+7'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchGeoData()
  }, [])

  return { geoData, loading, error }
}
