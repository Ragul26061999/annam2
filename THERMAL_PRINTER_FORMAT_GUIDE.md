# Thermal Printer Format Implementation Guide

## Overview
This guide provides complete implementation details for the 77mm thermal printer format used in pharmacy billing. The format is optimized for thermal receipt printers with Times New Roman font and specific font sizes for different sections.

## Format Specifications

### Paper Settings
- **Paper Width**: 77mm
- **Paper Height**: 297mm (continuous roll)
- **Margins**: 5mm all around
- **Font**: Times New Roman throughout

### CSS Structure
```css
@page { margin: 5mm; size: 77mm 297mm; }
body { 
  font-family: 'Times New Roman', Times, serif; 
  margin: 0; 
  padding: 10px;
  font-size: 12px;
  line-height: 1.2;
  width: 77mm;
}
```

## Font Size Classes

### Header Classes
```css
.header-14cm { font-size: 14pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
.header-9cm { font-size: 9pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
.header-10cm { font-size: 10pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
.header-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
```

### Content Classes
```css
.items-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
.bill-info-10cm { font-size: 10pt; font-family: 'Times New Roman', Times, serif; }
.bill-info-bold { font-weight: bold; font-family: 'Times New Roman', Times, serif; }
.footer-7cm { font-size: 7pt; font-family: 'Times New Roman', Times, serif; }
```

### Utility Classes
```css
.center { text-align: center; font-family: 'Times New Roman', Times, serif; }
.right { text-align: right; font-family: 'Times New Roman', Times, serif; }
.table { width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; }
.table td { padding: 2px; font-family: 'Times New Roman', Times, serif; }
.totals-line { display: flex; justify-content: space-between; font-family: 'Times New Roman', Times, serif; }
.footer { margin-top: 20px; font-family: 'Times New Roman', Times, serif; }
```

## Complete HTML Template

```html
<html>
<head>
  <title>Thermal Receipt - [BILL_NUMBER]</title>
  <style>
    @page { margin: 5mm; size: 77mm 297mm; }
    body { 
      font-family: 'Times New Roman', Times, serif; 
      margin: 0; 
      padding: 10px;
      font-size: 12px;
      line-height: 1.2;
      width: 77mm;
    }
    .header-14cm { font-size: 14pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
    .header-9cm { font-size: 9pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
    .header-10cm { font-size: 10pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
    .header-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
    .items-8cm { font-size: 8pt; font-weight: bold; font-family: 'Times New Roman', Times, serif; }
    .bill-info-10cm { font-size: 10pt; font-family: 'Times New Roman', Times, serif; }
    .bill-info-bold { font-weight: bold; font-family: 'Times New Roman', Times, serif; }
    .footer-7cm { font-size: 7pt; font-family: 'Times New Roman', Times, serif; }
    .center { text-align: center; font-family: 'Times New Roman', Times, serif; }
    .right { text-align: right; font-family: 'Times New Roman', Times, serif; }
    .table { width: 100%; border-collapse: collapse; font-family: 'Times New Roman', Times, serif; }
    .table td { padding: 2px; font-family: 'Times New Roman', Times, serif; }
    .totals-line { display: flex; justify-content: space-between; font-family: 'Times New Roman', Times, serif; }
    .footer { margin-top: 20px; font-family: 'Times New Roman', Times, serif; }
  </style>
</head>
<body>
  <!-- Header Section -->
  <div class="center">
    <div class="header-14cm">ANNAM PHARMACY</div>
    <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
    <div class="header-9cm">Phone- 04639 252592</div>
    <div class="header-10cm">Gst No: 33AJWPR2713G2ZZ</div>
    <div style="margin-top: 5px; font-weight: bold;">INVOICE</div>
  </div>
  
  <!-- Bill Information Section -->
  <div style="margin-top: 10px;">
    <table class="table">
      <tr>
        <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
        <td class="bill-info-10cm bill-info-bold">[BILL_NUMBER]</td>
      </tr>
      <tr>
        <td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
        <td class="bill-info-10cm bill-info-bold">[PATIENT_UHID]</td>
      </tr>
      <tr>
        <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
        <td class="bill-info-10cm bill-info-bold">[PATIENT_NAME]</td>
      </tr>
      <tr>
        <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
        <td class="bill-info-10cm bill-info-bold">[DATE_TIME]</td>
      </tr>
      <tr>
        <td class="header-10cm">Sales Type&nbsp;:&nbsp;&nbsp;</td>
        <td class="header-10cm bill-info-bold">[SALES_TYPE]</td>
      </tr>
    </table>
  </div>

  <!-- Items Table Section -->
  <div style="margin-top: 10px;">
    <table class="table">
      <tr style="border-bottom: 1px dashed #000;">
        <td width="30%" class="items-8cm">S.No</td>
        <td width="40%" class="items-8cm">Drug Name</td>
        <td width="15%" class="items-8cm text-center">Qty</td>
        <td width="15%" class="items-8cm text-right">Amt</td>
      </tr>
      <!-- ITEMS_ROWS_GO_HERE -->
    </table>
  </div>

  <!-- Totals Section -->
  <div style="margin-top: 10px;">
    <div class="totals-line items-8cm">
      <span>Taxable Amount</span>
      <span>[TAXABLE_AMOUNT]</span>
    </div>
    <div class="totals-line items-8cm">
      <span>&nbsp;&nbsp;&nbsp;&nbsp;Dist Amt</span>
      <span>[DISCOUNT_AMOUNT]</span>
    </div>
    <div class="totals-line items-8cm">
      <span>&nbsp;&nbsp;&nbsp;&nbsp;CGST Amt</span>
      <span>[CGST_AMOUNT]</span>
    </div>
    <div class="totals-line header-8cm">
      <span>&nbsp;&nbsp;&nbsp;&nbsp;SGST Amt</span>
      <span>[SGST_AMOUNT]</span>
    </div>
    <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
      <span>Total Amount</span>
      <span>[TOTAL_AMOUNT]</span>
    </div>
  </div>

  <!-- Footer Section -->
  <div class="footer">
    <div class="totals-line footer-7cm">
      <span>Printed on [PRINTED_DATE_TIME]</span>
      <span>Pharmacist Sign</span>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
```

## Implementation Steps

### 1. Create the Thermal Preview Function
```typescript
const showThermalPreview = () => {
  if (!billData || !billItems.length) return;

  const now = new Date();
  const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
  
  // Generate items HTML
  const itemsHtml = billItems.map((item: any, index: number) => `
    <tr>
      <td class="items-8cm">${index + 1}.</td>
      <td class="items-8cm">${item.name || item.description || 'Unknown'}</td>
      <td class="items-8cm text-center">${item.quantity || item.qty || 1}</td>
      <td class="items-8cm text-right">${Number(item.amount || item.total_amount || 0).toFixed(2)}</td>
    </tr>
  `).join('');

  // Calculate totals
  const subtotal = billData.subtotal || billItems.reduce((s: number, it: any) => s + Number(it.amount || it.total_amount || 0), 0);
  const discount = billData.discount || 0;
  const tax = billData.tax || 0;

  const thermalContent = `
    <!-- PASTE THE COMPLETE HTML TEMPLATE HERE -->
    <!-- Replace placeholders with actual data -->
  `;

  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (printWindow) {
    printWindow.document.write(thermalContent);
    printWindow.document.close();
  }
};
```

### 2. Add the Thermal Preview Button
```tsx
<button 
  onClick={showThermalPreview} 
  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
>
  Thermal Preview
</button>
```

### 3. Required Imports
```tsx
import { Eye } from 'lucide-react';
```

## Data Placeholders

Replace these placeholders in the HTML template:

| Placeholder | Description | Example |
|-------------|-------------|---------|
| `[BILL_NUMBER]` | Bill number | `AMP26010001` |
| `[PATIENT_UHID]` | Patient UHID | `AMH26010056` |
| `[PATIENT_NAME]` | Patient name | `Mr. SAMURA` |
| `[DATE_TIME]` | Bill date and time | `12-Jan-2026 13:35:56` |
| `[SALES_TYPE]` | Payment method | `CREDIT` |
| `[TAXABLE_AMOUNT]` | Subtotal amount | `1055.90` |
| `[DISCOUNT_AMOUNT]` | Discount amount | `0.00` |
| `[CGST_AMOUNT]` | CGST amount | `44.21` |
| `[SGST_AMOUNT]` | SGST amount | `44.21` |
| `[TOTAL_AMOUNT]` | Total amount | `1120.56` |
| `[PRINTED_DATE_TIME]` | Current date/time | `12-01-2026 13:50:51` |
| `[ITEMS_ROWS_GO_HERE]` | Items table rows | Generated dynamically |

## Items Row Generation
```typescript
const itemsHtml = billItems.map((item: any, index: number) => `
  <tr>
    <td class="items-8cm">${index + 1}.</td>
    <td class="items-8cm">${item.name || item.description || 'Unknown'}</td>
    <td class="items-8cm text-center">${item.quantity || item.qty || 1}</td>
    <td class="items-8cm text-right">${Number(item.amount || item.total_amount || 0).toFixed(2)}</td>
  </tr>
`).join('');
```

## Tax Calculations
```typescript
const subtotal = billData.subtotal || billItems.reduce((s: number, it: any) => s + Number(it.amount || it.total_amount || 0), 0);
const discount = billData.discount || 0;
const tax = billData.tax || 0;
const cgstAmount = tax / 2;
const sgstAmount = tax / 2;
```

## Usage Examples

### Pharmacy New Billing Page
- **File**: `app/pharmacy/newbilling/page.tsx`
- **Function**: `showThermalPreview()` (lines 887-1024)
- **Button**: In success modal alongside print button

### Pharmacy Billing Page
- **File**: `app/pharmacy/billing/page.tsx`
- **Function**: `showThermalPreview()` (lines 384-526)
- **Button**: In bill view modal alongside print button

## Customization Options

### Hospital Information
Update these lines in the header section:
```html
<div class="header-14cm">[HOSPITAL_NAME]</div>
<div>[HOSPITAL_ADDRESS]</div>
<div class="header-9cm">Phone-[HOSPITAL_PHONE]</div>
<div class="header-10cm">Gst No: [HOSPITAL_GST]</div>
```

### Additional Fields
Add more bill information rows:
```html
<tr>
  <td class="bill-info-10cm">[FIELD_LABEL]&nbsp;&nbsp;:&nbsp;&nbsp;</td>
  <td class="bill-info-10cm bill-info-bold">[FIELD_VALUE]</td>
</tr>
```

## Browser Compatibility
- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

## Printer Compatibility
- **77mm Thermal Printers**: Optimized for this width
- **80mm Thermal Printers**: Will work with small margins
- **Standard Printers**: Will work but may appear small

## Troubleshooting

### Common Issues
1. **Font not displaying**: Ensure Times New Roman is installed
2. **Print dialog not opening**: Check browser popup settings
3. **Content cut off**: Verify paper size settings in print dialog
4. **Items not bold**: Check CSS class application

### Debug Tips
- Use browser developer tools to inspect generated HTML
- Check console for JavaScript errors
- Verify data is properly passed to the function
- Test with different bill data scenarios

## Complete Implementation Checklist

- [ ] Import Eye icon from lucide-react
- [ ] Add CSS classes for all font sizes
- [ ] Create showThermalPreview function
- [ ] Generate items HTML with proper classes
- [ ] Calculate totals correctly
- [ ] Add thermal preview button
- [ ] Test with sample data
- [ ] Verify print functionality
- [ ] Check font consistency
- [ ] Test on different browsers

This guide provides everything needed to implement the thermal printer format on any page with consistent results.
