import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GenerateInvoiceDto } from './dto/invoice.dto';
import { Decimal } from '@prisma/client/runtime/library';

interface InvoiceItem {
  id: number;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  subtotal: number;
  category: string;
}

export interface Invoice {
  invoiceCode: string;
  customerName: string;
  paymentMethod: string;
  items: InvoiceItem[];
  totalAmount: number;
  createdAt: string;
  staffName?: string;
  note?: string;
}

@Injectable()
export class InvoiceService {
  constructor(private prisma: PrismaService) {}

  async generateInvoicePreview(
    dto: GenerateInvoiceDto,
    staffId: number,
  ): Promise<Invoice> {
    // Validate all products exist and have sufficient stock
    let totalAmount = 0;
    const invoiceItems: InvoiceItem[] = [];

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new NotFoundException(`Product #${item.productId} not found`);
      }

      if (!product.isActive) {
        throw new BadRequestException(
          `Product "${product.name}" is not available`,
        );
      }

      if (product.stock < item.quantity) {
        throw new BadRequestException(
          `Insufficient stock for "${product.name}". Available: ${product.stock}, Requested: ${item.quantity}`,
        );
      }

      const subtotal = Number(product.price) * item.quantity;
      totalAmount += subtotal;

      invoiceItems.push({
        id: product.id,
        productId: product.id,
        productName: product.name,
        price: Number(product.price),
        quantity: item.quantity,
        subtotal,
        category: product.category,
      });
    }

    // Get staff name
    const staff = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { name: true, email: true },
    });

    // Generate invoice code
    const invoiceCode = `INV-${Date.now()}-${staffId}`;

    return {
      invoiceCode,
      customerName: dto.customerName,
      paymentMethod: dto.paymentMethod,
      items: invoiceItems,
      totalAmount,
      createdAt: new Date().toLocaleString('vi-VN'),
      staffName: staff?.name || staff?.email || 'Unknown Staff',
    };
  }

  /**
   * Format invoice as text for printing simulation
   * Returns a string representation of the receipt
   */
  formatInvoiceForPrint(invoice: Invoice): string {
    const now = new Date();
    const dateStr = now.toLocaleString('vi-VN');

    // Simulate receipt paper width (40 characters per line)
    const width = 40;

    const pad = (str: string, align: 'left' | 'center' | 'right' = 'left') => {
      if (align === 'center') {
        const padding = Math.max(0, (width - str.length) / 2);
        return ' '.repeat(Math.floor(padding)) + str;
      } else if (align === 'right') {
        return str.padStart(width, ' ');
      }
      return str.padEnd(width, ' ');
    };

    let receipt = '';

    // Header
    receipt += '='.repeat(width) + '\n';
    receipt += pad('BIÊN LAI BÁN HÀNG', 'center') + '\n';
    receipt += pad('SMART BADMINTON BOOKING', 'center') + '\n';
    receipt += '='.repeat(width) + '\n\n';

    // Invoice info
    receipt += `Mã HĐ: ${invoice.invoiceCode}\n`;
    receipt += `Thời gian: ${dateStr}\n`;
    receipt += `Nhân viên: ${invoice.staffName}\n`;
    receipt += `Khách hàng: ${invoice.customerName}\n`;
    receipt += `\n`;

    // Items header
    receipt += '-'.repeat(width) + '\n';
    receipt += 'Sản phẩm' + ' '.repeat(15) + 'SL' + ' '.repeat(6) + 'TT\n';
    receipt += '-'.repeat(width) + '\n';

    // Items
    for (const item of invoice.items) {
      const itemName = item.productName.substring(0, 20).padEnd(20);
      const qty = item.quantity.toString().padStart(3);
      const subtotal = this.formatCurrency(item.subtotal).padStart(15);

      receipt += `${itemName} ${qty}x ${subtotal}\n`;
      receipt += `  @ ${this.formatCurrency(item.price)}/cái\n`;
    }

    // Total
    receipt += '-'.repeat(width) + '\n';
    receipt +=
      `TỔNG CỘNG:`.padEnd(25) +
      this.formatCurrency(invoice.totalAmount).padStart(15) +
      '\n';
    receipt += `\n`;

    // Payment method
    const paymentLabel = this.getPaymentMethodLabel(invoice.paymentMethod);
    receipt += pad(`Thanh toán: ${paymentLabel}`, 'center') + '\n';

    // Footer
    receipt += '\n';
    receipt += pad('Cảm ơn quý khách!', 'center') + '\n';
    receipt += pad('Hẹn gặp lại', 'center') + '\n';
    receipt += '='.repeat(width) + '\n';

    return receipt;
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
  }

  private getPaymentMethodLabel(method: string): string {
    const labels: Record<string, string> = {
      CASH: '💵 Tiền mặt',
      VNPAY: '💳 Chuyển khoản VNPay',
      BANK_TRANSFER: '🏦 Chuyển khoản',
    };
    return labels[method] || method;
  }
}
