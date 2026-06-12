import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Transaction } from '../types';

interface GroupedData {
  label: string;
  income: number;
  expense: number;
}

interface VisualChartProps {
  transactions: Transaction[];
  type: 'incomeVsExpense' | 'categoryBreakdown';
  transactionTypeFilter?: 'income' | 'expense';
  currency: string;
}

export const VisualChart: React.FC<VisualChartProps> = ({
  transactions,
  type,
  transactionTypeFilter = 'expense',
  currency,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="h-[240px] flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-850 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium max-w-[240px]">
          Add your first income or expense to start tracking your business finances.
        </p>
      </div>
    );
  }

  // Helper: Format amount cleanly
  const formatVal = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: val >= 100000 ? 'compact' : 'standard',
      maximumFractionDigits: 0,
    }).format(val);
  };

  if (type === 'incomeVsExpense') {
    // Group last 6 months or 7 days. Let's do last 6 calendar months based on current year or existing data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Group transactions by month of their date
    const monthlyGroups: Record<string, { income: number; expense: number }> = {};
    
    // Seed current and previous 5 months
    const now = new Date();
    const monthsToDraw: { year: number; monthIdx: number; key: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mIdx = d.getMonth();
      const yr = d.getFullYear();
      const label = `${months[mIdx]} ${yr.toString().slice(-2)}`;
      monthsToDraw.push({ year: yr, monthIdx: mIdx, key: label });
      monthlyGroups[label] = { income: 0, expense: 0 };
    }

    transactions.forEach((tx) => {
      if (!tx.date) return;
      const txDate = new Date(tx.date);
      if (isNaN(txDate.getTime())) return;
      
      const txMonthIdx = txDate.getMonth();
      const txYear = txDate.getFullYear();
      const label = `${months[txMonthIdx]} ${txYear.toString().slice(-2)}`;

      if (monthlyGroups[label] !== undefined) {
        if (tx.type === 'income') {
          monthlyGroups[label].income += tx.amount;
        } else {
          monthlyGroups[label].expense += tx.amount;
        }
      }
    });

    const chartData: GroupedData[] = monthsToDraw.map((m) => ({
      label: m.key,
      income: monthlyGroups[m.key].income,
      expense: monthlyGroups[m.key].expense,
    }));

    // Find Max value for scaling
    const maxVal = Math.max(
      ...chartData.map((d) => Math.max(d.income, d.expense)),
      500 // fallback min cap
    );
    const roundedMax = Math.ceil(maxVal / 500) * 500;

    // SVG parameters
    const width = 600;
    const height = 240;
    const paddingLeft = 45;
    const paddingRight = 15;
    const paddingTop = 25;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    return (
      <div className="w-full">
        {/* Chart View */}
        <div className="relative w-full overflow-x-auto select-none">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[450px] h-[240px] font-sans text-[10px] fill-slate-400"
          >
            {/* Grid Lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = paddingTop + chartHeight * (1 - ratio);
              const val = roundedMax * ratio;
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    strokeOpacity={0.08}
                    strokeDasharray="4 4"
                    strokeWidth={1}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400 font-mono text-[9px] dark:fill-slate-500"
                  >
                    {formatVal(val)}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {chartData.map((data, idx) => {
              const columnWidth = chartWidth / chartData.length;
              const colCenterX = paddingLeft + columnWidth * idx + columnWidth / 2;

              // Bar scales
              const incHeight = (data.income / roundedMax) * chartHeight;
              const expHeight = (data.expense / roundedMax) * chartHeight;

              const incY = paddingTop + chartHeight - incHeight;
              const expY = paddingTop + chartHeight - expHeight;

              const barWidth = Math.max(12, columnWidth * 0.18);
              const barSpacing = 3;

              const incX = colCenterX - barWidth - barSpacing;
              const expX = colCenterX + barSpacing;

              const isCurrentHovered = hoveredIdx === idx;

              return (
                <g key={idx}>
                  {/* Background Column Highlight on Hover */}
                  <rect
                    x={paddingLeft + columnWidth * idx + 2}
                    y={paddingTop - 5}
                    width={columnWidth - 4}
                    height={chartHeight + 10}
                    fill="currentColor"
                    fillOpacity={isCurrentHovered ? 0.03 : 0}
                    rx={6}
                    className="transition-all duration-150 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                  />

                  {/* Income Bar (Slick Green Accent) */}
                  <rect
                    x={incX}
                    y={incY}
                    width={barWidth}
                    height={Math.max(1, incHeight)}
                    fill="url(#incomeGrad)"
                    rx={2}
                    className="transition-all duration-300 pointer-events-none"
                  />

                  {/* Expense Bar (Slick Rose Accent) */}
                  <rect
                    x={expX}
                    y={expY}
                    width={barWidth}
                    height={Math.max(1, expHeight)}
                    fill="url(#expenseGrad)"
                    rx={2}
                    className="transition-all duration-300 pointer-events-none"
                  />

                  {/* X Axis Label */}
                  <text
                    x={colCenterX}
                    y={paddingTop + chartHeight + 16}
                    textAnchor="middle"
                    className="fill-slate-500 font-medium text-[9.5px] dark:fill-slate-400"
                  >
                    {data.label}
                  </text>

                  {/* Floating Custom Tooltip when Hovered */}
                  {isCurrentHovered && (
                    <g className="transition-all duration-300 pointer-events-none">
                      <rect
                        x={Math.min(width - 150, Math.max(10, colCenterX - 65))}
                        y={Math.min(height - 120, Math.max(5, Math.min(incY, expY) - 55))}
                        width={130}
                        height={46}
                        fill="rgba(15, 23, 42, 0.96)"
                        rx={6}
                        filter="url(#shadow)"
                      />
                      <text
                        x={Math.min(width - 150, Math.max(10, colCenterX - 65)) + 8}
                        y={Math.min(height - 120, Math.max(5, Math.min(incY, expY) - 55)) + 14}
                        fill="#fff"
                        className="font-semibold text-[9px]"
                      >
                        {data.label}
                      </text>
                      <text
                        x={Math.min(width - 150, Math.max(10, colCenterX - 65)) + 8}
                        y={Math.min(height - 120, Math.max(5, Math.min(incY, expY) - 55)) + 26}
                        fill="#10b981"
                        className="font-medium text-[9px]"
                      >
                        Inc: {currency}
                        {formatVal(data.income)}
                      </text>
                      <text
                        x={Math.min(width - 150, Math.max(10, colCenterX - 65)) + 8}
                        y={Math.min(height - 120, Math.max(5, Math.min(incY, expY) - 55)) + 38}
                        fill="#f43f5e"
                        className="font-medium text-[9px]"
                      >
                        Exp: {currency}
                        {formatVal(data.expense)}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}

            {/* Gradient Definitions */}
            <defs>
              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#e11d48" stopOpacity="0.6" />
              </linearGradient>
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3" />
              </filter>
            </defs>
          </svg>
        </div>
      </div>
    );
  }

  // CATEGORY BREAKDOWN PIE / DONUT CHART
  // Filter transactions of requested type
  const targetTxs = transactions.filter((t) => t.type === transactionTypeFilter);
  const totalsByCategory: Record<string, number> = {};
  let overallTotal = 0;

  targetTxs.forEach((tx) => {
    totalsByCategory[tx.category] = (totalsByCategory[tx.category] || 0) + tx.amount;
    overallTotal += tx.amount;
  });

  // Convert to sorted lists
  const categoryColors: Record<string, string> = {
    Rent: '#f43f5e',
    Marketing: '#f97316',
    Salaries: '#a855f7',
    Software: '#06b6d4',
    Tax: '#3b82f6',
    Utilities: '#eab308',
  };

  const sortedCategories = Object.entries(totalsByCategory)
    .map(([name, amount], idx) => {
      // Find a matching color or fallback using a deterministic hash or simple index loop
      const color = categoryColors[name] || `hsl(${(idx * 137.5) % 360}, 70%, 50%)`;
      return { name, amount, color, percent: overallTotal > 0 ? (amount / overallTotal) * 100 : 0 };
    })
    .sort((a, b) => b.amount - a.amount);

  if (sortedCategories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center text-slate-400 dark:text-slate-500">
        <p className="text-sm font-medium">No {transactionTypeFilter} data found in the current selection.</p>
        <p className="text-xs mt-1">Add transactions to generate a visual summary breakdown.</p>
      </div>
    );
  }

  // Draw Donut with Recharts
  const donutSize = 250; // Increased size slightly to allow more space for labels and interaction
  const outerRadius = 80;
  const innerRadius = 60;

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
      {/* Donut Cylinder */}
      <div className="md:col-span-5 flex justify-center">
        <div className="relative" style={{ width: donutSize, height: donutSize }}>
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={sortedCategories}
                dataKey="amount"
                cx="50%"
                cy="50%"
                innerRadius={innerRadius}
                outerRadius={outerRadius}
                paddingAngle={2}
                label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                labelLine={false}
                onMouseEnter={(_, index) => setHoveredIdx(index)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {sortedCategories.map((cat, idx) => (
                  <Cell key={idx} fill={cat.color} stroke={hoveredIdx === idx ? '#fff' : 'none'} strokeWidth={2} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>


          {/* Central text displaying hovered item percent or total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            {hoveredIdx !== null ? (
              <>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[110px]">
                  {sortedCategories[hoveredIdx].name}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                  {currency}{formatVal(sortedCategories[hoveredIdx].amount)}
                </span>
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                  ({sortedCategories[hoveredIdx].percent.toFixed(0)}%)
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold">
                  Total
                </span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-100 truncate max-w-[125px]">
                  {currency}
                  {formatVal(overallTotal)}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Legend list */}
      <div className="md:col-span-7 space-y-2">
        <div className="max-h-48 overflow-y-auto pr-1 space-y-2">
          {sortedCategories.map((cat, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-1.5 rounded-lg transition-all duration-200 cursor-pointer ${
                  isHovered ? 'bg-slate-100 dark:bg-slate-800/60' : 'hover:bg-slate-50 dark:hover:bg-slate-800/30'
                }`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 transition-transform duration-200"
                    style={{
                      backgroundColor: cat.color,
                      transform: isHovered ? 'scale(1.2)' : 'none',
                    }}
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center space-x-3 text-right">
                  <span className="text-xs font-mono text-slate-900 dark:text-slate-100 font-semibold shrink-0">
                    {currency}
                    {formatVal(cat.amount)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 w-10">
                    {cat.percent.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
