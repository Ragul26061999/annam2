# Patient Registration - Button Locations & Access

## 🎯 Where to Find the Registration Buttons

### Main Patients Page
**URL**: `http://localhost:3004/patients`

**Location**: Top right corner of the page

### Two Registration Buttons Available:

#### 1. 🚨 Emergency Register Button (Red)
- **Text**: "Emergency Register"
- **Color**: Red background
- **Icon**: AlertTriangle
- **Link**: `/patients/emergency-register`
- **URL**: `http://localhost:3004/patients/emergency-register`
- **Purpose**: Quick registration for emergency patients

#### 2. 👤 Register New Patient Button (Orange)
- **Text**: "Register New Patient"
- **Color**: Orange background
- **Icon**: UserPlus
- **Link**: `/patients/register`
- **URL**: `http://localhost:3004/patients/register`
- **Purpose**: Full patient registration with all details

---

## 📍 Visual Location

```
┌─────────────────────────────────────────────────────────────┐
│  Patients Page Header                                       │
│                                                              │
│  Patients                          [Refresh] [Emergency] [Register] │
│  Manage patient records                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔗 Direct URLs

### Normal Registration (Enhanced with new features)
```
http://localhost:3004/patients/register
```

### Emergency Registration
```
http://localhost:3004/patients/emergency-register
```

---

## 📋 Code Location in `/app/patients/page.tsx`

**Lines 312-333**:

```tsx
<div className="flex gap-3">
  <button onClick={handleRefresh}>
    <RefreshCw /> Refresh
  </button>
  
  <Link href="/patients/emergency-register">
    <button className="bg-red-500">
      <AlertTriangle /> Emergency Register
    </button>
  </Link>
  
  <Link href="/patients/register">
    <button className="bg-orange-500">
      <UserPlus /> Register New Patient
    </button>
  </Link>
</div>
```

---

## ✨ Enhanced Features (After Implementation)

Once you implement the enhancements from `ENHANCED_REGISTRATION_IMPLEMENTATION.md`, the **"Register New Patient"** button will lead to a form with:

### New Features:
1. ✅ **Admission Type Selection**
   - Outpatient (OPD) 🏥
   - Inpatient (Admission) 🛏️

2. ✅ **Doctor Selection Dropdown**
   - Shows active doctors
   - Displays consultation fees
   - Optional field

3. ✅ **Bed Selection** (for Inpatient only)
   - Shows available beds
   - Displays daily rates
   - Optional field

4. ✅ **Dynamic Billing**
   - Registration Fee: ₹100
   - Consultation Fee: Variable
   - Bed Charges: Variable
   - Real-time total calculation

5. ✅ **Modern Printable Receipt**
   - Professional design
   - Itemized billing
   - Print & Download buttons

---

## 🚀 Quick Access Steps

### To Register a New Patient:

1. **Navigate to Patients Page**
   ```
   http://localhost:3004/patients
   ```

2. **Click Orange Button** (Top Right)
   - Button text: "Register New Patient"
   - Orange background with UserPlus icon

3. **Fill Registration Form**
   - Step 1: Personal Information
   - Step 2: Medical & Admission (NEW FEATURES HERE)
   - Step 3: Guardian Details
   - Step 4: Emergency Contact & Billing Preview

4. **View Receipt**
   - After successful registration
   - Print or download option

---

## 🎨 Button Styling

### Emergency Register Button
```css
bg-red-500 hover:bg-red-600
text-white
px-4 py-2.5
rounded-xl
shadow-sm hover:shadow-md
```

### Register New Patient Button
```css
bg-orange-500 hover:bg-orange-600
text-white
px-4 py-2.5
rounded-xl
shadow-sm hover:shadow-md
```

---

## 📱 Mobile View

On mobile devices, the buttons stack vertically:
```
┌──────────────────────┐
│  [Refresh]           │
│  [Emergency Register]│
│  [Register Patient]  │
└──────────────────────┘
```

---

## 🔧 Testing

### Test the Buttons:

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Open Patients Page**
   ```
   http://localhost:3004/patients
   ```

3. **Click "Register New Patient"**
   - Should navigate to `/patients/register`
   - Form should load with 4 steps

4. **Click "Emergency Register"**
   - Should navigate to `/patients/emergency-register`
   - Quick registration form should load

---

## ✅ Current Status

- ✅ Buttons are already implemented
- ✅ Routes are working
- ✅ Basic forms are functional
- 🔄 Enhanced features ready to implement (see `ENHANCED_REGISTRATION_IMPLEMENTATION.md`)

---

## 📞 Need Help?

If buttons are not visible:
1. Check if you're on the correct page (`/patients`)
2. Ensure development server is running
3. Clear browser cache
4. Check browser console for errors

---

**Last Updated**: 2025-10-04
**Status**: ✅ Buttons Active and Working
