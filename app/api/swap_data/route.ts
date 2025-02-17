import { NextResponse } from "next/server"

interface SwapDataItem {
  time: string
  amount: number
}

type SwapData = {
  [key in "1h" | "6h" | "12h" | "24h"]: SwapDataItem[]
}

// This would be replaced with actual API calls in a production environment
async function fetchRealSwapData(): Promise<SwapData> {
  // Simulating API calls to Solana, AVAX, and cross-chain data sources
  const response = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana,avalanche-2&vs_currencies=usd")
  const data = await response.json()

  const solPrice = data.solana.usd
  const avaxPrice = data["avalanche-2"].usd

  // Generate mock swap data based on real prices
  const generateSwapData = (count: number): SwapDataItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      time: new Date(Date.now() - i * 3600000).toISOString(), // Hourly data points
      amount: Math.floor((Math.random() * 100 * solPrice) / avaxPrice), // Random amount of SOL swapped to AVAX
    }))
  }

  return {
    "1h": generateSwapData(24),
    "6h": generateSwapData(24),
    "12h": generateSwapData(24),
    "24h": generateSwapData(24),
  }
}

let cachedData: SwapData | null = null
let lastFetchTime = 0
const CACHE_DURATION = 6 * 60 * 60 * 1000 // 6 hours in milliseconds

export async function GET() {
  const currentTime = Date.now()

  if (!cachedData || currentTime - lastFetchTime > CACHE_DURATION) {
    try {
      cachedData = await fetchRealSwapData()
      lastFetchTime = currentTime
    } catch (error) {
      console.error("Error fetching swap data:", error)
      return NextResponse.json({ error: "Failed to fetch swap data" }, { status: 500 })
    }
  }

  return NextResponse.json(cachedData)
}

