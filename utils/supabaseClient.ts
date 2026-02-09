import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function sendPumpCommand(deviceId: string, command: 'ON' | 'OFF') {
  const { data, error } = await supabase
    .from('commands')
    .insert([
      { 
        device_id: deviceId, 
        command: command,
        created_at: new Date().toISOString()
      },
    ]);

  if (error) {
    console.error('Error sending command to Supabase:', error);
    throw error;
  }
  
  return data;
}

// In utils/supabaseClient.ts
export async function getLatestSensorData() {
  const { data, error } = await supabase
    .from('commands')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('Error fetching sensor data:', error);
    throw error;
  }

  return data;
}
