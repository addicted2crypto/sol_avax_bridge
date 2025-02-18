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
import { Badge } from "@/components/ui/badge";
import { formatTimeIn15MinIncrements } from "./utils/time";

interface InflowDataItem {
  time: string;
  exchangeAmount: number;
  bridgeAmount: number;
  exchangeUsdValue: number;
  bridgeUsdValue: number;
}

type InflowData = {
  [key in "1h" | "6h" | "12h" | "24h"]: InflowDataItem[];
};

export default function AvaxInflowTracker() {
  const [interval, setInterval] = useState<"1h" | "6h" | "12h" | "24h">("1h");
  const [data, setData] = useState<InflowDataItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/avax-inflow-data");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result: InflowData = await response.json();
        if (!result[interval]) {
          console.error("Invalid data structure:", result);
          throw new Error("Data not available for selected options");
        }
        setData(result[interval]);
      } catch (err) {
        setError("Failed to load data. Please try again later.");
        console.error("Error fetching inflow data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [interval]);

  const calculateTotals = () => {
    const totalExchangeAmount = data.reduce(
      (sum, item) => sum + item.exchangeAmount,
      0
    );
    const totalBridgeAmount = data.reduce(
      (sum, item) => sum + item.bridgeAmount,
      0
    );
    const totalExchangeUsd = data.reduce(
      (sum, item) => sum + item.exchangeUsdValue,
      0
    );
    const totalBridgeUsd = data.reduce(
      (sum, item) => sum + item.bridgeUsdValue,
      0
    );
    return {
      totalExchangeAmount,
      totalBridgeAmount,
      totalExchangeUsd,
      totalBridgeUsd,
    };
  };

  const {
    totalExchangeAmount,
    totalBridgeAmount,
    totalExchangeUsd,
    totalBridgeUsd,
  } = calculateTotals();

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
        <CardTitle>AVAX Inflow Tracker</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='flex justify-end space-x-2 mb-4'>
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
                Total Exchange Inflow for {interval}:{" "}
                {totalExchangeAmount.toFixed(2)} AVAX ($
                {totalExchangeUsd.toFixed(2)})
              </p>
              <p className='text-lg font-semibold'>
                Total Bridge Inflow for {interval}:{" "}
                {totalBridgeAmount.toFixed(2)} AVAX ($
                {totalBridgeUsd.toFixed(2)})
              </p>
            </div>
            <ChartContainer
              config={{
                exchangeAmount: {
                  label: "Exchange Inflow (AVAX)",
                  color: "hsl(var(--chart-1))",
                },
                bridgeAmount: {
                  label: "Bridge Inflow (AVAX)",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className='h-[300px]'
            >
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='time' tickFormatter={formatXAxis} />
                  <YAxis tickFormatter={formatYAxis} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type='monotone'
                    dataKey='exchangeAmount'
                    stroke='var(--color-exchangeAmount)'
                    strokeWidth={2}
                  />
                  <Line
                    type='monotone'
                    dataKey='bridgeAmount'
                    stroke='var(--color-bridgeAmount)'
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className='mt-4 flex justify-center space-x-4'>
              <div className='flex items-center'>
                <Badge
                  className='mr-2'
                  style={{ backgroundColor: "var(--color-exchangeAmount)" }}
                />
                <span>Exchange Inflow (AVAX)</span>
              </div>
              <div className='flex items-center'>
                <Badge
                  className='mr-2'
                  style={{ backgroundColor: "var(--color-bridgeAmount)" }}
                />
                <span>Bridge Inflow (AVAX)</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
