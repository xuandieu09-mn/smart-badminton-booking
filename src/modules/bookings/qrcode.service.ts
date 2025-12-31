import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QRCodeService {
  /**
   * Generate QR code for booking check-in
   * QR code contains booking code for verification
   */
  async generateBookingQR(bookingCode: string): Promise<string> {
    try {
      // Generate QR code as base64 data URL
      const qrCodeDataURL = await QRCode.toDataURL(bookingCode, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
      });

      return qrCodeDataURL;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code for booking group (fixed schedule)
   * QR code contains group ID prefixed with "GROUP-"
   */
  async generateGroupQR(groupId: number): Promise<string> {
    try {
      // Use GROUP- prefix to distinguish from individual booking codes
      const groupCode = `GROUP-${groupId}`;
      
      const qrCodeDataURL = await QRCode.toDataURL(groupCode, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 300,
        margin: 2,
      });

      return qrCodeDataURL;
    } catch (error) {
      throw new Error(`Failed to generate group QR code: ${error.message}`);
    }
  }

  /**
   * Generate QR code as buffer (for saving to file if needed)
   */
  async generateBookingQRBuffer(bookingCode: string): Promise<Buffer> {
    try {
      const buffer = await QRCode.toBuffer(bookingCode, {
        errorCorrectionLevel: 'H',
        type: 'png',
        width: 300,
        margin: 2,
      });

      return buffer;
    } catch (error) {
      throw new Error(`Failed to generate QR code buffer: ${error.message}`);
    }
  }

  /**
   * Validate QR code format (booking code format)
   */
  validateBookingCode(code: string): boolean {
    // Booking code format: BK{YYMMDD}-{XXXX}
    // Example: BK251215-CRWD
    const bookingCodeRegex = /^BK\d{6}-[A-Z0-9]{4}$/;
    return bookingCodeRegex.test(code);
  }
}
