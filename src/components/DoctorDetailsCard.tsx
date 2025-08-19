import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Clock, Calendar, FileText, Award,
  Phone, Mail, MapPin, Stethoscope, Book
} from 'lucide-react';
import { format } from 'date-fns';

interface DoctorDetailsCardProps {
  doctor: any;
}

const DoctorDetailsCard: React.FC<DoctorDetailsCardProps> = ({ doctor }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Basic Information */}
      <div className="card">
        <div className="flex items-start space-x-6">
          <img 
            src={doctor.image} 
            alt={doctor.name}
            className="h-24 w-24 rounded-lg object-cover"
          />
          <div className="flex-1">
            <div className="flex justify-between">
              <div>
                <h2 className="text-xl font-semibold">{doctor.name}</h2>
                <p className="text-gray-500">{doctor.specialty}</p>
              </div>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${
                doctor.status === 'Available' ? 'bg-success-50 text-success-700' :
                doctor.status === 'In Surgery' ? 'bg-warning-50 text-warning-700' :
                'bg-gray-50 text-gray-700'
              }`}>
                {doctor.status}
              </span>
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="flex items-center text-gray-600">
                <Phone size={16} className="mr-2" />
                <span>{doctor.contact}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Mail size={16} className="mr-2" />
                <span>{doctor.email || 'doctor@example.com'}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin size={16} className="mr-2" />
                <span>{doctor.department}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Clock size={16} className="mr-2" />
                <span>Working Hours: 9:00 AM - 5:00 PM</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-4 gap-6">
        <div className="card bg-primary-50">
          <div className="flex items-center text-primary-700 mb-2">
            <Users size={20} className="mr-2" />
            <span className="font-medium">Total Patients</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">1,284</p>
          <p className="text-sm text-primary-600 mt-1">+12 this month</p>
        </div>

        <div className="card bg-success-50">
          <div className="flex items-center text-success-700 mb-2">
            <Calendar size={20} className="mr-2" />
            <span className="font-medium">Appointments</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">156</p>
          <p className="text-sm text-success-600 mt-1">Next: Today, 2:30 PM</p>
        </div>

        <div className="card bg-warning-50">
          <div className="flex items-center text-warning-700 mb-2">
            <Stethoscope size={20} className="mr-2" />
            <span className="font-medium">Surgeries</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">48</p>
          <p className="text-sm text-warning-600 mt-1">This year</p>
        </div>

        <div className="card bg-danger-50">
          <div className="flex items-center text-danger-700 mb-2">
            <Award size={20} className="mr-2" />
            <span className="font-medium">Experience</span>
          </div>
          <p className="text-2xl font-semibold text-gray-900">15</p>
          <p className="text-sm text-danger-600 mt-1">Years</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Patients</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <img 
                    src={`https://i.pravatar.cc/40?img=${index + 10}`}
                    alt="Patient"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                  <div className="ml-3">
                    <p className="font-medium">Patient Name</p>
                    <p className="text-sm text-gray-500">Consultation</p>
                  </div>
                </div>
                <span className="text-sm text-gray-500">{format(new Date(), 'MMM dd')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Recent Notes</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((_, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Patient Name</span>
                  <span className="text-sm text-gray-500">{format(new Date(), 'MMM dd')}</span>
                </div>
                <p className="text-sm text-gray-600">Follow-up notes and observations about the patient's condition...</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expertise & Education */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Expertise</h3>
          <div className="space-y-3">
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <Book size={20} className="text-primary-500 mr-3" />
              <span>Cardiovascular Surgery</span>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <Book size={20} className="text-primary-500 mr-3" />
              <span>Minimally Invasive Surgery</span>
            </div>
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <Book size={20} className="text-primary-500 mr-3" />
              <span>Heart Transplantation</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Education & Certifications</h3>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">Harvard Medical School</p>
              <p className="text-sm text-gray-500">Doctor of Medicine in Cardiovascular Surgery</p>
              <p className="text-xs text-gray-500 mt-1">2005 - 2009</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium">American Board of Surgery</p>
              <p className="text-sm text-gray-500">Board Certification</p>
              <p className="text-xs text-gray-500 mt-1">2010</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DoctorDetailsCard;