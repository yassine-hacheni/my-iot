'use client';

import { useEffect, useState } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { supabase } from '@/utils/supabaseClient';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
} from 'chart.js';
import { subDays, format, parseISO, eachHourOfInterval, isToday, isTomorrow } from 'date-fns';
import 'chartjs-adapter-date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

interface SensorLog {
  id: number;
  device_id: string;
  soil_moisture: number;
  pump_state: number;
  created_at: string;
}

// Add this interface at the top of the file
interface WeatherData {
  current: {
    temp: number;
    weatherCode: number;
    precipitation: number;
    condition: string;
    icon: any;
  };
  daily: Array<{
    date: string;
    maxTemp: number;
    minTemp: number;
    precipitation: number;
    condition: string;
    icon: any;
  }>;
  hourly: Array<{
    time: string;
    temperature: number;
    condition: string;
    icon: any;
  }>;
}
 
interface SensorChartsProps {
  weatherData?: WeatherData;
}
 
interface WeatherChartData {
  labels: string[];
  temperature: number[];
  precipitation: number[];
  timeUnit: 'hour' | 'day';
}
export default function SensorCharts({ weatherData }: SensorChartsProps) {
  const [logs, setLogs] = useState<SensorLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  // In SensorCharts.tsx, update the return statement to show a loading state
  console.log(weatherData);
  // Add this new function to format time labels
const formatTimeLabel = (date: Date, timeUnit: string) => {
  if (timeUnit === 'hour') {
    return format(date, 'ha');
  } else if (timeUnit === 'day') {
    return isToday(date) 
      ? 'Today' 
      : isTomorrow(date) 
        ? 'Tomorrow' 
        : format(date, 'EEE');
  }
  return format(date, 'MMM d');
};
 
// Add this new function to prepare weather data
const prepareWeatherData = (weatherData: WeatherData, timeUnit: 'hour' | 'day' = 'hour'): WeatherChartData => {
  if (!weatherData) {
    return { labels: [], temperature: [], precipitation: [], timeUnit };
  }
 
  if (timeUnit === 'hour' && weatherData.hourly) {
    // For hourly view, use the hourly data
    const labels = weatherData.hourly.map(hour => hour.time);
    const temperature = weatherData.hourly.map(hour => hour.temperature);
    // Since hourly data doesn't have precipitation, we'll use 0 or you can modify based on your needs
    const precipitation = weatherData.hourly.map(() => 0);
    
    return { labels, temperature, precipitation, timeUnit: 'hour' };
  } 
  
  // For daily view, use the daily data
  if (weatherData.daily) {
    const labels = weatherData.daily.map(day => day.date);
    const temperature = weatherData.daily.map(day => (day.maxTemp + day.minTemp) / 2); // Average temperature
    const precipitation = weatherData.daily.map(day => day.precipitation);
    
    return { labels, temperature, precipitation, timeUnit: 'day' };
  }
 
  return { labels: [], temperature: [], precipitation: [], timeUnit };
};

 
// ... (existing component code)
 
  // Add this new state to the component
  const [timeUnit, setTimeUnit] = useState<'hour' | 'day'>('hour');
const [weatherChartData, setWeatherChartData] = useState<WeatherChartData>({ 
  labels: [], 
  temperature: [], 
  precipitation: [],
  timeUnit: 'hour'
});
 
// Add this effect to update weather data
  useEffect(() => {
    if (weatherData) {
      setWeatherChartData(prepareWeatherData(weatherData, timeUnit));
    }
  }, [weatherData, timeUnit]);
  
// Add this new chart options
const weatherChartOptions = {
  responsive: true,
  interaction: {
    mode: 'index' as const,
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top' as const,
    },
    title: {
      display: true,
      text: 'Weather Overview',
    },
    tooltip: {
      callbacks: {
        label: function(context: any) {
          let label = context.dataset.label || '';
          if (label) {
            label += ': ';
          }
          if (context.parsed.y !== null) {
            label += context.parsed.y + (context.datasetIndex === 0 ? '°C' : 'mm');
          }
          return label;
        }
      }
    }
  },
  scales: {
    x: {
      title: {
        display: true,
        text: timeUnit === 'hour' ? 'Time' : 'Day'
      }
    },
    y: {
      type: 'linear' as const,
      display: true,
      position: 'left' as const,
      title: {
        display: true,
        text: 'Temperature (°C)',
      }
    },
    y1: {
      type: 'linear' as const,
      display: true,
      position: 'right' as const,
      grid: {
        drawOnChartArea: false,
      },
      title: {
        display: true,
        text: 'Precipitation (mm)',
      },
      min: 0,
    },
  },
};
 
// Update the chart data configuration
const weatherChartDataConfig = {
  labels: weatherChartData.labels,
  datasets: [
    {
      label: 'Temperature',
      data: weatherChartData.temperature,
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
      yAxisID: 'y',
      tension: 0.4,
    },
    {
      label: 'Precipitation',
      data: weatherChartData.precipitation,
      borderColor: 'rgb(53, 162, 235)',
      backgroundColor: 'rgba(53, 162, 235, 0.5)',
      yAxisID: 'y1',
      type: 'bar' as const,
    },
  ],
};

  useEffect(() => {
    fetchSensorLogs();
  }, [timeRange]);

  const fetchSensorLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Calculate time filter based on selected range
      const now = new Date();
      let fromDate = new Date();
      
      switch (timeRange) {
        case '1h':
          fromDate.setHours(now.getHours() - 1);
          break;
        case '6h':
          fromDate.setHours(now.getHours() - 6);
          break;
        case '24h':
          fromDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          fromDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          fromDate.setDate(now.getDate() - 30);
          break;
        default:
          fromDate.setDate(now.getDate() - 1);
      }

      const { data, error } = await supabase
        .from('sensor_logs')
        .select('*')
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching sensor logs:', err);
      setError('Failed to load sensor data');
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare data for charts
  const chartData = {
    labels: logs.map(log => new Date(log.created_at).toLocaleTimeString()),
    timestamps: logs.map(log => new Date(log.created_at)),
    soilMoisture: logs.map(log => log.soil_moisture),
    pumpState: logs.map(log => log.pump_state)
  };

  // Soil Moisture Chart Options
  const moistureOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Soil Moisture Over Time',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `Moisture: ${context.raw}%`;
          }
        }
      }
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: timeRange === '1h' || timeRange === '6h' ? 'hour' : 'day',
          displayFormats: {
            hour: 'HH:mm',
            day: 'MMM d'
          }
        },
        title: {
          display: true,
          text: 'Time',
        },
      },
      y: {
        min: 0,
        max: 100,
        title: {
          display: true,
          text: 'Moisture (%)',
        },
      },
    },
  };

  // Pump Activity Chart Options
  // Update the pumpOptions to use horizontal bars
const pumpOptions = {
  indexAxis: 'x' as const,  // Keep bars vertical
  responsive: true,
  scales: {
    y: {
      min: 0,
      max: 1,
      ticks: {
        stepSize: 1,
        callback: (value: number) => value === 1 ? 'ON' : 'OFF'
      },
      title: {
        display: true,
        text: 'Pump State',
      },
    },
    x: {
      type: 'time' as const,
      time: {
        unit: timeRange === '1h' || timeRange === '6h' ? 'hour' : 'day',
        displayFormats: {
          hour: 'HH:mm',
          day: 'MMM d'
        }
      },
      title: {
        display: true,
        text: 'Time',
      },
    },
  },
  plugins: {
    legend: {
      display: false,
    },
    title: {
      display: true,
      text: 'Pump Activity Timeline',
    },
    tooltip: {
      callbacks: {
        label: (context: any) => {
          return `Pump: ${context.raw === 1 ? 'ON' : 'OFF'}`;
        }
      }
    }
  },
};

const pumpData = {
  labels: chartData.timestamps,
  datasets: [
    {
      label: 'Pump State',
      data: chartData.pumpState,
      backgroundColor: chartData.pumpState.map(state => 
        state === 1 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)'
      ),
      borderColor: chartData.pumpState.map(state => 
        state === 1 ? 'rgba(75, 192, 192, 1)' : 'rgba(255, 99, 132, 1)'
      ),
      borderWidth: 1,
      barThickness: 15,
      borderRadius: 0,
      borderSkipped: false,
    },
  ],
};
 


  // Soil Moisture Chart Data
  const moistureData = {
    labels: chartData.timestamps,
    datasets: [
      {
        label: 'Soil Moisture',
        data: chartData.soilMoisture,
        borderColor: 'rgb(53, 162, 235)',
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
        fill: true,
        tension: 0.4,
      },
    ],
  };



  if (isLoading) {
    return <div className="p-4 text-center">Loading charts...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  if (logs.length === 0) {
    return <div className="p-4 text-center">No sensor data available for the selected time range.</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end space-x-2 mb-4">
        <button
          onClick={() => setTimeRange('1h')}
          className={`px-3 py-1 rounded ${timeRange === '1h' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Last Hour
        </button>
        <button
          onClick={() => setTimeRange('6h')}
          className={`px-3 py-1 rounded ${timeRange === '6h' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Last 6 Hours
        </button>
        <button
          onClick={() => setTimeRange('24h')}
          className={`px-3 py-1 rounded ${timeRange === '24h' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Last 24 Hours
        </button>
        <button
          onClick={() => setTimeRange('7d')}
          className={`px-3 py-1 rounded ${timeRange === '7d' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Last 7 Days
        </button>
        <button
          onClick={() => setTimeRange('30d')}
          className={`px-3 py-1 rounded ${timeRange === '30d' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Last 30 Days
        </button>
      </div>
      <div className="flex justify-between items-center mb-6">
  <h2 className="text-2xl font-bold">Weather Analytics</h2>
  <div className="flex space-x-2">
    <button
      onClick={() => setTimeUnit('hour')}
      className={`px-3 py-1 rounded ${
        timeUnit === 'hour' ? 'bg-blue-500 text-white' : 'bg-gray-200'
      }`}
    >
      Hourly
    </button>
    <button
      onClick={() => setTimeUnit('day')}
      className={`px-3 py-1 rounded ${
        timeUnit === 'day' ? 'bg-blue-500 text-white' : 'bg-gray-200'
      }`}
    >
      Daily
    </button>
  </div>
</div>
      <div className="bg-white p-4 rounded-lg shadow">
        <Line options={moistureOptions} data={moistureData} />
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <Bar options={pumpOptions} data={pumpData} />
      </div>
      {/* Add this new chart component */}
    <div className="bg-white p-6 rounded-lg shadow mb-8">
      <Line options={weatherChartOptions} data={weatherChartDataConfig} />
    </div>
    </div>
  );
}
