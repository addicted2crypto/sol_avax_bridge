import { NextResponse } from "next/server"
import { roundToNearestHour } from "../utils/time"

interface BridgeDataItem {
  time: string
  amount: number
  usdValue: number
}

type BridgeData = {
  [key in "sol-avax" | "eth-avax"]: {
    [key in "1h" | "6h" | "12h" | "24h"]: BridgeDataItem[]
  }
}

async function fetchBitfinexPrices() {
  try {
    const [solResponse, ethResponse, avaxResponse] = await Promise.all([
      fetch("https://api.bitfinex.com/v2/ticker/tSOLUSD"),
      fetch("https://api.bitfinex.com/v2/ticker/tETHUSD"),
      fetch("https://api.bitfinex.com/v2/ticker/tAVAXUSD"),
    ])

    const [solData, ethData, avaxData] = await Promise.all([
      solResponse.json(),
      ethResponse.json(),
      avaxResponse.json(),
    ])

    return {
      sol: Number.parseFloat(solData[6]), // Last price
      eth: Number.parseFloat(ethData[6]),
      avax: Number.parseFloat(avaxData[6]),
    }
  } catch (error) {
    console.error("Error fetching prices:", error)
    return null
  }
}

async function fetchDefiLlamaBridgeData() {
  try {
    // DeFi Llama bridges API
    const response = await fetch("https://bridges.llama.fi/transfers/recent")
    const data = await response.json()

    // Filter for Solana->Avalanche and Ethereum->Avalanche transfers
    const solAvaxTransfers = data.transfers.filter((t: any) => t.fromChain === "Solana" && t.toChain === "Avalanche")
    const ethAvaxTransfers = data.transfers.filter((t: any) => t.fromChain === "Ethereum" && t.toChain === "Avalanche")

    return {
      solAvax: solAvaxTransfers,
      ethAvax: ethAvaxTransfers,
    }
  } catch (error) {
    console.error("Error fetching bridge data:", error)
    return null
  }
}

async function fetchRealBridgeData(): Promise<BridgeData> {
  try {
    const [prices, bridgeData] = await Promise.all([fetchBitfinexPrices(), fetchDefiLlamaBridgeData()])

    if (!prices || !bridgeData) {
      throw new Error("Failed to fetch required data")
    }

    const now = roundToNearestHour(new Date())

    return {
      "sol-avax": processTransfers(bridgeData.solAvax, prices.sol),
      "eth-avax": processTransfers(bridgeData.ethAvax, prices.eth),
    }
  } catch (error) {
    console.error("Error in fetchRealBridgeData:", error)
    return generateMockData()
  }
}

// Mock data generator for fallback
function generateMockData(): BridgeData {
  const generateDataPoints = (count: number): BridgeDataItem[] => {
    const now = roundToNearestHour(new Date())

    return Array.from({ length: count }, (_, i) => {
      const time = new Date(now)
      time.setMinutes(i * 15)
      return {
        time: time.toISOString(),
        amount: Math.floor(Math.random() * 1000),
        usdValue: Math.floor(Math.random() * 10000),
      }
    })
  }

  return {
    "sol-avax": {
      "1h": generateDataPoints(4),
      "6h": generateDataPoints(24),
      "12h": generateDataPoints(48),
      "24h": generateDataPoints(96),
    },
    "eth-avax": {
      "1h": generateDataPoints(4),
      "6h": generateDataPoints(24),
      "12h": generateDataPoints(48),
      "24h": generateDataPoints(96),
    },
  }
}

const processTransfers = (
  transfers: any[],
  sourcePrice: number,
): { [key in "1h" | "6h" | "12h" | "24h"]: BridgeDataItem[] } => {
  const timeRanges = {
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "12h": 12 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
  }

  const result: { [key in "1h" | "6h" | "12h" | "24h"]: BridgeDataItem[] } = {
    "1h": [],
    "6h": [],
    "12h": [],
    "24h": [],
  }

  for (const [range, duration] of Object.entries(timeRanges) as [keyof typeof timeRanges, number][]) {
    const now = roundToNearestHour(new Date()) // Added now variable declaration here
    const rangeStart = new Date(now.getTime() - duration)
    const relevantTransfers = transfers.filter((t: any) => new Date(t.timestamp * 1000) > rangeStart)

    // Create 15-minute intervals
    const intervals = duration / (15 * 60 * 1000)
    const dataPoints: BridgeDataItem[] = []

    for (let i = 0; i < intervals; i++) {
      const intervalTime = new Date(now.getTime() - i * 15 * 60 * 1000)
      const intervalStart = new Date(intervalTime.getTime() - 15 * 60 * 1000)

      const intervalTransfers = relevantTransfers.filter((t: any) => {
        const transferTime = new Date(t.timestamp * 1000)
        return transferTime >= intervalStart && transferTime < intervalTime
      })

      const totalAmount = intervalTransfers.reduce((sum: number, t: any) => sum + Number.parseFloat(t.amount), 0)
      const usdValue = totalAmount * sourcePrice

      dataPoints.push({
        time: intervalTime.toISOString(),
        amount: totalAmount,
        usdValue: usdValue,
      })
    }

    result[range] = dataPoints
  }

  return result
}

let cachedData: BridgeData | null = null
let lastFetchTime = 0
const CACHE_DURATION = 15 * 60 * 1000 // 15 minutes cache

export async function GET() {
  const currentTime = Date.now()

  if (!cachedData || currentTime - lastFetchTime > CACHE_DURATION) {
    try {
      console.log("Fetching new data...")
      cachedData = await fetchRealBridgeData()
      lastFetchTime = currentTime
      console.log("New data fetched and cached")
    } catch (error) {
      console.error("Error in GET route:", error)
      return NextResponse.json({ error: "Failed to fetch bridge data" }, { status: 500 })
    }
  }

  if (!cachedData) {
    console.error("No data available after fetch attempt")
    return NextResponse.json({ error: "No data available" }, { status: 500 })
  }

  return NextResponse.json(cachedData)
}

