import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Derive category from medication name or generic name
const deriveCategory = (name: string, genericName: string): string => {
  const lowerName = name.toLowerCase();
  const lowerGeneric = genericName ? genericName.toLowerCase() : '';
  
  // Antibiotics
  if (lowerName.includes('antibiotic') || lowerGeneric.includes('amox') || 
      lowerGeneric.includes('azith') || lowerGeneric.includes('cef') ||
      lowerGeneric.includes('augmentin') || lowerGeneric.includes('levoflox') ||
      lowerName.includes('azith') || lowerName.includes('cef') ||
      lowerName.includes('augmentin') || lowerName.includes('levoflox')) {
    return 'Antibiotics';
  }
  
  // Cardiovascular
  if (lowerName.includes('amlodipine') || lowerName.includes('atenolol') ||
      lowerName.includes('metoprolol') || lowerName.includes('losartan') ||
      lowerGeneric.includes('amlodipine') || lowerGeneric.includes('atenolol')) {
    return 'Cardiovascular';
  }
  
  // Pain & Anti-inflammatory
  if (lowerName.includes('paracetamol') || lowerName.includes('ibuprofen') ||
      lowerName.includes('diclofenac') || lowerName.includes('ketorol') ||
      lowerGeneric.includes('paracetamol') || lowerGeneric.includes('ibuprofen')) {
    return 'Pain Management';
  }
  
  // Vitamins & Supplements
  if (lowerName.includes('vitamin') || lowerName.includes('multivitamin') ||
      lowerName.includes('zinc') || lowerName.includes('calcium') ||
      lowerGeneric.includes('vitamin') || lowerGeneric.includes('multivitamin')) {
    return 'Vitamins & Supplements';
  }
  
  // Gastrointestinal
  if (lowerName.includes('pantoprazole') || lowerName.includes('omeprazole') ||
      lowerName.includes('ranitidine') || lowerGeneric.includes('pantoprazole')) {
    return 'Gastrointestinal';
  }
  
  // Respiratory
  if (lowerName.includes('salbutamol') || lowerName.includes('montelukast') ||
      lowerGeneric.includes('salbutamol') || lowerGeneric.includes('montelukast')) {
    return 'Respiratory';
  }
  
  // Diabetes
  if (lowerName.includes('metformin') || lowerName.includes('glimepiride') ||
      lowerGeneric.includes('metformin') || lowerGeneric.includes('glimepiride')) {
    return 'Diabetes';
  }
  
  // Neurology
  if (lowerName.includes('levetiracetam') || lowerName.includes('phenytoin') ||
      lowerGeneric.includes('levetiracetam') || lowerGeneric.includes('phenytoin')) {
    return 'Neurology';
  }
  
  // Default category
  return 'General Medicine';
};

// Parse CSV file with proper quote handling
const parseCSV = (text: string): any[] => {
  const lines = text.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  
  return lines.slice(1).map((line, index) => {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    // Push the last value
    values.push(currentValue.trim());
    
    const obj: any = { row: index + 2 };
    
    headers.forEach((header, i) => {
      obj[header] = values[i] || '';
    });
    
    return obj;
  });
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Initialize Supabase client with service role key (no RLS)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const text = await file.text();
    const data = parseCSV(text);
    
    let successCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const errors: any[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const med = data[i];
      
      try {
        // Validate required field
        if (!med.Medicine || med.Medicine.trim() === '') {
          errors.push({
            row: med.row,
            field: 'Medicine',
            message: 'Medicine name is required'
          });
          errorCount++;
          continue;
        }
        
        const medData = {
          name: med.Medicine,
          generic_name: med.Combination || 'Not specified',
          manufacturer: med.Brand || 'Not specified',
          category: deriveCategory(med.Medicine, med.Combination || ''),
          dosage_form: med.Product || 'Not specified',
          strength: 'N/A',
          unit: 'N/A',
          total_stock: 0,
          available_stock: 0,
          minimum_stock_level: 0,
          purchase_price: 0,
          selling_price: 0,
          mrp: 0,
          prescription_required: false,
          status: 'active' as const,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        // Check for duplicates (simplified - only check by name)
        const { data: existingMed } = await supabase
          .from('medications')
          .select('id')
          .eq('name', medData.name)
          .single();
        
        if (existingMed) {
          duplicateCount++;
        } else {
          // Insert medication
          const { data: insertData, error } = await supabase
            .from('medications')
            .insert(medData)
            .select();
          
          if (error) {
            console.error('Error inserting medication:', {
              error: error,
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
              medData: medData
            });
            errors.push({
              row: med.row,
              error: error.message || 'Unknown error',
              medData: medData
            });
            errorCount++;
          } else {
            console.log('Successfully inserted medication:', insertData);
            successCount++;
          }
        }
        
      } catch (error) {
        console.error('Error processing row:', error);
        errors.push({
          row: med.row,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        errorCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      totalRows: data.length,
      successCount,
      errorCount,
      duplicateCount,
      errors: errors.slice(0, 10) // Return first 10 errors
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
