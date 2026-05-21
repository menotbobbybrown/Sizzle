"use client";

import { useEffect, useState } from "react";

interface Sale {
  id: string;
  buyerName: string;
  productName: string;
}

export function RecentSalesTicker({ sales }: { sales: Sale[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sales.length === 0) return;
    
    // Show first one
    setVisible(true);

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % sales.length);
        setVisible(true);
      }, 500);
    }, 4000);

    return () => clearInterval(interval);
  }, [sales.length]);

  if (sales.length === 0) return null;

  const currentSale = sales[currentIndex];

  return (
    <div 
      className={`fixed bottom-6 left-6 transition-all duration-500 transform ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      } z-50`}
    >
      <div className="bg-white border border-zinc-200 rounded-full shadow-xl px-4 py-2 flex items-center space-x-3">
        <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center text-[10px] font-bold text-white uppercase">
          {currentSale.buyerName.substring(0, 2)}
        </div>
        <div>
          <p className="text-xs font-medium text-zinc-900">
            <span className="font-bold">{currentSale.buyerName}</span> bought {currentSale.productName}
          </p>
        </div>
      </div>
    </div>
  );
}
