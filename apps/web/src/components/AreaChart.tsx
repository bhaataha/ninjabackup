'use client';

/**
 * SVG Area Chart component for dashboard metrics
 * Renders an animated area chart with gradient fill
 */
export default function AreaChart({
  data,
  color = '#3b82f6',
  height = 120,
  labels,
}: {
  data: number[];
  color?: string;
  height?: number;
  labels?: string[];
}) {
  if (!data.length) return null;

  const width = 400;
  const padding = { top: 10, right: 10, bottom: 24, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const max = Math.max(...data) * 1.1 || 1;
  const min = 0;

  const points = data.map((v, i) => ({
    x: padding.left + (i / (data.length - 1)) * chartW,
    y: padding.top + chartH - ((v - min) / (max - min)) * chartH,
  }));

  // Line path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Area path (filled to bottom)
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const gradientId = `gradient-${color.replace('#', '')}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: `${height}px` }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(pct => (
        <line
          key={pct}
          x1={padding.left}
          y1={padding.top + chartH * (1 - pct)}
          x2={width - padding.right}
          y2={padding.top + chartH * (1 - pct)}
          stroke="rgba(255,255,255,0.04)"
          strokeDasharray="4 4"
        />
      ))}

      {/* Area fill */}
      <path d={areaPath} fill={`url(#${gradientId})`}>
        <animate attributeName="opacity" from="0" to="1" dur="0.8s" fill="freeze" />
      </path>

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <animate attributeName="stroke-dashoffset" from="1000" to="0" dur="1s" fill="freeze" />
      </path>

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3" fill={color} opacity="0">
            <animate attributeName="opacity" from="0" to="1" dur="0.3s" begin={`${0.5 + i * 0.05}s`} fill="freeze" />
          </circle>
          {/* Tooltip hover area */}
          <circle cx={p.x} cy={p.y} r="10" fill="transparent" style={{ cursor: 'pointer' }}>
            <title>{labels?.[i] || `Day ${i + 1}`}: {data[i]}</title>
          </circle>
        </g>
      ))}

      {/* X-axis labels */}
      {labels && labels.filter((_, i) => i % Math.ceil(labels.length / 7) === 0 || i === labels.length - 1).map((label, idx) => {
        const origIdx = labels.indexOf(label);
        return (
          <text
            key={idx}
            x={padding.left + (origIdx / (data.length - 1)) * chartW}
            y={height - 4}
            textAnchor="middle"
            fill="rgba(255,255,255,0.3)"
            fontSize="9"
            fontFamily="Inter, sans-serif"
          >{label}</text>
        );
      })}
    </svg>
  );
}
