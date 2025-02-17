"use client"

import { useState, useEffect } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface SwapDataItem {
  time: string;
  amount: number;
}

type SwapData = {
  [key in '1h' | '6h' | '12h' | '24h']: SwapDataItem[];
};

export default function SolanaAvaxSwapTracker() {
  const [interval, setInterval] = useState<keyof SwapData>('1h')
  const [data, setData] = useState<SwapDataItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch('/api/swap-data')
        if (!response.ok) {
          throw new Error('Failed to fetch data')
        }
        const result: SwapData = await response.json()
        setData(result[interval])
      } catch (err) {
        setError('Failed to load data. Please try again later.')
        console.error('Error fetching swap data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [interval])

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Solana to AVAX Swap Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center space-x-2 mb-4">
          <Button onClick={() => setInterval('1h')} variant={interval === '1h' ? 'default' : 'outline'}>1 Hour</Button>
          <Button onClick={() => setInterval('6h')} variant={interval === '6h' ? 'default' : 'outline'}>6 Hours</Button>
          <Button onClick={() => setInterval('12h')} variant={interval === '12h' ? 'default' : 'outline'}>12 Hours</Button>
          <Button onClick={() => setInterval('24h')} variant={interval === '24h' ? 'default' : 'outline'}>24 Hours</Button>
        </div>
        {isLoading ? (
          <div className="flex justify-center items-center h-[300px]">Loading...</div>
        ) : error ? (
          <div className="flex justify-center items-center h-[300px] text-red-500">{error}</div>
        ) : (
          <ChartContainer
            config={{
              amount: {
                label: "Amount (AVAX)",
                color: "hsl(var(--chart-1))",
              },
            }}
            className="h-[300px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" tickFormatter={formatXAxis} />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="amount" stroke="var(--color-amount)" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

