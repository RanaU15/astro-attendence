import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Read .env file directly
const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabaseUrl = env['PUBLIC_SUPABASE_URL'];
const supabaseAnonKey = env['PUBLIC_SUPABASE_ANON_KEY'];

console.log('SUPABASE URL:', supabaseUrl);
console.log('HAS ANON KEY:', !!supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  console.log('\n--- Checking employees table ---');
  const { data: employees, error: empErr } = await supabase.from('employees').select('*').limit(5);
  if (empErr) {
    console.error('Employees error:', empErr);
  } else {
    console.log(`Found ${employees.length} employees (showing up to 5):`);
    console.log(JSON.stringify(employees, null, 2));
  }

  console.log('\n--- Checking attendance table ---');
  const { data: attendance, error: attErr } = await supabase.from('attendance').select('*').limit(5);
  if (attErr) {
    console.error('Attendance error:', attErr);
  } else {
    console.log(`Found ${attendance.length} attendance logs (showing up to 5):`);
    console.log(JSON.stringify(attendance, null, 2));
  }

  console.log('\n--- Checking travel_sessions table ---');
  const { data: travel, error: travErr } = await supabase.from('travel_sessions').select('*').limit(5);
  if (travErr) {
    console.error('Travel sessions error:', travErr);
  } else {
    console.log(`Found ${travel.length} travel sessions (showing up to 5):`);
    console.log(JSON.stringify(travel, null, 2));
  }
}

checkDatabase();
