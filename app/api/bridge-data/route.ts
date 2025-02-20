import { NextResponse } from "next/server"
import { roundToNearestHour } from "../utils/time"

interface InflowDataItem {
  time: string
  exchangeAmount: number
  totalInflow: number
  solBridgeAmount: number
  ethBridgeAmount: number
}

type InflowData = {
  [key in "1h" | "6h" | "12h" | "24h"]: InflowDataItem[]
}

async function fetchBitfinexPrice() {
  try {
    const response = await fetch("https://api.bitfinex.com/v2/ticker/tAVAXUSD")
    const data = await response.json()
    return Number.parseFloat(data[6]) // Last price
  } catch (error) {
    console.error("Error fetching AVAX price:", error)
    return null
  }
}

async function fetchExchangeData() {
  // This is a placeholder. In a real-world scenario, you'd fetch this data from various exchange APIs
  return {
    binance: Math.random() * 1000,
    coinbase: Math.random() * 800,
    kraken: Math.random() * 600,
  }
}

async function fetchBridgeData() {
  try {
    const response = await fetch("https://bridges.llama.fi/transfers/recent")
    const data = await response.json()
    const avaxInflows = data.transfers.filter((t: any) => t.toChain === "Avalanche")
    return avaxInflows
  } catch (error) {
    console.error("Error fetching bridge data:", error)
    return []
  }
}

async function fetchRealInflowData(): Promise<InflowData> {
  try {
    const [avaxPrice, exchangeData, bridgeData] = await Promise.all([
      fetchBitfinexPrice(),
      fetchExchangeData(),
      fetchBridgeData(),
    ])

    if (!avaxPrice) {
      throw new Error("Failed to fetch AVAX price")
    }

    const now = roundToNearestHour(new Date())
    const timeRanges = {
      "1h": 60 * 60 * 1000,
      "6h": 6 * 60 * 60 * 1000,
      "12h": 12 * 60 * 60 * 1000,
      "24h": 24 * 60 * 60 * 1000,
    }

    const result: InflowData = {
      "1h": [],
      "6h": [],
      "12h": [],
      "24h": [],
    }

    for (const [range, duration] of Object.entries(timeRanges)) {
      const rangeStart = new Date(now.getTime() - duration)
      const relevantBridgeTransfers = bridgeData.filter((t: any) => new Date(t.timestamp * 1000) > rangeStart)

      const intervals = duration / (15 * 60 * 1000)
      const dataPoints: InflowDataItem[] = []

      for (let i = 0; i < intervals; i++) {
        const intervalTime = new Date(now.getTime() - i * 15 * 60 * 1000)
        const intervalStart = new Date(intervalTime.getTime() - 15 * 60 * 1000)

        const intervalBridgeTransfers = relevantBridgeTransfers.filter((t: any) => {
          const transferTime = new Date(t.timestamp * 1000)
          return transferTime >= intervalStart && transferTime < intervalTime
        })

        const solBridgeAmount = intervalBridgeTransfers
          .filter((t: any) => t.fromChain === "Solana")
          .reduce((sum: number, t: any) => sum + Number.parseFloat(t.amount), 0)
        const ethBridgeAmount = intervalBridgeTransfers
          .filter((t: any) => t.fromChain === "Ethereum")
          .reduce((sum: number, t: any) => sum + Number.parseFloat(t.amount), 0)
        const exchangeAmount = (exchangeData.binance + exchangeData.coinbase + exchangeData.kraken) / intervals
        const totalInflow = exchangeAmount + solBridgeAmount + ethBridgeAmount

        dataPoints.push({
          time: intervalTime.toISOString(),
          exchangeAmount,
          totalInflow,
          solBridgeAmount,
          ethBridgeAmount,
        })
      }

      result[range as keyof InflowData] = dataPoints
    }

    return result
  } catch (error) {
    console.error("Error in fetchRealInflowData:", error)
    return generateMockData()
  }
}

function generateMockData(): InflowData {
  const generateDataPoints = (count: number): InflowDataItem[] => {
    const now = roundToNearestHour(new Date())

    return Array.from({ length: count }, (_, i) => {
      const time = new Date(now)
      time.setMinutes(i * 15)
      const exchangeAmount = Math.floor(Math.random() * 1000)
      const solBridgeAmount = Math.floor(Math.random() * 200)
      const ethBridgeAmount = Math.floor(Math.random() * 300)
      const totalInflow = exchangeAmount + solBridgeAmount + ethBridgeAmount
      return {
        time: time.toISOString(),
        exchangeAmount,
        totalInflow,
        solBridgeAmount,
        ethBridgeAmount,
      }
    })
  }

  return {
    "1h": generateDataPoints(4),
    "6h": generateDataPoints(24),
    "12h": generateDataPoints(48),
    "24h": generateDataPoints(96),
  }
}

let cachedData: InflowData | null = null
let lastFetchTime = 0
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes cache

export async function GET() {
  const currentTime = Date.now()

  if (!cachedData || currentTime - lastFetchTime > CACHE_DURATION) {
    try {
      console.log("Fetching new data...")
      cachedData = await fetchRealInflowData()
      lastFetchTime = currentTime
      console.log("New data fetched and cached")
    } catch (error) {
      console.error("Error in GET route:", error)
      return NextResponse.json({ error: "Failed to fetch inflow data" }, { status: 500 })
    }
  }

  if (!cachedData) {
    console.error("No data available after fetch attempt")
    return NextResponse.json({ error: "No data available" }, { status: 500 })
  }

  return NextResponse.json(cachedData)
}

