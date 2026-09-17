// lib/supabaseClient.js
(function() {
  // CONFIGURATION: Replace these values with your actual Supabase project credentials
  const supabaseUrl = 'https://YOUR_PROJECT_REF.supabase.co';
  const supabaseKey = 'YOUR_SUPABASE_ANON_PUBLISHABLE_KEY';

  if (typeof supabase === 'undefined') {
    console.error('Supabase core library not loaded. Ensure lib/supabase.js is loaded first.');
    return;
  }

  // Initialize global Supabase Client instance
  window.supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);
  console.log('Supabase client initialized successfully.');
})();
