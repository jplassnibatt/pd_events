// Initialize Supabase client
const SUPABASE_URL = 'https://wtyojcrsymzzezevmili.supabase.co';  // Replace with your URL
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind0eW9qY3JzeW16emV6ZXZtaWxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTM3NzYsImV4cCI6MjA3ODQ2OTc3Nn0.7xG8953WPAiPsSMROZXdWr-6uwvik8ETUAXqfZ9i-qI';     // Replace with your anon key
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Load initial count
async function loadKrakenCount() {
    try {
        const { data, error } = await supabase
            .from('counters')
            .select('count')
            .eq('name', 'kraken_releases')
            .single();

        if (error) throw error;

        document.getElementById('kraken-count').textContent = data.count.toLocaleString();
        return data.count;
    } catch (error) {
        console.error('Error loading count:', error);
        document.getElementById('kraken-count').textContent = '0';
        return 0;
    }
}

// Increment counter
async function incrementKrakenCount() {
    try {
        const { data, error } = await supabase.rpc('increment_counter', {
            counter_name: 'kraken_releases'
        });

        if (error) throw error;

        document.getElementById('kraken-count').textContent = data.toLocaleString();
        return data;
    } catch (error) {
        console.error('Error incrementing count:', error);
        // Still increment locally even if server fails
        const currentCount = parseInt(document.getElementById('kraken-count').textContent.replace(/,/g, '')) || 0;
        document.getElementById('kraken-count').textContent = (currentCount + 1).toLocaleString();
    }
}

// Load count when page loads
document.addEventListener('DOMContentLoaded', loadKrakenCount);
