# Patient Revisit Feature - Quick Reference Guide

## 🎯 Overview
The Patient Revisit feature allows you to track and manage return visits from existing patients. This system captures comprehensive visit information while maintaining a complete history of patient interactions.

---

## 📋 Step-by-Step Setup

### Step 1: Database Setup (REQUIRED)
**You MUST execute this SQL script before using the feature:**

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `CREATE_PATIENT_REVISITS_TABLE.sql`
4. Copy all contents
5. Paste into Supabase SQL Editor
6. Click **Run** or press `Ctrl+Enter`
7. Verify: You should see "Success. No rows returned"

**What this creates:**
- `patient_revisits` table with all required fields
- Indexes for fast searching
- Security policies (RLS)
- Automatic timestamp updates

---

## 🚀 How to Use the Feature

### Accessing Revisit Module

1. **From Sidebar:**
   - Look for the "Revisit" menu item (cyan icon with refresh symbol)
   - Located after "Inpatient (IP)" in the sidebar
   - Click to open the dashboard

### Dashboard Overview

**Statistics Cards:**
- **Total Revisits**: All-time count
- **Today's Revisits**: Current day count
- **This Month**: Monthly count

**Features:**
- Search bar: Filter by UHID, patient name, or reason
- Recent visits table with full details
- "New Revisit" button to create new entries

---

## ➕ Creating a New Revisit

### Step 1: Search Patient
1. Click **"New Revisit"** button
2. Enter patient's **UHID** in search box
3. Click **"Search"** or press Enter
4. System validates patient exists

**If patient found:**
- Patient details auto-populate (Name, Age, Gender, Contact)
- Previous visits display (last 3)
- Previous diagnosis auto-fills if available

**If patient not found:**
- Error message displays
- Verify UHID is correct
- Patient must be registered first in the system

### Step 2: Fill Visit Information

**Required Fields (marked with *):**
- ✅ Visit Date
- ✅ Visit Time  
- ✅ Reason for Visit
- ✅ Registered By (Staff) - Select staff member

**Optional Fields:**
- Department
- Consulting Doctor
- Current Symptoms
- Previous Diagnosis (auto-filled)
- Current Diagnosis
- Visit Type (dropdown)
- Consultation Fee
- Payment Mode
- Additional Notes

### Step 3: Submit
1. Review all information
2. Ensure staff member is selected
3. Click **"Create Revisit"**
4. Success confirmation displays
5. Auto-redirects to dashboard in 2 seconds

---

## 📊 Data Collected

### Patient Identification
- **UHID**: Validated from existing records
- **Patient ID**: Auto-linked from database

### Visit Details
- **Date & Time**: When patient visited
- **Department**: Which department
- **Doctor**: Consulting physician

### Medical Information
- **Reason for Visit**: Why they came (required)
- **Symptoms**: Current complaints
- **Previous Diagnosis**: From last visit
- **Current Diagnosis**: New findings
- **Visit Type**: follow-up | emergency | routine-checkup | consultation

### Financial
- **Consultation Fee**: Amount charged
- **Payment Mode**: Cash | Card | UPI | Insurance
- **Payment Status**: pending | paid | partial

### Administrative
- **Staff ID**: Who registered the revisit
- **Notes**: Additional observations
- **Timestamps**: Created/Updated automatically

---

## 🔍 Search & Filter

**Dashboard Search:**
- Type in search box to filter results
- Searches across:
  - UHID
  - Patient name
  - Reason for visit
- Results update in real-time

---

## 💡 Tips & Best Practices

### For Staff Members

1. **Always Verify UHID:**
   - Double-check UHID before searching
   - Ask patient to show their ID card if unsure

2. **Complete Required Fields:**
   - Reason for visit should be clear and detailed
   - Select your staff ID correctly

3. **Review Previous History:**
   - Check previous visits before filling current diagnosis
   - Previous diagnosis auto-fills from last visit

4. **Payment Information:**
   - Update consultation fee if different from default
   - Select correct payment mode

### For Administrators

1. **Regular Monitoring:**
   - Check dashboard daily for stats
   - Review today's revisit count

2. **Data Quality:**
   - Ensure staff select themselves in forms
   - Train staff on proper reason descriptions

3. **Follow-up:**
   - Use visit history for patient care analysis
   - Track repeated visits for quality improvement

---

## 🎨 Visual Guide

### Dashboard Layout:
```
┌─────────────────────────────────────────────────┐
│  🔄 Patient Revisits    [+ New Revisit Button]  │
├─────────────────────────────────────────────────┤
│  [Total] [Today] [This Month]  ← Stats Cards    │
├─────────────────────────────────────────────────┤
│  🔍 Search by UHID, name, or reason...          │
├─────────────────────────────────────────────────┤
│  Recent Revisits Table:                          │
│  Date | UHID | Patient | Reason | Type | Fee    │
└─────────────────────────────────────────────────┘
```

### Create Revisit Form:
```
┌─────────────────────────────────────────────────┐
│  ← Patient Search                                │
│  [Enter UHID...] [Search]                        │
├─────────────────────────────────────────────────┤
│  Patient Details (auto-filled)                   │
│  UHID | Name | Age/Gender | Contact              │
│  Previous Visits: [History]                      │
├─────────────────────────────────────────────────┤
│  Visit Information Form:                         │
│  - Date/Time                                     │
│  - Department/Doctor                             │
│  - Reason (required)                             │
│  - Symptoms                                      │
│  - Diagnosis                                     │
│  - Fee & Payment                                 │
│  - Staff Selection (required)                    │
│  - Notes                                         │
├─────────────────────────────────────────────────┤
│  [Cancel] [Create Revisit]                       │
└─────────────────────────────────────────────────┘
```

---

## ❓ Troubleshooting

### Issue: "Patient not found"
**Solution:**
- Verify UHID is correct
- Check if patient is registered in system
- Try searching in Patients module first

### Issue: "Failed to create revisit"
**Possible Causes:**
1. Database table not created → Run SQL script
2. Missing required fields → Fill all marked with *
3. Staff not selected → Choose staff member

### Issue: Stats showing 0
**Solution:**
- Database may be empty (no revisits yet)
- Check if SQL migration ran successfully
- Verify network connection to Supabase

### Issue: Previous diagnosis not auto-filling
**Explanation:**
- Only fills if patient has previous visits
- Previous visit must have diagnosis recorded
- Check visit history section for data

---

## 🔐 Security & Privacy

- ✅ Row Level Security (RLS) enabled
- ✅ All data encrypted in transit
- ✅ Audit trail with timestamps
- ✅ Staff accountability tracking
- ✅ HIPAA-compliant data handling

---

## 📱 Mobile Responsiveness

The feature is fully responsive and works on:
- ✅ Desktop computers
- ✅ Tablets
- ✅ Mobile phones
- ✅ All modern browsers

---

## 🆘 Support

If you encounter issues:

1. **Check this guide** first
2. **Verify database setup** (SQL script executed)
3. **Review error messages** for specific issues
4. **Check browser console** for technical errors
5. **Contact system administrator** if problem persists

---

## ✅ Feature Checklist

Before using the feature, ensure:

- [ ] SQL migration script executed in Supabase
- [ ] Staff table populated with staff members
- [ ] Patients registered in system
- [ ] Doctors added to system
- [ ] Staff trained on using the interface
- [ ] Network connection to Supabase working

---

**Last Updated:** December 29, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready
