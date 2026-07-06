import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../context/ThemeContext"; 

const MenuInferior = ({ activeIndex, setActiveIndex, items }) => {
  const { isDarkMode } = useTheme();
  const containerRef = useRef(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (!items || items.length === 0) return null;

  const totalItems = items.length;
  const itemWidth = width / totalItems;
  const cx = (activeIndex * itemWidth) + (itemWidth / 2);

  if (width === 0) {
    return <div ref={containerRef} className="fixed bottom-6 w-[92%] max-w-[420px] h-[70px] left-1/2 -translate-x-1/2 lg:hidden" />;
  }

  const corFundo = isDarkMode ? "#B22222" : "#FF4500";
  const corBorda = isDarkMode ? "#121212" : "#F3F4F6";

  return (
    <div 
      ref={containerRef}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-[420px] h-[70px] z-30 lg:hidden pointer-events-none"
    >
      <svg width={width} height="70" viewBox={`0 0 ${width} 70`} className="absolute inset-0 drop-shadow-2xl pointer-events-auto">
        <path 
          fill={corFundo}
          className="transition-all duration-500 ease-[cubic-bezier(0.6,0.01,0.3,1)]"
          d={`M 0,25 C 0,11 11,0 25,0 H ${cx - 55} c 12,0 16,6 20,13 a 35,35 0 0 0 70,0 c 4,-7 8,-13 20,-13 H ${width - 25} c 14,0 25,11 25,25 v 20 c 0,14 -11,25 -25,25 H 25 C 11,70 0,59 0,45 Z`} 
        />
      </svg>

      <div 
        className="absolute w-[66px] h-[66px] rounded-full flex flex-col items-center justify-center shadow-lg transition-all duration-500 ease-[cubic-bezier(0.6,0.01,0.3,1)] pointer-events-auto"
        style={{ 
          left: `${cx - 33}px`, 
          top: '-15px',
          backgroundColor: corFundo,
          border: `5px solid ${corBorda}`
        }}
      >
        <div className="text-white flex flex-col items-center leading-none scale-110">
          {items[activeIndex]?.icon}
        </div>
      </div>

      <ul className="relative flex justify-between items-center h-full px-2 z-20 pointer-events-auto">
        {items.map((item, index) => {
          const isActive = activeIndex === index;
          return (
            <li key={index} className="flex-1 flex justify-center">
              <button
                onClick={() => {
                  setActiveIndex(index);
                  if (item.action) item.action();
                }}
                className={`flex flex-col items-center justify-center transition-all duration-500 w-full ${isActive ? "opacity-0 scale-50 translate-y-4" : "text-white opacity-90"}`}
              >
                <div className="mb-0.5">{item.icon}</div>
                <span className="text-[8px] font-bold uppercase tracking-tighter">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default MenuInferior;