'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Activity,
  Save,
  Loader2,
  User,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle,
  Stethoscope,
  IndianRupee,
  Printer,
  ScanBarcode
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '../../../../src/lib/supabase';
import { updateQueueStatus } from '../../../../src/lib/outpatientQueueService';
import { createAppointment, type AppointmentData } from '../../../../src/lib/appointmentService';
import { createOPConsultationBill } from '../../../../src/lib/universalPaymentService';
import { generateBarcodeForPatient, generatePrintableBarcodeData } from '../../../../src/lib/barcodeUtils';
import StaffSelect from '../../../../src/components/StaffSelect';

export default function EnterVitalsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const patientId = params?.patientId as string;
  const queueId = searchParams?.get('queueId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [patient, setPatient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [createdBill, setCreatedBill] = useState<any>(null);

  const [vitalsData, setVitalsData] = useState({
    height: '',
    weight: '',
    bmi: '',
    temperature: '',
    tempUnit: 'celsius',
    bpSystolic: '',
    bpDiastolic: '',
    pulse: '',
    spo2: '',
    respiratoryRate: '',
    randomBloodSugar: '',
    vitalNotes: '',
    consultingDoctorId: '',
    consultingDoctorName: '',
    diagnosis: '',
    consultationFee: '0',
    opCardAmount: '0',
    totalAmount: '0',
    paymentMode: 'Cash',
    staffId: ''
  });

  useEffect(() => {
    if (patientId) {
      loadPatientData();
      loadDoctors();
    }
  }, [patientId]);

  const loadDoctors = async () => {
    try {
      console.log('Loading doctors...');
      
      // Simple query without complex joins
      const { data, error } = await supabase
        .from('doctors')
        .select(`
          id,
          user_id,
          specialization,
          consultation_fee,
          status
        `)
        .eq('status', 'active')
        .is('deleted_at', null)
        .order('specialization', { ascending: true });

      console.log('Doctor query result:', { data, error });

      if (error) {
        console.error('Doctor query failed:', error);
        throw error;
      }

      if (data && data.length > 0) {
        // Get user details separately
        const userIds = data.map((d: { user_id: string | null }) => d.user_id).filter(Boolean);
        let doctorsWithUsers = data;

        if (userIds.length > 0) {
          const { data: usersData, error: usersError } = await supabase
            .from('users')
            .select('id, name, email')
            .in('id', userIds);

          console.log('Users query result:', { usersData, usersError });

          if (!usersError && usersData) {
            doctorsWithUsers = data.map((doctor: any) => ({
              ...doctor,
              users: usersData.find((user: any) => user.id === doctor.user_id)
            }));
          } else if (usersError) {
            console.warn('Could not fetch user details:', usersError);
            // Continue without user details
          }
        }

        console.log('Final doctors data:', doctorsWithUsers);
        setDoctors(doctorsWithUsers);
      } else {
        console.log('No active doctors found');
        setDoctors([]);
      }
    } catch (err) {
      console.error('Error loading doctors:', err);
      console.error('Error type:', typeof err);
      console.error('Error keys:', err ? Object.keys(err) : 'null');
      console.error('Error stringified:', JSON.stringify(err, null, 2));
      // Set empty array to prevent UI from breaking
      setDoctors([]);
    }
  };

  // Auto-calculate BMI
  useEffect(() => {
    const h = parseFloat(vitalsData.height) / 100; // cm to m
    const w = parseFloat(vitalsData.weight);
    if (h > 0 && w > 0) {
      const bmi = (w / (h * h)).toFixed(1);
      setVitalsData(prev => ({ ...prev, bmi }));
    } else {
      setVitalsData(prev => ({ ...prev, bmi: '' }));
    }
  }, [vitalsData.height, vitalsData.weight]);

  // Calculate total amount
  useEffect(() => {
    const fee = parseFloat(vitalsData.consultationFee) || 0;
    const opAmount = parseFloat(vitalsData.opCardAmount) || 0;
    setVitalsData(prev => ({ ...prev, totalAmount: (fee + opAmount).toString() }));
  }, [vitalsData.consultationFee, vitalsData.opCardAmount]);

  const loadPatientData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (error) throw error;

      setPatient(data);

      // Pre-fill any existing data
      if (data) {
        setVitalsData(prev => ({
          ...prev,
          height: data.height || '',
          weight: data.weight || '',
          bmi: data.bmi || '',
          temperature: data.temperature || '',
          tempUnit: data.temp_unit || 'celsius',
          bpSystolic: data.bp_systolic || '',
          bpDiastolic: data.bp_diastolic || '',
          pulse: data.pulse || '',
          spo2: data.spo2 || '',
          respiratoryRate: data.respiratory_rate || '',
          randomBloodSugar: data.random_blood_sugar || '',
          consultingDoctorName: data.consulting_doctor_name || '',
          diagnosis: data.diagnosis || data.primary_complaint || '',
          consultationFee: data.consultation_fee || '0',
          opCardAmount: data.op_card_amount || '0',
          totalAmount: data.total_amount || '0',
          paymentMode: data.payment_mode || 'Cash'
        }));
      }
    } catch (err) {
      console.error('Error loading patient:', err);
      setError('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setVitalsData(prev => ({ ...prev, [name]: value }));
  };

  const handleDoctorSelect = (doctorId: string) => {
    const selectedDoctor = doctors.find(d => d.id === doctorId);
    if (selectedDoctor) {
      setVitalsData(prev => ({
        ...prev,
        consultingDoctorId: doctorId,
        consultingDoctorName: selectedDoctor.users?.name || `Dr. ID: ${doctorId}`,
        consultationFee: selectedDoctor.consultation_fee?.toString() || '0'
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const toNumberOrNull = (v: string) => {
        const trimmed = (v ?? '').toString().trim();
        if (!trimmed) return null;
        const n = Number(trimmed);
        return Number.isFinite(n) ? n : null;
      };

      const toIntOrNull = (v: string) => {
        const n = toNumberOrNull(v);
        return n === null ? null : Math.trunc(n);
      };

      // Update patient record with vitals
      const vitalsUpdate = {
        height: toNumberOrNull(vitalsData.height),
        weight: toNumberOrNull(vitalsData.weight),
        bmi: toNumberOrNull(vitalsData.bmi),
        temperature: toNumberOrNull(vitalsData.temperature),
        temp_unit: vitalsData.tempUnit,
        bp_systolic: toIntOrNull(vitalsData.bpSystolic),
        bp_diastolic: toIntOrNull(vitalsData.bpDiastolic),
        pulse: toIntOrNull(vitalsData.pulse),
        spo2: toIntOrNull(vitalsData.spo2),
        respiratory_rate: toIntOrNull(vitalsData.respiratoryRate),
        random_blood_sugar: vitalsData.randomBloodSugar ? vitalsData.randomBloodSugar : null,
        vital_notes: vitalsData.vitalNotes ? vitalsData.vitalNotes : null,
        consulting_doctor_name: vitalsData.consultingDoctorName || null,
        diagnosis: vitalsData.diagnosis || null,
        consultation_fee: toNumberOrNull(vitalsData.consultationFee),
        op_card_amount: toNumberOrNull(vitalsData.opCardAmount),
        total_amount: toNumberOrNull(vitalsData.totalAmount),
        payment_mode: vitalsData.paymentMode,
        registration_status: 'completed',
        vitals_completed_at: new Date().toISOString(),
        staff_id: vitalsData.staffId || null
      };

      const { error: updateError } = await supabase
        .from('patients')
        .update(vitalsUpdate)
        .eq('id', patientId);

      if (updateError) throw updateError;

      // Update queue status if queueId is provided
      if (queueId) {
        await updateQueueStatus(queueId, 'completed', vitalsData.staffId);
      }

      // Create appointment for the selected doctor
      let createdAppointmentId: string | null = null;
      if (vitalsData.consultingDoctorId) {
        try {
          const today = new Date();
          
          // Schedule appointment for today at a reasonable future time
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          
          // If it's after 5 PM, schedule for tomorrow at 9 AM
          // Otherwise schedule for the next available slot (current time + 30 minutes, rounded up to next 30-min slot)
          let finalAppointmentDate = today.toISOString().split('T')[0];
          let appointmentTimeObj: Date;
          
          if (currentHour >= 17) {
            // After 5 PM - schedule for tomorrow
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            finalAppointmentDate = tomorrow.toISOString().split('T')[0];
            appointmentTimeObj = new Date(tomorrow.setHours(9, 0, 0, 0));
          } else {
            // During business hours - schedule for next 30-minute slot
            const nextSlotMinute = Math.ceil((currentMinute + 30) / 30) * 30;
            appointmentTimeObj = new Date(today.setHours(currentHour, nextSlotMinute, 0, 0));
            
            // If the next slot goes past business hours, schedule for tomorrow
            if (appointmentTimeObj.getHours() >= 17) {
              const tomorrow = new Date(today);
              tomorrow.setDate(tomorrow.getDate() + 1);
              finalAppointmentDate = tomorrow.toISOString().split('T')[0];
              appointmentTimeObj = new Date(tomorrow.setHours(9, 0, 0, 0));
            }
          }
          
          const appointmentTime = `${appointmentTimeObj.getHours().toString().padStart(2, '0')}:${appointmentTimeObj.getMinutes().toString().padStart(2, '0')}:00`;

          const appointmentData: AppointmentData = {
            patientId: patientId,
            doctorId: vitalsData.consultingDoctorId,
            appointmentDate: finalAppointmentDate,
            appointmentTime: appointmentTime,
            durationMinutes: 30,
            type: 'consultation',
            isEmergency: false,
            chiefComplaint: vitalsData.diagnosis || 'General consultation',
            bookingMethod: 'walk_in' // Default to walk_in for vitals entry appointments
          };

          const appointment = await createAppointment(appointmentData, vitalsData.staffId);
          console.log('Appointment created successfully:', appointment.id);
          createdAppointmentId = appointment.id;
        } catch (appointmentError) {
          console.error('Error creating appointment:', appointmentError);
          // Don't fail the entire process if appointment creation fails
          // Just log the error and continue with vitals completion
        }
      }

      // Create OP consultation bill
      try {
        const consultationFee = parseFloat(vitalsData.consultationFee) || 0;

        if (consultationFee > 0 && createdAppointmentId) {
          const bill = await createOPConsultationBill(
            patientId,
            createdAppointmentId,
            consultationFee,
            vitalsData.consultingDoctorName || 'Unknown Doctor',
            vitalsData.staffId || undefined
          );
          console.log('OP consultation bill created successfully:', bill.id);
          setCreatedBill(bill);
        } else if (consultationFee > 0 && !createdAppointmentId) {
          console.warn('Skipped bill creation because appointment was not created');
        } else {
          console.log('No bill created - consultation fee is zero');
        }
      } catch (billError) {
        console.error('Error creating OP consultation bill:', billError);
        // Don't fail the entire process if bill creation fails
        // Just log the error and continue with vitals completion
      }

      setSuccess(true);

      // Redirect after 2 seconds
      // setTimeout(() => {
      //   router.push('/outpatient?vitals=completed');
      // }, 2000);
    } catch (err) {
      console.error('Error saving vitals:', err);
      console.error('Error type:', typeof err);
      console.error('Error keys:', err ? Object.keys(err) : 'null');
      console.error('Error stringified:', JSON.stringify(err, null, 2));
      
      const errorMessage = 
        typeof err === 'string' ? err :
        (err as any)?.message || 
        (err as any)?.error_description || 
        (err as any)?.hint || 
        String(err);
      
      setError(`Failed to save vitals: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500" />
      </div>
    );
  }

  const showThermalPreviewWithLogo = () => {
    if (!createdBill) return;

    const now = new Date();
    const printedDateTime = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Get patient UHID
    const patientUhid = patient?.patient_id || 'WALK-IN';
    
    // Get payment status
    let paymentType = createdBill.payment_status?.toUpperCase() || 'CASH';
    if (createdBill.payment_status === 'paid') {
      paymentType = 'PAID';
    } else if (createdBill.payment_status === 'pending') {
      paymentType = 'PENDING';
    }

    const itemsHtml = createdBill.items?.map((item: any, index: number) => `
      <tr>
        <td class="items-8cm">${index + 1}.</td>
        <td class="items-8cm">${item.service_name || item.description || 'Consultation'}</td>
        <td class="items-8cm text-center">${item.quantity || 1}</td>
        <td class="items-8cm text-right">${Number(item.total_amount || 0).toFixed(2)}</td>
      </tr>
    `).join('') || '';

    const thermalContent = `
      <html>
        <head>
          <title>Thermal Receipt - ${createdBill.bill_id}</title>
          <style>
            @page { margin: 1mm; size: 77mm 297mm; }
            body { 
              font-family: 'Verdana', sans-serif; 
              font-weight: bold;
              margin: 0; 
              padding: 2px;
              font-size: 14px;
              line-height: 1.2;
              width: 77mm;
            }
            .header-14cm { font-size: 16pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-9cm { font-size: 11pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-10cm { font-size: 12pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .header-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .items-8cm { font-size: 10pt; font-weight: bold; font-family: 'Verdana', sans-serif; }
            .bill-info-10cm { font-size: 12pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .bill-info-bold { font-weight: bold; font-family: 'Verdana', sans-serif; }
            .footer-7cm { font-size: 9pt; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .center { text-align: center; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .right { text-align: right; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .table { width: 100%; border-collapse: collapse; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .table td { padding: 1px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .totals-line { display: flex; justify-content: space-between; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .footer { margin-top: 15px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .signature-area { margin-top: 25px; font-family: 'Verdana', sans-serif; font-weight: bold; }
            .logo { width: 350px; height: auto; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="center">
            <img src="/logo/annamHospital-bk.png" alt="ANNAM LOGO" class="logo" />
            <div>2/301, Raj Kanna Nagar, Veerapandian Patanam, Tiruchendur – 628216</div>
            <div class="header-9cm">Phone- 04639 252592</div>
            <div style="margin-top: 5px; font-weight: bold;">OP CONSULTATION BILL</div>
          </div>
          
          <div style="margin-top: 10px;">
            <table class="table">
              <tr>
                <td class="bill-info-10cm">Bill No&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${createdBill.bill_id}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">UHID&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${patientUhid}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Patient Name&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${patient?.name || 'Unknown Patient'}</td>
              </tr>
              <tr>
                <td class="bill-info-10cm">Date&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;:&nbsp;&nbsp;</td>
                <td class="bill-info-10cm bill-info-bold">${new Date(createdBill.created_at).toLocaleDateString()} ${new Date(createdBill.created_at).toLocaleTimeString()}</td>
              </tr>
              <tr>
                <td class="header-10cm">Payment Type&nbsp;:&nbsp;&nbsp;</td>
                <td class="header-10cm bill-info-bold">${paymentType}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 10px;">
            <table class="table">
              <tr style="border-bottom: 1px dashed #000;">
                <td width="10%" class="items-8cm">S.No</td>
                <td width="60%" class="items-8cm">Service</td>
                <td width="15%" class="items-8cm text-center">Qty</td>
                <td width="15%" class="items-8cm text-right">Amt</td>
              </tr>
              ${itemsHtml}
            </table>
          </div>

          <div style="margin-top: 10px;">
            <div class="totals-line header-10cm" style="border-top: 1px solid #000; padding-top: 2px;">
              <span>Total Amount</span>
              <span>${Number(createdBill.total_amount || 0).toFixed(2)}</span>
            </div>
          </div>

          <div class="footer">
            <div class="totals-line footer-7cm">
              <span>Printed on ${printedDateTime}</span>
              <span>Authorized Sign</span>
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(thermalContent);
      printWindow.document.close();
    }
  };

  const handlePrintBarcode = async () => {
    if (!patient) return;

    try {
      const uhid = patient.patient_id || 'UNKNOWN';
      const patientName = patient.name || 'Unknown Patient';
      
      const barcodeId = await generateBarcodeForPatient(patientId);
      
      const printData = generatePrintableBarcodeData(uhid, barcodeId, patientName);
      
      const printWindow = window.open('', '_blank', 'width=600,height=400');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Patient Barcode - ${patientName}</title>
              <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; }
                @media print {
                  body { margin: 0; padding: 0; display: block; }
                  .print-container { page-break-inside: avoid; }
                }
              </style>
            </head>
            <body>
              <div class="print-container">
                ${printData}
              </div>
              <script>
                window.onload = function() {
                  window.print();
                }
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (err) {
      console.error('Error printing barcode:', err);
      alert('Failed to generate barcode for printing');
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-orange-50/30 py-8 px-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vitals Saved Successfully!</h2>
          <p className="text-gray-600 mb-6">Patient registration is now complete.</p>
          
          {createdBill && (
            <button
              onClick={showThermalPreviewWithLogo}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg mb-4"
            >
              <Printer className="h-5 w-5" />
              <span>Print OP Bill</span>
            </button>
          )}

          <button
            onClick={handlePrintBarcode}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors shadow-lg mb-4"
          >
            <ScanBarcode className="h-5 w-5" />
            <span>Print Barcode for UHID</span>
          </button>

          <button
             onClick={() => router.push('/outpatient?vitals=completed')}
             className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-xl font-semibold transition-colors"
          >
             Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50/30 py-8 px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/outpatient"
            className="inline-flex items-center gap-2 text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Outpatient Queue
          </Link>
        </div>

        {/* Patient Info Card */}
        {patient && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-orange-500" />
              Patient Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-semibold text-gray-900">{patient.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">UHID</p>
                <p className="font-mono font-semibold text-orange-600">{patient.patient_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="text-gray-900">{patient.phone}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Age / Gender</p>
                <p className="text-gray-900">{patient.age || 'N/A'} yrs / {patient.gender}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Registration Date</p>
                <p className="text-gray-900">{new Date(patient.created_at).toLocaleDateString()}</p>
              </div>
              {patient.primary_complaint && (
                <div className="md:col-span-3">
                  <p className="text-sm text-gray-500">Primary Complaint</p>
                  <p className="text-gray-900">{patient.primary_complaint}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Vitals Entry Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="bg-gradient-to-r from-orange-400 to-orange-500 p-6 text-white rounded-t-xl">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6" />
              Enter Patient Vitals & Complete Registration
            </h1>
            <p className="text-white/80 text-sm mt-1">Fill in the vital signs and consultation details</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            )}

            {/* Vitals Section */}
            <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
              <h3 className="text-sm font-bold text-blue-800 mb-6 flex items-center gap-2">
                <Activity size={18} />
                Vital Signs & Measurements
              </h3>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Height (cm)</label>
                  <input
                    type="number"
                    name="height"
                    value={vitalsData.height}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="170"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Weight (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={vitalsData.weight}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="70"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">BMI (Auto)</label>
                  <input
                    type="text"
                    value={vitalsData.bmi}
                    readOnly
                    className="w-full px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-semibold text-blue-700"
                    placeholder="--"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Temperature</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      name="temperature"
                      value={vitalsData.temperature}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      placeholder="98.6"
                    />
                    <select
                      name="tempUnit"
                      value={vitalsData.tempUnit}
                      onChange={handleInputChange}
                      className="px-2 py-2 border border-blue-200 rounded-lg text-sm"
                    >
                      <option value="celsius">°C</option>
                      <option value="fahrenheit">°F</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">BP Systolic</label>
                  <input
                    type="number"
                    name="bpSystolic"
                    value={vitalsData.bpSystolic}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="120"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">BP Diastolic</label>
                  <input
                    type="number"
                    name="bpDiastolic"
                    value={vitalsData.bpDiastolic}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="80"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Pulse (bpm)</label>
                  <input
                    type="number"
                    name="pulse"
                    value={vitalsData.pulse}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="72"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">SpO2 (%)</label>
                  <input
                    type="number"
                    name="spo2"
                    value={vitalsData.spo2}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="98"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Respiratory Rate</label>
                  <input
                    type="number"
                    name="respiratoryRate"
                    value={vitalsData.respiratoryRate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="16"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Blood Sugar (mg/dL)</label>
                  <input
                    type="number"
                    name="randomBloodSugar"
                    value={vitalsData.randomBloodSugar}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-xs font-bold text-blue-600 uppercase mb-2">Vital Notes</label>
                <textarea
                  name="vitalNotes"
                  value={vitalsData.vitalNotes}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  placeholder="Any observations or notes about vitals..."
                />
              </div>
            </div>

            {/* Consultation Details */}
            <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100">
              <h3 className="text-sm font-bold text-purple-800 mb-6 flex items-center gap-2">
                <Stethoscope size={18} />
                Consultation Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-purple-600 uppercase mb-2">Consulting Doctor</label>
                  <select
                    value={vitalsData.consultingDoctorId}
                    onChange={(e) => handleDoctorSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select Doctor</option>
                    {doctors.map((doctor) => (
                      <option key={doctor.id} value={doctor.id}>
                        Dr. {doctor.users?.name || 'Unknown'} {doctor.specialization ? `- ${doctor.specialization}` : ''}
                        {doctor.consultation_fee ? ` (₹${doctor.consultation_fee})` : ''}
                      </option>
                    ))}
                  </select>
                  {vitalsData.consultingDoctorName && (
                    <p className="text-xs text-purple-600 mt-1">
                      Selected: Dr. {vitalsData.consultingDoctorName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-purple-600 uppercase mb-2">Diagnosis / Complaint</label>
                  <input
                    type="text"
                    name="diagnosis"
                    value={vitalsData.diagnosis}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="Brief diagnosis"
                  />
                </div>
              </div>
            </div>

            {/* Appointment Info */}
            {vitalsData.consultingDoctorId && (
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar size={16} className="text-blue-600" />
                  <h4 className="text-sm font-bold text-blue-800">Appointment Information</h4>
                </div>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• An appointment will be automatically created for today</p>
                  <p>• Time: Current time + 30 minutes</p>
                  <p>• Duration: 30 minutes consultation</p>
                  <p>• Status: Scheduled</p>
                </div>
              </div>
            )}

            {/* Billing Details */}
            <div className="bg-green-50/50 p-6 rounded-xl border border-green-100">
              <h3 className="text-sm font-bold text-green-800 mb-6 flex items-center gap-2">
                <IndianRupee size={18} />
                Billing Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="block text-xs font-bold text-green-600 uppercase mb-2">Consultation Fee</label>
                  <input
                    type="number"
                    name="consultationFee"
                    value={vitalsData.consultationFee}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                    placeholder="Auto-filled when doctor selected"
                    readOnly={vitalsData.consultingDoctorId !== ''}
                  />
                  {vitalsData.consultingDoctorId && (
                    <p className="text-xs text-green-600 mt-1">
                      Auto-filled from doctor selection
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-green-600 uppercase mb-2">OP Card Amount</label>
                  <input
                    type="number"
                    name="opCardAmount"
                    value={vitalsData.opCardAmount}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-green-600 uppercase mb-2">Total Amount</label>
                  <input
                    type="text"
                    value={vitalsData.totalAmount}
                    readOnly
                    className="w-full px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm font-bold text-green-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-green-600 uppercase mb-2">Payment Mode</label>
                  <select
                    name="paymentMode"
                    value={vitalsData.paymentMode}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="UPI">UPI</option>
                    <option value="Insurance">Insurance</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Staff Selection */}
            <div>
              <StaffSelect
                value={vitalsData.staffId}
                onChange={(staffId) => setVitalsData(prev => ({ ...prev, staffId }))}
                label="Staff Member (Optional)"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end pt-4 border-t">
              <Link href="/outpatient">
                <button
                  type="button"
                  className="px-6 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 text-white px-8 py-3 rounded-xl font-semibold transition-colors shadow-lg"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    <span>Save Vitals & Complete</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
