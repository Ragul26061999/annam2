'use client';

import React, { useState } from 'react';
import { Barcode, Search, Package, AlertCircle, CheckCircle, X } from 'lucide-react';
import { findMedicineByBarcode, findBatchByBarcode } from '../lib/pharmacyService';

interface BarcodeScannerProps {
  onMedicineFound?: (medicine: any) => void;
  onBatchFound?: (batch: any) => void;
  onClose: () => void;
  mode?: 'medicine' | 'batch' | 'both';
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onMedicineFound,
  onBatchFound,
  onClose,
  mode = 'both',
}) => {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);
  const [resultType, setResultType] = useState<'medicine' | 'batch' | null>(null);

  const handleScan = async () => {
    if (!barcode.trim()) {
      setError('Please enter a barcode');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setResultType(null);

    try {
      // Try to find medicine first (if mode allows)
      if (mode === 'medicine' || mode === 'both') {
        const medicine = await findMedicineByBarcode(barcode.trim());
        if (medicine) {
          setResult(medicine);
          setResultType('medicine');
          if (onMedicineFound) {
            onMedicineFound(medicine);
          }
          return;
        }
      }

      // Try to find batch (if mode allows)
      if (mode === 'batch' || mode === 'both') {
        const batch = await findBatchByBarcode(barcode.trim());
        if (batch) {
          setResult(batch);
          setResultType('batch');
          if (onBatchFound) {
            onBatchFound(batch);
          }
          return;
        }
      }

      // If nothing found
      setError('No medicine or batch found with this barcode');
    } catch (err: any) {
      console.error('Error scanning barcode:', err);
      setError(err.message || 'Failed to scan barcode');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleScan();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center rounded-t-2xl">
          <div className="flex items-center gap-3">
            <Barcode className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Barcode Scanner</h2>
              <p className="text-blue-100 text-sm">
                Scan or enter barcode to find {mode === 'both' ? 'medicine/batch' : mode}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-500 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Barcode Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Barcode Number
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter or scan barcode..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                autoFocus
              />
              <button
                onClick={handleScan}
                disabled={loading || !barcode.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                <Search className="w-4 h-4" />
                {loading ? 'Scanning...' : 'Scan'}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-700 font-medium">Scan Failed</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Success Result */}
          {result && resultType && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-green-700 font-medium">
                    {resultType === 'medicine' ? 'Medicine Found' : 'Batch Found'}
                  </p>
                  <p className="text-green-600 text-sm">Barcode: {barcode}</p>
                </div>
              </div>

              {resultType === 'medicine' ? (
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-800">{result.name}</h3>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Code:</span> {result.medication_code}</p>
                    <p><span className="font-medium">Generic:</span> {result.generic_name || 'N/A'}</p>
                    <p><span className="font-medium">Manufacturer:</span> {result.manufacturer}</p>
                    <p><span className="font-medium">Category:</span> {result.category}</p>
                    <p><span className="font-medium">Stock:</span> {result.available_stock || 0} units</p>
                    <p><span className="font-medium">Price:</span> ₹{result.unit_price}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <Barcode className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-gray-800">
                      {result.medication?.name || 'Batch'}
                    </h3>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><span className="font-medium">Batch:</span> {result.batch_number}</p>
                    <p><span className="font-medium">Medicine Code:</span> {result.medication?.medication_code}</p>
                    <p><span className="font-medium">Quantity:</span> {result.current_quantity} units</p>
                    <p><span className="font-medium">Expiry:</span> {new Date(result.expiry_date).toLocaleDateString()}</p>
                    <p><span className="font-medium">Supplier:</span> {result.supplier_name || 'N/A'}</p>
                    <p><span className="font-medium">Price:</span> ₹{result.selling_price}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-medium text-blue-800 mb-2">How to use:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Enter the barcode number manually</li>
              <li>• Or use a barcode scanner device</li>
              <li>• Press Enter or click Scan button</li>
              <li>• Results will show medicine or batch details</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {result && (
              <button
                onClick={() => {
                  setBarcode('');
                  setResult(null);
                  setResultType(null);
                  setError('');
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Scan Another
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
