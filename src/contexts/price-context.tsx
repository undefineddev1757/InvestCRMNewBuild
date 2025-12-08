"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface PriceData {
  symbol: string
  price: number
  timestamp: number
}

interface PriceContextType {
  prices: Record<string, PriceData>
  updatePrice: (symbol: string, price: number) => void
  getPrice: (symbol: string) => number | null
}

const PriceContext = createContext<PriceContextType | undefined>(undefined)

export function PriceProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<Record<string, PriceData>>({})

  const updatePrice = (symbol: string, price: number) => {
    setPrices(prev => ({
      ...prev,
      [symbol]: {
        symbol,
        price,
        timestamp: Date.now()
      }
    }))
  }

  const getPrice = (symbol: string): number | null => {
    const priceData = prices[symbol]
    if (!priceData) {
      return null
    }
    
    // Проверяем, не устарела ли цена (больше 5 минут)
    const isStale = Date.now() - priceData.timestamp > 300000
    if (isStale) {
      return null
    }
    
    return priceData.price
  }

  return (
    <PriceContext.Provider value={{ prices, updatePrice, getPrice }}>
      {children}
    </PriceContext.Provider>
  )
}

export function usePrice() {
  const context = useContext(PriceContext)
  if (context === undefined) {
    throw new Error('usePrice must be used within a PriceProvider')
  }
  return context
}
