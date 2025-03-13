import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';

interface HourlyData {
  time: string;
  windSpeed: string | number;
  windGusts: string | number;
  windDirection: string | number;
}

interface WeatherChartProps {
  hourlyData: HourlyData[];
  date: string;
  dayOfWeek: string;
}

const WeatherChart: React.FC<WeatherChartProps> = ({ hourlyData, date, dayOfWeek }) => {
  // Transform data for the chart
  const chartData = hourlyData.map(hour => {
    // Parse the hourly data string if it's a string
    const hourData = typeof hour === 'string' ? JSON.parse(hour) : hour;
    
    // Parse the timestamp and convert to PST
    const hourDate = new Date(hourData.timestamp);
    
    // Format time as HH:MM AM/PM in PST
    const timeStr = hourDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
      timeZone: 'America/Los_Angeles'
    });

    // Convert string values to numbers
    const windSpeed = Number(hourData.windSpeed);
    const windGusts = Number(hourData.windGusts || hourData.windSpeed);
    const windDirection = Number(hourData.windDirection);
    
    return {
      time: timeStr,
      windSpeed,
      windGusts,
      windDirection
    };
  });

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="text-gray-600 font-medium">{label}</p>
          {payload.map((entry: any, index: number) => {
            const value = Number(entry.value);
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {!isNaN(value) ? value.toFixed(1) : entry.value} {entry.name === 'windDirection' ? '°' : 'mph'}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-xl font-semibold text-gray-800">{dayOfWeek}, {date}</h3>
        <p className="text-sm text-gray-600">Wind conditions throughout the day</p>
      </div>
      
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{
              top: 20,
              right: 30,
              left: 20,
              bottom: 20,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="time" 
              stroke="#666"
              tick={{ fontSize: 12 }}
              interval={0}
              label={{ 
                value: 'Time (PST)', 
                position: 'bottom', 
                offset: 10,
                style: { fontSize: '12px', fill: '#666' }
              }}
            />
            <YAxis 
              yAxisId="left"
              stroke="#666"
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'Wind Speed (mph)', 
                angle: -90, 
                position: 'insideLeft',
                style: { fontSize: '12px', fill: '#666' }
              }}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              stroke="#666"
              tick={{ fontSize: 12 }}
              label={{ 
                value: 'Wind Direction (°)', 
                angle: 90, 
                position: 'insideRight',
                style: { fontSize: '12px', fill: '#666' }
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Reference lines for ideal conditions */}
            <ReferenceLine 
              yAxisId="left"
              y={15} 
              stroke="#4ade80" 
              strokeDasharray="3 3" 
              label={{ 
                value: "Ideal Wind Speed (15 mph)", 
                position: 'right',
                fill: '#4ade80'
              }}
            />
            <ReferenceLine 
              yAxisId="left"
              y={20} 
              stroke="#fbbf24" 
              strokeDasharray="3 3" 
              label={{ 
                value: "Maximum Safe Wind (20 mph)", 
                position: 'right',
                fill: '#fbbf24'
              }}
            />
            
            {/* Main data lines */}
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="windSpeed"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Wind Speed (mph)"
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="windGusts"
              stroke="#ef4444"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="Wind Gusts (mph)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="windDirection"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="Wind Direction (°)"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend explaining wind direction */}
      <div className="mt-4 text-sm text-gray-600 text-center">
        <p>• Wind Speed: Sustained wind speed in mph</p>
        <p>• Wind Gusts: Peak wind speeds in mph (dashed line)</p>
        <p>• Wind Direction: 0° = North, 90° = East, 180° = South, 270° = West</p>
      </div>
    </div>
  );
};

export default WeatherChart; 