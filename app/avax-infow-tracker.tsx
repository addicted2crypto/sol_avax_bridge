"use client"

import { useState, useEffect } from "react"
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { formatTimeIn15MinIncrements } from "./utils/time"
import { Badge } from "@/components/ui/badge"

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

export default function AvaxInflowTracker() {
  const [interval, setInterval] = useState<"1h" | "6h" | "12h" | "24h">("1h")
  const [data, setData] = useState<InflowDataItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch("/api/avax-inflow-data")
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        const result: InflowData = await response.json()
        if (!result[interval]) {
          console.error("Invalid data structure:", result)
          throw new Error("Data not available for selected options")
        }
        setData(result[interval])
      } catch (err) {
        setError("Failed to load data. Please try again later.")
        console.error("Error fetching inflow data:", err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [interval])

  const calculateTotals = () => {
    const totalExchangeAmount = data.reduce((sum, item) => sum + item.exchangeAmount, 0)
    const totalInflow = data.reduce((sum, item) => sum + item.totalInflow, 0)
    const totalSolBridgeAmount = data.reduce((sum, item) => sum + item.solBridgeAmount, 0)
    const totalEthBridgeAmount = data.reduce((sum, item) => sum + item.ethBridgeAmount, 0)
    return { totalExchangeAmount, totalInflow, totalSolBridgeAmount, totalEthBridgeAmount }
  }

  const { totalExchangeAmount, totalInflow, totalSolBridgeAmount, totalEthBridgeAmount } = calculateTotals()

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem)
    return formatTimeIn15MinIncrements(date)
  }

  const formatYAxis = (value: number) => {
    return `${value.toFixed(0)} AVAX`
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>AVAX Inflow Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end space-x-2 mb-4">
          <Button onClick={() => setInterval("1h")} variant={interval === "1h" ? "default" : "outline"}>
            1 Hour
          </Button>
          <Button onClick={() => setInterval("6h")} variant={interval === "6h" ? "default" : "outline"}>
            6 Hours
          </Button>
          <Button onClick={() => setInterval("12h")} variant={interval === "12h" ? "default" : "outline"}>
            12 Hours
          </Button>
          <Button onClick={() => setInterval("24h")} variant={interval === "24h" ? "default" : "outline"}>
            24 Hours
          </Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">Loading...</div>
        ) : error ? (
          <div className="flex justify-center items-center h-[300px] text-red-500">{error}</div>
        ) : data.length === 0 ? (
          <div className="flex justify-center items-center h-[300px]">No data available for the selected options.</div>
        ) : (
          <>
            <div className="mb-4 text-center">
              <p className="text-lg font-semibold">Exchange Inflow: {totalExchangeAmount.toFixed(2)} AVAX</p>
              <p className="text-lg font-semibold">Total Inflows: {totalInflow.toFixed(2)} AVAX</p>
              <p className="text-lg font-semibold">Total SOL Bridge Inflow: {totalSolBridgeAmount.toFixed(2)} AVAX</p>
              <p className="text-lg font-semibold">Total Base ETH Inflow: {totalEthBridgeAmount.toFixed(2)} AVAX</p>
            </div>
            <ChartContainer
              config={{
                exchangeAmount: {
                  label: "Exchange Inflow",
                  color: "hsl(var(--chart-1))",
                },
                totalInflow: {
                  label: "Total Inflow",
                  color: "hsl(var(--chart-2))",
                },
                solBridgeAmount: {
                  label: "SOL Bridge Inflow",
                  color: "hsl(var(--chart-3))",
                },
                ethBridgeAmount: {
                  label: "ETH Bridge Inflow",
                  color: "hsl(var(--chart-4))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" tickFormatter={formatXAxis} />
                  <YAxis tickFormatter={formatYAxis} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="exchangeAmount" stroke="var(--color-exchangeAmount)" strokeWidth={2} />
                  <Line type="monotone" dataKey="totalInflow" stroke="var(--color-totalInflow)" strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="solBridgeAmount"
                    stroke="var(--color-solBridgeAmount)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="ethBridgeAmount"
                    stroke="var(--color-ethBridgeAmount)"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="mt-4 flex justify-center space-x-4">
              <div className="flex items-center">
                <Badge className="mr-2" style={{ backgroundColor: "var(--color-exchangeAmount)" }} />
                <span>Exchange Inflow</span>
              </div>
              <div className="flex items-center">
                <Badge className="mr-2" style={{ backgroundColor: "var(--color-totalInflow)" }} />
                <span>Total Inflow</span>
              </div>
              <div className="flex items-center">
                <Badge className="mr-2" style={{ backgroundColor: "var(--color-solBridgeAmount)" }} />
                <span>SOL Bridge Inflow</span>
              </div>
              <div className="flex items-center">
                <Badge className="mr-2" style={{ backgroundColor: "var(--color-ethBridgeAmount)" }} />
                <span>ETH Bridge Inflow</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

