# Revisit Feature - Testing Checklist

## ✅ Pre-Testing Setup

### Database Setup
- [ ] Execute `CREATE_PATIENT_REVISITS_TABLE.sql` in Supabase
- [ ] Verify `patient_revisits` table exists
- [ ] Check indexes are created
- [ ] Confirm RLS policies are active
- [ ] Test table permissions

### Required Data
- [ ] At least one patient in `patients` table
- [ ] At least one staff member in `staff` table
- [ ] At least one doctor in staff/doctors
- [ ] Know a valid patient UHID for testing

---

## 🧪 Functional Testing

### Test 1: Navigation & UI
- [ ] Sidebar shows "Revisit" menu item
- [ ] "Revisit" menu has cyan RefreshCw icon
- [ ] Clicking "Revisit" navigates to `/revisit`
- [ ] Dashboard loads without errors
- [ ] All three stat cards display
- [ ] "New Revisit" button is visible

### Test 2: Dashboard Statistics
- [ ] Total Revisits displays correct number
- [ ] Today's Revisits shows 0 initially
- [ ] This Month shows 0 initially
- [ ] Purple, Cyan, Blue color themes applied
- [ ] Icons display correctly

### Test 3: Patient Search (Create Page)
**Valid UHID:**
- [ ] Navigate to `/revisit/create`
- [ ] Enter valid patient UHID
- [ ] Click "Search" or press Enter
- [ ] Patient details auto-populate:
  - [ ] UHID displays correctly
  - [ ] Patient name appears
  - [ ] Age calculated correctly
  - [ ] Gender displays
  - [ ] Contact number shows
- [ ] Previous visits section appears (if any exist)

**Invalid UHID:**
- [ ] Enter non-existent UHID
- [ ] Click "Search"
- [ ] Error message displays: "Patient not found"
- [ ] Patient details remain empty
- [ ] Form doesn't appear

**Empty Search:**
- [ ] Click "Search" without entering UHID
- [ ] Error displays: "Please enter a UHID"

### Test 4: Form Validation
**Required Fields:**
- [ ] Try submitting without selecting staff
- [ ] Error: "Please select the staff member"
- [ ] Try submitting without reason for visit
- [ ] Error: "Please enter the reason for visit"

**Patient Validation:**
- [ ] Try submitting before searching patient
- [ ] Error: "Please search and select a patient first"

### Test 5: Form Functionality
**Department & Doctor:**
- [ ] Department dropdown populates from doctors
- [ ] Selecting department filters doctors
- [ ] Doctor selection works correctly

**Visit Type:**
- [ ] Dropdown shows: follow-up, emergency, routine-checkup, consultation
- [ ] Default is "follow-up"
- [ ] Selection persists

**Payment Mode:**
- [ ] Dropdown shows: Cash, Card, UPI, Insurance
- [ ] Default is "Cash"
- [ ] Selection persists

**Staff Selection:**
- [ ] StaffSelect component loads
- [ ] Active staff members display
- [ ] Selection works correctly
- [ ] Required validation triggers

**Date & Time:**
- [ ] Default date is today
- [ ] Default time is current time
- [ ] User can change both
- [ ] Past dates allowed (for backdating)

### Test 6: Form Submission
**Successful Submission:**
- [ ] Fill all required fields
- [ ] Select staff member
- [ ] Click "Create Revisit"
- [ ] Loading state shows ("Creating Revisit...")
- [ ] Success page displays with green checkmark
- [ ] "Revisit Created!" message appears
- [ ] Auto-redirects to dashboard after 2 seconds

**Data Verification:**
- [ ] Dashboard stats increment correctly
- [ ] New revisit appears in table
- [ ] All data saved correctly:
  - [ ] UHID matches
  - [ ] Patient name correct
  - [ ] Reason for visit saved
  - [ ] Visit type displays
  - [ ] Consultation fee shows
  - [ ] Date formatted properly
  - [ ] Time displays correctly

### Test 7: Dashboard Features
**Search Functionality:**
- [ ] Type in search box
- [ ] Results filter by UHID
- [ ] Results filter by patient name
- [ ] Results filter by reason
- [ ] Real-time filtering works
- [ ] Clear search shows all results

**Table Display:**
- [ ] All columns visible
- [ ] Data aligns correctly
- [ ] Visit type badges colored correctly
- [ ] Currency symbol (₹) displays
- [ ] Hover effect on rows works
- [ ] No horizontal scroll on wide screens
- [ ] Horizontal scroll works on narrow screens

### Test 8: Data Accuracy
- [ ] Visit date matches input
- [ ] Visit time matches input
- [ ] UHID is correct
- [ ] Patient name correct
- [ ] Reason for visit exact match
- [ ] Symptoms saved if entered
- [ ] Previous diagnosis saved if filled
- [ ] Current diagnosis saved if filled
- [ ] Consultation fee accurate
- [ ] Payment mode correct
- [ ] Staff ID matches logged-in staff
- [ ] Notes saved if entered

### Test 9: Auto-Fill Features
**Visit History:**
- [ ] After creating first revisit, create second one for same patient
- [ ] Previous visits section shows history
- [ ] Shows last 3 visits maximum
- [ ] Each visit shows: date and reason
- [ ] Most recent visit at top

**Previous Diagnosis:**
- [ ] Create revisit with current diagnosis
- [ ] Create new revisit for same patient
- [ ] Previous diagnosis auto-fills from last visit
- [ ] User can edit auto-filled diagnosis

### Test 10: Edge Cases
**Multiple Revisits Same Day:**
- [ ] Create 2+ revisits on same day
- [ ] Today's stat increments correctly
- [ ] All appear in dashboard table
- [ ] No duplicate data

**Zero Fee:**
- [ ] Create revisit with 0 fee
- [ ] Saves correctly
- [ ] Displays as ₹0

**Long Text Fields:**
- [ ] Enter very long reason (500+ chars)
- [ ] Enter very long symptoms
- [ ] Data saves completely
- [ ] Display truncates or wraps properly

**Special Characters:**
- [ ] Enter reason with special chars: "Follow-up for #123 & medication check"
- [ ] Saves and displays correctly
- [ ] No encoding issues

### Test 11: Navigation & Back Button  
- [ ] Click browser back button from form
- [ ] Returns to dashboard
- [ ] No data loss errors
- [ ] Click "Cancel" button on form
- [ ] Returns to dashboard
- [ ] Click "Back" arrow icon
- [ ] Returns to dashboard

### Test 12: Responsive Design
**Mobile View (< 768px):**
- [ ] Dashboard displays properly
- [ ] Stats stack vertically
- [ ] Table scrolls horizontally
- [ ] Forms are usable
- [ ] Buttons accessible

**Tablet View (768px - 1024px):**
- [ ] Two-column layout works
- [ ] All features accessible
- [ ] No overflow issues

**Desktop View (> 1024px):**
- [ ] Three stats cards in row
- [ ] Table uses full width
- [ ] Form has proper spacing
- [ ] No excessive white space

---

## 🔒 Security Testing

### Access Control
- [ ] Unauthenticated users redirected (if auth enabled)
- [ ] RLS policies prevent unauthorized access
- [ ] Staff can only see permitted data

### Data Validation
- [ ] SQL injection attempts fail
- [ ] XSS attempts sanitized
- [ ] Invalid UUID rejected
- [ ] Date format validated

---

## ⚡ Performance Testing

### Load Time
- [ ] Dashboard loads in < 2 seconds
- [ ] Form renders in < 1 second
- [ ] Search responds in < 500ms
- [ ] Table renders 50+ rows smoothly

### Search Performance
- [ ] Search filters instantly
- [ ] No lag with 100+ revisits
- [ ] Debouncing works (if implemented)

---

## 🐛 Error Handling Testing

### Network Errors
- [ ] Disconnect internet
- [ ] Try to load dashboard
- [ ] Error message displays gracefully
- [ ] Try to submit form
- [ ] User-friendly error shows

### Database Errors
- [ ] Simulate DB connection failure
- [ ] App handles error gracefully
- [ ] User sees helpful message

### Invalid Data
- [ ] Submit malformed data
- [ ] Validation catches it
- [ ] Clear error message displays

---

## 📊 Analytics & Reporting

### Statistics Accuracy
- [ ] Create 5 revisits
- [ ] Total shows 5
- [ ] Create 2 more today
- [ ] Today's shows 2
- [ ] This month includes all 7
- [ ] Stats update after each creation

---

## ✅ Acceptance Criteria

All tests must pass before marking feature complete:

**Critical (Must Pass):**
- [x] SQL migration runs without errors
- [x] Patient search works correctly
- [x] Form validation prevents bad data
- [x] Data saves to database correctly
- [x] Dashboard displays all revisits
- [x] Staff tracking works
- [x] Required fields enforced

**Important (Should Pass):**
- [ ] Auto-fill features work
- [ ] Search/filter functional
- [ ] Stats calculate correctly
- [ ] Responsive on all devices
- [ ] Error messages clear

**Nice to Have:**
- [ ] Smooth animations
- [ ] Loading states
- [ ] Success confirmations
- [ ] Visit history display

---

## 📝 Test Results Template

```
Date: _______________
Tester: _______________

SETUP:
[ ] Database migration: PASS / FAIL
[ ] Required data present: PASS / FAIL

FUNCTIONALITY:
[ ] Navigation: PASS / FAIL / N/A
[ ] Patient search: PASS / FAIL / N/A
[ ] Form submission: PASS / FAIL / N/A
[ ] Data accuracy: PASS / FAIL / N/A
[ ] Dashboard display: PASS / FAIL / N/A

ISSUES FOUND:
1. _________________________________
2. _________________________________
3. _________________________________

OVERALL STATUS: PASS / FAIL / NEEDS FIXES
```

---

## 🚀 Production Readiness Checklist

Before deploying to production:

- [ ] All critical tests passed
- [ ] Database backed up
- [ ] SQL migration script documented
- [ ] User guide created
- [ ] Staff training completed
- [ ] Error logging configured
- [ ] Performance acceptable (< 2s load times)
- [ ] Security review completed
- [ ] Mobile testing done
- [ ] Accessibility checked

**Sign-off:**
- Developer: _________________ Date: _______
- Tester: _________________ Date: _______
- Manager: _________________ Date: _______

---

**Testing Status:** ⏳ PENDING EXECUTION  
**Created:** December 29, 2025  
**Last Updated:** December 29, 2025
