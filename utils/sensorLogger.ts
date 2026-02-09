// utils/sensorLogger.ts
import { supabase } from './supabaseClient';

export async function logSensorData(deviceId: string, soilMoisture: number, pumpState: number) {
  try {
    const { data, error } = await supabase
      .from('sensor_logs')
      .insert([
        {
          device_id: deviceId,
          soil_moisture: soilMoisture,
          pump_state: pumpState,
        }
      ]);

    if (error) {
      console.error('Error logging sensor data:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Exception in logSensorData:', error);
    return false;
  }
}