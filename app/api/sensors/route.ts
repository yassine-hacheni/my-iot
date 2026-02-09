// import { NextResponse } from 'next/server';

// export async function GET(request: Request) {
//   try {
//     // Get ESP32 IP from environment variable or use a default
//     const config = localStorage.getItem('irrigationConfig');
//     // const espIp = process.env.ESP_IP || '
//     const espIp = config ? JSON.parse(config).espIp : '10.96.87.31';
    
//     // Forward request to your ESP32
//     const response = await fetch(`http://${espIp}/sensors`, {
//       method: 'GET',
//       headers: {
//         'Content-Type': 'application/json',
//         // Add any required headers for your ESP32
//       },
//       // Add cache control to prevent caching
//       cache: 'no-store',
//     });

//     if (!response.ok) {
//       throw new Error(`ESP32 responded with status: ${response.status}`);
//     }

//     const data = await response.json();
    
//     // Return the response with CORS headers
//     return new NextResponse(JSON.stringify(data), {
//       status: 200,
//       headers: {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
//         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching sensor data:', error);
//     return new NextResponse(
//       JSON.stringify({ error: 'Failed to fetch sensor data'}),
//       {
//         status: 500,
//         headers: {
//           'Content-Type': 'application/json',
//           'Access-Control-Allow-Origin': '*',
//         },
//       }
//     );
//   }
// }

// // Handle OPTIONS method for CORS preflight
// export async function OPTIONS() {
//   return new NextResponse(null, {
//     status: 204,
//     headers: {
//       'Access-Control-Allow-Origin': '*',
//       'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
//       'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//     },
//   });
// }