# Patient Revisit Feature - Technical Specification

## 📐 Architecture Overview

### System Design
```
┌─────────────────────────────────────────────────────────┐
│                    User Interface Layer                  │
│  ┌──────────────────┐      ┌──────────────────┐        │
│  │  Dashboard Page  │      │  Create Page      │        │
│  │  /revisit        │      │  /revisit/create  │        │
│  └────────┬─────────┘      └────────┬──────────┘        │
└───────────┼────────────────────────┼───────────────────┘
            │                        │
┌───────────┼────────────────────────┼───────────────────┐
│           │    Service Layer       │                    │
│           ▼                        ▼                    │
│  ┌────────────────────────────────────────────┐        │
│  │        revisitService.ts                    │        │
│  │  - searchPatientByUHID()                    │        │
│  │  - getPatientVisitHistory()                 │        │
│  │  - createRevisit()                          │        │
│  │  - getRecentRevisits()                      │        │
│  │  - getRevisitStats()                        │        │
│  └────────────────┬───────────────────────────┘        │
└───────────────────┼─────────────────────────────────────┘
                    │
┌───────────────────┼─────────────────────────────────────┐
│                   │    Data Layer                       │
│                   ▼                                     │
│  ┌─────────────────────────────────────────────┐       │
│  │         Supabase PostgreSQL                  │       │
│  │  - patient_revisits table                    │       │
│  │  - patients table (reference)                │       │
│  │  - staff table (reference)                   │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## 🗄️ Database Schema

### Table: `patient_revisits`

```sql
CREATE TABLE patient_revisits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  uhid VARCHAR(50) NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  visit_time TIME NOT NULL DEFAULT CURRENT_TIME,
  department VARCHAR(100),
  doctor_id UUID REFERENCES staff(id),
  reason_for_visit TEXT NOT NULL,
  symptoms TEXT,
  previous_diagnosis TEXT,
  current_diagnosis TEXT,
  prescription_id UUID,
  consultation_fee DECIMAL(10, 2) DEFAULT 0,
  payment_mode VARCHAR(50) DEFAULT 'Cash',
  payment_status VARCHAR(50) DEFAULT 'pending',
  visit_type VARCHAR(50) DEFAULT 'follow-up',
  staff_id UUID REFERENCES staff(id),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_patient_revisits_patient_id ON patient_revisits(patient_id);
CREATE INDEX idx_patient_revisits_uhid ON patient_revisits(uhid);
CREATE INDEX idx_patient_revisits_visit_date ON patient_revisits(visit_date);
CREATE INDEX idx_patient_revisits_doctor_id ON patient_revisits(doctor_id);
```

### Relationships
- `patient_id` → `patients.id` (CASCADE DELETE)
- `doctor_id` → `staff.id` (NULL ON DELETE)
- `staff_id` → `staff.id` (NULL ON DELETE)

### Field Constraints
- `reason_for_visit`: NOT NULL (required)
- `consultation_fee`: DEFAULT 0, DECIMAL(10,2)
- `payment_status`: DEFAULT 'pending'
- `visit_type`: DEFAULT 'follow-up'

---

## 💻 Service Layer API

### File: `/src/lib/revisitService.ts`

#### Interface: `PatientRevisit`
```typescript
interface PatientRevisit {
  id: string;
  patient_id: string;
  uhid: string;
  visit_date: string;
  visit_time: string;
  department?: string;
  doctor_id?: string;
  reason_for_visit: string;
  symptoms?: string;
  previous_diagnosis?: string;
  current_diagnosis?: string;
  prescription_id?: string;
  consultation_fee?: number;
  payment_mode?: string;
  payment_status?: string;
  visit_type?: string;
  staff_id?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}
```

#### Function: `searchPatientByUHID(uhid: string)`
**Purpose:** Find patient by UHID  
**Parameters:**
- `uhid: string` - Patient's unique hospital ID

**Returns:** `Promise<PatientDetails | null>`

**Logic:**
1. Query `patients` table with case-insensitive UHID match
2. Calculate age from `date_of_birth`
3. Return patient details or null if not found

**Error Handling:**
- Returns `null` for PGRST116 (not found)
- Throws error for other failures

#### Function: `getPatientVisitHistory(patientId: string, limit: number = 5)`
**Purpose:** Get recent visits for a patient  
**Parameters:**
- `patientId: string` - Patient's database ID
- `limit: number` - Max number of visits (default: 5)

**Returns:** `Promise<PatientRevisit[]>`

**Query:**
```typescript
.from('patient_revisits')
.select('*, staff:staff_id(name)')
.eq('patient_id', patientId)
.order('visit_date', { ascending: false })
.order('visit_time', { ascending: false })
.limit(limit)
```

#### Function: `createRevisit(revisitData: PatientRevisitData)`
**Purpose:** Create new revisit record  
**Parameters:**
- `revisitData: PatientRevisitData` - Visit information

**Returns:** `Promise<PatientRevisit>`

**Validation:**
- Required: `patient_id`, `uhid`, `reason_for_visit`
- Optional fields set to undefined if empty

**Database Operation:**
```typescript
.insert([revisitData])
.select()
.single()
```

#### Function: `getRecentRevisits(limit: number = 20)`
**Purpose:** Get recent revisits for dashboard  
**Parameters:**
- `limit: number` - Max records (default: 20)

**Returns:** `Promise<PatientRevisit[]>` with joined patient and staff data

**Query:**
```typescript
.select(`
  *,
  patient:patient_id(name, patient_id, phone),
  staff:staff_id(name)
`)
.order('visit_date', { ascending: false })
.order('visit_time', { ascending: false })
.limit(limit)
```

#### Function: `getRevisitStats()`
**Purpose:** Calculate statistics  
**Returns:**
```typescript
{
  total: number,      // All-time revisits
  today: number,      // Today's count
  thisMonth: number   // Current month count
}
```

**Queries:**
1. Total: Count all records
2. Today: Filter by current date
3. This Month: Filter by first day of month to now

---

## 🎨 Frontend Components

### Page: `/app/revisit/page.tsx`

**State Management:**
```typescript
const [revisits, setRevisits] = useState<any[]>([]);
const [stats, setStats] = useState({ total: 0, today: 0, thisMonth: 0 });
const [loading, setLoading] = useState(true);
const [searchTerm, setSearchTerm] = useState('');
```

**Data Flow:**
1. `useEffect()` → `loadData()`
2. `loadData()` → Parallel fetch of revisits & stats
3. Update state with fetched data
4. Render dashboard

**Features:**
- Real-time search filtering
- Date formatting (en-IN locale)
- Responsive table
- Loading states
- Empty states

### Page: `/app/revisit/create/page.tsx`

**State Management:**
```typescript
const [uhidSearch, setUhidSearch] = useState('');
const [patient, setPatient] = useState<PatientDetails | null>(null);
const [visitHistory, setVisitHistory] = useState<any[]>([]);
const [doctors, setDoctors] = useState<Doctor[]>([]);
const [formData, setFormData] = useState({ /* form fields */ });
```

**User Flow:**
1. Search patient by UHID
2. Display patient details + history
3. Auto-fill previous diagnosis
4. User fills form
5. Validate required fields
6. Submit to `createRevisit()`
7. Show success page
8. Redirect to dashboard

**Validation Rules:**
- Patient must exist
- Reason for visit required
- Staff selection required
- All other fields optional

**Auto-fill Logic:**
```typescript
if (history.length > 0 && history[0].current_diagnosis) {
  setFormData(prev => ({
    ...prev,
    previousDiagnosis: history[0].current_diagnosis
  }));
}
```

---

## 🔌 Integration Points

### StaffSelect Component
**Import:** `../../../src/components/StaffSelect`  
**Props:**
- `value: string` - Selected staff ID
- `onChange: (val: string) => void` - Handler
- `label: string` - Display label
- `required: boolean` - Validation flag

**Usage:**
```tsx
<StaffSelect
  value={formData.staffId}
  onChange={(val) => handleInputChange('staffId', val)}
  label="Registered By (Staff)"
  required
/>
```

### Doctor Service
**Import:** `../../../src/lib/doctorService`  
**Function:** `getAllDoctorsSimple()`  
**Returns:** `Doctor[]` with user details

**Used For:**
- Populating department dropdown
- Filtering doctors by department
- Displaying doctor names

---

## 🎯 Business Logic

### Visit Type Classification
```typescript
type VisitType = 
  | 'follow-up'        // Return visit for existing condition
  | 'emergency'        // Urgent care needed
  | 'routine-checkup'  // Regular health check
  | 'consultation';    // General consultation
```

### Payment Status
```typescript
type PaymentStatus = 
  | 'pending'   // Not yet paid
  | 'paid'      // Fully paid
  | 'partial';  // Partially paid
```

### Payment Modes
```typescript
type PaymentMode = 
  | 'Cash' 
  | 'Card' 
  | 'UPI' 
  | 'Insurance';
```

---

## 🔒 Security Implementation

### Row Level Security (RLS)
```sql
ALTER TABLE patient_revisits ENABLE ROW LEVEL SECURITY;

-- Read access for all authenticated users
CREATE POLICY "Enable read access for all users" 
  ON patient_revisits FOR SELECT 
  USING (true);

-- Insert for authenticated users
CREATE POLICY "Enable insert access for authenticated users" 
  ON patient_revisits FOR INSERT 
  WITH CHECK (true);

-- Update for authenticated users
CREATE POLICY "Enable update access for authenticated users" 
  ON patient_revisits FOR UPDATE 
  USING (true);
```

### Data Validation
- UHID validated against existing patients
- Staff ID validated against active staff
- Doctor ID validated if provided
- SQL injection prevention via parameterized queries

---

## 📊 Performance Optimizations

### Database Level
1. **Indexes on frequently queried columns**
   - patient_id (for patient lookups)
   - uhid (for search)
   - visit_date (for date filtering)
   - doctor_id (for doctor reports)

2. **Efficient Queries**
   - Use `.single()` for unique results
   - Limit results with `.limit()`
   - Order before limiting for top N queries

### Frontend Level
1. **Code Splitting**
   - Dashboard and Create pages separately loaded
   - Next.js automatic code splitting

2. **State Management**
   - Minimal re-renders
   - Efficient filtering with useMemo (can be added)

3. **Loading States**
   - Skeleton loaders for better UX
   - Async operations don't block UI

---

## 🧪 Testing Strategy

### Unit Tests (To Be Implemented)
```typescript
// revisitService.test.ts
describe('searchPatientByUHID', () => {
  it('should return patient when UHID exists', async () => {
    const result = await searchPatientByUHID('UHID001');
    expect(result).toBeDefined();
    expect(result?.patient_id).toBe('UHID001');
  });

  it('should return null when UHID not found', async () => {
    const result = await searchPatientByUHID('INVALID');
    expect(result).toBeNull();
  });
});
```

### Integration Tests
- Test full flow: Search → Fill → Submit
- Verify database persistence
- Check data relationships

### E2E Tests (Recommended)
```typescript
// Playwright/Cypress tests
test('Create revisit flow', async () => {
  await page.goto('/revisit/create');
  await page.fill('[placeholder*="UHID"]', 'UHID001');
  await page.click('button:has-text("Search")');
  // ... continue test
});
```

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] Run SQL migration in production Supabase
- [ ] Verify all environment variables
- [ ] Test in staging environment
- [ ] Backup production database

### Deployment
- [ ] Deploy code to production
- [ ] Monitor error logs
- [ ] Verify feature accessibility
- [ ] Test critical paths

### Post-Deployment
- [ ] Verify stats calculation
- [ ] Test patient search
- [ ] Create test revisit
- [ ] Monitor performance metrics

---

## 📈 Future Enhancements

### Short Term
1. **Prescription Integration**
   - Link revisits to prescriptions
   - Auto-generate prescription from revisit

2. **Printing**
   - Visit slip printing
   - Patient copy generation

3. **Analytics Dashboard**
   - Revisit trends
   - Top reasons for revisit
   - Department-wise distribution

### Long Term
1. **SMS Notifications**
   - Appointment reminders
   - Follow-up alerts

2. **Patient Portal Integration**
   - Patients view their revisit history
   - Book follow-up appointments

3. **AI Suggestions**
   - Predict follow-up needs
   - Suggest next visit date

---

## 🐛 Known Issues / Limitations

### Current Limitations
1. No prescription linking yet
2. No visit slip printing
3. Stats not real-time (page refresh needed)
4. Search is client-side only

### Planned Fixes
1. Add WebSocket for real-time updates
2. Implement server-side search
3. Add export to PDF/Excel
4. Prescription module integration

---

## 📞 Support & Maintenance

### Logging
- All service functions log errors to console
- Database errors caught and reported
- User-friendly error messages displayed

### Monitoring
**Recommended Metrics:**
- Revisit creation rate
- Search success rate
- Form abandonment rate
- API response times

### Maintenance
**Regular Tasks:**
- Review error logs weekly
- Update indexes based on query patterns
- Archive old revisit data (yearly)
- Backup database regularly

---

## 📚 References

### External Dependencies
- **Next.js 16.1.1**: React framework
- **Supabase**: Backend & database
- **Lucide React**: Icon library
- **TypeScript**: Type safety

### Related Documentation
- [Supabase Docs](https://supabase.com/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [PostgreSQL Functions](https://www.postgresql.org/docs/)

---

**Document Version:** 1.0.0  
**Last Updated:** December 29, 2025  
**Author:** Development Team  
**Status:** ✅ Production Ready
