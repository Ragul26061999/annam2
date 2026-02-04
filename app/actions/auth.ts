'use server'

import { requireSupabaseAdmin } from '@/src/lib/supabase-admin';

export async function createUserAccount(
  entityId: string,
  entityType: 'staff' | 'doctor' | 'patient',
  emailInput: string,
  name: string,
  role: string,
  passwordInput?: string
) {
  try {
    const supabaseAdmin = requireSupabaseAdmin();

    // 1. Format Email
    let email = emailInput.trim();
    if (!email) {
      return { success: false, error: 'Email is required' };
    }
    
    // Check if it's a mobile number (only digits)
    if (/^\d+$/.test(email)) {
      email = `${email}@annammultispecialityhospital.com`;
    }

    // 2. Determine Password
    const password = passwordInput && passwordInput.trim() ? passwordInput : 'password123';

    // 3. Map Role
    const roleMap: Record<string, string> = {
      'Administrator': 'admin',
      'Lab Technician': 'technician',
      'Nurse': 'nurse',
      'Pharmacist': 'pharmacist',
      'Receptionist': 'receptionist',
      'Doctor': 'doctor',
      'Patient': 'patient',
      'MD': 'md'
    };
    
    // Normalize role (handle existing lowercase or mapped)
    const normalizedRole = roleMap[role] || role.toLowerCase();

    // 4. Create Auth User
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        name,
        role: normalizedRole
      }
    });

    if (authError) {
      return { success: false, error: authError.message };
    }

    if (!authUser.user) {
      return { success: false, error: 'Failed to create user' };
    }

    // 5. Get Entity Identifier (Employee ID, License, UHID)
    let identifier = null;
    let tableName = '';
    
    if (entityType === 'staff') {
      tableName = 'staff';
      const { data } = await supabaseAdmin.from('staff').select('employee_id').eq('id', entityId).single();
      identifier = data?.employee_id;
    } 
    else if (entityType === 'doctor') {
      tableName = 'doctors';
      const { data } = await supabaseAdmin.from('doctors').select('license_number').eq('id', entityId).single();
      identifier = data?.license_number;
    } 
    else if (entityType === 'patient') {
      tableName = 'patients';
      const { data } = await supabaseAdmin.from('patients').select('patient_id').eq('id', entityId).single();
      identifier = data?.patient_id;
    }

    // 6. Create Public User Record
    const { data: publicUser, error: publicUserError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_id: authUser.user.id,
        email: email,
        name: name,
        role: normalizedRole,
        status: 'active',
        employee_id: identifier // Map entity ID to employee_id column
      })
      .select()
      .single();

    if (publicUserError) {
      // Try to cleanup auth user if public user creation fails to avoid orphan auth users
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
      return { success: false, error: 'Failed to create public user profile: ' + publicUserError.message };
    }

    // 7. Update Entity Table (Link and Email)
    const { error: linkError } = await supabaseAdmin
      .from(tableName)
      .update({ 
        email: email,
        user_id: publicUser.id 
      })
      .eq('id', entityId);

    if (linkError) {
      return { success: false, error: 'Failed to link user to profile: ' + linkError.message };
    }

    return { success: true, email, password };

  } catch (error: any) {
    console.error('Create user error:', error);
    return { success: false, error: error.message || 'Unknown error occurred' };
  }
}
