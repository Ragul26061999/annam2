import QRCode from 'qrcode';

/**
 * Generate QR code as data URL for a given UHID
 * @param uhid - Unique Hospital ID
 * @param width - Optional width parameter (default: 200)
 * @returns Promise with QR code data URL
 */
export async function generateQRCode(uhid: string, width: number = 200): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(uhid, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
}

/**
 * Generate QR code as SVG string for a given UHID
 * @param uhid - Unique Hospital ID
 * @returns Promise with QR code SVG string
 */
export async function generateQRCodeSVG(uhid: string): Promise<string> {
  try {
    const qrCodeSVG = await QRCode.toString(uhid, {
      errorCorrectionLevel: 'H',
      type: 'svg',
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeSVG;
  } catch (error) {
    console.error('Error generating QR code SVG:', error);
    throw new Error('Failed to generate QR code SVG');
  }
}

/**
 * Generate QR code for patient label printing
 * Optimized for thermal printers (2x3 inch labels)
 * @param uhid - Unique Hospital ID
 * @returns Promise with QR code data URL
 */
export async function generateQRCodeForLabel(uhid: string): Promise<string> {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(uhid, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: 150, // Smaller size for label
      margin: 0.5,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code for label:', error);
    throw new Error('Failed to generate QR code for label');
  }
}
