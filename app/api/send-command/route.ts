import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    // Log the incoming request URL and method
    console.log(`[${new Date().toISOString()}] ${request.method} ${request.url}`);
    
    // Parse the request body
    let body;
    try {
      body = await request.json();
      console.log('Request body:', JSON.stringify(body, null, 2));
    } catch (e) {
      console.error('Error parsing JSON:', e);
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const { device_id, command } = body;

    // Validate required fields
    const errors = [];
    if (!device_id) errors.push('Missing device_id');
    if (command === undefined || command === null) errors.push('Missing command');
    
    if (errors.length > 0) {
      console.error('Validation errors:', errors);
      return NextResponse.json(
        { error: 'Invalid request', details: errors },
        { status: 400 }
      );
    }

    // Convert command to 1/0 format
    const commandValue = command === 'ON' || command === 1 || command === '1' ? 1 : 0;
    
    // First, try to update the existing record
    const { data: updateData, error: updateError } = await supabase
      .from('commands')
      .update({ command: commandValue })
      .eq('device_id', device_id)
      .select();

    let data = updateData;
    let error = updateError;

    // If no rows were updated (record doesn't exist), insert a new one
    if (!updateError && (!updateData || updateData.length === 0)) {
      const { data: insertData, error: insertError } = await supabase
        .from('commands')
        .insert([{ device_id, command: commandValue }])
        .select();
      
      data = insertData;
      error = insertError;
    }

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save command to Supabase' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error in send-command API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
