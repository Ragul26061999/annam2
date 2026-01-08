-- Seed X-Ray Procedures from Master List
-- Source: data/x_ray_procedure_master_list.md

-- 1. Skull / Head / ENT
INSERT INTO radiology_test_catalog (test_code, test_name, modality, body_part, test_cost, is_active) VALUES
('XR-SKU-001', 'Skull AP', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-002', 'Skull LAT', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-003', 'Skull Axial', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-004', 'Skull axial seated', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-005', 'Skull 30 degree (Towne’s)', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-006', 'Sella turcica – lateral', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-007', 'Petrous bone', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-008', 'Petrous bone – Mayer’s view', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-009', 'Petrous bone – Stenvers view', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-010', 'Zygomatic PA + LAT', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-011', 'Zygomatic LAT LT', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-012', 'Zygomatic LAT RT', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-013', 'Nasopharynx LAT', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-014', 'Nose LAT', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-015', 'Nose Axial', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-016', 'Eye', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-017', 'Eye AP', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-018', 'Eye LAT', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-019', 'Eye Object Position', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-020', 'PNS', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-021', 'Mastoid', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-022', 'Mandible', 'X-Ray', 'Skull / Head', 0.00, true),
('XR-SKU-023', 'Jaw Open & Close', 'X-Ray', 'Skull / Head', 0.00, true)
ON CONFLICT (test_code) DO NOTHING;

-- 2. Spine
INSERT INTO radiology_test_catalog (test_code, test_name, modality, body_part, test_cost, is_active) VALUES
('XR-SPI-001', 'C Spine AP, LAT and OBL', 'X-Ray', 'Spine', 0.00, true),
('XR-SPI-002', 'C Spine left & right LAT', 'X-Ray', 'Spine', 0.00, true),
('XR-SPI-003', 'Thoracic spine AP and LAT', 'X-Ray', 'Spine', 0.00, true),
('XR-SPI-004', 'Lumbar spine AP, LAT and OBL', 'X-Ray', 'Spine', 0.00, true),
('XR-SPI-005', 'Lumbar spine AP and LAT', 'X-Ray', 'Spine', 0.00, true),
('XR-SPI-006', 'Coccyx AP', 'X-Ray', 'Spine', 0.00, true),
('XR-SPI-007', 'Coccyx AP + LAT', 'X-Ray', 'Spine', 0.00, true),
('XR-SPI-008', 'DL Spine', 'X-Ray', 'Spine', 0.00, true)
ON CONFLICT (test_code) DO NOTHING;

-- 3. Chest & Thorax
INSERT INTO radiology_test_catalog (test_code, test_name, modality, body_part, test_cost, is_active) VALUES
('XR-CHE-001', 'Chest PA', 'X-Ray', 'Chest & Thorax', 0.00, true),
('XR-CHE-002', 'Chest PA + LAT', 'X-Ray', 'Chest & Thorax', 0.00, true),
('XR-CHE-003', 'Chest PA + LAT + OBL', 'X-Ray', 'Chest & Thorax', 0.00, true),
('XR-CHE-004', 'Chest LAT', 'X-Ray', 'Chest & Thorax', 0.00, true),
('XR-CHE-005', 'Chest AP', 'X-Ray', 'Chest & Thorax', 0.00, true),
('XR-CHE-006', 'Ribs AP + Axial', 'X-Ray', 'Chest & Thorax', 0.00, true),
('XR-CHE-007', 'Apicogram', 'X-Ray', 'Chest & Thorax', 0.00, true)
ON CONFLICT (test_code) DO NOTHING;

-- 4. Shoulder / Upper Limb
INSERT INTO radiology_test_catalog (test_code, test_name, modality, body_part, test_cost, is_active) VALUES
('XR-SHO-001', 'Shoulder AP + LAT (4 views)', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-002', 'Shoulder LT AP + LAT', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-003', 'Shoulder RT AP + LAT', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-004', 'Shoulder LT', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-005', 'Shoulder RT', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-006', 'Scapula RT AP', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-007', 'Scapula LT AP', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-008', 'Scapula LT LAT', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-009', 'Scapula RT LAT', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-010', 'Clavicle LT AP', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-011', 'Clavicle RT AP', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-012', 'Clavicle LT AP + RT AP', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-013', 'Forearm AP + LAT', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true),
('XR-SHO-014', 'STN', 'X-Ray', 'Shoulder / Upper Limb', 0.00, true)
ON CONFLICT (test_code) DO NOTHING;

-- 5. Elbow / Wrist / Hand / Finger
INSERT INTO radiology_test_catalog (test_code, test_name, modality, body_part, test_cost, is_active) VALUES
('XR-ELB-001', 'Elbow AP LAT (4 views)', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-002', 'Elbow joint LT AP + LAT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-003', 'Elbow joint RT AP + LAT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-004', 'Wrist PA + LAT (4 views)', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-005', 'Wrist AP LAT (4 views)', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-006', 'Wrist LT PA + LAT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-007', 'Wrist RT PA + LAT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-008', 'Wrist RT AP + LAT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-009', 'Hand LT AP + LAT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-010', 'Hand RT AP + LAT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-011', 'Hand Extent LT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-012', 'Hand Extent RT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-013', 'Finger LT AP + LAT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true),
('XR-ELB-014', 'Finger RT AP + LAT', 'X-Ray', 'Elbow / Wrist / Hand', 0.00, true)
ON CONFLICT (test_code) DO NOTHING;

-- 6. Pelvis / Abdomen
INSERT INTO radiology_test_catalog (test_code, test_name, modality, body_part, test_cost, is_active) VALUES
('XR-PEL-001', 'Pelvis AP', 'X-Ray', 'Pelvis / Abdomen', 0.00, true),
('XR-PEL-002', 'Pelvis LAT', 'X-Ray', 'Pelvis / Abdomen', 0.00, true),
('XR-PEL-003', 'KUB PA', 'X-Ray', 'Pelvis / Abdomen', 0.00, true),
('XR-PEL-004', 'T Pipe', 'X-Ray', 'Pelvis / Abdomen', 0.00, true),
('XR-PEL-005', 'Abdomen erect', 'X-Ray', 'Pelvis / Abdomen', 0.00, true),
('XR-PEL-006', 'Abdomen supine', 'X-Ray', 'Pelvis / Abdomen', 0.00, true),
('XR-PEL-007', 'Sacrum', 'X-Ray', 'Pelvis / Abdomen', 0.00, true)
ON CONFLICT (test_code) DO NOTHING;

-- 7. Lower Limb
INSERT INTO radiology_test_catalog (test_code, test_name, modality, body_part, test_cost, is_active) VALUES
('XR-LOW-001', 'Hip LT AP + LAT', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-002', 'Femur AP LAT (4 views)', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-003', 'Femur LT AP + LAT', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-004', 'Femur RT AP + LAT', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-005', 'Knee LT AP + LAT', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-006', 'Knee RT AP + LAT', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-007', 'Knee RT LAT (4 views)', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-008', 'Knee joint LT Axial', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-009', 'Knee joint RT Axial', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-010', 'Knee Skyline', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-011', 'Both Knee', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-012', 'Tibia AP LAT (4 views)', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-013', 'Tibia LT AP + LAT', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-014', 'Tibia RT AP + LAT', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-015', 'Calcaneus LAT', 'X-Ray', 'Lower Limb', 0.00, true),
('XR-LOW-016', 'Calcaneus Axial', 'X-Ray', 'Lower Limb', 0.00, true)
ON CONFLICT (test_code) DO NOTHING;

-- 8. Foot / Ankle
INSERT INTO radiology_test_catalog (test_code, test_name, modality, body_part, test_cost, is_active) VALUES
('XR-FOO-001', 'Foot AP LAT (4 views)', 'X-Ray', 'Foot / Ankle', 0.00, true),
('XR-FOO-002', 'Foot LT AP + LAT', 'X-Ray', 'Foot / Ankle', 0.00, true),
('XR-FOO-003', 'Foot RT AP + LAT', 'X-Ray', 'Foot / Ankle', 0.00, true),
('XR-FOO-004', 'Foot with Weight', 'X-Ray', 'Foot / Ankle', 0.00, true),
('XR-FOO-005', 'Foot LT with Weight', 'X-Ray', 'Foot / Ankle', 0.00, true),
('XR-FOO-006', 'Foot RT with Weight', 'X-Ray', 'Foot / Ankle', 0.00, true),
('XR-FOO-007', 'Ankle LT AP + LAT', 'X-Ray', 'Foot / Ankle', 0.00, true),
('XR-FOO-008', 'Ankle RT AP + LAT', 'X-Ray', 'Foot / Ankle', 0.00, true),
('XR-FOO-009', 'Ankle RT LAT (4 views)', 'X-Ray', 'Foot / Ankle', 0.00, true)
ON CONFLICT (test_code) DO NOTHING;
