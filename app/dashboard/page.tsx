'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'next/navigation';
import { logSensorData } from '@/utils/sensorLogger';
import dynamic from 'next/dynamic';

// Dynamically import the SensorCharts component with SSR disabled
const SensorCharts = dynamic(() => import('@/components/SensorCharts'), { ssr: false });
import { 
  Droplets, 
  Cloud, 
  CloudRain, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  Sun,
  CloudSun,
  Cloudy,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  Wind
} from 'lucide-react';
const getWeatherIcon = (code: number) => {
  // WMO Weather interpretation codes
  if (code === 0) return <Sun className="text-yellow-500" />;
  if (code <= 3) return <CloudSun className="text-yellow-400" />;
  if (code <= 48) return <Cloudy className="text-gray-600" />;
  if (code <= 67) return <CloudRain className="text-blue-400" />;
  if (code <= 77) return <CloudDrizzle className="text-blue-300" />;
  if (code <= 99) return <CloudLightning className="text-yellow-500" />;
  return <Sun className="text-yellow-500" />;
};


interface WeatherForecast {
  time: string;
  temperature: number;
  condition: string;
  icon: string;
}
// Openfield2026240112
export default function DashboardPage() {
  const router = useRouter();
  const [config, setConfig] = useState<{
    location: string;
    dryThreshold: number;
    moderateThreshold: number;
  } | null>(null);
  

  const [isAutoMode, setIsAutoMode] = useState(true);
  const [pumpState, setPumpState] = useState<boolean>(false);
  const [soilMoisture, setSoilMoisture] = useState<number | null>(null);
  const [weather, setWeather] = useState<WeatherForecast[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState({ lat: '', lon: '' });
  const [weatherData, setWeatherData] = useState<any>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [currentDay, setCurrentDay] = useState(0);
  // Add these state variables near the top of your component
const [isConfigOpen, setIsConfigOpen] = useState(false);
const [dryThreshold, setDryThreshold] = useState(30); // Default value
const [rainThreshold, setRainThreshold] = useState(70); // Default value
 
  const [autoDecisionMaking, setAutoDecisionMaking] = useState(false);
  const [decisionNotification, setDecisionNotification] = useState<{
  show: boolean;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
} | null>(null);

// Add this function to handle the configuration update
const handleUpdateThresholds = async (e: React.FormEvent) => {
  e.preventDefault();
  
  try {
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      router.push('/login');
      return;
    }
 
    const user = JSON.parse(userJson);
    const { error } = await supabase
      .from('users_settings')
      .update({
        dry_threshold: dryThreshold,
        rain_threshold: rainThreshold,
        updated_at: new Date().toISOString()
      })
      .eq('username', user.username);
      
    if (error) throw error;
 
    // Update local state
    setConfig(prev => prev ? {
      ...prev,
      dryThreshold: dryThreshold,
      rainThreshold: rainThreshold
    } : null);
 
    // Close the modal
    setIsConfigOpen(false);
 
  } catch (error) {
    console.error('Error updating thresholds:', error);
    // Handle error (e.g., show error message)
  }
};
  const fetchWeather = async (lat: string, lon: string) => {
  try {
    setWeatherLoading(true);
    setError(null);
    
    const response = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
    if (!response.ok) {
      throw new Error('Failed to fetch weather data');
    }
    
    const data = await response.json();
    const processedData = processWeatherData(data);
    setWeatherData(processedData);
    // Update the weather state with the processed hourly data
    setWeather(processedData.hourly);
  } catch (err) {
    console.error('Error fetching weather:', err);
    setError('Failed to load weather data. Please try again.');
  } finally {
    setWeatherLoading(false);
  }
};

const getWeatherForLocation = async (lat: string, lon: string) => {
  try {
    setLocation({ lat, lon });
    await fetchWeather(lat, lon);
  } catch (error) {
    console.error('Error fetching weather:', error);
    setError('Failed to load weather data. Using default location.');
    // Fallback to a default location (e.g., New York)
    const defaultLat = '40.7128';
    const defaultLon = '-74.0060';
    setLocation({ lat: defaultLat, lon: defaultLon });
    await fetchWeather(defaultLat, defaultLon);
  }
};
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 30000); // Poll every 30 seconds

  return () => clearInterval(interval);
}, []);

 // Update the useEffect hook
useEffect(() => {
  const initializeApp = async () => {
    const savedConfig = localStorage.getItem('irrigationConfig');
    if (!savedConfig) {
      router.push('/setup');
      return;
    }
    
    try {
      // Parse and set the initial config
      const parsedConfig = JSON.parse(savedConfig);
      setConfig(parsedConfig);
      
      // Fetch user settings including location (only once)
      await fetchUserSettings();
      
      // Initial data fetch
      await fetchData();
      
      // Set up polling for sensor data (but not for user settings)
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
      
    } catch (error) {
      console.error('Error initializing app:', error);
      setError('Failed to initialize application');
    }
  };

  initializeApp();
}, [router]); // Empty dependency array means this runs once on mount

  // const fetchData = async (espIp: string) => {
  //   try {
  //     // In a real app, you would fetch this from your ESP32
  //     const response = await fetch('/api/sensors');
  //     // const response = await fetch(`http://${espIp}/llll`);
  //     console.log(response)
  //     const data = await response.json();
  //     // setSoilMoisture(data.moisture);
  //     console.log("2 sensors")
      
  //     // Only update the pump state if it's not currently being controlled by the user
  //     // This prevents the automatic toggling of the pump
  //     if (!isAutoMode) {
  //       setPumpState(data.pompe);
  //     }
      
  //     // Convert soil moisture sensor reading to percentage
  //     // 100% dry = 7xx, 0% dry = 4xxx
  //     let moisturePercentage = 0;
  //     if (data.soil_moisture) {
  //       const sensorValue = parseInt(data.soil_moisture);
  //       if (sensorValue >= 700 && sensorValue <= 799) {
  //         // 7xx range = 100% dry
  //         moisturePercentage = 100;
  //       } else if (sensorValue >= 4000 && sensorValue <= 4999) {
  //         // 4xxx range = 0% dry (fully wet)
  //         moisturePercentage = 0;
  //       } else if (sensorValue > 799 && sensorValue < 4000) {
  //         // Linear interpolation between 7xx and 4xxx
  //         // Map 800 to ~100% and 3999 to ~0%
  //         moisturePercentage = Math.round(100 - ((sensorValue - 800) / (3999 - 800)) * 100);
  //         // Clamp between 0 and 100
  //         moisturePercentage = Math.max(0, Math.min(100, moisturePercentage));
  //       }
  //     }
  //     setSoilMoisture(moisturePercentage);
  //     setIsLoading(false);
  //   } catch (err) {
  //     setError('Failed to fetch sensor data');
  //     setIsLoading(false);
  //   }
  // };

  const fetchUserSettings = async () => {
  try {
    // Get the logged-in user from localStorage
    const userJson = localStorage.getItem('user');
    if (!userJson) {
      router.push('/login');
      return false;
    }

    const user = JSON.parse(userJson);
    const username = user?.username;

    if (!username) {
      setError('User not authenticated');
      router.push('/login');
      return false;
    }

    // Fetch user settings for the logged-in user
    const { data: userData, error } = await supabase
      .from('users_settings')
      .select('*')
      .eq('username', username)  // Filter by the logged-in user's username
      .single();

    if (error) {
      console.error('Error fetching user settings:', error);
      throw error;
    }
    
    if (userData) {
      // Create location string from latitude and longitude
      const location = userData.latitude && userData.longitude 
        ? `${userData.latitude},${userData.longitude}`
        : '0,0'; // Default coordinates if not set
        setDryThreshold(userData.dry_threshold || 30);
      setRainThreshold(userData.rain_threshold || 70);
         setConfig((prev) => {
        if(!prev) return null;
        return {
        ...prev,
        location: userData.latitude && userData.longitude 
        ? `${userData.latitude},${userData.longitude}`
        : '',
        dryThreshold: userData.dry_threshold,
        rainThreshold: userData.rain_threshold
        };
        
      });
      

      // If we have coordinates, update the weather
      if (userData.latitude && userData.longitude) {
        await getWeatherForLocation(
          userData.latitude.toString(),
          userData.longitude.toString()
        );
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error('Error in fetchUserSettings:', err);
    setError('Failed to load user settings. Using default configuration.');
    return false;
  }
};
  const fetchData = async () => {
  try {
    const { data: latestData, error } = await supabase
      .from('commands')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
      
    if (error) throw error;
    
    if (latestData) {
      // Assuming the commands table has a 'sensor_value' field that contains the moisture data
      // Adjust the field names according to your actual commands table structure
      const sensorValue = latestData.soil_moisture || 0;
      let moisturePercentage = 0;
      
      // Convert sensor value to percentage (adjust these ranges based on your sensor)
      if (sensorValue >= 700 && sensorValue <= 799) {
        moisturePercentage = 100;
      } else if (sensorValue >= 4000 && sensorValue <= 4999) {
        moisturePercentage = 0;
      } else if (sensorValue > 799 && sensorValue < 4000) {
        moisturePercentage = Math.round(100 - ((sensorValue - 800) / (3999 - 800)) * 100);
        moisturePercentage = Math.max(0, Math.min(100, moisturePercentage));
      }
      
      setSoilMoisture(moisturePercentage);
      
       // Log the sensor data
      await logSensorData(
        'esp32_001', 
        soilMoisture|| 0, 
        latestData.command === 1 ? 1 : 0
      );


      // Update pump state based on command
      // Assuming the command field contains 'ON' or 'OFF' for the pump
      if (latestData.command) {
        console.log("yalla")
        setPumpState(true);
      } else{
        console.log("yalla yallla")
        setPumpState(false);
      }
    }
    
    setIsLoading(false);
  } catch (err) {
    console.error('Error fetching sensor data:', err);
    setError('Failed to fetch sensor data from database');
    setIsLoading(false);
  }
};



  const getWeatherCondition = (code: number): string => {
    // WMO Weather interpretation codes
    const conditions: {[key: number]: string} = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow fall',
      73: 'Moderate snow fall',
      75: 'Heavy snow fall',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with hail',
      99: 'Thunderstorm with heavy hail'
    };
    return conditions[code] || 'Unknown';
  };

  const processWeatherData = (data: any) => {
    // Process hourly data for today
    const now = new Date();
    const currentHour = now.getHours();
    const today = now.toISOString().split('T')[0];
    
    // Process hourly data
    const hourly = data.hourly.time.map((time: string, index: number) => {
      const weatherCode = data.hourly.weathercode[index];
      return {
        time: new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        temperature: Math.round(data.hourly.temperature_2m[index]),
        condition: getWeatherCondition(weatherCode),
        icon: getWeatherIcon(weatherCode)
      };
    }).filter((_: any, index: number) => 
      data.hourly.time[index].startsWith(today) && 
      index >= currentHour
    );

    // Process daily forecast
    const daily = data.daily.time.map((date: string, index: number) => {
      const weatherCode = data.daily.weathercode[index];
      return {
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
        maxTemp: Math.round(data.daily.temperature_2m_max[index]),
        minTemp: Math.round(data.daily.temperature_2m_min[index]),
        precipitation: data.daily.precipitation_sum[index],
        condition: getWeatherCondition(weatherCode),
        icon: getWeatherIcon(weatherCode)
      };
    });

    return { 
      current: {
        temp: Math.round(data.hourly.temperature_2m[0]),
        weatherCode: data.hourly.weathercode[0],
        precipitation: data.hourly.precipitation_probability[0],
        condition: getWeatherCondition(data.hourly.weathercode[0]),
        icon: getWeatherIcon(data.hourly.weathercode[0])
      },
      hourly,
      daily: daily.slice(0, 5) // Next 5 days
    };
  };


  const togglePump = async (state: boolean) => {
  try {
    setIsLoading(true);
    
    // Update local state immediately for better UX
    setPumpState(state);
    console.log(state);
    
     // Log the pump state change
    await logSensorData('esp32_001', soilMoisture || 0, state ? 1 : 0);

    // Update in commands table
    const { error } = await supabase
      .from('commands')
      .update({
        command: state ? 1 : 0,  // 1 for ON, 0 for OFF
        created_at: new Date().toISOString()
      })
      .eq('device_id', 'esp32_001'); 

    if (error) throw error;

  } catch (err) {
    console.error('Error toggling pump:', err);
    setError('Failed to update pump state');
    // Revert local state on error
    setPumpState(!state);
  } finally {
    setIsLoading(false);
  }
};
// Add this ref and effect hook near your other state declarations
const modalRef = useRef<HTMLDivElement>(null);
 
// Add this effect to handle outside clicks
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      setIsConfigOpen(false);
    }
  };
 
  if (isConfigOpen) {
    document.addEventListener('mousedown', handleClickOutside);
  }
 
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [isConfigOpen]);
 
 const makeDecision = async () => {
  if (!config || soilMoisture === null || !weatherData) {
    setDecisionNotification({
      show: true,
      message: "Insufficient data to make a decision",
      type: 'error'
    });
    return;
  }

  const todayRain = weatherData.daily[0]?.precipitation || 0;
  const tomorrowRain = weatherData.daily[1]?.precipitation || 0;
  const RAIN_THRESHOLD = 5; // mm of rain to be considered significant

  // Decision logic
  if (soilMoisture < config.dryThreshold) {
    if (todayRain >= RAIN_THRESHOLD) {
      setDecisionNotification({
        show: true,
        message: `Recommendation: Soil is dry (${soilMoisture}%) but it's raining today (${todayRain}mm). No need to water.`,
        type: 'info'
      });
    } else if (tomorrowRain >= RAIN_THRESHOLD) {
      setDecisionNotification({
        show: true,
        message: `Recommendation: Soil is dry (${soilMoisture}%) and rain is expected tomorrow (${tomorrowRain}mm). Consider watering until moderate level.`,
        type: 'warning'
      });
    } else {
      setDecisionNotification({
        show: true,
        message: `Recommendation: Soil is dry (${soilMoisture}%). You may want to turn ON the pump.`,
        type: 'warning'
      });
    }
  } else if (soilMoisture > config.moderateThreshold) {
    setDecisionNotification({
      show: true,
      message: `Recommendation: Soil is too wet (${soilMoisture}%). You may want to turn OFF the pump.`,
      type: 'info'
    });
  } else {
    setDecisionNotification({
      show: true,
      message: `Soil moisture is optimal (${soilMoisture}%). No action needed.`,
      type: 'success'
    });
  }

  // Auto-hide notification after 10 seconds
  setTimeout(() => {
    setDecisionNotification(prev => prev ? { ...prev, show: false } : null);
  }, 10000);

  // If auto decision making is on, execute the recommended action
  if (autoDecisionMaking) {
    console.log("hello auto mode");
    if (soilMoisture < config.dryThreshold && todayRain < RAIN_THRESHOLD) {
      await togglePump(true);
    } else if (soilMoisture > config.dryThreshold) {
      await togglePump(false);
    }else{
      console.log(`soil moisture ${soilMoisture} config threshold ${config.dryThreshold} todayrain ${todayRain} rain_thres ${RAIN_THRESHOLD}`);
    }
  }
};

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation({
            lat: latitude.toFixed(6),
            lon: longitude.toFixed(6)
          });
          fetchWeather(latitude.toString(), longitude.toString());
        },
        (error) => {
          setError("Unable to get location: " + error.message);
        }
      );
    } else {
      setError("Geolocation is not supported by your browser");
    }
  };

  const handleLogout = () => {
    // Clear any authentication tokens or user data from localStorage
    localStorage.removeItem('authToken');
    // Redirect to login page
    router.push('/login');
  };
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Irrigation System Dashboard</h1>
              <p className="text-gray-700">Location: {config?.location || 'Loading location...'}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <span className="mr-2 text-sm font-medium text-gray-800">Auto Decision</span>
                <button
                  type="button"
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${autoDecisionMaking ? 'bg-indigo-600' : 'bg-gray-200'}`}
                  onClick={() => setAutoDecisionMaking(!autoDecisionMaking)}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${autoDecisionMaking ? 'translate-x-6' : 'translate-x-1'}`}
                  />
                </button>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </header>
        <div className="flex justify-between items-center mb-6">
  <h1 className="text-2xl font-bold"> dashboard </h1>
  <button
    onClick={() => setIsConfigOpen(true)}
    className="p-2 rounded-full hover:bg-gray-100"
    title="Configure thresholds"
  >
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  </button>
</div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {/* Decision Notification */}
        {decisionNotification?.show && (
          <div 
            className={`mb-6 p-4 rounded-md ${
              decisionNotification.type === 'error' ? 'bg-red-100 text-red-700' :
              decisionNotification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
              decisionNotification.type === 'success' ? 'bg-green-100 text-green-700' :
              'bg-blue-100 text-blue-700'
            }`}
            role="alert"
          >
            <div className="flex justify-between items-center">
              <p>{decisionNotification.message}</p>
              <button 
                onClick={() => setDecisionNotification(prev => prev ? { ...prev, show: false } : null)}
                className="ml-4 text-xl font-bold leading-none"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pump Control Card */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Pump Control</h2>
            <div className="flex flex-col items-center space-y-4">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-4xl font-bold ${
                pumpState ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {pumpState ? 'ON' : 'OFF'}
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => togglePump(true)}
                  disabled={isLoading || pumpState}
                  className={`px-6 py-2 rounded-md font-medium ${
                    pumpState
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  Turn On
                </button>
                <button
                  onClick={() => togglePump(false)}
                  disabled={isLoading || !pumpState}
                  className={`px-6 py-2 rounded-md font-medium ${
                    !pumpState
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  Turn Off
                </button>
              </div>
            </div>
          </div>

          {/* Soil Moisture Card */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Soil Moisture</h2>
            <div className="flex flex-col items-center">
              {soilMoisture !== null ? (
                <>
                  <div className="w-48 h-48 relative mb-4">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke="#e5e7eb"
                          strokeWidth="10"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          fill="none"
                          stroke={
                            soilMoisture < config!.dryThreshold
                              ? '#ef4444' // Red for dry
                              : soilMoisture > config!.moderateThreshold
                              ? '#22c55e' // Green for wet
                              : '#f59e0b' // Yellow for moderate
                          }
                          strokeWidth="10"
                          strokeDasharray={`${soilMoisture * 2.83} 283`}
                          transform="rotate(-90 50 50)"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold">{soilMoisture}%</span>
                      <span className="text-sm text-gray-600">
                        {soilMoisture < config!.dryThreshold
                          ? 'Dry'
                          : soilMoisture > config!.moderateThreshold
                          ? 'Wet'
                          : 'Moderate'}
                      </span>
                    </div>
                  </div>
                  <div className="w-full">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>0%</span>
                      <span>50%</span>
                      <span>100%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{ width: `${soilMoisture}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-1 text-xs text-gray-600">
                      <span>Dry</span>
                      <span>Moderate</span>
                      <span>Wet</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-gray-600">Loading moisture data...</div>
              )}
            </div>
            <button
            onClick={fetchData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                Refresh
              </>
            )}
          </button>
          </div>

          {/* Weather Forecast Card */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Weather Forecast</h2>
            {weatherLoading ? (
              <div className="text-gray-600">Loading weather data...</div>
            ) : weatherData?.daily?.length > 0 ? (
              <div className="relative">
                <div className="overflow-hidden">
                  <div className="flex transition-transform duration-300" style={{ transform: `translateX(-${currentDay * 100}%)` }}>
                    {weatherData.daily.slice(0, 3).map((day: any, index: number) => (
                      <div key={index} className="w-full flex-shrink-0 px-2">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="font-medium text-lg mb-2">
                            {index === 0 ? 'Today' : index === 1 ? 'Tomorrow' : day.date}
                          </h3>
                          <div className="flex items-center justify-between">
                            <div className="text-4xl font-bold">
                              {day.maxTemp}°C
                            </div>
                            <div className="text-4xl">
                              {day.icon}
                            </div>
                          </div>
                          <div className="mt-2 text-gray-700">{day.condition}</div>
                          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                            <div>High: {day.maxTemp}°C</div>
                            <div>Low: {day.minTemp}°C</div>
                            <div>Precip: {day.precipitation}mm</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setCurrentDay(prev => Math.max(0, prev - 1))}
                  disabled={currentDay === 0}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  &larr;
                </button>
                <button
                  onClick={() => setCurrentDay(prev => Math.min(weatherData.daily.length - 1, prev + 1))}
                  disabled={currentDay === 2}
                  className="absolute right-0 top-1/2 -translate-y-1/2 -mr-2 p-2 rounded-full bg-white shadow-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  &rarr;
                </button>
                <div className="flex justify-center mt-4 space-x-2">
                  {[0, 1, 2].map((dot) => (
                    <button
                      key={dot}
                      onClick={() => setCurrentDay(dot)}
                      className={`w-2 h-2 rounded-full ${currentDay === dot ? 'bg-blue-500' : 'bg-gray-300'}`}
                      aria-label={`View day ${dot + 1}`}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-gray-600">No weather data available</div>
            )}
          </div>
        </div> {/* Close the grid container */}

        {/* Decision Button */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={makeDecision}
            disabled={isLoading || soilMoisture === null}
            className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Make Irrigation Decision
          </button>
        </div>

        {/* Status Bar */}
        <div className="mt-8 p-4 bg-white rounded-lg shadow-md">
          <h3 className="font-medium mb-2">System Status</h3>
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              config && soilMoisture !== null ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-sm">
              {config && soilMoisture !== null
                ? 'System online and monitoring'
                : 'Connecting to sensors...'}
            </span>
          </div>
        </div>

        {/* Sensor Data Charts */}
        <div className="mt-12">
          <h2 className="text-2xl font-bold mb-6 text-gray-800">Sensor Analytics</h2>
          <div className="bg-white p-6 rounded-lg shadow-md">
            <SensorCharts weatherData={weatherData} />
          </div>
        </div>
      </div>
      {/* Configuration Modal */}
{isConfigOpen && (
  <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-black/30">
    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-2xl">
      <div ref={modalRef} className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Configure Thresholds</h2>
        <button 
          onClick={() => setIsConfigOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <form onSubmit={handleUpdateThresholds}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dry Threshold (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={dryThreshold}
            onChange={(e) => setDryThreshold(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rain Threshold (%)
          </label>
          <input
            type="number"
            min="0"
            max="100"
            value={rainThreshold}
            onChange={(e) => setRainThreshold(Number(e.target.value))}
            className="w-full p-2 border border-gray-300 rounded"
            required
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => setIsConfigOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  </div>
)}
    </div>

  );
}
