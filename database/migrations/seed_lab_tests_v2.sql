-- Seed Lab and Radiology Tests from Master List
-- Source: data/lab_diagnostic_test_master_list.md

-- 1. Biochemistry Tests
INSERT INTO lab_test_catalog (test_code, test_name, category, test_cost, department, is_active) VALUES
('BIO-001', '24 Hours Creatinine Clearance', 'Biochemistry', 350.00, 'Laboratory', true),
('BIO-002', '24 Hours Protein Clearance', 'Biochemistry', 100.00, 'Laboratory', true),
('BIO-003', 'ADA Level', 'Biochemistry', 600.00, 'Laboratory', true),
('BIO-004', 'ANA', 'Biochemistry', 500.00, 'Laboratory', true),
('BIO-005', 'APTT', 'Biochemistry', 250.00, 'Laboratory', true),
('BIO-006', 'Acid Phosphatase', 'Biochemistry', 300.00, 'Laboratory', true),
('BIO-007', 'Albumin', 'Biochemistry', 100.00, 'Laboratory', true),
('BIO-008', 'ALP (Alkaline Phosphatase)', 'Biochemistry', 300.00, 'Laboratory', true),
('BIO-009', 'Ammonia', 'Biochemistry', 500.00, 'Laboratory', true),
('BIO-010', 'Amylase', 'Biochemistry', 500.00, 'Laboratory', true),
('BIO-011', 'Bilirubin', 'Biochemistry', 200.00, 'Laboratory', true),
('BIO-012', 'Calcium', 'Biochemistry', 150.00, 'Laboratory', true),
('BIO-013', 'Cholesterol', 'Biochemistry', 140.00, 'Laboratory', true),
('BIO-014', 'Cholinesterase', 'Biochemistry', 550.00, 'Laboratory', true),
('BIO-015', 'Creatinine (Serum)', 'Biochemistry', 200.00, 'Laboratory', true),
('BIO-016', 'Electrolytes', 'Biochemistry', 500.00, 'Laboratory', true),
('BIO-017', 'FPS', 'Biochemistry', 50.00, 'Laboratory', true),
('BIO-018', 'FT3', 'Biochemistry', 250.00, 'Laboratory', true),
('BIO-019', 'FT4', 'Biochemistry', 250.00, 'Laboratory', true),
('BIO-020', 'Gamma GT', 'Biochemistry', 250.00, 'Laboratory', true),
('BIO-021', 'Glucose', 'Biochemistry', 50.00, 'Laboratory', true),
('BIO-022', 'Glucose Test', 'Biochemistry', 300.00, 'Laboratory', true),
('BIO-023', 'HDL Cholesterol', 'Biochemistry', 150.00, 'Laboratory', true),
('BIO-024', 'Hemoglobin', 'Biochemistry', 60.00, 'Laboratory', true),
('BIO-025', 'HbA1c', 'Biochemistry', 450.00, 'Laboratory', true),
('BIO-026', 'Insulin', 'Biochemistry', 600.00, 'Laboratory', true),
('BIO-027', 'LDH', 'Biochemistry', 500.00, 'Laboratory', true),
('BIO-028', 'LFT', 'Biochemistry', 1000.00, 'Laboratory', true),
('BIO-029', 'Lipase', 'Biochemistry', 500.00, 'Laboratory', true),
('BIO-030', 'Lipid Profile', 'Biochemistry', 700.00, 'Laboratory', true),
('BIO-031', 'Magnesium', 'Biochemistry', 200.00, 'Laboratory', true),
('BIO-032', 'Micro Albumin', 'Biochemistry', 300.00, 'Laboratory', true),
('BIO-033', 'NT Pro BNP', 'Biochemistry', 600.00, 'Laboratory', true),
('BIO-034', 'Phosphorus', 'Biochemistry', 150.00, 'Laboratory', true),
('BIO-035', 'RFT', 'Biochemistry', 500.00, 'Laboratory', true),
('BIO-036', 'SGOT', 'Biochemistry', 150.00, 'Laboratory', true),
('BIO-037', 'SGPT', 'Biochemistry', 150.00, 'Laboratory', true),
('BIO-038', 'Sugar FBS', 'Biochemistry', 50.00, 'Laboratory', true),
('BIO-039', 'T3', 'Biochemistry', 300.00, 'Laboratory', true),
('BIO-040', 'T4', 'Biochemistry', 300.00, 'Laboratory', true),
('BIO-041', 'TSH', 'Biochemistry', 300.00, 'Laboratory', true),
('BIO-042', 'Total Protein', 'Biochemistry', 400.00, 'Laboratory', true),
('BIO-043', 'Triglycerides', 'Biochemistry', 250.00, 'Laboratory', true),
('BIO-044', 'Urea', 'Biochemistry', 80.00, 'Laboratory', true),
('BIO-045', 'Uric Acid', 'Biochemistry', 180.00, 'Laboratory', true),
('BIO-046', 'Vitamin D', 'Biochemistry', 600.00, 'Laboratory', true)
ON CONFLICT (test_code) 
DO UPDATE SET 
    test_cost = EXCLUDED.test_cost,
    test_name = EXCLUDED.test_name,
    category = EXCLUDED.category;

-- 2. Hematology Tests
INSERT INTO lab_test_catalog (test_code, test_name, category, test_cost, department, is_active) VALUES
('HEM-001', 'Absolute Eosinophil Count', 'Hematology', 180.00, 'Laboratory', true),
('HEM-002', 'Bleeding Time', 'Hematology', 50.00, 'Laboratory', true),
('HEM-003', 'Blood Grouping', 'Hematology', 100.00, 'Laboratory', true),
('HEM-004', 'CBC', 'Hematology', 300.00, 'Laboratory', true),
('HEM-005', 'Clotting Time', 'Hematology', 50.00, 'Laboratory', true),
('HEM-006', 'ESR', 'Hematology', 50.00, 'Laboratory', true),
('HEM-007', 'FNAC', 'Hematology', 1000.00, 'Laboratory', true),
('HEM-008', 'Hematocrit', 'Hematology', 60.00, 'Laboratory', true),
('HEM-009', 'MP Card Test', 'Hematology', 150.00, 'Laboratory', true),
('HEM-010', 'PCV', 'Hematology', 80.00, 'Laboratory', true),
('HEM-011', 'Peripheral Smear', 'Hematology', 200.00, 'Laboratory', true),
('HEM-012', 'Platelet Count', 'Hematology', 150.00, 'Laboratory', true),
('HEM-013', 'PPBS', 'Hematology', 300.00, 'Laboratory', true),
('HEM-014', 'PPT Smear', 'Hematology', 300.00, 'Laboratory', true),
('HEM-015', 'Smear MP / MF', 'Hematology', 600.00, 'Laboratory', true)
ON CONFLICT (test_code) 
DO UPDATE SET 
    test_cost = EXCLUDED.test_cost,
    test_name = EXCLUDED.test_name,
    category = EXCLUDED.category;

-- 3. Serology & Immunology
INSERT INTO lab_test_catalog (test_code, test_name, category, test_cost, department, is_active) VALUES
('SER-001', 'Anti TB IgG', 'Serology & Immunology', 500.00, 'Laboratory', true),
('SER-002', 'Anti TB IgM', 'Serology & Immunology', 500.00, 'Laboratory', true),
('SER-003', 'ASO', 'Serology & Immunology', 600.00, 'Laboratory', true),
('SER-004', 'C Reactive Protein', 'Serology & Immunology', 300.00, 'Laboratory', true),
('SER-005', 'Chikungunya IgM', 'Serology & Immunology', 600.00, 'Laboratory', true),
('SER-006', 'Complement C3', 'Serology & Immunology', 400.00, 'Laboratory', true),
('SER-007', 'Complement C4', 'Serology & Immunology', 400.00, 'Laboratory', true),
('SER-008', 'Coombs Direct', 'Serology & Immunology', 200.00, 'Laboratory', true),
('SER-009', 'Coombs Indirect', 'Serology & Immunology', 200.00, 'Laboratory', true),
('SER-010', 'D-Dimer', 'Serology & Immunology', 500.00, 'Laboratory', true),
('SER-011', 'Dengue Card Test', 'Serology & Immunology', 300.00, 'Laboratory', true),
('SER-012', 'HAV', 'Serology & Immunology', 550.00, 'Laboratory', true),
('SER-013', 'HBsAg Spot Card', 'Serology & Immunology', 200.00, 'Laboratory', true),
('SER-014', 'HCV Spot Card', 'Serology & Immunology', 300.00, 'Laboratory', true),
('SER-015', 'HEV', 'Serology & Immunology', 1000.00, 'Laboratory', true),
('SER-016', 'HIV Spot Card', 'Serology & Immunology', 300.00, 'Laboratory', true),
('SER-017', 'HIV Western Blot', 'Serology & Immunology', 2000.00, 'Laboratory', true),
('SER-018', 'Leptospira IgM', 'Serology & Immunology', 600.00, 'Laboratory', true),
('SER-019', 'Malaria Card Test', 'Serology & Immunology', 150.00, 'Laboratory', true),
('SER-020', 'Scrub Typhus', 'Serology & Immunology', 400.00, 'Laboratory', true),
('SER-021', 'VDRL Spot', 'Serology & Immunology', 150.00, 'Laboratory', true),
('SER-022', 'Widal Test', 'Serology & Immunology', 200.00, 'Laboratory', true)
ON CONFLICT (test_code) 
DO UPDATE SET 
    test_cost = EXCLUDED.test_cost,
    test_name = EXCLUDED.test_name,
    category = EXCLUDED.category;

-- 4. Microbiology
INSERT INTO lab_test_catalog (test_code, test_name, category, test_cost, department, is_active) VALUES
('MIC-001', 'AF B Stain', 'Microbiology', 150.00, 'Laboratory', true),
('MIC-002', 'Aerobic Susceptibility (Urine)', 'Microbiology', 150.00, 'Laboratory', true),
('MIC-003', 'Blood Culture & Sensitivity', 'Microbiology', 500.00, 'Laboratory', true),
('MIC-004', 'Body Fluid Analysis', 'Microbiology', 800.00, 'Laboratory', true),
('MIC-005', 'C/S Blood', 'Microbiology', 250.00, 'Laboratory', true),
('MIC-006', 'Culture Urine with Sensitivity', 'Microbiology', 250.00, 'Laboratory', true),
('MIC-007', 'Fungus', 'Microbiology', 250.00, 'Laboratory', true),
('MIC-008', 'Gram Stain', 'Microbiology', 200.00, 'Laboratory', true),
('MIC-009', 'Semen Analysis', 'Microbiology', 300.00, 'Laboratory', true),
('MIC-010', 'Sputum Culture & Sensitivity', 'Microbiology', 1000.00, 'Laboratory', true),
('MIC-011', 'Stool Routine', 'Microbiology', 150.00, 'Laboratory', true),
('MIC-012', 'Stool Ova & Parasite', 'Microbiology', 400.00, 'Laboratory', true),
('MIC-013', 'Urine Culture Sensitivity', 'Microbiology', 500.00, 'Laboratory', true)
ON CONFLICT (test_code) 
DO UPDATE SET 
    test_cost = EXCLUDED.test_cost,
    test_name = EXCLUDED.test_name,
    category = EXCLUDED.category;

-- 5. Urine Analysis
INSERT INTO lab_test_catalog (test_code, test_name, category, test_cost, department, is_active) VALUES
('URI-001', 'Urine Acetone', 'Urine Analysis', 50.00, 'Laboratory', true),
('URI-002', 'Urine Albumin', 'Urine Analysis', 50.00, 'Laboratory', true),
('URI-003', 'Urine Analysis (Clinical Pathology)', 'Urine Analysis', 100.00, 'Laboratory', true),
('URI-004', 'Urine BP', 'Urine Analysis', 50.00, 'Laboratory', true),
('URI-005', 'Urine BS', 'Urine Analysis', 50.00, 'Laboratory', true),
('URI-006', 'Urine Sugar', 'Urine Analysis', 50.00, 'Laboratory', true),
('URI-007', 'Urine Routine', 'Urine Analysis', 100.00, 'Laboratory', true)
ON CONFLICT (test_code) 
DO UPDATE SET 
    test_cost = EXCLUDED.test_cost,
    test_name = EXCLUDED.test_name,
    category = EXCLUDED.category;

-- 6. Radiology - X-Ray
INSERT INTO radiology_test_catalog (test_code, test_name, modality, body_part, test_cost, is_active) VALUES
('RAD-001', 'Abdomen Erect & Supine', 'X-Ray', 'Abdomen', 400.00, true),
('RAD-002', 'Ankle AP & LAT', 'X-Ray', 'Ankle', 400.00, true),
('RAD-003', 'Chest AP', 'X-Ray', 'Chest', 400.00, true),
('RAD-004', 'Elbow AP & LAT', 'X-Ray', 'Elbow', 600.00, true),
('RAD-005', 'Foot AP & LAT', 'X-Ray', 'Foot', 600.00, true),
('RAD-006', 'Forearm AP & LAT', 'X-Ray', 'Forearm', 600.00, true),
('RAD-007', 'Hand AP & LAT', 'X-Ray', 'Hand', 600.00, true),
('RAD-008', 'Hip Joint AP & LAT', 'X-Ray', 'Hip', 600.00, true),
('RAD-009', 'Humerus AP & LAT', 'X-Ray', 'Humerus', 600.00, true),
('RAD-010', 'Knee AP & LAT', 'X-Ray', 'Knee', 600.00, true),
('RAD-011', 'L-Spine AP & LAT', 'X-Ray', 'Spine', 600.00, true),
('RAD-012', 'Neck AP', 'X-Ray', 'Neck', 400.00, true),
('RAD-013', 'Pelvis AP & LAT', 'X-Ray', 'Pelvis', 400.00, true),
('RAD-014', 'Shoulder X-Ray', 'X-Ray', 'Shoulder', 400.00, true),
('RAD-015', 'Skull AP & LAT', 'X-Ray', 'Skull', 400.00, true),
('RAD-016', 'Spine AP & LAT', 'X-Ray', 'Spine', 600.00, true),
('RAD-017', 'Wrist AP & LAT', 'X-Ray', 'Wrist', 400.00, true)
ON CONFLICT (test_code) 
DO UPDATE SET 
    test_cost = EXCLUDED.test_cost,
    test_name = EXCLUDED.test_name,
    modality = EXCLUDED.modality;

-- 7. Contrast & Special Radiology
INSERT INTO radiology_test_catalog (test_code, test_name, modality, test_cost, contrast_required, is_active) VALUES
('RAD-SPC-001', 'Barium Meal', 'Special Radiology', 2400.00, true, true),
('RAD-SPC-002', 'Barium Swallow', 'Special Radiology', 400.00, true, true),
('RAD-SPC-003', 'IVP', 'Special Radiology', 1000.00, true, true),
('RAD-SPC-004', 'KUB (Kidney Ureter Bladder)', 'Special Radiology', 600.00, false, true)
ON CONFLICT (test_code) 
DO UPDATE SET 
    test_cost = EXCLUDED.test_cost,
    test_name = EXCLUDED.test_name,
    contrast_required = EXCLUDED.contrast_required;

-- 8. Clinical Pathology & Others
INSERT INTO lab_test_catalog (test_code, test_name, category, test_cost, department, is_active) VALUES
('CP-001', 'Body Fluid', 'Clinical Pathology', 800.00, 'Laboratory', true),
('CP-002', 'Pregnancy Test', 'Clinical Pathology', 200.00, 'Laboratory', true)
ON CONFLICT (test_code) 
DO UPDATE SET 
    test_cost = EXCLUDED.test_cost,
    test_name = EXCLUDED.test_name,
    category = EXCLUDED.category;
