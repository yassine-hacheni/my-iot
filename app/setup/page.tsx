'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SetupPage() {
  const router = useRouter();
  // Update the form data state to include latitude and longitude
const [formData, setFormData] = useState({
  username: '',
  password: '',
  confirmPassword: '',
  dryThreshold: 30,
  rainThreshold: 5,
  latitude: '',
  longitude: ''
});
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('Threshold') ? parseInt(value, 10) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');
  
  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  // Validate latitude and longitude
  const lat = parseFloat(formData.latitude);
  const lng = parseFloat(formData.longitude);
  
  if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    setError('Please enter valid latitude (-90 to 90) and longitude (-180 to 180) values');
    return;
  }

  setIsLoading(true);
  
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(formData.password, salt);
    
    const { data, error: supabaseError } = await supabase
      .from('users_settings')
      .upsert(
        { 
          username: formData.username,
          password: hashedPassword,
          dry_threshold: formData.dryThreshold,
          rain_threshold: formData.rainThreshold,
          latitude: lat,
          longitude: lng,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'id' }
      )
      .select();

    if (supabaseError) {
      console.error('Supabase error:', supabaseError);
      throw new Error(supabaseError.message || 'Failed to save user data');
    }

    localStorage.setItem('irrigationConfig', JSON.stringify({
      dryThreshold: formData.dryThreshold,
      rainThreshold: formData.rainThreshold,
      location: `${lat},${lng}`
    }));
    
    router.push('/dashboard');
  } catch (err) {
    console.error('Detailed error:', err);
    setError(`Failed to save configuration: ${err.message || 'Unknown error'}`);
  } finally {
    setIsLoading(false);
  }
};
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Irrigation System Setup
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={formData.username}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Choose a username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  value={formData.password}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter a password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="rainThreshold" className="block text-sm font-medium text-gray-700">
                Rain Threshold (mm)
              </label>
              <div className="mt-1">
                <input
                  id="rainThreshold"
                  name="rainThreshold"
                  type="number"
                  min="0"
                  step="0.1"
                  required
                  value={formData.rainThreshold}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter rain threshold in mm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <div className="mt-1">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={8}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Confirm your password"
                />
              </div>
            </div>

            <div>
              <label htmlFor="dryThreshold" className="block text-sm font-medium text-gray-700">
                Dry Threshold (%)
              </label>
              <div className="mt-1">
                <input
                  id="dryThreshold"
                  name="dryThreshold"
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={formData.dryThreshold}
                  onChange={handleChange}
                  className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>


            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}
            {/* Add these input fields inside the form, before the submit button */}
<div>
  <label htmlFor="latitude" className="block text-sm font-medium text-gray-700">
    Latitude
  </label>
  <div className="mt-1">
    <input
      id="latitude"
      name="latitude"
      type="number"
      step="0.000001"
      required
      value={formData.latitude}
      onChange={handleChange}
      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      placeholder="e.g. 40.7128"
    />
  </div>
</div>

<div>
  <label htmlFor="longitude" className="block text-sm font-medium text-gray-700">
    Longitude
  </label>
  <div className="mt-1">
    <input
      id="longitude"
      name="longitude"
      type="number"
      step="0.000001"
      required
      value={formData.longitude}
      onChange={handleChange}
      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      placeholder="e.g. -74.0060"
    />
  </div>
</div>
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Create Account & Save Settings'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
