'use client';

import { useId } from 'react';

import { cn } from '@/lib/utils';

interface AreaChartProps {
  data: number[];
  labels: string[];
  height?: number;
  maxHeight?: number;
  className?: string;
  tooltipLabel?: string;
  color?: string;
}

export function AreaChart({
  data,
  labels,
  height = 160,
  maxHeight,
  className,
  tooltipLabel,
  color = '#10b981',
}: AreaChartProps) {
  const gradientId = useId();

  if (!data.length) return null;

  const max = Math.max(...data);
  const min = 0;
  const range = max - min || 1;
  const padding = 32;
  const chartWidth = 500;
  const chartHeight = height;

  const points = data.map((value, index) => ({
    x: padding + (index / (data.length - 1)) * (chartWidth - padding * 2),
    y: chartHeight - padding - ((value - min) / range) * (chartHeight - padding * 2),
    value,
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - padding} L ${points[0].x} ${chartHeight - padding} Z`;

  const yAxisValues = [0, max * 0.25, max * 0.5, max * 0.75, max];

  return (
    <div className={cn('w-full', className)} style={maxHeight ? { maxHeight } : undefined}>
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full"
        style={{
          height: maxHeight ? `${maxHeight}px` : 'auto',
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        }}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Y-axis labels */}
        {yAxisValues.map((val, i) => {
          const y = chartHeight - padding - (i / 4) * (chartHeight - padding * 2);
          return (
            <g key={i}>
              <text
                x={padding - 6}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground/70 text-[10px]"
              >
                {val >= 1000 ? `${Math.round(val / 1000)}k` : Math.round(val)}
              </text>
              <line
                x1={padding}
                y1={y}
                x2={chartWidth - padding}
                y2={y}
                className="stroke-border/60"
                strokeWidth="0.5"
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {labels.map((label, i) => {
          const x = padding + (i / (labels.length - 1)) * (chartWidth - padding * 2);
          return (
            <text
              key={i}
              x={x}
              y={chartHeight - 8}
              textAnchor="middle"
              className="fill-muted-foreground/70 text-[10px]"
            >
              {label}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradientId})`} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, i) => (
          <circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={color}
            strokeWidth="1.5"
            className="stroke-card opacity-0 transition-opacity hover:opacity-100"
          />
        ))}

        {/* Tooltip for highlighted point */}
        {tooltipLabel && points.length > 3 && (
          <g>
            <line
              x1={points[3].x}
              y1={points[3].y}
              x2={points[3].x}
              y2={chartHeight - padding}
              className="stroke-border"
              strokeWidth="1"
              strokeDasharray="3"
            />
            <circle
              cx={points[3].x}
              cy={points[3].y}
              r="4"
              fill={color}
              strokeWidth="2"
              className="stroke-card"
            />
            <rect
              x={points[3].x - 36}
              y={points[3].y - 30}
              width="72"
              height="22"
              rx="5"
              fill={color}
            />
            <text
              x={points[3].x}
              y={points[3].y - 15}
              textAnchor="middle"
              className="fill-white text-[9px]"
              fontWeight="600"
            >
              {tooltipLabel}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
