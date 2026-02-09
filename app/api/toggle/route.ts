import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get the URL and search params
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const relay = searchParams.get('relay') || '1'; // Default to relay 1 if not specified

    // Validate state parameter
    if (state === null || (state !== '0' && state !== '1')) {
      return new NextResponse(
        'Invalid state parameter. Must be 0 or 1',
        { status: 400, headers: { 'Content-Type': 'text/plain' } }
      );
    }

    const espIp = process.env.ESP_IP || '10.96.87.31';
    const url = `http://${espIp}/update?relay=${relay}&state=${state}`;

    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`ESP32 responded with status: ${response.status}`);
    }

    // Get the response as text
    const responseText = await response.text();
    
    // Return the response with text/plain content type
    return new NextResponse(responseText, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('Error toggling relay:', error);
    return new NextResponse(
      `Error: noway}`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}

// Handle OPTIONS method for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}