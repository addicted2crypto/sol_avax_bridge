"use client";

import { useState, useEffect } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatTimeIn15MinIncrements } from "./utils/time";

interface BridgeDataItem {
  time: string;
  amount: number;
  usdValue: number;
}

type BridgeData = {
  [key in "sol-avax" | "eth-avax"]: {
    [key in "1h" | "6h" | "12h" | "24h"]: BridgeDataItem[];
  };
};

export default function CrossChainBridgeTracker() {
  const [bridgeType, setBridgeType] = useState<"sol-avax" | "eth-avax">(
    "sol-avax"
  );
  const [interval, setInterval] = useState<"1h" | "6h" | "12h" | "24h">("1h");
  const [data, setData] = useState<BridgeDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/bridge-data");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result: BridgeData = await response.json();
        if (!result[bridgeType] || !result[bridgeType][interval]) {
          console.error("Invalid data structure:", result);
          throw new Error("Data not available for selected options");
        }
        setData(result[bridgeType][interval]);
      } catch (err) {
        setError("Failed to load data. Please try again later.");
        console.error("Error fetching bridge data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [bridgeType, interval]);

  const calculateTotals = () => {
    const totalAmount = data.reduce((sum, item) => sum + item.amount, 0);
    const totalUSD = data.reduce((sum, item) => sum + item.usdValue, 0);
    return { totalAmount, totalUSD };
  };

  const { totalAmount, totalUSD } = calculateTotals();

  const formatXAxis = (tickItem: string) => {
    const date = new Date(tickItem);
    return formatTimeIn15MinIncrements(date);
  };

  const formatYAxis = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  return (
    <Card className='w-full max-w-4xl mx-auto'>
      <CardHeader>
        <CardTitle>Cross-Chain Bridge Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex justify-between items-center mb-4'>
          <Select
            value={bridgeType}
            onValueChange={(value: "sol-avax" | "eth-avax") =>
              setBridgeType(value)
            }
          >
            <SelectTrigger className='w-[180px]'>
              <SelectValue placeholder='Select bridge' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='sol-avax'>SOL to AVAX</SelectItem>
              <SelectItem value='eth-avax'>ETH to AVAX</SelectItem>
            </SelectContent>
          </Select>
          <div className='flex space-x-2'>
            <Button
              onClick={() => setInterval("1h")}
              variant={interval === "1h" ? "default" : "outline"}
            >
              1 Hour
            </Button>
            <Button
              onClick={() => setInterval("6h")}
              variant={interval === "6h" ? "default" : "outline"}
            >
              6 Hours
            </Button>
            <Button
              onClick={() => setInterval("12h")}
              variant={interval === "12h" ? "default" : "outline"}
            >
              12 Hours
            </Button>
            <Button
              onClick={() => setInterval("24h")}
              variant={interval === "24h" ? "default" : "outline"}
            >
              24 Hours
            </Button>
          </div>
        </div>
        {isLoading ? (
          <div className='flex justify-center items-center h-[300px]'>
            Loading...
          </div>
        ) : error ? (
          <div className='flex justify-center items-center h-[300px] text-red-500'>
            {error}
          </div>
        ) : data.length === 0 ? (
          <div className='flex justify-center items-center h-[300px]'>
            No data available for the selected options.
          </div>
        ) : (
          <>
            <div className='mb-4 text-center'>
              <p className='text-lg font-semibold'>
                Total for {interval}: {totalAmount.toFixed(2)}{" "}
                {bridgeType === "sol-avax" ? "SOL" : "ETH"}
              </p>
              <p className='text-lg font-semibold'>
                Total USD Value: ${totalUSD.toFixed(2)}
              </p>
            </div>
            <ChartContainer
              config={{
                amount: {
                  label: `Amount (${
                    bridgeType === "sol-avax" ? "SOL" : "ETH"
                  })`,
                  color: "hsl(var(--chart-1))",
                },
                usdValue: {
                  label: "USD Value",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className='h-[300px]'
            >
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='time' tickFormatter={formatXAxis} />
                  <YAxis yAxisId='left' tickFormatter={formatYAxis} />
                  <YAxis
                    yAxisId='right'
                    orientation='right'
                    tickFormatter={formatYAxis}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    yAxisId='left'
                    type='monotone'
                    dataKey='amount'
                    stroke='var(--color-amount)'
                    strokeWidth={2}
                  />
                  <Line
                    yAxisId='right'
                    type='monotone'
                    dataKey='usdValue'
                    stroke='var(--color-usdValue)'
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className='mt-4 flex justify-center space-x-4'>
              <div className='flex items-center'>
                <Badge
                  className='mr-2'
                  style={{ backgroundColor: "var(--color-amount)" }}
                />
                <span>{`Amount (${
                  bridgeType === "sol-avax" ? "SOL" : "ETH"
                })`}</span>
              </div>
              <div className='flex items-center'>
                <Badge
                  className='mr-2'
                  style={{ backgroundColor: "var(--color-usdValue)" }}
                />
                <span>USD Value</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
