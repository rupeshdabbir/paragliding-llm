import React from 'react';

interface GaugeProps {
  value: number;
  maxValue: number;
  label: string;
  color: string;
  confidence?: 'Low' | 'Medium' | 'High';
  direction?: string;
}

const Gauge: React.FC<GaugeProps> = ({ value, maxValue, label, color, confidence, direction }) => {
  const percentage = (value / maxValue) * 100;
  
  if (direction) {
    return (
      <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md">
        <div className="text-lg font-semibold mb-2">{label}</div>
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="transform" style={{ rotate: `${value}deg` }}>
              ↑
            </div>
          </div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1">N</div>
          <div className="absolute right-0 top-1/2 translate-y-1/2">E</div>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1">S</div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2">W</div>
        </div>
        <div className="mt-2 text-sm">{direction}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center p-4 bg-white rounded-lg shadow-md">
      <div className="text-lg font-semibold mb-2">{label}</div>
      <div className="relative w-32 h-16">
        <div 
          className="h-4 rounded-full bg-gray-200"
          style={{
            background: `linear-gradient(to right, 
              ${color} 0%, 
              ${color} ${percentage}%, 
              #e5e7eb ${percentage}%, 
              #e5e7eb 100%)`
          }}
        />
        <div className="mt-2 text-center">
          {confidence ? (
            <span className={`font-medium ${
              confidence === 'High' ? 'text-green-600' :
              confidence === 'Medium' ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {confidence}
            </span>
          ) : (
            <span>{value} {label.includes('Speed') ? 'mph' : '%'}</span>
          )}
        </div>
      </div>
    </div>
  );
};

interface WeatherGaugesProps {
  windSpeed: number;
  windDirection: number;
  flightConditions: {
    recommendation: 'Low' | 'Medium' | 'High';
    confidence: number;
  };
}

const WeatherGauges: React.FC<WeatherGaugesProps> = ({ windSpeed, windDirection, flightConditions }) => {
  console.log('Wind Speed:', windSpeed);
  console.log('Wind Direction:', windDirection);
  console.log('Flight Conditions:', flightConditions);

  const getDirectionLabel = (degrees: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((degrees % 360) / 45)) % 8;
    return directions[index];
  };

  return (
    <div className="flex flex-wrap gap-4 justify-center my-4">
      <Gauge
        value={flightConditions.confidence}
        maxValue={100}
        label="Flight Conditions"
        color="#10B981"
        confidence={flightConditions.recommendation}
      />
      <Gauge
        value={windSpeed}
        maxValue={30}
        label="Wind Speed"
        color="#3B82F6"
      />
      <Gauge
        value={windDirection}
        maxValue={360}
        label="Wind Direction"
        color="#8B5CF6"
        direction={getDirectionLabel(windDirection)}
      />
    </div>
  );
};

export default WeatherGauges; 