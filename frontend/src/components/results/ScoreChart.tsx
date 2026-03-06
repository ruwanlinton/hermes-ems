import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ScoreChartProps {
  distribution: { range: string; count: number }[];
}

export function ScoreChart({ distribution }: ScoreChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={distribution} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#718096" }} />
        <YAxis tick={{ fontSize: 11, fill: "#718096" }} allowDecimals={false} />
        <Tooltip
          formatter={(value: number) => [value, "Candidates"]}
          labelFormatter={(label) => `Score range: ${label}%`}
        />
        <Bar dataKey="count" fill="#2b6cb0" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
