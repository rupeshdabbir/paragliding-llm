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

  if (confidence) {
    const getConfidenceColor = (confidence: 'Low' | 'Medium' | 'High') => {
      switch (confidence) {
        case 'High':
          return {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-700',
            icon: 'text-green-500',
            progress: 'bg-green-500'
          };
        case 'Medium':
          return {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            text: 'text-yellow-700',
            icon: 'text-yellow-500',
            progress: 'bg-yellow-500'
          };
        case 'Low':
          return {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: 'text-red-500',
            progress: 'bg-red-500'
          };
      }
    };

    const colors = getConfidenceColor(confidence);
    const getConfidenceIcon = (confidence: 'Low' | 'Medium' | 'High') => {
      switch (confidence) {
        case 'High':
          return '✓';
        case 'Medium':
          return '!';
        case 'Low':
          return '✕';
      }
    };

    return (
      <div className={`flex flex-col items-center p-4 rounded-lg shadow-md border ${colors.bg} ${colors.border}`}>
        <div className="text-lg font-semibold mb-2">{label}</div>
        <div className="flex items-center space-x-2 mb-2">
          <span className={`text-2xl font-bold ${colors.text}`}>
            {getConfidenceIcon(confidence)}
          </span>
          <span className={`text-xl font-bold ${colors.text}`}>
            {confidence}
          </span>
        </div>
        <div className="relative w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div 
            className={`absolute h-full ${colors.progress} transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-2 text-sm text-gray-600">
          Confidence: {value}%
        </div>
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
          <span>{value} {label.includes('Speed') ? 'mph' : '%'}</span>
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