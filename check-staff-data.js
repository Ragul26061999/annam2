/**
 * Script to check if staff data exists in the database
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase credentials (from src/lib/supabase.ts)
const supabaseUrl = 'https://zusheijhebsmjiyyeiqq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1c2hlaWpoZWJzbWppeXllaXFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE4MjI0NDAsImV4cCI6MjA2NzM5ODQ0MH0.iwGPaOJPa6OvwX_iA1xvRt5cM72DWfd8Br1pwRTemRc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStaffData() {
  console.log('🔍 Checking Staff Data in Database...\n');
  console.log('='.repeat(80));

  try {
    // 1. Check if staff table exists and get count
    console.log('\n📊 STAFF TABLE CHECK');
    console.log('-'.repeat(80));
    
    const { data: staffData, error: staffError, count: staffCount } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: false })
      .limit(10);

    if (staffError) {
      console.error('❌ Error querying staff table:', staffError.message);
      if (staffError.code === '42P01') {
        console.log('⚠️  Staff table does not exist in the database');
      }
    } else {
      console.log(`✅ Staff table exists`);
      console.log(`📈 Total staff records: ${staffCount || 0}`);
      
      if (staffData && staffData.length > 0) {
        console.log(`\n📋 Sample Staff Records (first ${staffData.length}):`);
        console.log('-'.repeat(80));
        staffData.forEach((staff, index) => {
          console.log(`\n${index + 1}. Staff ID: ${staff.id}`);
          console.log(`   Employee ID: ${staff.employee_id || 'N/A'}`);
          console.log(`   Name: ${staff.first_name || ''} ${staff.last_name || ''}`);
          console.log(`   Role: ${staff.role || 'N/A'}`);
          console.log(`   Email: ${staff.email || 'N/A'}`);
          console.log(`   Phone: ${staff.phone || 'N/A'}`);
          console.log(`   Department ID: ${staff.department_id || 'N/A'}`);
          console.log(`   Status: ${staff.is_active ? 'Active' : 'Inactive'}`);
          console.log(`   Hire Date: ${staff.hire_date || 'N/A'}`);
        });
      } else {
        console.log('\n⚠️  No staff records found in the database');
        console.log('💡 You may need to add staff members to the system');
      }
    }

    // 2. Check departments table
    console.log('\n\n📊 DEPARTMENTS TABLE CHECK');
    console.log('-'.repeat(80));
    
    const { data: deptData, error: deptError, count: deptCount } = await supabase
      .from('departments')
      .select('*', { count: 'exact' });

    if (deptError) {
      console.error('❌ Error querying departments table:', deptError.message);
    } else {
      console.log(`✅ Departments table exists`);
      console.log(`📈 Total departments: ${deptCount || 0}`);
      
      if (deptData && deptData.length > 0) {
        console.log(`\n📋 Available Departments:`);
        console.log('-'.repeat(80));
        deptData.forEach((dept, index) => {
          console.log(`${index + 1}. ${dept.name} (${dept.is_active ? 'Active' : 'Inactive'})`);
          if (dept.description) {
            console.log(`   Description: ${dept.description}`);
          }
        });
      }
    }

    // 3. Check staff roles table (if exists)
    console.log('\n\n📊 STAFF ROLES TABLE CHECK');
    console.log('-'.repeat(80));
    
    const { data: rolesData, error: rolesError, count: rolesCount } = await supabase
      .from('staff_roles')
      .select('*', { count: 'exact' });

    if (rolesError) {
      if (rolesError.code === '42P01') {
        console.log('⚠️  Staff roles table does not exist (may be optional)');
      } else {
        console.error('❌ Error querying staff_roles table:', rolesError.message);
      }
    } else {
      console.log(`✅ Staff roles table exists`);
      console.log(`📈 Total roles: ${rolesCount || 0}`);
      
      if (rolesData && rolesData.length > 0) {
        console.log(`\n📋 Available Roles:`);
        console.log('-'.repeat(80));
        rolesData.forEach((role, index) => {
          console.log(`${index + 1}. ${role.name}`);
          if (role.description) {
            console.log(`   Description: ${role.description}`);
          }
        });
      }
    }

    // 4. Check staff schedules table (if exists)
    console.log('\n\n📊 STAFF SCHEDULES TABLE CHECK');
    console.log('-'.repeat(80));
    
    const { data: schedulesData, error: schedulesError, count: schedulesCount } = await supabase
      .from('staff_schedules')
      .select('*', { count: 'exact' })
      .limit(5);

    if (schedulesError) {
      if (schedulesError.code === '42P01') {
        console.log('⚠️  Staff schedules table does not exist (may be optional)');
      } else {
        console.error('❌ Error querying staff_schedules table:', schedulesError.message);
      }
    } else {
      console.log(`✅ Staff schedules table exists`);
      console.log(`📈 Total schedules: ${schedulesCount || 0}`);
    }

    // 5. Summary
    console.log('\n\n' + '='.repeat(80));
    console.log('📝 SUMMARY');
    console.log('='.repeat(80));
    
    const summary = {
      'Staff Records': staffCount || 0,
      'Departments': deptCount || 0,
      'Roles': rolesCount || 0,
      'Schedules': schedulesCount || 0
    };

    Object.entries(summary).forEach(([key, value]) => {
      const status = value > 0 ? '✅' : '⚠️';
      console.log(`${status} ${key}: ${value}`);
    });

    if (staffCount === 0) {
      console.log('\n💡 RECOMMENDATION:');
      console.log('   No staff data found. Consider:');
      console.log('   1. Running a seed script to add sample staff');
      console.log('   2. Adding staff manually through the admin interface');
      console.log('   3. Importing staff data from an existing system');
    } else {
      console.log('\n✅ Staff data is present in the database!');
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ Unexpected error:', error);
  }
}

// Run the check
checkStaffData()
  .then(() => {
    console.log('\n✅ Staff data check completed!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Failed to check staff data:', error);
    process.exit(1);
  });
