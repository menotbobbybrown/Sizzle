"use client";

import { useState, useEffect, useCallback } from "react";

interface RecentSale {
  id: string;
  buyerName: string;
  productName: string;
  amount?: number;
  currency?: string;
  createdAt: string;
}

interface RecentSalesTickerProps {
  workspaceId: string;
  maxDisplay?: number;
  intervalMs?: number;
}

export function RecentSalesTicker({
  workspaceId,
  maxDisplay = 5,
  intervalMs = 4000,
}: RecentSalesTickerProps) {
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch recent sales
  const fetchSales = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/storefront/${workspaceId}/recent-sales?limit=${maxDisplay}`
      );
      if (response.ok) {
        const data = await response.json();
        setSales(data.sales || []);
      }
    } catch (error) {
      console.error("Failed to fetch recent sales:", error);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, maxDisplay]);

  // Initial fetch and polling
  useEffect(() => {
    fetchSales();
    const pollInterval = setInterval(fetchSales, 60000); // Refresh every minute
    return () => clearInterval(pollInterval);
  }, [fetchSales]);

  // Cycle through sales
  useEffect(() => {
    if (sales.length <= 1) return;

    const cycleInterval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sales.length);
    }, intervalMs);

    return () => clearInterval(cycleInterval);
  }, [sales.length, intervalMs]);

  if (isLoading || sales.length === 0) {
    return null;
  }

  const currentSale = sales[currentIndex];

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground animate-in fade-in slide-in-from-right-4">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      <span>
        <span className="font-medium text-foreground">{currentSale.buyerName}</span>
        {" "}just purchased{" "}
        <span className="font-medium text-foreground">{currentSale.productName}</span>
        {currentSale.amount && (
          <span className="ml-1 text-green-600">
            ${currentSale.amount.toFixed(0)}
          </span>
        )}
      </span>
    </div>
  );
}

/**
 * Hook for managing recent sales state with cycling
 */
export function useRecentSalesTicker(
  sales: RecentSale[],
  intervalMs = 4000
) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (sales.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sales.length);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [sales.length, intervalMs]);

  return {
    currentSale: sales[currentIndex],
    totalSales: sales.length,
    currentIndex,
  };
}

/**
 * Server-side helper to get formatted recent sales for display
 */
export function formatRecentSaleForDisplay(sale: RecentSale): string {
  let text = `${sale.buyerName} purchased ${sale.productName}`;
  if (sale.amount) {
    text += ` for $${sale.amount.toFixed(0)}`;
  }
  return text;
}