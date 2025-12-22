import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GoogleGenerativeAI,
  GenerativeModel,
  FunctionDeclaration,
  SchemaType,
  ChatSession,
  Part,
  FunctionCall,
} from '@google/generative-ai';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../pos/products.service';
import { BookingsService } from '../bookings/bookings.service';
import { Role, PaymentMethod, BookingType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 SMART AGENT - SmartCourt AI Assistant
// Kết nối Database thực + 4 Tools đầy đủ
// ═══════════════════════════════════════════════════════════════════════════

// Định nghĩa giờ hoạt động
const OPERATING_HOURS = { start: 6, end: 22 };

// ═══════════════════════════════════════════════════════════════════════════
// 🧠 SYSTEM INSTRUCTION V2 - Enhanced with Hardcoded Context
// Phase 1: Củng cố "Bộ não" - Nạp kiến thức tĩnh trước khi dùng Function Calling
// Last updated: 2025-12-22
// ═══════════════════════════════════════════════════════════════════════════

const SYSTEM_INSTRUCTION = `
╔══════════════════════════════════════════════════════════════════════════╗
║  🏸 SmartCourt AI Assistant - Trợ Lý Đặt Sân Thông Minh                  ║
╚══════════════════════════════════════════════════════════════════════════╝

🎯 ĐỊNH DANH:
Bạn là Trợ lý AI chuyên nghiệp của SmartCourt Badminton Center - hệ thống đặt sân 
cầu lông hiện đại tại TP.HCM. Bạn thông minh, thân thiện, nhiệt tình và luôn trả 
lời chính xác dựa trên dữ liệu có sẵn.

═══════════════════════════════════════════════════════════════════════════════

📋 THÔNG TIN CƠ SỞ (HARDCODED - ƯU TIÊN CAO):

🏢 **Thông tin doanh nghiệp:**
- Tên: SmartCourt Badminton Center
- Địa chỉ: 123 Đường Thể Thao, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh
- Hotline: 1900-8888 (Hỗ trợ 24/7)
- Email: support@smartcourt.vn
- Website: www.smartcourt.vn

⏰ **Giờ hoạt động:**
- Thứ 2 - Thứ 6: 6:00 - 22:00
- Thứ 7 - Chủ nhật: 6:00 - 23:00
- Nghỉ lễ: Giảm 20% giờ cao điểm

💰 **BẢNG GIÁ SÂN (Chi tiết từng khung giờ):**

| Khung giờ          | Giá/giờ     | Ghi chú                    |
|--------------------|-------------|----------------------------|
| 06:00 - 08:00      | 50.000đ     | Khung sáng sớm - Rẻ nhất   |
| 08:00 - 12:00      | 70.000đ     | Khung sáng                 |
| 12:00 - 14:00      | 60.000đ     | Khung trưa - Ưu đãi        |
| 14:00 - 17:00      | 80.000đ     | Khung chiều                |
| 17:00 - 20:00      | 120.000đ    | Khung tối - Cao điểm       |
| 20:00 - 22:00      | 100.000đ    | Khung tối muộn             |
| Sau 22:00          | Đóng cửa    | Không phục vụ              |

📝 **CHÍNH SÁCH ĐẶT SÂN:**
- Đặt tối thiểu: 1 giờ
- Đặt tối đa: 4 giờ/lần (nếu cần thêm phải liên hệ staff)
- Cọc trước: 50% tổng tiền (qua ví điện tử hoặc VNPay)
- Thanh toán còn lại: Trực tiếp khi check-in

⚠️ **CHÍNH SÁCH HỦY SÂN:**
- Hủy trước 24h: Hoàn 100% cọc
- Hủy trước 12h: Hoàn 50% cọc
- Hủy dưới 12h: KHÔNG hoàn tiền
- Trễ hơn 15 phút: Tự động hủy, mất cọc

🏸 **THÔNG TIN SÂN:**
Hiện có 5 sân cầu lông tiêu chuẩn thi đấu:
- Sân 1, 2, 3: Sân VIP (Thảm cao cấp, ánh sáng LED)
- Sân 4, 5: Sân thường (Chất lượng tốt, giá chuẩn)
- Tất cả sân đều có điều hòa, camera giám sát

🛒 **SẢN PHẨM POS PHỔ BIẾN (Tham khảo - Có thể thay đổi):**

**Đồ uống:**
- Nước Revive (500ml): 15.000đ
- Nước Sting (330ml): 15.000đ
- Aquafina (500ml): 10.000đ
- Redbull (250ml): 20.000đ
- Coca Cola (330ml): 12.000đ

**Thực phẩm:**
- Bánh mì thịt: 25.000đ
- Xúc xích nướng: 15.000đ
- Snack Oishi: 8.000đ

**Phụ kiện:**
- Vợt Yonex (Cơ bản): 450.000đ
- Vợt Victor (Trung cấp): 650.000đ
- Giày Lining: 850.000đ - 1.200.000đ
- Cầu Yonex (1 hộp 12 quả): 180.000đ
- Quấn cán vợt: 25.000đ/cái

*Lưu ý: Giá trên chỉ mang tính chất tham khảo. Để biết giá chính xác và 
sản phẩm còn hàng, vui lòng sử dụng chức năng tra cứu POS (nếu đã đăng nhập).*

═══════════════════════════════════════════════════════════════════════════════

🛠️ CÔNG CỤ ĐỘNG (Function Calling - Chỉ dùng khi khách đã đăng nhập):

Bạn có 4 công cụ để tra cứu dữ liệu thời gian thực từ database:

1. **get_pos_products**
   - Mục đích: Tra cứu sản phẩm POS chính xác (giá real-time, tồn kho)
   - Khi nào dùng: Khách hỏi "menu đồ uống chi tiết", "vợt còn hàng không"
   - Lưu ý: Chỉ gọi khi khách đã đăng nhập

2. **get_court_availability**
   - Mục đích: Kiểm tra sân trống theo ngày cụ thể
   - Khi nào dùng: "Tối nay còn sân không?", "Mai có sân 2 trống không?"
   - Lưu ý: Cần xác định rõ ngày (hôm nay/ngày mai/ngày cụ thể)

3. **create_booking**
   - Mục đích: Đặt sân cho khách hàng
   - Khi nào dùng: Khách cung cấp ĐỦ thông tin (sân, ngày, giờ, thời lượng)
   - Lưu ý: PHẢI xác nhận lại với khách trước khi gọi

4. **get_user_bookings**
   - Mục đích: Xem lịch đặt sân của khách
   - Khi nào dùng: "Tôi đã đặt sân gì?", "Xem lịch của tôi"
   - Lưu ý: Chỉ hiển thị booking của user đang đăng nhập

═══════════════════════════════════════════════════════════════════════════════

📜 QUY TẮC TRẢ LỜI (QUAN TRỌNG):

✅ **CÂU HỎI TRONG PHẠM VI (Trả lời trực tiếp):**
1. Giá sân theo khung giờ → Dùng BẢNG GIÁ hardcoded ở trên
2. Giờ mở cửa/đóng cửa → Dùng GIỜ HOẠT ĐỘNG
3. Địa chỉ, hotline, email → Dùng THÔNG TIN CƠ SỞ
4. Chính sách hủy/cọc → Dùng CHÍNH SÁCH ĐẶT SÂN
5. Sản phẩm POS (tham khảo) → Dùng danh sách hardcoded
6. Chào hỏi cơ bản → Giới thiệu SmartCourt + 4 tính năng chính

💡 **Ví dụ:**
👤 "Sân giá bao nhiêu vào chiều?"
🤖 "🏸 **Giá sân khung chiều (14:00 - 17:00): 80.000đ/giờ**
     Nếu bạn đặt khung tối (17:00 - 20:00) sẽ là 120.000đ/giờ (cao điểm).
     Bạn muốn đặt sân không ạ?"

👤 "Mấy giờ mở cửa?"
🤖 "⏰ SmartCourt mở cửa:
     - Thứ 2-6: **6:00 - 22:00**
     - Thứ 7-CN: **6:00 - 23:00**
     Bạn muốn đặt sân khung giờ nào ạ? 🏸"

❌ **CÂU HỎI NGOÀI PHẠM VI (Từ chối lịch sự):**
- Nấu ăn, thời tiết, chính trị, y tế, pháp luật, giải trí...
- Template: "Xin lỗi, mình là AI chuyên về đặt sân cầu lông, không hỗ trợ về 
  [chủ đề X] ạ 😊 Bạn có cần giúp đỡ gì về dịch vụ sân không?"

💡 **Ví dụ:**
👤 "Bạn biết nấu phở không?"
🤖 "😊 Mình là AI chuyên về đặt sân cầu lông, không hỗ trợ nấu ăn ạ. 
     Nhưng nếu bạn muốn đặt sân để chơi thể thao, mình rất sẵn lòng giúp! 🏸"

🔧 **CÂU HỎI CẦN FUNCTION CALLING (Gọi tool nếu đã login):**
- "Tối nay còn sân không?" → Cần get_court_availability
- "Menu đồ uống chi tiết?" → Cần get_pos_products (nếu muốn giá real-time)
- "Đặt sân 1 lúc 18h" → Cần create_booking (sau khi xác nhận đủ info)
- "Tôi đã đặt sân gì?" → Cần get_user_bookings

⚠️ **Nếu khách CHƯA đăng nhập:**
"⚠️ Bạn cần đăng nhập để sử dụng tính năng này. 
Tuy nhiên, mình có thể cung cấp thông tin tham khảo về [giá/sản phẩm/...] nhé!"

═══════════════════════════════════════════════════════════════════════════════

🎨 ĐỊNH DẠNG TRẢ LỜI (Markdown):

1. **LUÔN dùng Emoji** phù hợp: 🏸 💰 ⏰ 📋 ✅ ⚠️ 😊
2. **Dùng Markdown** khi liệt kê:
   - Gạch đầu dòng (- hoặc •)
   - **Bôi đậm** tên sản phẩm, giá tiền
   - Xuống dòng rõ ràng
3. Giữ câu trả lời **ngắn gọn** (3-5 dòng), trừ khi liệt kê danh sách
4. Kết thúc bằng **câu hỏi gợi ý** (Call-to-Action)

💡 **Ví dụ tốt:**
👤 "Có nước gì?"
🤖 "🥤 **Đồ uống phổ biến tại SmartCourt:**
     - Nước Revive: **15.000đ**
     - Aquafina: **10.000đ**
     - Redbull: **20.000đ**
     
     Bạn muốn xem danh sách đầy đủ với giá real-time không? (Cần đăng nhập) 🏸"

═══════════════════════════════════════════════════════════════════════════════

🚫 NGHIÊM CẤM:
- Tự bịa thông tin không có trong prompt này hoặc tools
- Trả lời về chính trị, tôn giáo, y tế, pháp lý
- Nói xấu đối thủ cạnh tranh
- Đưa ra lời khuyên đầu tư, chứng khoán
- Vi phạm chính sách nội dung của Google/OpenAI

═══════════════════════════════════════════════════════════════════════════════

✨ MỤC TIÊU CUỐI CÙNG:
Cung cấp trải nghiệm tư vấn đặt sân XUẤT SẮC, giúp khách hàng nhanh chóng tìm 
được sân phù hợp, hiểu rõ giá cả, chính sách, và hoàn tất booking một cách dễ dàng.

Luôn thân thiện, chính xác, và hướng khách về hành động tiếp theo! 🚀
`.trim();

// ═══════════════════════════════════════════════════════════════════════════
// 🛠️ FUNCTION DECLARATIONS - 4 Tools đầy đủ
// ═══════════════════════════════════════════════════════════════════════════

const GET_POS_PRODUCTS: FunctionDeclaration = {
  name: 'get_pos_products',
  description:
    'Tra cứu danh sách sản phẩm đang bán tại quầy POS (nước uống, vợt, giày, phụ kiện). Gọi khi khách hỏi về menu, đồ uống, sản phẩm, hoặc muốn mua hàng.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      keyword: {
        type: SchemaType.STRING,
        description: 'Từ khóa tìm kiếm (tùy chọn). VD: "nước", "vợt", "giày"',
      },
      category: {
        type: SchemaType.STRING,
        description:
          'Loại sản phẩm: DRINK, EQUIPMENT, ACCESSORY, FOOD (tùy chọn)',
        format: 'enum',
        enum: ['DRINK', 'EQUIPMENT', 'ACCESSORY', 'FOOD'],
      },
    },
    required: [],
  },
};

const CREATE_BOOKING: FunctionDeclaration = {
  name: 'create_booking',
  description:
    'Đặt sân cầu lông cho khách. CHỈ gọi khi đã có ĐỦ thông tin: sân nào (courtId), ngày nào, giờ nào, bao lâu. PHẢI xác nhận lại trước khi gọi.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      courtId: {
        type: SchemaType.NUMBER,
        description: 'Số sân (1, 2, 3...). VD: khách nói "sân 1" → courtId = 1',
      },
      date: {
        type: SchemaType.STRING,
        description: 'Ngày đặt (YYYY-MM-DD). VD: "ngày mai" → "2025-12-22"',
      },
      time: {
        type: SchemaType.STRING,
        description: 'Giờ bắt đầu (HH:mm). VD: "6 giờ tối" → "18:00"',
      },
      duration: {
        type: SchemaType.NUMBER,
        description: 'Số giờ đặt (1, 2, 3...). Mặc định 1 nếu không nói.',
      },
    },
    required: ['courtId', 'date', 'time', 'duration'],
  },
};

const GET_COURT_AVAILABILITY: FunctionDeclaration = {
  name: 'get_court_availability',
  description:
    'Kiểm tra sân trống theo ngày. Gọi khi khách hỏi "còn sân không", "sân nào trống", "tối nay có sân không".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      date: {
        type: SchemaType.STRING,
        description:
          'Ngày cần xem (YYYY-MM-DD). Mặc định hôm nay nếu không có.',
      },
    },
    required: [],
  },
};

const GET_USER_BOOKINGS: FunctionDeclaration = {
  name: 'get_user_bookings',
  description:
    'Xem lịch đặt sân của khách hàng. Gọi khi khách hỏi "tôi đã đặt gì", "xem lịch của tôi", "booking của tôi".',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      status: {
        type: SchemaType.STRING,
        description:
          'Lọc theo trạng thái: CONFIRMED, PENDING_PAYMENT, hoặc ALL',
        format: 'enum',
        enum: ['CONFIRMED', 'PENDING_PAYMENT', 'ALL'],
      },
    },
    required: [],
  },
};

// Tools array
const AI_TOOLS = [
  {
    functionDeclarations: [
      GET_POS_PRODUCTS,
      CREATE_BOOKING,
      GET_COURT_AVAILABILITY,
      GET_USER_BOOKINGS,
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CHAT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly bookingsService: BookingsService,
  ) {}

  async onModuleInit() {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');

    if (!apiKey || apiKey.trim() === '') {
      this.logger.warn('⚠️ GEMINI_API_KEY not configured. AI disabled.');
      return;
    }

    try {
      this.logger.log('🚀 Initializing SmartCourt AI Agent...');

      this.genAI = new GoogleGenerativeAI(apiKey);

      // ✨ Khởi tạo với systemInstruction + tools
      // Try multiple models in order of preference
      const modelsToTry = [
        'gemini-2.0-flash',
        'gemini-2.5-flash',
        'gemini-1.5-flash-latest',
      ];

      for (const modelName of modelsToTry) {
        try {
          this.logger.log(`🔄 Trying model: ${modelName}...`);

          this.model = this.genAI.getGenerativeModel({
            model: modelName,
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: AI_TOOLS,
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
              maxOutputTokens: 1024,
            },
          });

          const testResult = await this.model.generateContent('Xin chào');
          if (testResult.response.text()) {
            this.isInitialized = true;
            this.logger.log(`✅ SmartCourt AI initialized with ${modelName}`);
            this.logger.log(
              '🛠️ Tools: 4 functions (POS, Booking, Availability, User Bookings)',
            );
            return; // Success, exit loop
          }
        } catch (err) {
          this.logger.warn(`❌ Model ${modelName} failed: ${err.message}`);
          continue; // Try next model
        }
      }

      this.logger.error('❌ All models failed to initialize');
    } catch (error) {
      this.logger.error(`❌ AI init failed: ${error.message}`);
      this.isInitialized = false;
    }
  }

  /**
   * Check if AI is available
   */
  isAvailable(): boolean {
    return this.isInitialized && this.model !== null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🛠️ FUNCTION HANDLERS - Database thực
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 📦 get_pos_products - Tra cứu sản phẩm từ database
   */
  private async handleGetPosProducts(args: {
    keyword?: string;
    category?: string;
  }): Promise<object> {
    try {
      this.logger.log(
        `📦 [Function] get_pos_products: ${JSON.stringify(args)}`,
      );

      let products = await this.productsService.getAllProducts(
        args.category as any,
      );

      // Filter by keyword if provided
      if (args.keyword) {
        const keyword = args.keyword.toLowerCase();
        products = products.filter(
          (p) =>
            p.name.toLowerCase().includes(keyword) ||
            p.description?.toLowerCase().includes(keyword),
        );
      }

      if (products.length === 0) {
        return {
          success: true,
          message: 'Không tìm thấy sản phẩm phù hợp',
          products: [],
        };
      }

      const productList = products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: Number(p.price),
        priceFormatted: `${Number(p.price).toLocaleString('vi-VN')}đ`,
        stock: p.stock,
        inStock: p.stock > 0,
      }));

      return {
        success: true,
        message: `Tìm thấy ${products.length} sản phẩm`,
        products: productList,
      };
    } catch (error) {
      this.logger.error(`❌ Error in get_pos_products: ${error.message}`);
      return {
        success: false,
        error: 'Không thể tra cứu sản phẩm lúc này',
      };
    }
  }

  /**
   * 📅 create_booking - Đặt sân từ database
   */
  private async handleCreateBooking(
    args: {
      courtId: number;
      date: string;
      time: string;
      duration: number;
    },
    userId: number | null,
  ): Promise<object> {
    try {
      this.logger.log(
        `📅 [Function] create_booking: ${JSON.stringify(args)}, userId: ${userId}`,
      );

      if (!userId) {
        return {
          success: false,
          error: 'Bạn cần đăng nhập để đặt sân. Vui lòng đăng nhập trước!',
        };
      }

      // Parse date and time
      const [year, month, day] = args.date.split('-').map(Number);
      const [hour, minute] = args.time.split(':').map(Number);

      const startDateTime = new Date(year, month - 1, day, hour, minute || 0);
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + args.duration);

      // Validate
      if (startDateTime < new Date()) {
        return {
          success: false,
          error: 'Không thể đặt sân trong quá khứ',
        };
      }

      if (hour < OPERATING_HOURS.start || hour >= OPERATING_HOURS.end) {
        return {
          success: false,
          error: `Giờ hoạt động: ${OPERATING_HOURS.start}:00 - ${OPERATING_HOURS.end}:00`,
        };
      }

      // Create booking
      const result = await this.bookingsService.createBooking(
        {
          courtId: args.courtId,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          type: BookingType.REGULAR,
          paymentMethod: PaymentMethod.WALLET,
        },
        userId,
        Role.CUSTOMER,
      );

      const bookingData = result.booking;

      return {
        success: true,
        message: 'Đặt sân thành công!',
        booking: {
          bookingCode: bookingData.bookingCode,
          courtName: bookingData.court?.name,
          date: args.date,
          time: `${args.time} - ${endDateTime.getHours()}:${String(endDateTime.getMinutes()).padStart(2, '0')}`,
          duration: `${args.duration} giờ`,
          totalPrice: `${Number(bookingData.totalPrice).toLocaleString('vi-VN')}đ`,
          status: bookingData.status,
          paymentStatus: bookingData.paymentStatus,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error in create_booking: ${error.message}`);

      if (
        error.message?.includes('already booked') ||
        error.message?.includes('ConflictException')
      ) {
        return {
          success: false,
          error: 'Sân đã được đặt trong khung giờ này. Vui lòng chọn giờ khác!',
        };
      }

      if (error.message?.includes('Court not found')) {
        return {
          success: false,
          error: 'Không tìm thấy sân. Vui lòng kiểm tra lại số sân!',
        };
      }

      return {
        success: false,
        error: `Không thể đặt sân: ${error.message}`,
      };
    }
  }

  /**
   * 🏸 get_court_availability - Xem sân trống
   */
  private async handleGetCourtAvailability(args: {
    date?: string;
  }): Promise<object> {
    try {
      this.logger.log(
        `🏸 [Function] get_court_availability: ${JSON.stringify(args)}`,
      );

      const targetDate = args.date ? new Date(args.date) : new Date();
      const dateKey = targetDate.toISOString().split('T')[0];

      const courts = await this.prisma.court.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });

      if (courts.length === 0) {
        return {
          success: true,
          message: 'Hiện tại không có sân nào trong hệ thống',
          courts: [],
        };
      }

      // Get bookings for the target date
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const bookings = await this.prisma.booking.findMany({
        where: {
          startTime: { gte: startOfDay },
          endTime: { lte: endOfDay },
          status: { in: ['PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN'] },
        },
        select: {
          courtId: true,
          startTime: true,
          endTime: true,
        },
      });

      // Build availability map
      const bookingMap = new Map<string, Set<number>>();

      bookings.forEach((booking) => {
        const start = new Date(booking.startTime);
        const end = new Date(booking.endTime);
        const current = new Date(start);

        while (current < end) {
          const hour = current.getHours();
          const key = `${hour}`;

          if (!bookingMap.has(key)) {
            bookingMap.set(key, new Set());
          }
          bookingMap.get(key).add(booking.courtId);
          current.setHours(current.getHours() + 1);
        }
      });

      // Generate time slots
      const now = new Date();
      const isToday = targetDate.toDateString() === now.toDateString();
      const currentHour = now.getHours();

      const slots: any[] = [];

      for (
        let hour = OPERATING_HOURS.start;
        hour < OPERATING_HOURS.end;
        hour++
      ) {
        if (isToday && hour <= currentHour) continue;

        const bookedCourtIds = bookingMap.get(`${hour}`) || new Set();
        const availableCourts = courts.filter((c) => !bookedCourtIds.has(c.id));

        slots.push({
          time: `${hour}:00 - ${hour + 1}:00`,
          availableCourts: availableCourts.map((c) => ({
            id: c.id,
            name: c.name,
            price: `${Number(c.pricePerHour).toLocaleString('vi-VN')}đ/giờ`,
          })),
          totalAvailable: availableCourts.length,
          isFull: availableCourts.length === 0,
        });
      }

      const formatDate = targetDate.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });

      return {
        success: true,
        date: formatDate,
        dateKey,
        totalCourts: courts.length,
        courts: courts.map((c) => ({
          id: c.id,
          name: c.name,
          pricePerHour: `${Number(c.pricePerHour).toLocaleString('vi-VN')}đ`,
        })),
        availability: slots,
        summary: {
          totalSlots: slots.length,
          fullyBookedSlots: slots.filter((s) => s.isFull).length,
          availableSlots: slots.filter((s) => !s.isFull).length,
        },
      };
    } catch (error) {
      this.logger.error(`❌ Error in get_court_availability: ${error.message}`);
      return {
        success: false,
        error: 'Không thể tra cứu sân trống lúc này',
      };
    }
  }

  /**
   * 📋 get_user_bookings - Xem lịch đặt của user
   */
  private async handleGetUserBookings(
    args: { status?: string },
    userId: number | null,
  ): Promise<object> {
    try {
      this.logger.log(
        `📋 [Function] get_user_bookings: ${JSON.stringify(args)}, userId: ${userId}`,
      );

      if (!userId) {
        return {
          success: false,
          error: 'Bạn cần đăng nhập để xem lịch đặt sân',
        };
      }

      const whereClause: any = {
        userId,
        startTime: { gte: new Date() },
      };

      if (args.status && args.status !== 'ALL') {
        whereClause.status = args.status;
      }

      const bookings = await this.prisma.booking.findMany({
        where: whereClause,
        include: {
          court: { select: { name: true } },
        },
        orderBy: { startTime: 'asc' },
        take: 10,
      });

      if (bookings.length === 0) {
        return {
          success: true,
          message: 'Bạn chưa có lịch đặt sân nào sắp tới',
          bookings: [],
        };
      }

      const bookingList = bookings.map((b) => ({
        bookingCode: b.bookingCode,
        courtName: b.court?.name,
        date: new Date(b.startTime).toLocaleDateString('vi-VN'),
        time: `${new Date(b.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(b.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
        status: b.status,
        paymentStatus: b.paymentStatus,
        totalPrice: `${Number(b.totalPrice).toLocaleString('vi-VN')}đ`,
      }));

      return {
        success: true,
        message: `Bạn có ${bookings.length} lịch đặt sân`,
        bookings: bookingList,
      };
    } catch (error) {
      this.logger.error(`❌ Error in get_user_bookings: ${error.message}`);
      return {
        success: false,
        error: 'Không thể tra cứu lịch đặt sân',
      };
    }
  }

  /**
   * 🔄 Execute a function call from AI
   */
  private async executeFunction(
    functionCall: FunctionCall,
    userId: number | null,
  ): Promise<string> {
    const { name, args } = functionCall;

    this.logger.log(`🔧 Executing function: ${name}`);
    this.logger.log(`📦 Args: ${JSON.stringify(args)}`);

    let result: object;

    switch (name) {
      case 'get_pos_products':
        result = await this.handleGetPosProducts(args as any);
        break;

      case 'create_booking':
        result = await this.handleCreateBooking(args as any, userId);
        break;

      case 'get_court_availability':
        result = await this.handleGetCourtAvailability(args as any);
        break;

      case 'get_user_bookings':
        result = await this.handleGetUserBookings(args as any, userId);
        break;

      default:
        this.logger.warn(`⚠️ Unknown function: ${name}`);
        result = { error: `Unknown function: ${name}` };
    }

    return JSON.stringify(result);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 💬 MAIN CHAT METHOD - với Function Calling Loop
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🤖 Generate AI response với database thực
   * Enhanced với retry logic và quota handling
   */
  async generateResponse(
    message: string,
    userId?: number | null,
  ): Promise<string> {
    this.logger.log(`💬 User ${userId || 'anonymous'}: "${message}"`);

    // Fallback if AI not ready
    if (!this.isInitialized || !this.model) {
      this.logger.warn('⚠️ AI not available, using fallback');
      return this.getFallbackResponse(message);
    }

    // 🔄 Retry logic với exponential backoff
    const maxRetries = 2;
    let lastError: Error | null = null;

    for (let retry = 0; retry <= maxRetries; retry++) {
      try {
        if (retry > 0) {
          this.logger.log(`🔄 Retry attempt ${retry}/${maxRetries}...`);
          // Wait before retry (exponential backoff)
          await new Promise((resolve) => setTimeout(resolve, 1000 * retry));
        }

        // Start chat session
        const chat: ChatSession = this.model.startChat({ history: [] });

        // Send message
        let result = await chat.sendMessage(message);
        let response = result.response;

        // 🔄 FUNCTION CALLING LOOP
        let iteration = 0;
        const maxIterations = 5;

        while (iteration < maxIterations) {
          const functionCalls = response.functionCalls();

          // Không có function call → trả về text
          if (!functionCalls || functionCalls.length === 0) {
            const text = response.text();
            this.logger.log(`🤖 AI Response (iter ${iteration + 1})`);
            return text || this.getFallbackResponse(message);
          }

          // Có function call → thực thi
          this.logger.log(`🔧 Function calls: ${functionCalls.length}`);

          const functionResponses: Part[] = [];

          for (const fc of functionCalls) {
            this.logger.log(`   → Executing: ${fc.name}`);
            const funcResult = await this.executeFunction(fc, userId || null);

            functionResponses.push({
              functionResponse: {
                name: fc.name,
                response: JSON.parse(funcResult),
              },
            });

            this.logger.log(`   ✅ ${fc.name} executed`);
          }

          // Gửi kết quả function về cho AI
          result = await chat.sendMessage(functionResponses);
          response = result.response;

          iteration++;
        }

        this.logger.warn('⚠️ Max iterations reached in function calling loop');
        return response.text() || this.getFallbackResponse(message);
      } catch (error) {
        lastError = error;

        // 🔍 Kiểm tra loại lỗi
        const errorMsg = error.message || '';

        // Rate limit / Quota exceeded - Log chi tiết
        if (
          errorMsg.includes('429') ||
          errorMsg.includes('quota') ||
          errorMsg.includes('Too Many Requests')
        ) {
          this.logger.warn(
            `⚠️ API Quota exceeded (retry ${retry}): ${errorMsg.substring(0, 200)}`,
          );

          // Nếu đã retry hết → dùng fallback
          if (retry >= maxRetries) {
            this.logger.error(
              '❌ All retries exhausted due to quota limits. Using enhanced fallback.',
            );
            return this.getFallbackResponse(message);
          }
          continue; // Try again
        }

        // Các lỗi khác → không retry
        this.logger.error(`❌ Chat error (non-retryable): ${errorMsg}`);
        break;
      }
    }

    // Fallback khi hết retry
    this.logger.warn(
      `⚠️ Using fallback after error: ${lastError?.message?.substring(0, 100)}`,
    );
    return this.getFallbackResponse(message);
  }

  /**
   * 🆘 Fallback responses - Enhanced với hardcoded context
   * THỨ TỰ KIỂM TRA: Patterns cụ thể → Patterns chung → Default
   * Version: 2.1 - Enhanced fallback khi quota hết
   */
  private getFallbackResponse(message: string): string {
    const msg = message.toLowerCase();

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 1: Chào hỏi (Check đầu tiên)
    // ═══════════════════════════════════════════════════════════════════════
    if (
      msg.includes('chào') ||
      msg.includes('hello') ||
      msg.includes('hi') ||
      msg === 'hey'
    ) {
      return '👋 **Xin chào! Tôi là SmartCourt AI**\n\n🏸 Tôi có thể giúp bạn:\n• Đặt sân cầu lông\n• Xem menu đồ uống & sản phẩm\n• Kiểm tra sân trống\n• Xem lịch đặt của bạn\n\nBạn cần gì ạ?';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 2: DỊCH VỤ / LIỆT KÊ / THÔNG TIN CHUNG
    // ═══════════════════════════════════════════════════════════════════════

    // Liệt kê dịch vụ / tính năng
    if (
      msg.includes('dịch vụ') ||
      msg.includes('dich vu') ||
      (msg.includes('liệt kê') && !msg.includes('giá')) ||
      msg.includes('liet ke') ||
      msg.includes('có gì') ||
      msg.includes('co gi') ||
      msg.includes('tính năng') ||
      msg.includes('tinh nang') ||
      msg.includes('hỗ trợ gì') ||
      msg.includes('làm được gì')
    ) {
      return (
        '🏸 **Dịch vụ tại SmartCourt:**\n\n' +
        '**1️⃣ Đặt sân cầu lông:**\n' +
        '• 5 sân tiêu chuẩn thi đấu\n' +
        '• Giá từ 50.000đ - 120.000đ/giờ\n' +
        '• Đặt online 24/7\n\n' +
        '**2️⃣ Quầy POS:**\n' +
        '• Đồ uống (Revive, Sting, Coca...)\n' +
        '• Vợt cầu lông (Yonex, Victor)\n' +
        '• Phụ kiện (cầu, quấn cán...)\n\n' +
        '**3️⃣ Tiện ích khác:**\n' +
        '• Điều hòa mát mẻ\n' +
        '• Camera giám sát 24/7\n' +
        '• Wifi miễn phí\n\n' +
        '📞 Hotline: **1900-8888**\n' +
        '🏸 Bạn cần dịch vụ nào?'
      );
    }

    // Thông tin / Giới thiệu sân
    if (
      msg.includes('giới thiệu') ||
      msg.includes('gioi thieu') ||
      msg.includes('thông tin') ||
      msg.includes('thong tin') ||
      msg.includes('về sân') ||
      msg.includes('ve san') ||
      msg.includes('smartcourt là gì') ||
      msg.includes('là gì')
    ) {
      return (
        '🏢 **Giới thiệu SmartCourt Badminton Center:**\n\n' +
        '📍 **Địa chỉ:** 123 Đường Thể Thao, Phường Tân Phú, Quận 7, TP.HCM\n' +
        '📞 **Hotline:** 1900-8888 (24/7)\n' +
        '📧 **Email:** support@smartcourt.vn\n' +
        '🌐 **Website:** www.smartcourt.vn\n\n' +
        '⏰ **Giờ hoạt động:**\n' +
        '• Thứ 2-6: 6:00 - 22:00\n' +
        '• Thứ 7-CN: 6:00 - 23:00\n\n' +
        '🏸 **Cơ sở vật chất:**\n' +
        '• 5 sân cầu lông tiêu chuẩn\n' +
        '• Điều hòa + ánh sáng LED\n' +
        '• Quầy POS phục vụ đồ uống, phụ kiện\n\n' +
        'Bạn muốn đặt sân ngay không? 🏸'
      );
    }

    // Địa chỉ
    if (
      msg.includes('địa chỉ') ||
      msg.includes('dia chi') ||
      msg.includes('ở đâu') ||
      msg.includes('o dau') ||
      msg.includes('chỗ nào') ||
      msg.includes('cho nao')
    ) {
      return (
        '📍 **Địa chỉ SmartCourt:**\n\n' +
        '**123 Đường Thể Thao, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh**\n\n' +
        '📞 Hotline: **1900-8888**\n' +
        '🌐 Website: www.smartcourt.vn\n\n' +
        '🚗 Có bãi đỗ xe rộng rãi cho khách hàng.\n' +
        '🏸 Hẹn gặp bạn tại sân!'
      );
    }

    // Liên hệ / Hotline
    if (
      msg.includes('liên hệ') ||
      msg.includes('lien he') ||
      msg.includes('hotline') ||
      msg.includes('điện thoại') ||
      msg.includes('dien thoai') ||
      msg.includes('số điện') ||
      msg.includes('so dien') ||
      msg.includes('gọi') ||
      msg.includes('email')
    ) {
      return (
        '📞 **Liên hệ SmartCourt:**\n\n' +
        '• **Hotline:** 1900-8888 (Hỗ trợ 24/7)\n' +
        '• **Email:** support@smartcourt.vn\n' +
        '• **Website:** www.smartcourt.vn\n' +
        '• **Địa chỉ:** 123 Đường Thể Thao, Q.7, TP.HCM\n\n' +
        '💬 Hoặc chat với tôi để được hỗ trợ ngay! 🏸'
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 3: POS - Vợt, Nước, Sản phẩm
    // ═══════════════════════════════════════════════════════════════════════

    // Vợt cầu lông
    if (
      msg.includes('vợt') ||
      msg.includes('vot') ||
      msg.includes('racket') ||
      msg.includes('racquet')
    ) {
      return (
        '🏸 **Vợt cầu lông tại SmartCourt:**\n\n' +
        '• **Vợt Yonex** (Cơ bản): 450.000đ\n' +
        '• **Vợt Victor** (Trung cấp): 650.000đ\n' +
        '• **Quấn cán vợt:** 25.000đ/cái\n\n' +
        '💡 *Giá tham khảo. Vui lòng liên hệ staff hoặc đăng nhập để xem giá chính xác.*\n' +
        '📞 Hotline: **1900-8888**'
      );
    }

    // Đồ uống / Nước
    if (
      msg.includes('nước') ||
      msg.includes('nuoc') ||
      msg.includes('uống') ||
      msg.includes('uong') ||
      msg.includes('menu') ||
      msg.includes('đồ uống') ||
      msg.includes('do uong')
    ) {
      return (
        '🥤 **Đồ uống tại SmartCourt:**\n\n' +
        '• Nước Revive (500ml): **15.000đ**\n' +
        '• Nước Sting (330ml): **15.000đ**\n' +
        '• Aquafina (500ml): **10.000đ**\n' +
        '• Redbull (250ml): **20.000đ**\n' +
        '• Coca Cola (330ml): **12.000đ**\n\n' +
        '💡 Muốn xem menu đầy đủ với giá real-time? Vui lòng đăng nhập! 🏸'
      );
    }

    // Cầu lông (shuttlecock)
    if (
      (msg.includes('cầu lông') &&
        (msg.includes('mua') || msg.includes('bán') || msg.includes('giá'))) ||
      msg.includes('quả cầu') ||
      msg.includes('qua cau') ||
      msg.includes('shuttlecock')
    ) {
      return (
        '🏸 **Cầu lông tại SmartCourt:**\n\n' +
        '• **Cầu Yonex** (hộp 12 quả): 180.000đ\n' +
        '• **Cầu Lining** (hộp 12 quả): 150.000đ\n\n' +
        '💡 *Giá tham khảo. Liên hệ staff để biết hàng còn không.*\n' +
        '📞 Hotline: **1900-8888**'
      );
    }

    // POS chung
    if (msg.includes('pos') || msg.includes('quầy')) {
      return (
        '🛒 **Quầy POS SmartCourt:**\n\n' +
        '**Đồ uống:**\n' +
        '• Nước Revive: 15.000đ\n' +
        '• Aquafina: 10.000đ\n' +
        '• Redbull: 20.000đ\n\n' +
        '**Phụ kiện:**\n' +
        '• Vợt Yonex: 450.000đ\n' +
        '• Vợt Victor: 650.000đ\n' +
        '• Cầu Yonex (12 quả): 180.000đ\n\n' +
        '📞 Hotline: **1900-8888**'
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PRIORITY 3: GIỜ MỞ CỬA / ĐÓNG CỬA (HARDCODED)
    // ═══════════════════════════════════════════════════════════════════════

    // Giờ mở cửa
    if (
      (msg.includes('giờ') || msg.includes('gio')) &&
      (msg.includes('mở') || msg.includes('mo') || msg.includes('mở cửa'))
    ) {
      return (
        '⏰ **SmartCourt mở cửa:**\n\n' +
        '• Thứ 2-6: **6:00 - 22:00**\n' +
        '• Thứ 7-CN: **6:00 - 23:00**\n\n' +
        'Bạn muốn đặt sân khung giờ nào ạ? 🏸'
      );
    }

    // Giờ đóng cửa
    if (
      (msg.includes('đóng') ||
        msg.includes('dong') ||
        msg.includes('đóng cửa')) &&
      (msg.includes('giờ') || msg.includes('gio') || msg.includes('khi nào'))
    ) {
      return (
        '⏰ **SmartCourt đóng cửa:**\n\n' +
        '• Thứ 2 - Thứ 6: **22:00**\n' +
        '• Thứ 7 - Chủ nhật: **23:00**\n\n' +
        'Bạn muốn đặt sân khung giờ nào ạ? 🏸'
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 📋 CHÍNH SÁCH (HARDCODED)
    // ═══════════════════════════════════════════════════════════════════════

    // Chính sách hủy sân
    if (
      (msg.includes('hủy') || msg.includes('huy')) &&
      (msg.includes('sân') || msg.includes('san'))
    ) {
      return (
        '⚠️ **Chính sách hủy sân tại SmartCourt:**\n\n' +
        '• **Hủy trước 24h:** Hoàn 100% tiền cọc\n' +
        '• **Hủy trước 12h:** Hoàn 50% tiền cọc\n' +
        '• **Hủy dưới 12h:** KHÔNG hoàn tiền cọc\n' +
        '• **Trễ hơn 15 phút** khi đến sân: Booking tự động hủy và mất cọc.\n\n' +
        'Bạn có cần hỗ trợ đặt sân không ạ? 🏸'
      );
    }

    // Chính sách cọc
    if (
      msg.includes('cọc') ||
      msg.includes('coc') ||
      (msg.includes('đặt') && msg.includes('trước'))
    ) {
      return (
        '💰 **Chính sách đặt sân tại SmartCourt:**\n\n' +
        'Bạn cần cọc trước **50%** tổng tiền sân để xác nhận đặt chỗ nhé.\n' +
        'Thanh toán có thể qua ví điện tử hoặc VNPay ạ. 🏸'
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 💰 GIÁ SÂN - Chi tiết theo khung giờ (HARDCODED)
    // ═══════════════════════════════════════════════════════════════════════

    // Bảng giá chi tiết / đầy đủ
    if (
      msg.includes('bảng giá') ||
      (msg.includes('giá') && msg.includes('chi tiết')) ||
      (msg.includes('giá') && msg.includes('đầy đủ')) ||
      msg.includes('giá cả')
    ) {
      return (
        '💰 **BẢNG GIÁ SÂN SMARTCOURT**\n\n' +
        '| Khung giờ | Giá/giờ | Ghi chú |\n' +
        '|-----------|---------|----------|\n' +
        '| 06:00 - 08:00 | **50.000đ** | Sáng sớm - Rẻ nhất |\n' +
        '| 08:00 - 12:00 | **70.000đ** | Khung sáng |\n' +
        '| 12:00 - 14:00 | **60.000đ** | Khung trưa - Ưu đãi |\n' +
        '| 14:00 - 17:00 | **80.000đ** | Khung chiều |\n' +
        '| 17:00 - 20:00 | **120.000đ** | Tối - Cao điểm ⭐ |\n' +
        '| 20:00 - 22:00 | **100.000đ** | Tối muộn |\n\n' +
        '📞 Hotline: **1900-8888**\n' +
        '🏸 Bạn muốn đặt sân không ạ?'
      );
    }

    // Giá sân vào SÁNG (ƯU TIÊN CAO - Check trước)
    if (
      (msg.includes('sáng') || msg.includes('sang')) &&
      (msg.includes('sân') || msg.includes('giá') || msg.includes('gia'))
    ) {
      return (
        '🌅 **Giá sân buổi sáng:**\n\n' +
        '• **06:00 - 08:00:** 50.000đ/giờ (Sáng sớm - Rẻ nhất) ⭐\n' +
        '• **08:00 - 12:00:** 70.000đ/giờ (Khung sáng)\n\n' +
        '💡 Khung sáng sớm (6-8h) là rẻ nhất trong ngày!\n' +
        '🏸 Bạn muốn đặt sân sáng không ạ?'
      );
    }

    // Giá sân vào CHIỀU
    if (
      (msg.includes('chiều') || msg.includes('chieu')) &&
      (msg.includes('sân') || msg.includes('giá') || msg.includes('gia'))
    ) {
      return (
        '🌤️ **Giá sân buổi chiều:**\n\n' +
        '• **12:00 - 14:00:** 60.000đ/giờ (Khung trưa - Ưu đãi)\n' +
        '• **14:00 - 17:00:** 80.000đ/giờ (Khung chiều)\n\n' +
        '💡 Khung trưa (12-14h) có giá ưu đãi!\n' +
        '🏸 Bạn muốn đặt sân chiều không ạ?'
      );
    }

    // Giá sân vào TỐI
    if (
      (msg.includes('tối') ||
        msg.includes('toi') ||
        msg.includes('cao điểm')) &&
      (msg.includes('sân') ||
        msg.includes('giá') ||
        msg.includes('gia') ||
        msg.includes('chơi'))
    ) {
      return (
        '🌆 **Giá sân buổi tối:**\n\n' +
        '• **17:00 - 20:00:** 120.000đ/giờ (Cao điểm) ⭐\n' +
        '• **20:00 - 22:00:** 100.000đ/giờ (Tối muộn)\n\n' +
        '💡 Khung 17-20h là cao điểm, đông khách nhất!\n' +
        '🏸 Bạn muốn đặt sân tối không ạ?'
      );
    }

    // Giá sân chung chung (CHECK SAU CÙNG - nếu không match sáng/chiều/tối)
    if (
      (msg.includes('giá') ||
        msg.includes('gia') ||
        msg.includes('bao nhiêu')) &&
      (msg.includes('sân') ||
        msg.includes('san') ||
        msg.includes('thuê') ||
        msg.includes('thue')) &&
      !msg.includes('hủy') && // Tránh conflict với "hủy sân"
      !msg.includes('cọc') // Tránh conflict với "cọc"
    ) {
      return (
        '💰 **Giá sân SmartCourt:**\n\n' +
        '• **Sáng sớm (6-8h):** 50.000đ/giờ - Rẻ nhất ⭐\n' +
        '• **Sáng (8-12h):** 70.000đ/giờ\n' +
        '• **Trưa (12-14h):** 60.000đ/giờ - Ưu đãi\n' +
        '• **Chiều (14-17h):** 80.000đ/giờ\n' +
        '• **Tối (17-20h):** 120.000đ/giờ - Cao điểm\n' +
        '• **Tối muộn (20-22h):** 100.000đ/giờ\n\n' +
        '🏸 Bạn muốn đặt khung giờ nào?'
      );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 🏸 Các patterns khác
    // ═══════════════════════════════════════════════════════════════════════

    // Giày, phụ kiện chung
    if (
      msg.includes('giày') ||
      msg.includes('giay') ||
      msg.includes('phụ kiện') ||
      msg.includes('phu kien') ||
      msg.includes('sản phẩm')
    ) {
      return (
        '🛒 **Sản phẩm tại SmartCourt:**\n\n' +
        '**Vợt & Cầu:**\n' +
        '• Vợt Yonex: 450.000đ\n' +
        '• Vợt Victor: 650.000đ\n' +
        '• Cầu Yonex (hộp 12 quả): 180.000đ\n\n' +
        '**Giày & Phụ kiện:**\n' +
        '• Giày Lining: 850.000đ - 1.200.000đ\n' +
        '• Quấn cán vợt: 25.000đ\n\n' +
        '💡 *Giá tham khảo. Đăng nhập để xem chi tiết.*'
      );
    }

    // Sân trống / Còn sân
    if (
      msg.includes('trống') ||
      msg.includes('trong') ||
      msg.includes('còn sân') ||
      msg.includes('con san') ||
      msg.includes('có sân') ||
      msg.includes('khả dụng') ||
      msg.includes('available')
    ) {
      return '🏸 **Kiểm tra sân trống**\n\nBạn muốn xem sân trống:\n• Hôm nay?\n• Ngày mai?\n• Ngày cụ thể nào?\n\n💡 Cho tôi biết ngày, tôi sẽ kiểm tra cho bạn! (Nếu đã đăng nhập)';
    }

    // Đặt sân
    if (
      msg.includes('đặt') ||
      msg.includes('dat') ||
      msg.includes('book') ||
      msg.includes('thuê') ||
      msg.includes('thue') ||
      msg.includes('reservation')
    ) {
      return '📅 **Đặt sân cầu lông**\n\nĐể đặt sân, tôi cần:\n1️⃣ **Sân số mấy?** (VD: sân 1, sân 2)\n2️⃣ **Ngày nào?** (VD: ngày mai, 22/12)\n3️⃣ **Giờ mấy?** (VD: 18h, 20h)\n4️⃣ **Đặt mấy tiếng?** (VD: 1 tiếng, 2 tiếng)\n\n⚠️ Bạn cần đăng nhập để đặt sân.';
    }

    // Lịch đặt / My bookings
    if (
      msg.includes('lịch') ||
      msg.includes('lich') ||
      msg.includes('đã đặt') ||
      msg.includes('booking') ||
      msg.includes('của tôi')
    ) {
      return '📋 **Xem lịch đặt sân**\n\n⚠️ Bạn cần đăng nhập để xem lịch đặt của mình.\n\nSau khi đăng nhập, tôi có thể cho bạn biết:\n• Các sân đã đặt\n• Trạng thái thanh toán\n• Thời gian check-in\n\n🔐 Vui lòng đăng nhập để sử dụng tính năng này.';
    }

    // Câu hỏi ngoài chủ đề
    if (
      msg.includes('nấu ăn') ||
      msg.includes('chính trị') ||
      msg.includes('chinh tri') ||
      msg.includes('thời tiết') ||
      msg.includes('thoi tiet') ||
      msg.includes('bóng đá') ||
      msg.includes('bong da') ||
      msg.includes('xe') ||
      msg.includes('nhà') ||
      msg.includes('nha')
    ) {
      return '😊 **Xin lỗi, tôi chỉ hỗ trợ về sân cầu lông**\n\nTôi là AI chuyên về:\n• Đặt sân cầu lông\n• Tra cứu sản phẩm POS\n• Kiểm tra sân trống\n• Hỗ trợ booking\n\nBạn có câu hỏi nào về dịch vụ sân cầu lông không? 🏸';
    }

    // Default
    return '👋 **SmartCourt AI - Trợ lý đặt sân thông minh**\n\n🎯 Tôi có thể giúp bạn:\n• 📅 **Đặt sân** cầu lông (cần đăng nhập)\n• 🏸 **Xem sân trống** theo ngày\n• 🛒 **Tra cứu sản phẩm** POS\n• 📋 **Xem lịch đặt** của bạn\n• 💰 **Xem bảng giá** sân\n\n💬 Hãy nói cho tôi biết bạn cần gì nhé! 🏸';
  }
}
