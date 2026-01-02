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
import Groq from 'groq-sdk';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../pos/products.service';
import { BookingsService } from '../bookings/bookings.service';
import { PaymentsService } from '../payments/payments.service';
import { Role, PaymentMethod, BookingType } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 SMART AGENT - SmartCourt AI Assistant
// Kết nối Database thực + 4 Tools đầy đủ
// ═══════════════════════════════════════════════════════════════════════════

// Định nghĩa giờ hoạt động
const OPERATING_HOURS = { start: 6, end: 21 };

// ═══════════════════════════════════════════════════════════════════════════
// 🚫 OFF-TOPIC DETECTION - Keywords
// ═══════════════════════════════════════════════════════════════════════════

const OFF_TOPIC_KEYWORDS = [
  // Nấu ăn
  'nấu',
  'món',
  'công thức',
  'ăn gì',
  'làm bánh',
  'nướng',
  'chiên',
  'hấp',
  'phở',
  'bún',
  'cơm',
  'mì',
  'canh',
  'soup',
  'cooking',
  'recipe',

  // Lập trình
  'code',
  'lập trình',
  'javascript',
  'python',
  'java',
  'react',
  'node',
  'database',
  'api',
  'programming',
  'function',
  'debug',
  'bug',
  'git',

  // Y tế
  'bệnh',
  'thuốc',
  'khám',
  'điều trị',
  'bác sĩ',
  'đau',
  'sốt',
  'cảm',
  'viêm',
  'doctor',
  'medical',
  'sick',
  'disease',
  'medicine',

  // Chính trị
  'chính trị',
  'bầu cử',
  'đảng',
  'tổng thống',
  'quốc hội',
  'chính phủ',
  'politics',
  'election',
  'president',
  'government',

  // Du lịch (không liên quan sân cầu lông)
  'khách sạn',
  'vé máy bay',
  'tour',
  'visa',
  'hộ chiếu',
  'resort',
  'hotel',
  'flight',
  'ticket',
  'tourism',

  // Giải trí (phim, nhạc, game)
  'phim',
  'movie',
  'concert',
  'ca sĩ',
  'game',
  'chơi game',
  'netflix',
  'spotify',
  'youtube',
  'tiktok',

  // Tài chính
  'cổ phiếu',
  'chứng khoán',
  'forex',
  'crypto',
  'bitcoin',
  'đầu tư',
  'stock',
  'investment',
  'trading',

  // Thời tiết (trừ khi liên quan đặt sân)
  'bão',
  'lũ lụt',
  'động đất',
  'thiên tai',
  'typhoon',
  'flood',
  'earthquake',

  // Giáo dục (không liên quan)
  'thi đại học',
  'học bổng',
  'trường học',
  'ôn thi',
  'university',
  'scholarship',
  'exam',
];

const BADMINTON_KEYWORDS = [
  // Sân cầu lông
  'sân',
  'court',
  'cầu lông',
  'badminton',
  'cầu',
  'vợt',

  // Đặt chỗ
  'đặt',
  'book',
  'booking',
  'thuê',
  'rent',
  'lịch',
  'schedule',
  'hủy',
  'cancel',
  'xóa',
  'delete',

  // Giá cả
  'giá',
  'price',
  'bao nhiêu',
  'how much',
  'cost',
  'tiền',
  'money',
  'phí',
  'fee',
  'thanh toán',
  'payment',
  'ví',
  'wallet',

  // Thời gian hoạt động
  'giờ',
  'time',
  'mở cửa',
  'đóng cửa',
  'open',
  'close',
  'hour',
  'sáng',
  'chiều',
  'tối',
  'morning',
  'afternoon',
  'evening',

  // Dịch vụ
  'nước',
  'drink',
  'đồ uống',
  'beverage',
  'cầu',
  'shuttle',
  'vợt',
  'racket',
  'giày',
  'shoes',
  'quần áo',
  'phụ kiện',

  // Địa chỉ, liên hệ
  'địa chỉ',
  'address',
  'ở đâu',
  'where',
  'hotline',
  'phone',
  'liên hệ',
  'contact',
  'smartcourt',

  // Chung
  'có',
  'còn',
  'trống',
  'available',
  'free',
  'xem',
  'view',
  'check',
];

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
- TẤT CẢ CÁC NGÀY: 6:00 - 21:00 (từ thứ 2 đến Chủ nhật)
- Không nghỉ lễ, phục vụ liên tục

💰 **BẢNG GIÁ SÂN (2 khung giờ duy nhất):**

| Khung giờ          | Giá/giờ     | Ghi chú                    |
|--------------------|-------------|----------------------------|
| 06:00 - 17:00      | 50.000đ     | Khung giờ thường           |
| 17:00 - 21:00      | 100.000đ    | Khung giờ cao điểm         |
| Sau 21:00          | Đóng cửa    | Không phục vụ              |

📝 **CHÍNH SÁCH ĐẶT SÂN:**
- Đặt tối thiểu: 1 giờ
- Đặt tối đa: 4 giờ/lần (nếu cần thêm phải liên hệ staff)
- Thanh toán: **100% TRƯỚC** khi đặt sân (qua ví điện tử hoặc VNPay)
- KHÔNG áp dụng đặt cọc, phải thanh toán full

⚠️ **CHÍNH SÁCH HỦY SÂN:**
- Hủy trước 24h: Hoàn 100% tiền
- Hủy trước 12h: Hoàn 50% tiền
- Hủy dưới 12h: KHÔNG hoàn tiền
- Trễ hơn 15 phút: Tự động hủy, không hoàn tiền

🏸 **THÔNG TIN SÂN:**
Hiện có **5 sân cầu lông tiêu chuẩn** (không có sân VIP):
- Sân 1, 2, 3, 4, 5: Sân thường, chất lượng tốt, giá đồng nhất
- Tất cả sân đều có điều hòa, camera giám sát

🛒 **SẢN PHẨM POS PHỔ BIẾN (Tham khảo - Có thể thay đổi):**

**Cầu lông:**
- Cầu RSL Classic (12 quả): 120.000đ
- Cầu Yonex AS30 (12 quả): 180.000đ
- Cầu Victor Gold (12 quả): 150.000đ

**Đồ uống:**
- Nước Aquafina 500ml: 10.000đ
- Nước Revive 500ml: 15.000đ
- Trà đào Cozy 450ml: 12.000đ
- Nước Sting 330ml: 12.000đ

**Phụ kiện:**
- Quấn cán vợt: 25.000đ
- Băng đô thấm mồ hôi: 30.000đ
- Vỏ vợt cầu lông: 50.000đ

**Thiết bị:**
- Vợt Yonex Astrox: 1.500.000đ
- Giày cầu lông Kawasaki: 450.000đ

**Khác:**
- Khăn mặt: 35.000đ
- Dây vợt thay thế (BG65): 80.000đ

*Lưu ý: Giá trên lấy từ database. Để biết tồn kho real-time, dùng chức năng tra cứu POS (nếu đã đăng nhập).*

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
🤖 "🏸 **Giá sân:**
     - Khung 6h-17h (bao gồm chiều): **50.000đ/giờ**
     - Khung 17h-21h (cao điểm): **100.000đ/giờ**
     Bạn muốn đặt sân không ạ?"

👤 "Mấy giờ mở cửa?"
🤖 "⏰ SmartCourt mở cửa **6:00 - 21:00** tất cả các ngày trong tuần!
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
    '🆕 PHASE 3: Tra cứu sản phẩm POS (đồ uống, cầu, vợt, phụ kiện). GỌI KHI: khách hỏi về menu, giá sản phẩm, "có gì?", "bán gì?", "nước gì?", "vợt gì?". KHÔNG GỌI khi hỏi về giá sân (dùng fallback).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      keyword: {
        type: SchemaType.STRING,
        description:
          'Từ khóa tìm kiếm (tùy chọn). VD: "nước", "vợt", "cầu", "revive"',
      },
      category: {
        type: SchemaType.STRING,
        description:
          'Loại sản phẩm: DRINK (nước uống), EQUIPMENT (vợt, cầu), ACCESSORY (phụ kiện), FOOD (đồ ăn)',
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
    '🆕 PHASE 3: Đặt sân cầu lông cho khách. GỌI 2 LẦN: (1) Lần đầu KHÔNG có confirmed → hiện thông tin xác nhận. (2) Sau khi khách nói "Có"/"Đồng ý" → gọi LẦN 2 với confirmed=true để thực thi.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      courtId: {
        type: SchemaType.NUMBER,
        description: 'Số sân (1-5). VD: "sân 1" → courtId = 1',
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
        description: 'Số giờ đặt (1-8). Mặc định 1 nếu không nói.',
      },
      confirmed: {
        type: SchemaType.BOOLEAN,
        description:
          '🆕 PHASE 3: true khi khách đã xác nhận "Có"/"Đồng ý". Lần đầu KHÔNG truyền (hoặc false).',
      },
    },
    required: ['courtId', 'date', 'time', 'duration'],
  },
};

const GET_COURT_AVAILABILITY: FunctionDeclaration = {
  name: 'get_court_availability',
  description:
    '🆕 PHASE 3: Kiểm tra sân trống theo ngày. GỌI KHI: khách hỏi "còn sân không?", "sân nào trống?", "tối nay có sân không?", "ngày mai còn sân?". Hiển thị danh sách khung giờ và sân available.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      date: {
        type: SchemaType.STRING,
        description:
          'Ngày cần xem (YYYY-MM-DD). Mặc định hôm nay nếu không có. VD: "ngày mai" → parse thành 2025-12-22',
      },
    },
    required: [],
  },
};

const GET_USER_BOOKINGS: FunctionDeclaration = {
  name: 'get_user_bookings',
  description:
    '🆕 PHASE 3: Xem lịch đặt sân của khách hàng. GỌI KHI: khách hỏi "tôi đã đặt gì?", "xem lịch của tôi", "booking của tôi", "lịch sử đặt sân". YÊU CẦU đăng nhập (userId != null).',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      status: {
        type: SchemaType.STRING,
        description:
          'Lọc theo trạng thái: CONFIRMED (đã xác nhận), PENDING_PAYMENT (chưa thanh toán), hoặc ALL (tất cả)',
        format: 'enum',
        enum: ['CONFIRMED', 'PENDING_PAYMENT', 'ALL'],
      },
    },
    required: [],
  },
};

const CANCEL_BOOKING: FunctionDeclaration = {
  name: 'cancel_booking',
  description:
    '🆕 PHASE 4: Hủy booking đã đặt. GỌI KHI: khách hỏi "hủy sân", "cancel booking", "xóa lịch đặt". Tính phí hủy theo chính sách: >24h hoàn 100%, >12h hoàn 50%, <12h không hoàn. YÊU CẦU đăng nhập.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      bookingCode: {
        type: SchemaType.STRING,
        description:
          'Mã booking cần hủy (VD: COURT-ABC123). Có thể lấy từ get_user_bookings.',
      },
      reason: {
        type: SchemaType.STRING,
        description:
          'Lý do hủy (tùy chọn). VD: "Bận việc đột xuất", "Thời tiết xấu"',
      },
      confirmed: {
        type: SchemaType.BOOLEAN,
        description:
          '🆕 true khi khách đã xác nhận hủy sau khi được thông báo phí.',
      },
    },
    required: ['bookingCode'],
  },
};

const GET_WALLET_BALANCE: FunctionDeclaration = {
  name: 'get_wallet_balance',
  description:
    '🆕 PHASE 4: Xem số dư ví điện tử. GỌI KHI: khách hỏi "ví của tôi", "số dư", "còn bao nhiêu tiền", "tài khoản". YÊU CẦU đăng nhập.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {},
    required: [],
  },
};

const CREATE_FIXED_SCHEDULE_BOOKING: FunctionDeclaration = {
  name: 'create_fixed_schedule_booking',
  description:
    '🆕 PHASE 4: Đặt sân theo lịch cố định (VD: T2-T4-T6 hàng tuần, 18h-20h). GỌI KHI: khách hỏi "đặt sân cố định", "đặt theo tuần", "lịch đặt định kỳ". Có giảm giá: >4 buổi giảm 5%, >8 buổi giảm 10%. YÊU CẦU đăng nhập.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      daysOfWeek: {
        type: SchemaType.ARRAY,
        description:
          'Các ngày trong tuần (1=T2, 2=T3, ..., 7=CN). VD: [1,3,5] = T2-T4-T6',
        items: { type: SchemaType.NUMBER },
      },
      startDate: {
        type: SchemaType.STRING,
        description: 'Ngày bắt đầu (YYYY-MM-DD). VD: "2026-01-01"',
      },
      endDate: {
        type: SchemaType.STRING,
        description: 'Ngày kết thúc (YYYY-MM-DD). VD: "2026-03-31"',
      },
      courtId: {
        type: SchemaType.NUMBER,
        description: 'Số sân (1-5)',
      },
      time: {
        type: SchemaType.STRING,
        description: 'Giờ bắt đầu (HH:mm). VD: "18:00"',
      },
      duration: {
        type: SchemaType.NUMBER,
        description: 'Số giờ mỗi buổi (1-4)',
      },
      confirmed: {
        type: SchemaType.BOOLEAN,
        description:
          '🆕 true khi khách đã xác nhận sau khi xem tổng chi phí + giảm giá.',
      },
    },
    required: [
      'daysOfWeek',
      'startDate',
      'endDate',
      'courtId',
      'time',
      'duration',
    ],
  },
};

const PAYMENT: FunctionDeclaration = {
  name: 'payment',
  description:
    '🆕 PHASE 4: Thanh toán booking bằng ví điện tử. GỌI KHI: khách hỏi "thanh toán", "trả tiền", "payment". Có 2 phương thức: WALLET (từ ví) hoặc VNPAY (chuyển khoản). YÊU CẦU đăng nhập.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      bookingCode: {
        type: SchemaType.STRING,
        description:
          'Mã booking cần thanh toán (VD: COURT-ABC123). Có thể lấy từ get_user_bookings.',
      },
      paymentMethod: {
        type: SchemaType.STRING,
        description:
          'Phương thức thanh toán: "WALLET" (ví điện tử) hoặc "VNPAY" (chuyển khoản)',
        format: 'enum',
        enum: ['WALLET', 'VNPAY'],
      },
      confirmed: {
        type: SchemaType.BOOLEAN,
        description:
          '🆕 true khi khách đã xác nhận thanh toán sau khi xem số tiền.',
      },
    },
    required: ['bookingCode', 'paymentMethod'],
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
      CANCEL_BOOKING,
      GET_WALLET_BALANCE,
      CREATE_FIXED_SCHEDULE_BOOKING,
      PAYMENT,
    ],
  },
];

/**
 * Convert Gemini function declarations to Groq tools format
 */
function convertToGroqTools() {
  const tools = [];

  for (const func of [
    GET_POS_PRODUCTS,
    CREATE_BOOKING,
    GET_COURT_AVAILABILITY,
    GET_USER_BOOKINGS,
    CANCEL_BOOKING,
    GET_WALLET_BALANCE,
    CREATE_FIXED_SCHEDULE_BOOKING,
  ]) {
    tools.push({
      type: 'function',
      function: {
        name: func.name,
        description: func.description,
        parameters: func.parameters,
      },
    });
  }

  return tools;
}

// ═══════════════════════════════════════════════════════════════════════════
// 🤖 CHAT SERVICE
// ═══════════════════════════════════════════════════════════════════════════

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private groqClient: Groq | null = null;
  private aiProvider: 'gemini' | 'groq' = 'groq';
  private isInitialized = false;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly bookingsService: BookingsService,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Get Groq tools format
   */
  private getGroqTools() {
    return convertToGroqTools();
  }

  async onModuleInit() {
    // Get AI provider from config
    this.aiProvider =
      (this.configService.get<string>('AI_PROVIDER') as 'gemini' | 'groq') ||
      'groq';

    if (this.aiProvider === 'groq') {
      await this.initGroq();
    } else {
      await this.initGemini();
    }
  }

  /**
   * Initialize Groq AI
   */
  private async initGroq() {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');

    if (
      !apiKey ||
      apiKey.trim() === '' ||
      apiKey === 'your_groq_api_key_here'
    ) {
      this.logger.warn('⚠️ GROQ_API_KEY not configured. AI disabled.');
      this.logger.warn(
        '👉 Get your free API key from: https://console.groq.com',
      );
      return;
    }

    try {
      this.logger.log('🚀 Initializing SmartCourt AI with Groq...');

      this.groqClient = new Groq({ apiKey });

      // Test connection
      const testResponse = await this.groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
      });

      if (testResponse.choices[0]?.message) {
        this.isInitialized = true;
        this.logger.log(
          '✅ SmartCourt AI initialized with Groq (llama-3.3-70b-versatile)',
        );
        this.logger.log(
          '🛠️ Tools: 4 functions (POS, Booking, Availability, User Bookings)',
        );
      }
    } catch (error) {
      this.logger.error(`❌ Groq init failed: ${error.message}`);
      this.isInitialized = false;
    }
  }

  /**
   * Initialize Gemini AI (legacy)
   */
  private async initGemini() {
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
   * 🆕 PHASE 3: Enhanced with suggested actions & better error messages
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
          message:
            '❌ **Không tìm thấy sản phẩm**\n\n💡 Vui lòng thử từ khóa khác hoặc xem tất cả sản phẩm.',
          products: [],
          // 🆕 PHASE 3: Suggested actions when no results
          suggestedActions: [
            '📋 Xem tất cả sản phẩm (không lọc)',
            '🏸 Đặt sân cầu lông',
            '📅 Xem sân trống',
          ],
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
        message: `✅ Tìm thấy **${products.length} sản phẩm**`,
        products: productList,
        // 🆕 PHASE 3: Suggested actions after showing products
        suggestedActions: [
          '🏸 Đặt sân để chơi',
          '📅 Xem lịch sân trống hôm nay',
          '📦 Xem thêm sản phẩm khác',
        ],
      };
    } catch (error) {
      this.logger.error(`❌ Error in get_pos_products: ${error.message}`);
      return {
        success: false,
        error:
          '❌ **Không thể tra cứu sản phẩm lúc này**\n\n💡 Vui lòng thử lại sau hoặc liên hệ hotline: **1900-8888**',
      };
    }
  }

  /**
   * 📅 create_booking - Đặt sân từ database
   * 🆕 PHASE 3: Added confirmation step, enhanced validation & suggested actions
   */
  private async handleCreateBooking(
    args: {
      courtId: number;
      date: string;
      time: string;
      duration: number;
      confirmed?: boolean; // 🆕 PHASE 3: Confirmation flag
    },
    userId: number | null,
  ): Promise<object> {
    try {
      this.logger.log(
        `📅 [Function] create_booking: ${JSON.stringify(args)}, userId: ${userId}`,
      );

      // 🆕 PHASE 3: Enhanced validation with detailed error messages
      if (!userId) {
        return {
          success: false,
          error:
            '🔒 **Bạn cần đăng nhập để đặt sân**\n\n💡 Vui lòng đăng nhập hoặc đăng ký tài khoản để sử dụng tính năng này.',
        };
      }

      // 🆕 PHASE 3: Input validation
      if (!args.courtId || !args.date || !args.time || !args.duration) {
        return {
          success: false,
          error:
            '❌ **Thiếu thông tin đặt sân**\n\n📋 Vui lòng cung cấp:\n• Số sân (1-5)\n• Ngày (VD: 2025-12-22)\n• Giờ (VD: 18:00)\n• Thời lượng (VD: 2 giờ)',
        };
      }

      // Parse date and time
      const [year, month, day] = args.date.split('-').map(Number);
      const [hour, minute] = args.time.split(':').map(Number);

      const startDateTime = new Date(year, month - 1, day, hour, minute || 0);
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + args.duration);

      // 🆕 PHASE 3: Enhanced validation with detailed messages
      if (startDateTime < new Date()) {
        return {
          success: false,
          error:
            '⏰ **Không thể đặt sân trong quá khứ**\n\n💡 Vui lòng chọn thời gian trong tương lai.',
        };
      }

      if (hour < OPERATING_HOURS.start || hour >= OPERATING_HOURS.end) {
        return {
          success: false,
          error: `🕐 **Ngoài giờ hoạt động**\n\n⏰ Sân mở cửa: **${OPERATING_HOURS.start}:00 - ${OPERATING_HOURS.end}:00** hàng ngày.\n\n💡 Vui lòng chọn giờ trong khung giờ hoạt động.`,
        };
      }

      // 🆕 PHASE 3: Court ID validation
      if (args.courtId < 1 || args.courtId > 5) {
        return {
          success: false,
          error:
            '🏸 **Số sân không hợp lệ**\n\n✅ Sân khả dụng: **Sân 1, 2, 3, 4, 5**\n\n💡 Vui lòng chọn số sân từ 1 đến 5.',
        };
      }

      // 🆕 PHASE 3: Duration validation
      if (args.duration < 1 || args.duration > 8) {
        return {
          success: false,
          error:
            '⏱️ **Thời lượng không hợp lệ**\n\n✅ Thời lượng đặt sân: **1-8 giờ**\n\n💡 Vui lòng chọn thời lượng từ 1 đến 8 giờ.',
        };
      }

      // 🆕 PHASE 3: CONFIRMATION STEP - Check availability BEFORE asking confirmation
      if (!args.confirmed) {
        // ✅ CHECK SÂN TRỐNG TRƯỚC KHI HỎI XÁC NHẬN
        const existingBooking = await this.prisma.booking.findFirst({
          where: {
            courtId: args.courtId,
            startTime: { lte: endDateTime },
            endTime: { gte: startDateTime },
            status: {
              notIn: ['CANCELLED', 'CANCELLED_LATE', 'EXPIRED'],
            },
          },
          include: {
            court: { select: { name: true } },
          },
        });

        // ❌ Nếu sân đã được đặt → Thông báo luôn, KHÔNG hỏi confirm
        if (existingBooking) {
          const bookedTime = `${new Date(existingBooking.startTime).getHours()}:${String(new Date(existingBooking.startTime).getMinutes()).padStart(2, '0')} - ${new Date(existingBooking.endTime).getHours()}:${String(new Date(existingBooking.endTime).getMinutes()).padStart(2, '0')}`;

          return {
            success: false,
            error: `⚠️ **Sân ${args.courtId} đã được đặt!**\n\n❌ Khung giờ **${args.time} - ${endDateTime.getHours()}:${String(endDateTime.getMinutes()).padStart(2, '0')}** đã có người đặt (Booking: ${existingBooking.bookingCode}).\n\n💡 **Gợi ý:**\n• Chọn giờ khác (VD: sau ${bookedTime})\n• Chọn sân khác (Sân 1-5)\n• Hỏi "Còn sân nào trống hôm nay?" để xem lịch`,
            suggestedActions: [
              '📅 Xem sân trống hôm nay',
              '🏸 Đặt sân khác',
              '🕐 Đặt giờ khác',
            ],
          };
        }

        // ✅ SÂN TRỐNG → Tính giá và hỏi xác nhận
        const isPeakHour = hour >= 17; // 17h-21h = peak
        const pricePerHour = isPeakHour ? 100000 : 50000;
        const totalPrice = pricePerHour * args.duration;

        const dateFormatted = startDateTime.toLocaleDateString('vi-VN', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        return {
          success: false,
          requiresConfirmation: true,
          message: `✅ **Sân ${args.courtId} còn trống!**\n\n📋 **Xác nhận thông tin đặt sân:**\n\n🏸 **Sân:** Sân ${args.courtId}\n📅 **Ngày:** ${dateFormatted}\n🕐 **Giờ:** ${args.time} - ${endDateTime.getHours()}:${String(endDateTime.getMinutes()).padStart(2, '0')}\n⏱️ **Thời lượng:** ${args.duration} giờ\n💰 **Tổng tiền:** ${totalPrice.toLocaleString('vi-VN')}đ ${isPeakHour ? '(Giờ cao điểm)' : '(Giờ thường)'}\n\n❓ Bạn có chắc chắn muốn đặt sân này không?\n\n💡 Trả lời **"Có"** hoặc **"Đồng ý"** để xác nhận đặt sân.`,
          bookingInfo: {
            courtId: args.courtId,
            date: args.date,
            time: args.time,
            duration: args.duration,
          },
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

      // 🆕 PHASE 3: Enhanced success response with suggested actions
      return {
        success: true,
        message: '✅ **Đặt sân thành công!**',
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
        // 🆕 PHASE 3: Suggested actions
        suggestedActions: [
          '💰 Thanh toán ngay để xác nhận booking',
          '🥤 Xem menu đồ uống và sản phẩm',
          '📋 Xem tất cả lịch đặt sân của bạn',
        ],
      };
    } catch (error) {
      this.logger.error(`❌ Error in create_booking: ${error.message}`);

      // 🆕 PHASE 3: Enhanced error handling with detailed Vietnamese messages
      if (
        error.message?.includes('already booked') ||
        error.message?.includes('ConflictException')
      ) {
        return {
          success: false,
          error:
            '⚠️ **Sân đã được đặt**\n\n❌ Sân này đã có người đặt trong khung giờ bạn chọn.\n\n💡 **Gợi ý:**\n• Chọn giờ khác\n• Chọn sân khác\n• Hỏi "còn sân nào trống?" để xem lịch',
        };
      }

      if (error.message?.includes('Court not found')) {
        return {
          success: false,
          error:
            '🏸 **Không tìm thấy sân**\n\n❌ Sân bạn chọn không tồn tại hoặc đã ngừng hoạt động.\n\n💡 Vui lòng chọn số sân từ **1 đến 5**.',
        };
      }

      if (error.message?.includes('Insufficient balance')) {
        return {
          success: false,
          error:
            '💰 **Số dư không đủ**\n\n❌ Tài khoản của bạn không đủ tiền để đặt sân.\n\n💡 Vui lòng nạp thêm tiền vào ví hoặc chọn phương thức thanh toán khác.',
        };
      }

      return {
        success: false,
        error: `❌ **Không thể đặt sân**\n\n🔧 Lỗi: ${error.message}\n\n💡 Vui lòng thử lại hoặc liên hệ hotline: **1900-8888**`,
      };
    }
  }

  /**
   * 🏸 get_court_availability - Xem sân trống
   * 🆕 PHASE 3: Enhanced with suggested actions & better formatting
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
          message:
            '❌ **Hiện tại không có sân nào trong hệ thống**\n\n💡 Vui lòng liên hệ hotline: **1900-8888**',
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

      // 🆕 PHASE 3: Enhanced response with suggested actions
      return {
        success: true,
        message:
          slots.filter((s) => !s.isFull).length > 0
            ? `✅ Tìm thấy **${slots.filter((s) => !s.isFull).length}** khung giờ còn trống`
            : '⚠️ **Tất cả khung giờ đã đầy**',
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
        // 🆕 PHASE 3: Suggested actions after viewing availability
        suggestedActions:
          slots.filter((s) => !s.isFull).length > 0
            ? [
                '🏸 Đặt sân ngay (nếu đã đăng nhập)',
                '📅 Xem sân trống ngày khác',
                '🥤 Xem menu đồ uống',
              ]
            : [
                '📅 Xem sân trống ngày mai',
                '📋 Xem lịch đặt của bạn',
                '🥤 Xem menu đồ uống',
              ],
      };
    } catch (error) {
      this.logger.error(`❌ Error in get_court_availability: ${error.message}`);
      return {
        success: false,
        error:
          '❌ **Không thể tra cứu sân trống lúc này**\n\n💡 Vui lòng thử lại sau hoặc liên hệ hotline: **1900-8888**',
      };
    }
  }

  /**
   * 📋 get_user_bookings - Xem lịch đặt của user
   * 🆕 PHASE 3: Enhanced with suggested actions & better error messages
   */
  private async handleGetUserBookings(
    args: { status?: string },
    userId: number | null,
  ): Promise<object> {
    try {
      this.logger.log(
        `📋 [Function] get_user_bookings: ${JSON.stringify(args)}, userId: ${userId}`,
      );

      // 🆕 PHASE 3: Enhanced validation
      if (!userId) {
        return {
          success: false,
          error:
            '🔒 **Bạn cần đăng nhập để xem lịch đặt sân**\n\n💡 Vui lòng đăng nhập hoặc đăng ký tài khoản để sử dụng tính năng này.',
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
          message: '📭 **Bạn chưa có lịch đặt sân nào sắp tới**',
          bookings: [],
          // 🆕 PHASE 3: Suggested actions when no bookings
          suggestedActions: [
            '🏸 Đặt sân mới',
            '📅 Xem sân trống hôm nay',
            '🥤 Xem menu đồ uống',
          ],
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

      // 🆕 PHASE 3: Check for pending payments
      const pendingPayments = bookings.filter(
        (b) => b && b.paymentStatus === 'UNPAID',
      );

      return {
        success: true,
        message: `✅ Bạn có **${bookings.length} lịch đặt sân** sắp tới`,
        bookings: bookingList,
        // 🆕 PHASE 3: Suggested actions based on booking status
        suggestedActions:
          pendingPayments.length > 0
            ? [
                `💰 Thanh toán ${pendingPayments.length} booking`,
                '🏸 Đặt thêm sân mới',
                '📅 Xem sân trống',
              ]
            : [
                '🏸 Đặt thêm sân mới',
                '📅 Xem sân trống hôm nay',
                '🥤 Xem menu đồ uống',
              ],
      };
    } catch (error) {
      this.logger.error(`❌ Error in get_user_bookings: ${error.message}`);
      return {
        success: false,
        error:
          '❌ **Không thể tra cứu lịch đặt sân**\n\n💡 Vui lòng thử lại sau hoặc liên hệ hotline: **1900-8888**',
      };
    }
  }

  /**
   * � cancel_booking - Hủy booking
   * 🆕 PHASE 4: New tool for canceling bookings
   */
  private async handleCancelBooking(
    args: { bookingCode: string; reason?: string; confirmed?: boolean },
    userId: number | null,
  ): Promise<object> {
    try {
      this.logger.log(
        `🚫 [Function] cancel_booking: ${JSON.stringify(args)}, userId: ${userId}`,
      );

      if (!userId) {
        return {
          success: false,
          error:
            '🔒 **Bạn cần đăng nhập để hủy booking**\n\n💡 Vui lòng đăng nhập để sử dụng tính năng này.',
        };
      }

      // Find booking
      const booking = await this.prisma.booking.findFirst({
        where: {
          bookingCode: args.bookingCode,
          userId,
        },
        include: { court: true },
      });

      if (!booking) {
        return {
          success: false,
          error: `❌ **Không tìm thấy booking ${args.bookingCode}**\n\n💡 Vui lòng kiểm tra lại mã booking hoặc dùng "Xem lịch của tôi" để xem tất cả booking.`,
        };
      }

      if (booking.status === 'CANCELLED') {
        return {
          success: false,
          error: `⚠️ **Booking này đã bị hủy trước đó**\n\n📅 Ngày: ${new Date(booking.startTime).toLocaleDateString('vi-VN')}\n🕐 Giờ: ${new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`,
        };
      }

      // Calculate refund policy
      const now = new Date();
      const startTime = new Date(booking.startTime);
      const hoursUntilStart =
        (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      let refundPercent = 0;
      if (hoursUntilStart >= 24) {
        refundPercent = 100;
      } else if (hoursUntilStart >= 12) {
        refundPercent = 50;
      } else {
        refundPercent = 0;
      }

      const totalPrice = Number(booking.totalPrice);
      const refundAmount = Math.floor((totalPrice * refundPercent) / 100);

      // Confirmation step
      if (!args.confirmed) {
        return {
          success: false,
          requiresConfirmation: true,
          message: `⚠️ **Xác nhận hủy booking:**\n\n📋 **Thông tin:**\n• Mã booking: ${booking.bookingCode}\n• Sân: ${booking.court.name}\n• Ngày: ${new Date(booking.startTime).toLocaleDateString('vi-VN')}\n• Giờ: ${new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}\n\n💰 **Chính sách hoàn tiền:**\n• Tổng tiền: ${totalPrice.toLocaleString('vi-VN')}đ\n• Thời gian còn lại: ${Math.floor(hoursUntilStart)} giờ\n• Hoàn lại: **${refundPercent}%** = **${refundAmount.toLocaleString('vi-VN')}đ**\n\n✅ Bạn có chắc chắn muốn hủy booking này không?\n\n💡 Trả lời **"Có"** hoặc **"Đồng ý"** để xác nhận hủy.`,
          bookingInfo: {
            bookingCode: args.bookingCode,
            refundPercent,
            refundAmount,
          },
        };
      }

      // Execute cancellation via bookingsService
      await this.bookingsService.cancelBooking(booking.id, userId);

      return {
        success: true,
        message: `✅ **Đã hủy booking thành công!**\n\n📋 Mã booking: ${booking.bookingCode}\n💰 Hoàn lại: **${refundAmount.toLocaleString('vi-VN')}đ** (${refundPercent}%)\n\n💡 Tiền đã được hoàn vào ví của bạn.`,
        refund: {
          amount: refundAmount,
          percent: refundPercent,
        },
        suggestedActions: [
          '💰 Xem số dư ví',
          '🏸 Đặt sân mới',
          '📅 Xem sân trống hôm nay',
        ],
      };
    } catch (error) {
      this.logger.error(`❌ Error in cancel_booking: ${error.message}`);
      return {
        success: false,
        error: `❌ **Không thể hủy booking**\n\n🔧 Lỗi: ${error.message}\n\n💡 Vui lòng thử lại hoặc liên hệ hotline: **1900-8888**`,
      };
    }
  }

  /**
   * 💰 get_wallet_balance - Xem số dư ví
   * 🆕 PHASE 4: New tool for checking wallet balance
   */
  private async handleGetWalletBalance(userId: number | null): Promise<object> {
    try {
      this.logger.log(`💰 [Function] get_wallet_balance, userId: ${userId}`);

      if (!userId) {
        return {
          success: false,
          error:
            '🔒 **Bạn cần đăng nhập để xem ví**\n\n💡 Vui lòng đăng nhập để sử dụng tính năng này.',
        };
      }

      const wallet = await this.prisma.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        return {
          success: false,
          error:
            '❌ **Không tìm thấy ví điện tử**\n\n💡 Vui lòng liên hệ admin để kích hoạt ví.',
        };
      }

      // Get recent transactions
      const transactions = await this.prisma.walletTransaction.findMany({
        where: { walletId: wallet.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
      });

      const balance = Number(wallet.balance);

      return {
        success: true,
        message: `💰 **Thông tin ví của bạn:**\n\n💵 Số dư hiện tại: **${balance.toLocaleString('vi-VN')}đ**`,
        balance,
        balanceFormatted: `${balance.toLocaleString('vi-VN')}đ`,
        recentTransactions: transactions.map((t) => ({
          type: t.type,
          amount: `${t.type === 'PAYMENT' ? '-' : '+'}${Number(t.amount).toLocaleString('vi-VN')}đ`,
          description: t.description,
          date: new Date(t.createdAt).toLocaleDateString('vi-VN'),
        })),
        suggestedActions:
          balance < 100000
            ? [
                '💳 Nạp tiền vào ví',
                '🏸 Đặt sân (cần đủ tiền)',
                '📅 Xem sân trống',
              ]
            : [
                '🏸 Đặt sân ngay',
                '📅 Xem sân trống hôm nay',
                '🥤 Xem menu đồ uống',
              ],
      };
    } catch (error) {
      this.logger.error(`❌ Error in get_wallet_balance: ${error.message}`);
      return {
        success: false,
        error:
          '❌ **Không thể tra cứu ví**\n\n💡 Vui lòng thử lại sau hoặc liên hệ hotline: **1900-8888**',
      };
    }
  }

  /**
   * 📅 create_fixed_schedule_booking - Đặt lịch cố định
   * 🆕 PHASE 4: New tool for fixed schedule bookings
   */
  private async handleCreateFixedScheduleBooking(
    args: {
      daysOfWeek: number[];
      startDate: string;
      endDate: string;
      courtId: number;
      time: string;
      duration: number;
      confirmed?: boolean;
    },
    userId: number | null,
  ): Promise<object> {
    try {
      this.logger.log(
        `📅 [Function] create_fixed_schedule_booking: ${JSON.stringify(args)}, userId: ${userId}`,
      );

      if (!userId) {
        return {
          success: false,
          error:
            '🔒 **Bạn cần đăng nhập để đặt lịch cố định**\n\n💡 Vui lòng đăng nhập để sử dụng tính năng này.',
        };
      }

      // Validation
      if (!args.daysOfWeek || args.daysOfWeek.length === 0) {
        return {
          success: false,
          error:
            '❌ **Thiếu thông tin ngày trong tuần**\n\n💡 VD: T2-T4-T6 = [1,3,5]',
        };
      }

      // Check availability first
      const [hour] = args.time.split(':').map(Number);
      const endHour = hour + args.duration;
      const endTime = `${String(endHour).padStart(2, '0')}:00`;

      const checkResult =
        await this.bookingsService.checkFixedScheduleAvailability(
          {
            courtId: args.courtId,
            daysOfWeek: args.daysOfWeek,
            startDate: args.startDate,
            endDate: args.endDate,
            startTime: args.time,
            endTime: endTime,
          },
          userId,
        );

      // If has conflicts, show them
      if (!checkResult.success && checkResult.conflicts) {
        return {
          success: false,
          hasConflicts: true,
          message: `⚠️ **Có ${checkResult.conflicts.length} ngày bị trùng lịch:**\n\n${checkResult.conflicts
            .slice(0, 5)
            .map((c: any) => `• ${c.date} - ${c.reason}`)
            .join(
              '\n',
            )}\n\n💡 Vui lòng chọn sân khác hoặc điều chỉnh thời gian.`,
          conflicts: checkResult.conflicts,
          suggestedActions: [
            '🏸 Chọn sân khác',
            '📅 Điều chỉnh thời gian',
            '📋 Xem sân trống',
          ],
        };
      }

      // Confirmation step
      if (!args.confirmed && checkResult.summary) {
        const summary = checkResult.summary;
        return {
          success: false,
          requiresConfirmation: true,
          message: `📋 **Xác nhận đặt lịch cố định:**\n\n🏸 **Thông tin:**\n• Sân: Sân ${args.courtId}\n• Các ngày: ${args.daysOfWeek.map((d) => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d]).join(', ')}\n• Thời gian: ${args.time} (${args.duration}h/buổi)\n• Từ: ${args.startDate}\n• Đến: ${args.endDate}\n\n💰 **Chi phí:**\n• Tổng số buổi: ${summary.totalSessions} buổi\n• Giá gốc: ${summary.originalPrice.toLocaleString('vi-VN')}đ\n• Giảm giá: ${summary.discountRate}% = -${summary.discountAmount.toLocaleString('vi-VN')}đ\n• **Thành tiền: ${summary.finalPrice.toLocaleString('vi-VN')}đ**\n\n✅ Bạn có chắc chắn muốn đặt lịch cố định này không?\n\n💡 Trả lời **"Có"** hoặc **"Đồng ý"** để xác nhận.`,
          bookingInfo: args,
          summary,
        };
      }

      // Create fixed schedule booking
      const [hour2] = args.time.split(':').map(Number);
      const endHour2 = hour2 + args.duration;
      const endTime2 = `${String(endHour2).padStart(2, '0')}:00`;

      const result = await this.bookingsService.createFixedScheduleBooking(
        {
          courtId: args.courtId,
          daysOfWeek: args.daysOfWeek,
          startDate: args.startDate,
          endDate: args.endDate,
          startTime: args.time,
          endTime: endTime2,
        },
        userId,
      );

      const groupData = result.bookingGroup;
      const summaryData = result.summary;

      // Get group code from bookings
      const firstBooking = await this.prisma.booking.findFirst({
        where: { bookingGroupId: groupData.id },
        select: { bookingCode: true },
      });

      return {
        success: true,
        message: `✅ **Đặt lịch cố định thành công!**\n\n📋 Mã nhóm: GROUP-${groupData.id}\n🏸 Sân: Sân ${args.courtId}\n📅 Tổng số buổi: ${summaryData.totalSessions} buổi\n💰 Tổng tiền: ${Number(groupData.finalPrice).toLocaleString('vi-VN')}đ (Giảm ${summaryData.discount})\n\n💡 Hệ thống đã tạo mã QR chung cho tất cả các buổi!`,
        bookingGroup: {
          groupId: groupData.id,
          totalSessions: summaryData.totalSessions,
          totalPrice: Number(groupData.finalPrice),
          discount: summaryData.discount,
        },
        suggestedActions: [
          '💰 Thanh toán ngay',
          '📋 Xem tất cả lịch đặt',
          '💵 Xem số dư ví',
        ],
      };
    } catch (error) {
      this.logger.error(
        `❌ Error in create_fixed_schedule_booking: ${error.message}`,
      );
      return {
        success: false,
        error: `❌ **Không thể đặt lịch cố định**\n\n🔧 Lỗi: ${error.message}\n\n💡 Vui lòng thử lại hoặc liên hệ hotline: **1900-8888**`,
      };
    }
  }

  /**
   * 💰 payment - Thanh toán booking
   * 🆕 PHASE 4: Payment with wallet or VNPay
   */
  private async handlePayment(
    args: {
      bookingCode: string;
      paymentMethod: 'WALLET' | 'VNPAY';
      confirmed?: boolean;
    },
    userId: number | null,
  ): Promise<object> {
    try {
      this.logger.log(
        `💰 [Function] payment: ${JSON.stringify(args)}, userId: ${userId}`,
      );

      // Validate login
      if (!userId) {
        return {
          success: false,
          error:
            '🔒 **Bạn cần đăng nhập để thanh toán**\n\n💡 Vui lòng đăng nhập để sử dụng tính năng này.',
        };
      }

      // Get booking
      const booking = await this.prisma.booking.findFirst({
        where: {
          bookingCode: args.bookingCode,
          userId,
        },
        include: {
          court: { select: { name: true } },
        },
      });

      if (!booking) {
        return {
          success: false,
          error: `❌ **Không tìm thấy booking ${args.bookingCode}**\n\n💡 Vui lòng kiểm tra lại mã booking.`,
        };
      }

      // Check if already paid
      if (booking.paymentStatus === 'PAID') {
        return {
          success: true,
          message: `✅ **Booking này đã được thanh toán!**\n\n📋 Mã: ${booking.bookingCode}\n💰 Số tiền: ${Number(booking.totalPrice).toLocaleString('vi-VN')}đ`,
          suggestedActions: ['📋 Xem lịch đặt', '🏸 Đặt sân mới'],
        };
      }

      // Step 1: Confirmation phase
      if (!args.confirmed) {
        return {
          success: true,
          message: `⚠️ **Xác nhận thanh toán:**\n\n📋 Mã booking: ${booking.bookingCode}\n🏸 Sân: ${booking.court?.name}\n📅 Ngày: ${new Date(booking.startTime).toLocaleDateString('vi-VN')}\n⏰ Giờ: ${new Date(booking.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${new Date(booking.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}\n💰 Số tiền: **${Number(booking.totalPrice).toLocaleString('vi-VN')}đ**\n💳 Phương thức: ${args.paymentMethod === 'WALLET' ? 'Ví điện tử' : 'VNPay'}\n\n❓ Xác nhận thanh toán?`,
          booking: {
            code: booking.bookingCode,
            totalPrice: Number(booking.totalPrice),
            paymentMethod: args.paymentMethod,
          },
          suggestedActions: ['Có, thanh toán', 'Không, hủy bỏ'],
        };
      }

      // Step 2: Execute payment
      if (args.paymentMethod === 'WALLET') {
        // Pay with wallet
        const result = await this.paymentsService.payWithWallet(
          booking.id,
          userId,
        );

        if (!result.success) {
          return {
            success: false,
            error: `❌ **Thanh toán thất bại**\n\n${result.message}\n\n💡 Vui lòng nạp thêm tiền vào ví hoặc chọn phương thức thanh toán khác.`,
            suggestedActions: ['💳 Nạp tiền vào ví', '💰 Xem số dư ví'],
          };
        }

        return {
          success: true,
          message: `✅ **Thanh toán thành công!**\n\n📋 Mã booking: ${booking.bookingCode}\n💰 Số tiền: ${Number(booking.totalPrice).toLocaleString('vi-VN')}đ\n💳 Phương thức: Ví điện tử\n\n📱 Bạn có thể dùng mã QR để check-in khi đến sân.`,
          payment: {
            bookingCode: booking.bookingCode,
            amount: Number(booking.totalPrice),
            method: 'WALLET',
            status: 'PAID',
          },
          suggestedActions: ['📋 Xem lịch đặt', '🏸 Đặt sân mới', '💵 Xem ví'],
        };
      } else {
        // VNPay payment
        return {
          success: true,
          message: `💳 **Chuyển đến trang thanh toán VNPay...**\n\n📋 Mã booking: ${booking.bookingCode}\n💰 Số tiền: ${Number(booking.totalPrice).toLocaleString('vi-VN')}đ\n\n💡 Vui lòng hoàn tất thanh toán trên trang VNPay.`,
          payment: {
            bookingCode: booking.bookingCode,
            amount: Number(booking.totalPrice),
            method: 'VNPAY',
            vnpayUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${booking.id}`,
          },
          suggestedActions: ['💰 Thanh toán bằng ví', '📋 Xem lịch đặt'],
        };
      }
    } catch (error) {
      this.logger.error(`❌ Error in payment: ${error.message}`);
      return {
        success: false,
        error: `❌ **Không thể thanh toán**\n\n🔧 Lỗi: ${error.message}\n\n💡 Vui lòng thử lại sau hoặc liên hệ hotline: **1900-8888**`,
      };
    }
  }

  /**
   * �🔄 Execute a function call from AI
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

      case 'cancel_booking':
        result = await this.handleCancelBooking(args as any, userId);
        break;

      case 'get_wallet_balance':
        result = await this.handleGetWalletBalance(userId);
        break;

      case 'create_fixed_schedule_booking':
        result = await this.handleCreateFixedScheduleBooking(
          args as any,
          userId,
        );
        break;

      case 'payment':
        result = await this.handlePayment(args as any, userId);
        break;

      default:
        this.logger.warn(`⚠️ Unknown function: ${name}`);
        result = { error: `Unknown function: ${name}` };
    }

    return JSON.stringify(result);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // � OFF-TOPIC DETECTION METHODS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Kiểm tra xem câu hỏi có liên quan đến đặt sân cầu lông không
   * @param query Câu hỏi của user
   * @returns true nếu liên quan, false nếu off-topic
   */
  private isRelevantToBadmintonBooking(query: string): boolean {
    const lowerQuery = query.toLowerCase();

    // Kiểm tra có chứa từ khóa badminton không
    const hasBadmintonKeyword = BADMINTON_KEYWORDS.some((keyword) =>
      lowerQuery.includes(keyword.toLowerCase()),
    );

    // Kiểm tra có chứa từ khóa off-topic không
    const hasOffTopicKeyword = OFF_TOPIC_KEYWORDS.some((keyword) =>
      lowerQuery.includes(keyword.toLowerCase()),
    );

    // Nếu có từ khóa off-topic VÀ KHÔNG có từ khóa badminton → OFF-TOPIC
    if (hasOffTopicKeyword && !hasBadmintonKeyword) {
      this.logger.log(`🚫 Off-topic detected: "${query}"`);
      return false;
    }

    // Ngược lại → cho qua AI xử lý
    return true;
  }

  /**
   * Trả về response lịch sự khi phát hiện câu hỏi off-topic
   */
  private getOffTopicResponse(): string {
    return `😊 **Xin lỗi bạn!**

Mình là trợ lý AI chuyên về **đặt sân cầu lông** của SmartCourt, nên không thể hỗ trợ về chủ đề này ạ.

🏸 **Mình có thể giúp bạn:**
• 📅 Đặt sân cầu lông (1 lần hoặc lịch cố định)
• 🔍 Kiểm tra sân trống theo ngày giờ
• 💰 Xem giá sân & số dư ví điện tử
• 📋 Xem lịch sử đặt sân của bạn
• ❌ Hủy booking (có chính sách hoàn tiền)

💡 **Bạn có thể thử hỏi:**
- "Tối nay còn sân không?"
- "Giá sân vào cuối tuần bao nhiêu?"
- "Đặt sân 3 lúc 18h ngày mai"
- "Xem lịch đặt của tôi"

Bạn cần hỗ trợ gì về đặt sân cầu lông không ạ? 🏸`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // �💬 MAIN CHAT METHOD - với Function Calling Loop
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 🤖 Generate AI response với database thực
   * Enhanced với retry logic và quota handling
   */
  async generateResponse(
    message: string,
    userId?: number | null,
    history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  ): Promise<string> {
    this.logger.log(
      `💬 User ${userId || 'anonymous'}: "${message}" (history: ${history?.length || 0} messages)`,
    );

    // ✅ OFF-TOPIC DETECTION - Check BEFORE calling AI to save API costs
    if (!this.isRelevantToBadmintonBooking(message)) {
      this.logger.log('🚫 Off-topic query rejected');
      // Track as off_topic intent in analytics
      // TODO: Add analytics tracking here if needed
      return this.getOffTopicResponse();
    }

    // Fallback if AI not ready
    if (!this.isInitialized) {
      this.logger.warn('⚠️ AI not available, using fallback');
      return this.getFallbackResponse(message);
    }

    // ✨ Add current date/time context
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5);
    const dateContext = `[CONTEXT: Hôm nay là ${currentDate}, hiện tại là ${currentTime}]`;
    const messageWithContext = `${dateContext}\n\n${message}`;

    this.logger.log(`📅 Current date context: ${currentDate} ${currentTime}`);

    // Route to appropriate AI provider
    if (this.aiProvider === 'groq') {
      return this.generateResponseWithGroq(messageWithContext, userId, history);
    } else {
      return this.generateResponseWithGemini(
        messageWithContext,
        userId,
        history,
      );
    }
  }

  /**
   * Generate response using Groq
   */
  private async generateResponseWithGroq(
    message: string,
    userId?: number | null,
    history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  ): Promise<string> {
    if (!this.groqClient) {
      return this.getFallbackResponse(message);
    }

    try {
      // Convert history to Groq format
      const messages: any[] = [{ role: 'system', content: SYSTEM_INSTRUCTION }];

      // Add history if provided
      if (history && history.length > 0) {
        for (const msg of history) {
          messages.push({
            role: msg.role === 'model' ? 'assistant' : 'user',
            content: msg.parts[0]?.text || '',
          });
        }
      }

      // Add current message
      messages.push({ role: 'user', content: message });

      // Call Groq with function calling
      const response = await this.groqClient.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages,
        tools: this.getGroqTools(),
        tool_choice: 'auto',
        max_tokens: 1024,
        temperature: 0.7,
      });

      const choice = response.choices[0];

      // Check if function calls are needed
      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        // Execute function calls
        const toolResults: any[] = [];

        for (const toolCall of choice.message.tool_calls) {
          const functionName = toolCall.function.name;
          const functionArgs = JSON.parse(toolCall.function.arguments);

          this.logger.log(`🔧 Executing function: ${functionName}`);
          this.logger.log(`📦 Args: ${JSON.stringify(functionArgs)}`);

          const result = await this.executeFunction(
            { name: functionName, args: functionArgs },
            userId,
          );

          toolResults.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: functionName,
            content: result,
          });
        }

        // Send function results back to AI
        messages.push(choice.message);
        messages.push(...toolResults);

        const finalResponse = await this.groqClient.chat.completions.create({
          model: 'llama-3.3-70b-versatile',
          messages,
          max_tokens: 1024,
          temperature: 0.7,
        });

        this.logger.log('🤖 AI Response with function results');
        return (
          finalResponse.choices[0].message.content ||
          this.getFallbackResponse(message)
        );
      }

      // No function calls, return text directly
      this.logger.log('🤖 AI Response (no function calls)');
      return choice.message.content || this.getFallbackResponse(message);
    } catch (error) {
      this.logger.error(`❌ Groq error: ${error.message}`);
      return this.getFallbackResponse(message);
    }
  }

  /**
   * Generate response using Gemini (legacy)
   */
  private async generateResponseWithGemini(
    message: string,
    userId?: number | null,
    history?: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>,
  ): Promise<string> {
    if (!this.model) {
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

        // Start chat session với history từ frontend
        const chat: ChatSession = this.model.startChat({
          history: history || [],
        });

        // Send message with date context (message param already has context)
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
        '• 5 sân tiêu chuẩn\n' +
        '• Giá: **50.000đ** (6-17h) | **100.000đ** (17-21h)\n' +
        '• Đặt online 24/7\n\n' +
        '**2️⃣ Quầy POS:**\n' +
        '• Cầu lông RSL, Yonex, Victor\n' +
        '• Đồ uống (Aquafina, Revive, Sting...)\n' +
        '• Phụ kiện (quấn cán, băng đô...)\n\n' +
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
        '⏰ **Giờ hoạt động:** 6:00 - 21:00 (tất cả các ngày)\n\n' +
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
        '• **Vợt Yonex Astrox**: 1.500.000đ (cao cấp)\n' +
        '• **Quấn cán vợt:** 25.000đ/cái\n' +
        '• **Dây vợt thay thế (BG65):** 80.000đ\n\n' +
        '💡 *Giá từ database. Đăng nhập để xem tồn kho real-time.*\n' +
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
        '• Nước Aquafina 500ml: **10.000đ**\n' +
        '• Nước Revive 500ml: **15.000đ**\n' +
        '• Trà đào Cozy 450ml: **12.000đ**\n' +
        '• Nước Sting 330ml: **12.000đ**\n\n' +
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
        '• **Cầu RSL Classic** (12 quả): 120.000đ\n' +
        '• **Cầu Yonex AS30** (12 quả): 180.000đ\n' +
        '• **Cầu Victor Gold** (12 quả): 150.000đ\n\n' +
        '💡 *Giá từ database. Liên hệ staff để biết hàng còn không.*\n' +
        '📞 Hotline: **1900-8888**'
      );
    }

    // POS chung
    if (msg.includes('pos') || msg.includes('quầy')) {
      return (
        '🛒 **Quầy POS SmartCourt:**\n\n' +
        '**Cầu lông:**\n' +
        '• Cầu RSL Classic: 120.000đ\n' +
        '• Cầu Yonex AS30: 180.000đ\n' +
        '• Cầu Victor Gold: 150.000đ\n\n' +
        '**Đồ uống:**\n' +
        '• Aquafina 500ml: 10.000đ\n' +
        '• Revive 500ml: 15.000đ\n' +
        '• Sting 330ml: 12.000đ\n\n' +
        '**Phụ kiện:**\n' +
        '• Quấn cán vợt: 25.000đ\n' +
        '• Vợt Yonex Astrox: 1.500.000đ\n\n' +
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
        '• **TẤT CẢ CÁC NGÀY:** 6:00 - 21:00\n\n' +
        '💰 Giá sân: **50.000đ/h** (6-17h) | **100.000đ/h** (17-21h)\n\n' +
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
        '• **TẤT CẢ CÁC NGÀY:** 21:00\n\n' +
        '💡 Khung cuối cùng: 20:00 - 21:00 (giá 100.000đ/h)\n\n' +
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
        '• **Hủy trước 24h:** Hoàn 100% tiền\n' +
        '• **Hủy trước 12h:** Hoàn 50% tiền\n' +
        '• **Hủy dưới 12h:** KHÔNG hoàn tiền\n' +
        '• **Trễ hơn 15 phút** khi đến sân: Booking tự động hủy, không hoàn tiền.\n\n' +
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
        '💰 **Chính sách thanh toán tại SmartCourt:**\n\n' +
        'Bạn cần thanh toán **100%** tổng tiền sân để xác nhận đặt chỗ.\n' +
        '⚠️ KHÔNG áp dụng đặt cọc, phải thanh toán full.\n' +
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
        '| 06:00 - 17:00 | **50.000đ** | Khung giờ thường |\n' +
        '| 17:00 - 21:00 | **100.000đ** | Khung cao điểm ⭐ |\n\n' +
        '⏰ Giờ hoạt động: 6:00 - 21:00 (tất cả các ngày)\n' +
        '💳 Thanh toán: 100% trước khi đặt sân\n\n' +
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
        '• **06:00 - 17:00:** 50.000đ/giờ (Khung giờ thường)\n\n' +
        '💡 Giá 50k/h áp dụng cả ngày từ 6h sáng đến 17h chiều!\n' +
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
        '• **06:00 - 17:00:** 50.000đ/giờ (Khung giờ thường)\n\n' +
        '💡 Giá 50k/h áp dụng từ 6h sáng đến 17h chiều!\n' +
        '⚠️ Từ 17h trở đi là khung cao điểm: 100.000đ/h\n' +
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
        '• **17:00 - 21:00:** 100.000đ/giờ (Cao điểm) ⭐\n\n' +
        '💡 Khung tối 17-21h là cao điểm, đông khách nhất!\n' +
        '⏰ Sân đóng cửa lúc 21:00\n' +
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
        '• **Khung thường (6h-17h):** 50.000đ/giờ\n' +
        '• **Khung cao điểm (17h-21h):** 100.000đ/giờ ⭐\n\n' +
        '⏰ Giờ hoạt động: 6:00 - 21:00 (tất cả các ngày)\n' +
        '💳 Thanh toán: 100% trước khi đặt sân\n\n' +
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
        '**Cầu lông:**\n' +
        '• Cầu RSL Classic: 120.000đ\n' +
        '• Cầu Yonex AS30: 180.000đ\n' +
        '• Cầu Victor Gold: 150.000đ\n\n' +
        '**Vợt & Phụ kiện:**\n' +
        '• Vợt Yonex Astrox: 1.500.000đ\n' +
        '• Giày Kawasaki: 450.000đ\n' +
        '• Quấn cán vợt: 25.000đ\n\n' +
        '💡 *Giá từ database. Đăng nhập để xem chi tiết.*'
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 🆕 PHASE 4: Chat History & Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * 💾 Save chat message to database
   */
  async saveChatMessage(
    userId: number,
    role: 'user' | 'bot',
    content: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.prisma.chatMessage.create({
        data: {
          userId,
          role,
          content,
          metadata: metadata || {},
        },
      });
      this.logger.log(`💾 Saved ${role} message for user ${userId}`);
    } catch (error) {
      this.logger.error(`❌ Failed to save chat message: ${error.message}`);
    }
  }

  /**
   * 📜 Get chat history for user
   */
  async getChatHistory(userId: number, limit: number = 50): Promise<any[]> {
    try {
      const messages = await this.prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      return messages.reverse().map((msg) => ({
        id: msg.id.toString(),
        content: msg.content,
        sender: msg.role,
        timestamp: msg.createdAt,
        suggestedActions: msg.metadata?.['suggestedActions'] || [],
        bookingCard: msg.metadata?.['bookingCard'] || null,
      }));
    } catch (error) {
      this.logger.error(`❌ Failed to get chat history: ${error.message}`);
      return [];
    }
  }

  /**
   * 📊 Track analytics for chat query
   */
  async trackChatAnalytics(
    userId: number | null,
    query: string,
    intent: string | null,
    wasResolved: boolean,
    toolUsed: string | null,
    responseTime: number,
  ): Promise<void> {
    try {
      await this.prisma.chatAnalytics.create({
        data: {
          userId,
          query,
          intent,
          wasResolved,
          toolUsed,
          responseTime,
        },
      });
      this.logger.log(
        `📊 Tracked analytics: ${intent} - ${wasResolved ? 'resolved' : 'unresolved'}`,
      );
    } catch (error) {
      this.logger.error(`❌ Failed to track analytics: ${error.message}`);
    }
  }

  /**
   * 🔍 Detect intent from user message
   */
  private detectIntent(message: string): string {
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.match(/đặt|book|booking/)) return 'booking';
    if (lowerMsg.match(/hủy|cancel|xóa/)) return 'cancel';
    if (lowerMsg.match(/ví|số dư|balance|wallet/)) return 'wallet';
    if (lowerMsg.match(/lịch|history|booking/)) return 'view_bookings';
    if (lowerMsg.match(/sân trống|available|còn sân/)) return 'availability';
    if (lowerMsg.match(/giá|price|bao nhiêu/)) return 'pricing';
    if (lowerMsg.match(/nước|menu|sản phẩm|product/)) return 'products';
    if (lowerMsg.match(/giờ|mở cửa|operating/)) return 'info';
    if (lowerMsg.match(/địa chỉ|address|ở đâu/)) return 'contact';

    return 'general';
  }
}
