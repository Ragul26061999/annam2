'use client';
import React, { useEffect, useState } from 'react';
import { CheckCircle, Printer, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { supabase } from '../src/lib/supabase';

interface AppointmentSuccessPageProps {
  appointmentId: string;
  patientName: string;
  uhid: string;
  onBack: () => void;
}

interface AppointmentDetails {
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  appointmentType: string;
  qrCode?: string;
}

export default function AppointmentSuccessPage({
  appointmentId,
  patientName,
  uhid,
  onBack
}: AppointmentSuccessPageProps) {
  const router = useRouter();
  const [appointmentDetails, setAppointmentDetails] = useState<AppointmentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAppointmentDetails();
  }, [appointmentId]);

  const fetchAppointmentDetails = async () => {
    try {
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointment')
        .select(`
          *,
          encounter:encounter(
            id,
            patient_id,
            clinician_id
          )
        `)
        .eq('id', appointmentId)
        .single();

      if (appointmentError) throw appointmentError;

      // Get patient QR code
      const { data: patient } = await supabase
        .from('patients')
        .select('qr_code')
        .eq('patient_id', uhid)
        .single();

      // Get doctor name
      const { data: doctor } = await supabase
        .from('doctors')
        .select('users!inner(name)')
        .eq('id', appointment.encounter.clinician_id)
        .single();

      setAppointmentDetails({
        doctorName: doctor?.users?.name || 'Unknown Doctor',
        appointmentDate: appointment.scheduled_at.split('T')[0],
        appointmentTime: appointment.scheduled_at.split('T')[1].substring(0, 5),
        appointmentType: appointment.appointment_type || 'consultation',
        qrCode: patient?.qr_code
      });
    } catch (error) {
      console.error('Error fetching appointment details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrintSlip = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to print');
      return;
    }

    const details = appointmentDetails || {
      doctorName: 'Unknown',
      appointmentDate: new Date().toISOString().split('T')[0],
      appointmentTime: '00:00',
      appointmentType: 'consultation',
      qrCode: undefined
    };

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Appointment Slip - ${uhid}</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 20px;
              }
            }
            
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
            }
            
            .slip-container {
              max-width: 600px;
              margin: 0 auto;
              border: 2px solid #000;
              padding: 30px;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #000;
              padding-bottom: 15px;
            }
            
            .hospital-name {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .slip-title {
              font-size: 18px;
              font-weight: 600;
              margin-top: 10px;
            }
            
            .content {
              display: flex;
              gap: 30px;
              margin-top: 20px;
            }
            
            .qr-section {
              flex-shrink: 0;
            }
            
            .qr-code {
              width: 150px;
              height: 150px;
              border: 1px solid #ccc;
            }
            
            .info-section {
              flex-grow: 1;
            }
            
            .info-row {
              margin-bottom: 15px;
              display: flex;
            }
            
            .info-label {
              font-weight: bold;
              width: 180px;
              flex-shrink: 0;
            }
            
            .info-value {
              flex-grow: 1;
            }
            
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #ccc;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="slip-container">
            <div class="header">
              <div class="hospital-name">ANNAM MULTISPECIALITY HOSPITAL</div>
              <div class="slip-title">Appointment Confirmation Slip</div>
            </div>
            
            <div class="content">
              ${details.qrCode ? `
                <div class="qr-section">
                  <img src="${details.qrCode}" alt="QR Code" class="qr-code" />
                </div>
              ` : ''}
              
              <div class="info-section">
                <div class="info-row">
                  <div class="info-label">UHID:</div>
                  <div class="info-value" style="font-size: 18px; font-weight: bold;">${uhid}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Patient Name:</div>
                  <div class="info-value" style="font-size: 16px; font-weight: 600;">${patientName}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Doctor:</div>
                  <div class="info-value">Dr. ${details.doctorName}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Appointment Type:</div>
                  <div class="info-value" style="text-transform: capitalize;">${details.appointmentType.replace('_', ' ')}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Appointment Date:</div>
                  <div class="info-value">${new Date(details.appointmentDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Appointment Time:</div>
                  <div class="info-value">${details.appointmentTime}</div>
                </div>
                
                <div class="info-row">
                  <div class="info-label">Booking Time:</div>
                  <div class="info-value">${new Date().toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })}</div>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <p><strong>Important Instructions:</strong></p>
              <p>• Please arrive 15 minutes before your scheduled appointment time</p>
              <p>• Bring this slip and a valid ID proof</p>
              <p>• Bring all previous medical records and current medications</p>
              <p>• For rescheduling, contact reception at least 24 hours in advance</p>
              <p style="margin-top: 20px;">Thank you for choosing Annam Hospital</p>
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading appointment details...</p>
        </div>
      </div>
    );
  }

  const details = appointmentDetails || {
    doctorName: 'Unknown',
    appointmentDate: new Date().toISOString().split('T')[0],
    appointmentTime: '00:00',
    appointmentType: 'consultation',
    qrCode: undefined
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Success Message */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-green-900">Appointment Booked Successfully!</h2>
              <p className="text-sm text-green-700">Your appointment has been scheduled and confirmed</p>
            </div>
          </div>
        </div>

        {/* Patient Receipt - Similar to Registration Label */}
        <div id="appointment-slip-section">
          <div className="bg-white rounded-xl shadow-lg border-2 border-gray-800 p-6 mx-auto" style={{ maxWidth: '600px' }}>
            {/* Hospital Header */}
            <div className="text-center border-b-2 border-gray-800 pb-4 mb-6">
              <h1 className="text-2xl font-bold text-gray-900">ANNAM MULTISPECIALITY HOSPITAL</h1>
              <p className="text-base font-semibold text-gray-700 mt-2">Appointment Confirmation Slip</p>
            </div>

            {/* Main Content with QR Code */}
            <div className="flex gap-6 items-start">
              {/* QR Code Section */}
              {details.qrCode && (
                <div className="flex-shrink-0">
                  <div className="border-2 border-gray-300 p-2 bg-white">
                    <img 
                      src={details.qrCode} 
                      alt={`QR Code for ${uhid}`}
                      className="w-32 h-32"
                    />
                  </div>
                </div>
              )}

              {/* Patient Information */}
              <div className="flex-1 space-y-3">
                <div className="border-b border-gray-300 pb-2">
                  <span className="font-bold text-gray-700">UHID: </span>
                  <span className="text-lg font-bold text-gray-900">{uhid}</span>
                </div>
                
                <div className="border-b border-gray-300 pb-2">
                  <span className="font-bold text-gray-700">NAME: </span>
                  <span className="text-base font-semibold text-gray-900 uppercase">{patientName}</span>
                </div>
                
                <div className="border-b border-gray-300 pb-2">
                  <span className="font-bold text-gray-700">DOCTOR: </span>
                  <span className="text-base text-gray-900">Dr. {details.doctorName}</span>
                </div>
                
                <div className="border-b border-gray-300 pb-2">
                  <span className="font-bold text-gray-700">TYPE: </span>
                  <span className="text-base text-gray-900 capitalize">{details.appointmentType.replace('_', ' ')}</span>
                </div>
                
                <div className="border-b border-gray-300 pb-2">
                  <span className="font-bold text-gray-700">DATE: </span>
                  <span className="text-base text-gray-900">
                    {new Date(details.appointmentDate).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    }).toUpperCase()}
                  </span>
                </div>
                
                <div className="border-b border-gray-300 pb-2">
                  <span className="font-bold text-gray-700">TIME: </span>
                  <span className="text-base text-gray-900">{details.appointmentTime}</span>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">Important Instructions:</p>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• Please arrive 15 minutes before your scheduled time</li>
                <li>• Bring this slip and a valid ID proof</li>
                <li>• Bring all previous medical records</li>
              </ul>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-4 border-t border-gray-300 text-center">
              <p className="text-xs text-gray-600">Please keep this slip for your records</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center gap-4 flex-wrap">
          <button
            onClick={handlePrintSlip}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Printer className="w-5 h-5" />
            Print Appointment Slip
          </button>
          
          <button
            onClick={() => router.push('/appointments')}
            className="btn-primary"
          >
            View All Appointments
          </button>
          
          <button
            onClick={onBack}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Book Another Appointment
          </button>
        </div>
      </div>
    </div>
  );
}
