# Quick Start Guide - Enhanced Patient Registration with Drug Allergy

## 🚀 How to Access Enhanced Registration

### Step 1: Navigate to Patients Page
```
URL: http://localhost:3005/patients
```

### Step 2: Look for the Buttons (Top Right)
You'll see 4 buttons in this order:
1. **Refresh** (White/Gray)
2. **Emergency Register** (Red)
3. **Enhanced Registration** ⭐ (Gradient Orange) ← **CLICK THIS**
4. **Register New Patient** (Orange)

### Step 3: Click "Enhanced Registration"
This will take you to: `http://localhost:3005/patients/enhanced-register`

## 📋 Registration Process (4 Steps)

### Step 1: Personal Information
- **UHID Preview:** Auto-generated in format `AH2510-0001`
- **Name:** First and Last name
- **DOB/Age:** Enter either DOB (auto-calculates age) OR age (estimates DOB)
- **Gender, Marital Status**
- **Contact:** Phone, Email
- **Address**

**Click "Next" →**

---

### Step 2: Appointment & Medical Information ⭐ DRUG ALLERGY HERE

#### Appointment Details:
- **Select Doctor** from dropdown (loaded from database)
- **Appointment Date & Time**
- **Appointment Type:** New Patient, Follow-up, Consultation
- **Primary Complaint:** Reason for visit

#### Medical History:
- **Blood Group**
- **Current Symptoms**
- **General Allergies** (food, environmental, etc.)

#### 🔴 DRUG ALLERGY SECTION (Critical):
```
┌─────────────────────────────────────────────────┐
│ ⚠️ VITAL: Drug Allergy Information              │
│                                                  │
│ ○ No Drug Allergies                             │
│ ● Has Drug Allergies                            │
│                                                  │
│ If "Has Drug Allergies" selected:               │
│ ┌─────────────────────────────────────────────┐ │
│ │ Specify Drug Names (REQUIRED)               │ │
│ │ e.g., Penicillin, Aspirin, Ibuprofen       │ │
│ └─────────────────────────────────────────────┘ │
│ ⚠️ Critical for safe treatment                  │
└─────────────────────────────────────────────────┘
```

**How to Use:**
1. Select "No Drug Allergies" if patient has no drug allergies
2. Select "Has Drug Allergies" if patient is allergic to any drugs
3. If allergic, a text box appears - **MUST list all drug names**
4. Examples: Penicillin, Aspirin, Sulfa drugs, etc.

- **Current Medications**
- **Chronic Conditions**

**Click "Next" →**

---

### Step 3: Guardian/Attendant Details
- Guardian Name
- Relationship
- Contact Information
- Address (if different)

**All fields optional**

**Click "Next" →**

---

### Step 4: Emergency Contact & Insurance
- Emergency Contact Name, Phone, Relationship
- Insurance Provider & Policy Number
- **Final UHID Confirmation** displayed

**Click "Register Patient" →**

---

## ✅ Success Screen

After registration, you'll see:

### Patient Information:
- **UHID:** `AH2510-0001` (with copy button)
- **QR Code:** Generated and stored
- **Login Credentials:** For patient portal

### Print Options:
1. **Print Patient Label** (2×3 inch thermal label)
2. **Print Registration Slip** (A4 full page)

Both include:
- Hospital name
- QR code
- Patient UHID
- Patient name
- Date of visit

### Action Buttons:
- **View All Patients** → Go to patients list
- **View Patient Record** → See full patient details
- **Register Another Patient** → Start new registration

## 🎯 Key Features

### 1. Sequential UHID
- Format: `AH{YY}{MM}-{XXXX}`
- Example: `AH2510-0001` (October 2025, patient #1)
- Resets every month (0001, 0002, 0003...)

### 2. Age Auto-Calculation
- **Enter DOB** → Age calculated automatically
- **Enter Age** → DOB estimated as Jan 1st of calculated year
- Visual hints show calculated values

### 3. Drug Allergy (VITAL)
- Prominent red warning section
- Required to specify drug names if allergic
- Critical for patient safety

### 4. Appointment Integration
- Select doctor from database
- Schedule appointment during registration
- No need for separate appointment booking

### 5. QR Code
- Auto-generated for each UHID
- Stored in database
- Printed on labels for quick scanning

### 6. Printable Labels
- Thermal printer compatible (2×3 inch)
- A4 registration slip option
- Professional hospital branding

## 🔍 Finding Drug Allergy Information

### In the Form:
- **Location:** Step 2 - Appointment & Medical Information
- **Visual:** Red-bordered section with ⚠️ warning icon
- **Position:** After "General Allergies" field, before "Current Medications"

### After Registration:
Drug allergy information will be visible in:
- Patient details page
- Medical records
- Prescription screens
- Appointment details

## 📱 Button Locations Summary

### Main Patients Page (`/patients`):
```
┌─────────────────────────────────────────────────┐
│ Patients                                         │
│ Manage patient records and information          │
│                                                  │
│ [Refresh] [Emergency] [Enhanced] [Register]     │
│                          ↑                       │
│                    CLICK HERE                    │
└─────────────────────────────────────────────────┘
```

### Enhanced Registration Page (`/patients/enhanced-register`):
```
┌─────────────────────────────────────────────────┐
│ New Patient Registration                         │
│ Enhanced registration with appointment           │
│                                                  │
│ Step 1 → Step 2 → Step 3 → Step 4              │
│          ↑                                       │
│    Drug Allergy Here                            │
└─────────────────────────────────────────────────┘
```

## 🆘 Troubleshooting

### Issue: Can't find "Enhanced Registration" button
**Solution:** 
- Make sure you're on `/patients` page
- Look for gradient orange button
- Should be between "Emergency Register" and "Register New Patient"

### Issue: Drug allergy field not showing
**Solution:**
- Make sure you're on Step 2
- Scroll down to medical history section
- Look for red-bordered section with ⚠️ icon

### Issue: Can't submit with drug allergy
**Solution:**
- If you selected "Has Drug Allergies", you MUST fill in drug names
- The text area is required when allergic
- List at least one drug name

### Issue: UHID not generating
**Solution:**
- UHID generates automatically when moving from Step 1 to Step 2
- If it fails, click "Next" again
- Check browser console for errors

## 📞 Quick Reference

| Feature | Location | Required? |
|---------|----------|-----------|
| Enhanced Registration Button | `/patients` page, top right | - |
| Drug Allergy Selection | Step 2, Medical History section | No |
| Drug Names (if allergic) | Step 2, appears when "Has Allergies" selected | Yes (if allergic) |
| UHID Preview | Step 1, after personal info | Auto-generated |
| Doctor Selection | Step 2, Appointment section | Optional |
| Print Labels | Success screen | Optional |

## ✨ Tips

1. **Save Time:** Use Enhanced Registration for complete patient setup
2. **Drug Allergies:** Always ask patient about drug allergies - it's critical
3. **Age Entry:** If patient doesn't know exact DOB, just enter age
4. **Print Labels:** Print labels immediately after registration
5. **QR Codes:** Use QR scanner for quick patient lookup in future

---

**Ready to Register?** 
Go to http://localhost:3005/patients and click "Enhanced Registration"! 🎉
