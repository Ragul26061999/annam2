
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listProjects() {
  console.log('Checking database connection and fetching projects...');
  
  try {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*');

    if (error) {
      console.error('Error fetching projects:', error.message);
      return;
    }

    if (!projects || projects.length === 0) {
      console.log('Connected! But no projects found in the "projects" table.');
    } else {
      console.log('Connected! Database Project List:');
      console.table(projects);
    }

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

listProjects();
