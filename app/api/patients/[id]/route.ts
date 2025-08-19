import { NextRequest, NextResponse } from 'next/server';
import { updatePatientRecord, getPatientByUHID } from '../../../../src/lib/patientService';

// GET /api/patients/[id] - Get patient by UHID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const patient = await getPatientByUHID(id);
    
    if (!patient) {
      return NextResponse.json(
        { error: 'Patient not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ patient });
  } catch (error) {
    console.error('Error fetching patient:', error);
    return NextResponse.json(
      { error: 'Failed to fetch patient' },
      { status: 500 }
    );
  }
}

// PATCH /api/patients/[id] - Update patient by UHID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Patient ID is required' },
        { status: 400 }
      );
    }

    const updateData = await request.json();
    console.log('Received update data:', updateData);
    
    if (!updateData || Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Update data is required' },
        { status: 400 }
      );
    }

    // Validate required fields - only firstName is mandatory
    if (updateData.firstName !== undefined && (!updateData.firstName || updateData.firstName.trim() === '')) {
      return NextResponse.json(
        { error: 'First name is required' },
        { status: 400 }
      );
    }

    // Map frontend fields to database fields
    const mappedData: Record<string, string | undefined> = {};
    
    // Combine firstName and lastName into name field
    if (updateData.firstName || updateData.lastName) {
      const firstName = updateData.firstName || '';
      const lastName = updateData.lastName || '';
      mappedData.name = `${firstName} ${lastName}`.trim();
    }
    
    // Map other fields that exist in database
    const fieldMapping = {
      dateOfBirth: 'date_of_birth',
      maritalStatus: 'marital_status',
      currentMedications: 'current_medications',
      chronicConditions: 'chronic_conditions',
      previousSurgeries: 'previous_surgeries',
      bloodGroup: 'blood_group',
      medicalHistory: 'medical_history',
      emergencyContactName: 'emergency_contact_name',
      emergencyContactPhone: 'emergency_contact_phone',
      emergencyContactRelationship: 'emergency_contact_relationship',
      insuranceProvider: 'insurance_provider',
      insuranceNumber: 'insurance_number'
    };
    
    // Direct field mappings (same name in frontend and database)
    const directFields = ['gender', 'phone', 'email', 'address', 'allergies', 'status'];
    
    // Map fields with different names
    Object.entries(fieldMapping).forEach(([frontendField, dbField]) => {
      if (updateData[frontendField] !== undefined) {
        mappedData[dbField] = updateData[frontendField];
      }
    });
    
    // Map direct fields
    directFields.forEach(field => {
      if (updateData[field] !== undefined) {
        mappedData[field] = updateData[field];
      }
    });
    
    // Skip fields that don't exist in database
    // primaryComplaint, initialSymptoms, guardianName, guardianRelationship, guardianPhone, guardianAddress, referredBy
    
    // Add updated timestamp
    mappedData.updated_at = new Date().toISOString();

    console.log('Mapped data being sent to database:', mappedData);
    const updatedPatient = await updatePatientRecord(id, mappedData);
    
    return NextResponse.json(updatedPatient);
  } catch (error) {
    console.error('Error updating patient:', error);
    return NextResponse.json(
      { error: 'Failed to update patient' },
      { status: 500 }
    );
  }
}