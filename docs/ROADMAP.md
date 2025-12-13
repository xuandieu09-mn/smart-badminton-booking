# 🏸 ROADMAP 21 NGÀY: HỆ THỐNG ĐẶT SÂN CẦU LÔNG THÔNG MINH

> Hướng dẫn chi tiết từng ngày để xây dựng hệ thống đặt sân cầu lông với NestJS + React + PostgreSQL

## 📊 TIẾN ĐỘ DỰ ÁN

**Hoàn thành tổng thể: 48% (12/25 ngày)**

### CHÚ THÍCH TRẠNG THÁI
- ✅ **Hoàn thành** - Đã triển khai đầy đủ với tests
- ⚠️ **Một phần** - Đã bắt đầu nhưng cần hoàn thiện
- ❌ **Chưa làm** - Chưa bắt đầu
- 🔥 **Ưu tiên cao** - Đang chặn các tính năng khác

---

## 📅 GIAI ĐOẠN 1: NỀN TẢNG CƠ BẢN (Ngày 1-5) ✅

### Day 1: Thiết kế Database Schema ✅
**Trạng thái: 100% Hoàn thành**

#### Nhiệm vụ đã hoàn thành:
- ✅ Thiết kế 6 models cốt lõi (User, Court, Booking, Wallet, WalletTransaction, Payment)
- ✅ Thêm model PricingRule cho định giá động
- ✅ Thiết lập exclusion constraints để ngăn đặt trùng lịch
- ✅ Tạo enums (Role, BookingStatus, PaymentMethod, etc.)

#### Files đã tạo:
✅ prisma/schema.prisma - 6 models + quan hệ


#### Bảng Database:
- ✅ `users` - Quản lý người dùng
- ✅ `courts` - Quản lý sân
- ✅ `bookings` - Đặt sân (có exclusion constraint)
- ✅ `wallets` - Ví điện tử
- ✅ `wallet_transactions` - Lịch sử giao dịch ví
- ✅ `payments` - Thanh toán
- ✅ `pricing_rules` - Quy tắc định giá động (WF3.1)

---

### Day 2: Database Migrations & Constraints ✅
**Trạng thái: 100% Hoàn thành**

#### Nhiệm vụ đã hoàn thành:
- ✅ Tạo migration ban đầu với exclusion constraint
- ✅ Áp dụng 4 migrations thành công
- ✅ Test ngăn chặn đặt trùng lịch ở cấp độ database

#### Files đã tạo:
✅ prisma/migrations/ (4 migration files)


#### Lệnh đã chạy:
```bash
npx prisma migrate dev
npx prisma generate


Day 3: Seed Data & Test Accounts ✅
Trạng thái: 100% Hoàn thành

Nhiệm vụ đã hoàn thành:
✅ Seed 3 vai trò (CUSTOMER, STAFF, ADMIN)
✅ Tạo 5 sân test
✅ Thiết lập 6 pricing rules (giờ thường, giờ vàng, giờ cao điểm)
✅ Tạo booking mẫu
✅ Khởi tạo ví với số dư test
Files đã tạo:✅ prisma/seed.ts - 425 dòng
Tài khoản test:
✅ Khách hàng: customer1@example.com / password123
✅ Nhân viên: staff1@example.com / password123
✅ Quản trị: admin@example.com / password123

Day 4: NestJS Project Setup ✅
Trạng thái: 100% Hoàn thành

Nhiệm vụ đã hoàn thành:
✅ Khởi tạo NestJS project
✅ Thiết lập PrismaService
✅ Cấu hình Docker (PostgreSQL + Redis)
✅ Thiết lập biến môi trường
✅ Tạo kiến trúc modular
Files đã tạo:✅ src/app.module.ts
✅ src/prisma/prisma.service.ts
✅ docker-compose.yml
Modules đã load:
✅ ConfigModule (global)
✅ PrismaModule
✅ QueueModule (BullMQ + Redis)
Day 5: Authentication & JWT ✅
Trạng thái: 100% Hoàn thành

Nhiệm vụ đã hoàn thành:
✅ Triển khai JWT authentication
✅ Tạo endpoints register/login
✅ Thiết lập Passport strategies
✅ Hash mật khẩu với bcrypt
✅ Tạo & xác thực token
Files đã tạo:
Code
✅ src/modules/auth/auth.service.ts
✅ src/modules/auth/auth.controller.ts
✅ src/modules/auth/strategies/jwt.strategy.ts
✅ src/modules/auth/guards/jwt-auth.guard.ts
API Endpoints:
Code
✅ POST /api/auth/register
✅ POST /api/auth/login
Tests: 4/4 passing ✅

📅 GIAI ĐOẠN 2: RBAC & BOOKING CORE (Ngày 6-9) ✅
Day 6: Role-Based Access Control ✅
Trạng thái: 100% Hoàn thành

Nhiệm vụ đã hoàn thành:
✅ Tạo Roles decorator
✅ Triển khai RolesGuard
✅ Thiết lập CurrentUser decorator
✅ Test endpoints phân quyền theo vai trò
Files đã tạo:
Code
✅ src/common/decorators/roles.decorator.ts
✅ src/common/guards/roles.guard.ts
✅ src/common/decorators/current-user.decorator.ts
Routes được bảo vệ:
✅ Admin only: POST /api/courts, DELETE /api/bookings
✅ Staff only: GET /api/bookings (tất cả)
✅ Customer: GET /api/bookings/my-bookings
Day 7: Booking Service với Transactions ✅
Trạng thái: 100% Hoàn thành

Nhiệm vụ đã hoàn thành:
✅ Tạo BookingsService với Prisma transactions
✅ Triển khai ngăn chặn đặt trùng lịch
✅ Tạo mã booking duy nhất
✅ Tính giá từ PricingRules
✅ Xử lý flow PENDING_PAYMENT -> CONFIRMED
Files đã tạo:
Code
✅ src/modules/bookings/bookings.service.ts - 280 dòng
✅ src/modules/bookings/bookings.controller.ts
✅ src/modules/bookings/dto/create-booking.dto.ts
API Endpoints:
Code
✅ POST /api/bookings - Tạo booking
✅ GET /api/bookings - Danh sách tất cả (admin)
✅ GET /api/bookings/my-bookings - Booking của user
✅ GET /api/bookings/:id - Chi tiết booking
✅ POST /api/bookings/:id/cancel - Hủy booking
Tests: 6/6 passing ✅

Day 8: Hệ thống Ví & Thanh toán ✅
Trạng thái: 100% Hoàn thành

Nhiệm vụ đã hoàn thành:
✅ Tạo Wallet service (theo dõi số dư)
✅ Triển khai chức năng nạp tiền
✅ Tạo bản ghi WalletTransaction
✅ Payment service với trừ tiền ví
✅ Logic hoàn tiền
Files đã tạo:
Code
✅ src/modules/wallet/wallet.service.ts
✅ src/modules/payments/payments.service.ts
API Endpoints:
Code
✅ GET /api/wallet/balance
✅ POST /api/wallet/deposit/:userId (admin)
✅ GET /api/wallet/transactions
✅ POST /api/wallet/pay/:bookingId
✅ POST /api/payments/:id/refund
✅ GET /api/payments
Tests: 14/14 passing ✅ (6 Wallet + 8 Payments)

Day 9: BullMQ Queue cho Timeout 15 phút ✅
Trạng thái: 100% Hoàn thành

Nhiệm vụ đã hoàn thành:
✅ Thiết lập BullMQ với Redis
✅ Tạo BookingTimeoutProcessor
✅ Lên lịch expiration jobs cho PENDING_PAYMENT bookings
✅ Tự động hủy booking chưa thanh toán sau 15 phút
Files đã tạo:
Code
✅ src/queue/queue.module.ts
✅ src/modules/bookings/processors/booking-timeout.processor.ts
✅ src/queue/queue.constants.ts
Queue Jobs:
✅ BOOKING_TIMEOUT queue đã đăng ký
✅ EXPIRE_BOOKING job processor
✅ Retry: 3 lần, delay: 15 phút
Tests: Kiểm thử thủ công đã pass ✅

📅 GIAI ĐOẠN 3: COURTS & CALENDAR UI (Ngày 10-11) ✅
Day 10: Courts Module với Dynamic Pricing ✅
Trạng thái: 100% Hoàn thành

Nhiệm vụ đã hoàn thành:
✅ Triển khai CRUD operations cho Courts
✅ Kiểm tra sân trống (ngăn đặt trùng)
✅ Tính toán slots khả dụng (6:00-21:00, theo giờ)
✅ Định giá động với PricingRules
✅ Lấy giá sân cho khoảng thời gian cụ thể
Files đã tạo:
Code
✅ src/modules/courts/courts.service.ts - 194 dòng
✅ src/modules/courts/courts.controller.ts
✅ src/modules/courts/dto/
API Endpoints:
Code
✅ GET /api/courts - Danh sách sân
✅ GET /api/courts/:id - Chi tiết sân
✅ GET /api/courts/:id/available-slots?date=YYYY-MM-DD
✅ GET /api/courts/:id/pricing?startTime=...&endTime=...
✅ POST /api/courts (admin)
✅ PUT /api/courts/:id (admin)
✅ DELETE /api/courts/:id (admin)
Logic Định giá:
✅ Giờ THƯỜNG (6:00-17:00): 50,000 VND/h
✅ Giờ VÀNG (17:00-21:00): 80,000 VND/h
✅ Giờ CAO ĐIỂM (19:00-21:00, cuối tuần): 100,000 VND/h
✅ Matching dựa trên độ ưu tiên
Tests: 12/12 passing ✅

Day 11: React Calendar UI với Real-time Booking ✅
Trạng thái: 100% Hoàn thành

Nhiệm vụ đã hoàn thành:
✅ Thiết lập React + Vite + TanStack Query
✅ Tạo Calendar component với timeline grid
✅ Dropdown chọn sân
✅ Điều hướng ngày (presets 7 ngày)
✅ Tính giá real-time
✅ Chọn nhiều slot (bulk booking)
✅ Xác nhận booking với mutation
✅ Xử lý lỗi & loading states
Files đã tạo:
Code
✅ frontend/src/features/calendar/components/Calendar.tsx - 330 dòng
✅ frontend/src/features/calendar/pages/CalendarPage.tsx
✅ frontend/src/features/calendar/hooks/useCourtBookings.ts
Tính năng:
✅ Lưới slot theo giờ (6:00-21:00)
✅ Slots có màu: Xanh (trống), Đỏ (đã đặt), Vàng (chờ thanh toán)
✅ Tính giá real-time
✅ Chọn nhiều slot (đặt hàng loạt)
✅ Polling: Refetch bookings mỗi 5 giây
✅ Toast notifications khi thành công/lỗi
Backend Bulk Booking:
Code
✅ POST /api/bookings/bulk - Tạo nhiều booking
✅ Transaction-based (tất cả hoặc không)
✅ Phát hiện xung đột trên tất cả slots
✅ Lên lịch expiration jobs cho mỗi booking
📅 GIAI ĐOẠN 4: ADMIN DASHBOARD (Ngày 12) ✅
Day 12: Admin Dashboard với Analytics ✅
Trạng thái: 100% Hoàn thành

Nhiệm vụ đã hoàn thành:
✅ Tạo AdminLayout với sidebar navigation
✅ Dashboard statistics (6 chỉ số chính)
✅ Danh sách bookings với phân trang
✅ Quản lý sân (CRUD UI)
✅ Phân tích thanh toán với biểu đồ
✅ Kiểm soát truy cập theo vai trò
Files đã tạo:
Code
✅ frontend/src/features/admin/layouts/AdminLayout.tsx
✅ frontend/src/features/admin/pages/AdminDashboard.tsx
✅ frontend/src/features/admin/components/DashboardStats.tsx
✅ frontend/src/features/admin/components/BookingsList.tsx
✅ frontend/src/features/admin/components/CourtManagement.tsx
✅ frontend/src/features/admin/components/PaymentAnalytics.tsx
Chỉ số Dashboard:
✅ Tổng số booking
✅ Tổng doanh thu (VND)
✅ Tổng người dùng
✅ Tỷ lệ lấp đầy (%)
✅ Booking hôm nay
✅ Số lượng chờ thanh toán
Tính năng:
✅ Tab navigation (Tổng quan, Bookings, Sân, Analytics)
✅ Bảng bookings với phân trang (10/trang)
✅ CRUD sân với modal forms
✅ Phân tích trạng thái thanh toán (progress bars)
✅ Danh sách thanh toán gần đây
✅ Chỉ báo trạng thái có màu
📅 GIAI ĐOẠN 5: TÍNH NĂNG ENTERPRISE (Ngày 13-21) 🔥
Day 13: Đặt chỗ Real-time với Khóa tạm thời (WF1.1) ❌ QUAN TRỌNG
Trạng thái: 0% - CẦN TRIỂN KHAI

Yêu cầu:
Code
🔥 WF1.1: Grid View với Trạng thái Real-time
- Ô trắng: Trống
- Ô đỏ: Đã đặt
- Ô vàng: Đang khóa tạm thời (giữ 10 phút)
LƯU Ý: Ở Day 9 đã dùng Redis + BullMQ để làm tính năng hết hạn 15 phút cho booking chưa thanh toán. Day 13 này là tính năng KHÁC - khóa slot tạm thời 10 phút KHI USER ĐANG CHỌN, chưa tạo booking.

Nhiệm vụ cần làm:
❌ Thêm bảng temporary_locks vào database
❌ Tạo TemporaryLockService với Redis
❌ Triển khai khóa 10 phút khi chọn slot
❌ Tự động mở khóa sau timeout
❌ Cập nhật Calendar UI để hiển thị slots đang bị khóa
Files cần tạo:
Code
❌ prisma/migrations/add_temporary_locks.sql
❌ src/modules/bookings/services/temporary-lock.service.ts
❌ src/modules/bookings/dto/lock-slot.dto.ts
❌ frontend/src/features/calendar/hooks/useSlotLock.ts
API Endpoints cần thêm:
Code
❌ POST /api/bookings/lock-slot - Khóa slot trong 10 phút
❌ DELETE /api/bookings/unlock-slot/:lockId - Mở khóa
❌ GET /api/bookings/active-locks - Lấy tất cả locks đang hoạt động
Database Schema:
SQL
CREATE TABLE temporary_locks (
  id SERIAL PRIMARY KEY,
  court_id INT NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  user_id INT,
  session_id VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
Day 14: Hệ thống Check-in bằng QR Code (WF2.1) ❌ QUAN TRỌNG
Trạng thái: 0% - CẦN TRIỂN KHAI

Yêu cầu:
Code
🔥 WF2.1: Staff Check-in Dashboard
- Tạo mã QR sau khi xác nhận booking
- Nhân viên quét QR qua mobile/tablet
- Giám sát sân real-time (đèn xanh/đỏ)
Nhiệm vụ cần làm:
❌ Tạo QR code sau khi thanh toán (dùng package qrcode)
❌ Lưu QR data trong booking record
❌ Tạo Staff Check-in UI (camera scanner)
❌ Triển khai endpoint check-in (cập nhật status thành CHECKED_IN)
❌ Bảng trạng thái sân real-time (WebSockets hoặc polling)
Files cần tạo:
Code
❌ src/modules/bookings/services/qr-code.service.ts
❌ frontend/src/features/staff/pages/CheckInPage.tsx
❌ frontend/src/features/staff/components/QRScanner.tsx
❌ frontend/src/features/staff/components/CourtMonitor.tsx
API Endpoints cần thêm:
Code
❌ POST /api/bookings/:id/generate-qr - Tạo QR sau thanh toán
❌ POST /api/bookings/check-in - Quét QR và check-in
❌ GET /api/courts/realtime-status - Lấy trạng thái sân real-time
Dependencies cần cài:
bash
npm install qrcode @types/qrcode
npm install react-qr-reader
Day 15: Đặt lịch Cố định (WF1.2) ❌ CAO
Trạng thái: 0% - CẦN TRIỂN KHAI

Yêu cầu:
Code
🔥 WF1.2: Recurring Booking (thay thế tìm đối thủ)
- Khách chọn: Sân X, Thứ 5 hàng tuần, 19:00-20:00, trong 3 tháng
- System scan conflicts (kiểm tra giải đấu)
- Tạo bulk bookings nếu tất cả slots trống
Nhiệm vụ cần làm:
❌ Tạo RecurringBookingDto (court, dayOfWeek, time, duration)
❌ Triển khai conflict scan (kiểm tra tournaments trong bookings với type='TOURNAMENT')
❌ Tạo recurring bookings (tạo 12 records nếu 3 tháng)
❌ Thêm recurrence_group_id để link các bookings liên quan
❌ Frontend UI cho thiết lập recurring booking
Files cần tạo:
Code
❌ src/modules/bookings/dto/create-recurring-booking.dto.ts
❌ src/modules/bookings/services/recurring-booking.service.ts
❌ frontend/src/features/booking/pages/RecurringBookingPage.tsx
API Endpoints cần thêm:
Code
❌ POST /api/bookings/recurring - Tạo lịch lặp lại
❌ POST /api/bookings/recurring/:groupId/cancel-all - Hủy cả series
❌ GET /api/bookings/recurring/:groupId - Lấy tất cả bookings trong series
Database Schema Update:
SQL
ALTER TABLE bookings ADD COLUMN recurrence_group_id VARCHAR(50);
ALTER TABLE bookings ADD COLUMN is_recurring BOOLEAN DEFAULT FALSE;
CREATE INDEX idx_recurrence_group ON bookings(recurrence_group_id);
Day 16: Membership Tiers & Loyalty Points (WF1.3) ❌ CAO
Trạng thái: 0% - CẦN TRIỂN KHAI

Yêu cầu:
Code
🔥 WF1.3: Hệ thống Thành viên
- Silver: Giảm 5% sau 10 bookings
- Gold: Giảm 10% sau 50 bookings
- Platinum: Giảm 15% + ưu tiên đặt sân
Nhiệm vụ cần làm:
❌ Thêm bảng membership (userId, tier, points, discountRate)
❌ Thêm bảng loyalty_transactions (theo dõi points kiếm được/tiêu)
❌ Tự động nâng hạng tier dựa trên tổng bookings
❌ Áp dụng giảm giá khi checkout dựa trên tier
❌ Hiển thị membership badge trong user profile
Files cần tạo:
Code
❌ prisma/migrations/add_membership_tables.sql
❌ src/modules/membership/membership.service.ts
❌ src/modules/membership/membership.controller.ts
❌ frontend/src/features/profile/components/MembershipCard.tsx
API Endpoints cần thêm:
Code
❌ GET /api/membership/my-tier - Lấy tier hiện tại
❌ GET /api/membership/points-history - Lịch sử giao dịch points
❌ POST /api/membership/redeem-points - Dùng points để giảm giá
Database Schema:
SQL
CREATE TABLE memberships (
  id SERIAL PRIMARY KEY,
  user_id INT UNIQUE REFERENCES users(id),
  tier VARCHAR(20) DEFAULT 'BRONZE',
  total_bookings INT DEFAULT 0,
  total_spent DECIMAL(12,2) DEFAULT 0,
  points_balance INT DEFAULT 0,
  discount_rate DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE loyalty_transactions (
  id SERIAL PRIMARY KEY,
  membership_id INT REFERENCES memberships(id),
  booking_id INT REFERENCES bookings(id),
  type VARCHAR(20),
  points INT NOT NULL,
  balance_after INT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
Day 17: Vận hành Sân - Chặn & Hoán đổi (WF2.2) ❌ CAO
Trạng thái: 0% - CẦN TRIỂN KHAI

Yêu cầu:
Code
🔥 WF2.2: Quản lý Sân của Staff
- Chặn sân để bảo trì (ngăn đặt mới)
- Hoán đổi bookings giữa các sân (nếu sân hỏng)
- Hủy khẩn cấp với auto-refund
Nhiệm vụ cần làm:
❌ Thêm bảng maintenance_blocks
❌ Tạo BlockCourtDto (courtId, startDate, endDate, reason)
❌ Triển khai SwapBookingDto (fromCourtId, toCourtId, date)
❌ Tự động thông báo khách hàng về thay đổi sân qua email
❌ Staff UI để lên lịch bảo trì
Files cần tạo:
Code
❌ prisma/migrations/add_maintenance_blocks.sql
❌ src/modules/courts/services/court-operations.service.ts
❌ src/modules/courts/dto/block-court.dto.ts
❌ src/modules/courts/dto/swap-booking.dto.ts
❌ frontend/src/features/staff/pages/CourtOpsPage.tsx
API Endpoints cần thêm:
Code
❌ POST /api/courts/:id/block - Chặn sân (staff)
❌ POST /api/courts/:id/unblock - Mở chặn sân (staff)
❌ POST /api/bookings/swap - Hoán đổi booking sang sân khác
❌ GET /api/courts/maintenance-schedule - Lấy danh sách sân bị chặn
Database Schema:
SQL
CREATE TABLE maintenance_blocks (
  id SERIAL PRIMARY KEY,
  court_id INT NOT NULL REFERENCES courts(id),
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  reason TEXT,
  blocked_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
Day 18: Mini POS & Quản lý Ca (WF2.3) ❌ TRUNG BÌNH
Trạng thái: 0% - CẦN TRIỂN KHAI

Yêu cầu:
Code
🔥 WF2.3: Hệ thống Point of Sale (POS)
- Thêm dịch vụ phụ vào booking (nước, thuê vợt)
- Theo dõi thanh toán tiền mặt/thẻ mỗi ca
- Tạo báo cáo ca (tổng doanh số, hoàn tiền)
Nhiệm vụ cần làm:
❌ Thêm bảng booking_extras (bookingId, itemType, quantity, price)
❌ Thêm bảng shift_reports (staffId, startTime, endTime, totalCash, totalCard)
❌ Tạo POS UI cho staff để thêm items vào booking
❌ Tạo báo cáo ca khi nhấn nút "End Shift"
❌ In hóa đơn qua browser print API
Files cần tạo:
Code
❌ prisma/migrations/add_pos_tables.sql
❌ src/modules/pos/pos.service.ts
❌ src/modules/pos/pos.controller.ts
❌ frontend/src/features/staff/pages/POSPage.tsx
❌ frontend/src/features/staff/components/ShiftReport.tsx
API Endpoints cần thêm:
Code
❌ POST /api/pos/add-item - Thêm item vào booking
❌ GET /api/pos/booking/:id/items - Lấy booking extras
❌ POST /api/pos/end-shift - Tạo báo cáo ca
❌ GET /api/pos/shift-history - Lấy lịch sử các ca trước
Database Schema:
SQL
CREATE TABLE booking_extras (
  id SERIAL PRIMARY KEY,
  booking_id INT REFERENCES bookings(id),
  item_type VARCHAR(50),
  item_name VARCHAR(100),
  quantity INT DEFAULT 1,
  unit_price DECIMAL(10,2),
  total_price DECIMAL(10,2),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE shift_reports (
  id SERIAL PRIMARY KEY,
  staff_id INT REFERENCES users(id),
  shift_start TIMESTAMP NOT NULL,
  shift_end TIMESTAMP,
  total_cash DECIMAL(12,2) DEFAULT 0,
  total_card DECIMAL(12,2) DEFAULT 0,
  total_refunds DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
Day 19: Đa chi nhánh & Cấu hình Định giá Động (WF3.1) ❌ CAO
Trạng thái: 0% - CẦN TRIỂN KHAI

Yêu cầu:
Code
🔥 WF3.1: Quản lý Đa chi nhánh
- CRUD cho partners/branches (1 partner = N branches)
- Mỗi branch có sân & pricing rules riêng
- Admin có thể cấu hình: "Giờ vàng (17h-20h) +20%"
Nhiệm vụ cần làm:
❌ Thêm bảng branches (partnerId, name, address, phone)
❌ Cập nhật bảng courts để link tới branch_id
❌ Cập nhật pricing_rules để link tới branch_id (không chỉ courtId)
❌ Admin UI cho quản lý branch
❌ Admin UI cho cấu hình pricing rule (CRUD)
Files cần tạo:
Code
❌ prisma/migrations/add_branches_table.sql
❌ src/modules/branches/branches.service.ts
❌ src/modules/branches/branches.controller.ts
❌ frontend/src/features/admin/pages/BranchManagement.tsx
❌ frontend/src/features/admin/pages/PricingRuleConfig.tsx
API Endpoints cần thêm:
Code
❌ POST /api/branches - Tạo branch (admin)
❌ GET /api/branches - Danh sách tất cả branches
❌ PUT /api/branches/:id - Cập nhật branch
❌ DELETE /api/branches/:id - Xóa branch
❌ POST /api/pricing-rules - Tạo pricing rule
❌ PUT /api/pricing-rules/:id - Cập nhật pricing rule
❌ DELETE /api/pricing-rules/:id - Xóa pricing rule
Database Schema:
SQL
CREATE TABLE branches (
  id SERIAL PRIMARY KEY,
  partner_id INT REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE courts ADD COLUMN branch_id INT REFERENCES branches(id);
ALTER TABLE pricing_rules ADD COLUMN branch_id INT REFERENCES branches(id);
Day 20: Business Intelligence & Heatmap (WF3.2) ❌ TRUNG BÌNH
Trạng thái: 0% - CẦN TRIỂN KHAI

Yêu cầu:
Code
🔥 WF3.2: Analytics Dashboard
- Heatmap: Hiển thị giờ nào đầy (đỏ) vs. trống (xanh)
- So sánh doanh thu theo tháng (biểu đồ)
- Top 5 sân bận nhất
- Tỷ lệ giữ chân khách hàng
Nhiệm vụ cần làm:
❌ Tạo analytics queries trong BookingsService
❌ Tạo dữ liệu heatmap (aggregate bookings theo giờ)
❌ Tạo biểu đồ so sánh doanh thu (Recharts)
❌ Thêm chức năng export Excel
❌ Cache dữ liệu analytics trong Redis (TTL 5 phút)
Files cần tạo:
Code
❌ src/modules/analytics/analytics.service.ts
❌ src/modules/analytics/analytics.controller.ts
❌ frontend/src/features/admin/pages/AnalyticsPage.tsx
❌ frontend/src/features/admin/components/HeatmapChart.tsx
❌ frontend/src/features/admin/components/RevenueChart.tsx
API Endpoints cần thêm:
Code
❌ GET /api/analytics/heatmap?date=YYYY-MM-DD
❌ GET /api/analytics/revenue?startDate=...&endDate=...
❌ GET /api/analytics/top-courts
❌ GET /api/analytics/customer-retention
❌ GET /api/analytics/export-excel
Queries cần triển khai:
SQL
-- Heatmap: Đếm bookings theo giờ
SELECT 
  EXTRACT(HOUR FROM start_time) as hour,
  COUNT(*) as booking_count
FROM bookings
WHERE DATE(start_time) = '2025-12-05'
GROUP BY hour
ORDER BY hour;

-- Doanh thu theo tháng
SELECT 
  TO_CHAR(created_at, 'YYYY-MM') as month,
  SUM(total_price) as revenue
FROM bookings
WHERE status = 'CONFIRMED'
GROUP BY month
ORDER BY month DESC;
Day 21: Tích hợp VNPay/MoMo Payment Gateway 🔥 QUAN TRỌNG
Trạng thái: 0% - CHẶN PRODUCTION

Yêu cầu:
Code
🔥 Tích hợp Payment Gateway
- VNPay: Redirect tới URL thanh toán, xử lý IPN callback
- MoMo: Thanh toán QR code, xác thực webhook
- Cập nhật trạng thái booking khi thanh toán thành công
Nhiệm vụ cần làm:
❌ Đăng ký tài khoản VNPay sandbox
❌ Tạo VNPayService (tạo payment URL, xác thực signature)
❌ Tạo MoMoService (tạo QR code, xác thực webhook)
❌ Xử lý IPN callbacks (cập nhật booking status)
❌ Frontend: Redirect tới payment gateway sau khi booking
Files cần tạo:
Code
❌ src/modules/payments/gateways/vnpay.service.ts
❌ src/modules/payments/gateways/momo.service.ts
❌ src/modules/payments/dto/vnpay-callback.dto.ts
❌ src/modules/payments/dto/momo-callback.dto.ts
❌ frontend/src/features/payment/pages/PaymentGateway.tsx
API Endpoints cần thêm:
Code
❌ POST /api/payments/vnpay/create-url - Tạo VNPay payment URL
❌ GET /api/payments/vnpay/callback - Xử lý VNPay IPN
❌ POST /api/payments/momo/create-qr - Tạo MoMo QR code
❌ POST /api/payments/momo/webhook - Xử lý MoMo webhook
Biến môi trường:
env
VNPAY_TMN_CODE=your_tmn_code
VNPAY_SECRET_KEY=your_secret_key
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payment/return

MOMO_PARTNER_CODE=your_partner_code
MOMO_ACCESS_KEY=your_access_key
MOMO_SECRET_KEY=your_secret_key
MOMO_ENDPOINT=https://test-payment.momo.vn
Security: Xác thực HMAC SHA512 signature ✅

📅 GIAI ĐOẠN CUỐI: TESTING & DEPLOYMENT (Ngày 22-25) ❌
Day 22: Email Notifications với Nodemailer ❌ CAO
Trạng thái: 0% - CẦN TRIỂN KHAI

Nhiệm vụ cần làm:
❌ Thiết lập Nodemailer với Gmail SMTP
❌ Tạo email templates (xác nhận booking, hủy)
❌ Queue email jobs với BullMQ
❌ Gửi email khi có sự kiện booking
Files cần tạo:
Code
❌ src/modules/notifications/notifications.service.ts
❌ src/modules/notifications/templates/booking-confirmation.hbs
❌ src/modules/notifications/processors/email.processor.ts
Day 23: Integration Tests (E2E) ❌ TRUNG BÌNH
Trạng thái: 0% - CẦN TRIỂN KHAI

Nhiệm vụ cần làm:
❌ Thiết lập Supertest
❌ Viết E2E tests cho booking flow
❌ Test ngăn chặn đặt trùng
❌ Test payment flow
❌ Test role-based access
Files cần tạo:
Code
❌ test/e2e/bookings.e2e-spec.ts
❌ test/e2e/payments.e2e-spec.ts
❌ test/e2e/auth.e2e-spec.ts
Day 24: Bảo mật Nâng cao ❌ TRUNG BÌNH
Trạng thái: 0% - CẦN TRIỂN KHAI

Nhiệm vụ cần làm:
❌ Cài Helmet middleware
❌ Thiết lập rate limiting (@nestjs/throttler)
❌ Cấu hình CORS đúng cách
❌ Thêm input sanitization
❌ Security audit
Files cần chỉnh sửa:
Code
❌ src/main.ts - Thêm Helmet, CORS, Throttler
Day 25: Production Deployment ❌ CAO
Trạng thái: 0% - CẦN TRIỂN KHAI

Nhiệm vụ cần làm:
❌ Thiết lập CI/CD pipeline (GitHub Actions)
❌ Deploy backend lên Railway/Render
❌ Deploy frontend lên Vercel
❌ Thiết lập production database (Supabase)
❌ Cấu hình biến môi trường
❌ Thiết lập monitoring (Sentry)
📊 TỔNG KẾT TIẾN ĐỘ DỰ ÁN
Giai đoạn	Mô tả	Trạng thái	Hoàn thành
Giai đoạn 1	Nền tảng cơ bản (Ngày 1-5)	✅	100%
Giai đoạn 2	RBAC & Booking Core (Ngày 6-9)	✅	100%
Giai đoạn 3	Courts & Calendar UI (Ngày 10-11)	✅	100%
Giai đoạn 4	Admin Dashboard (Ngày 12)	✅	100%
Giai đoạn 5	Tính năng Enterprise (Ngày 13-21)	❌	0%
Giai đoạn 6	Testing & Deployment (Ngày 22-25)	❌	0%
Hoàn thành tổng thể: 48% (12 của 25 ngày)

🔥 CON ĐƯỜNG TỚI PRODUCTION
Tuần 1 (Ngày 13-17) 🚨 ƯU TIÊN 1
✅ Day 13: Temporary Lock System (WF1.1)
✅ Day 14: QR Code Check-in (WF2.1)
✅ Day 15: Recurring Booking (WF1.2)
✅ Day 16: Membership Tiers (WF1.3)
✅ Day 17: Court Operations (WF2.2)
Tuần 2 (Ngày 18-21) 🚨 ƯU TIÊN 2
Day 18: Mini POS System (WF2.3)
Day 19: Multi-Branch Config (WF3.1)
Day 20: Analytics & Heatmap (WF3.2)
Day 21: VNPay/MoMo Integration 🔥 CHẶN
Tuần 3 (Ngày 22-25) 📈 HOÀN THIỆN
Day 22: Email Notifications
Day 23: Integration Tests
Day 24: Security Hardening
Day 25: Production Deployment
📁 FILES CHÍNH CẦN SỬA ĐỔI
Thay đổi Database Schema cần thiết:
Code
❌ temporary_locks (Day 13)
❌ maintenance_blocks (Day 17)
❌ booking_extras (Day 18)
❌ shift_reports (Day 18)
❌ branches (Day 19)
❌ memberships (Day 16)
❌ loyalty_transactions (Day 16)
Services mới cần tạo:
Code
❌ TemporaryLockService (Day 13)
❌ QRCodeService (Day 14)
❌ RecurringBookingService (Day 15)
❌ MembershipService (Day 16)
❌ CourtOperationsService (Day 17)
❌ POSService (Day 18)
❌ BranchesService (Day 19)
❌ AnalyticsService (Day 20)
❌ VNPayService (Day 21)
❌ MoMoService (Day 21)
❌ NotificationsService (Day 22)
Frontend Pages cần xây dựng:
Code
❌ RecurringBookingPage (Day 15)
❌ MembershipCard component (Day 16)
❌ CheckInPage (Day 14)
❌ CourtOpsPage (Day 17)
❌ POSPage (Day 18)
❌ BranchManagement (Day 19)
❌ PricingRuleConfig (Day 19)
❌ AnalyticsPage (Day 20)
❌ HeatmapChart (Day 20)
🎯 CHỈ SỐ THÀNH CÔNG
Đến cuối Tuần 1 (Day 17):
✅ Temporary lock system ngăn đặt trùng
✅ QR code check-in hoạt động trên mobile
✅ Khách hàng có thể tạo recurring bookings
✅ Giảm giá membership tự động áp dụng khi checkout
Đến cuối Tuần 2 (Day 21):
✅ Hỗ trợ đa chi nhánh hoạt động
✅ VNPay/MoMo payment gateways live
✅ Analytics dashboard với heatmap
✅ POS system theo dõi doanh số ca
Đến cuối Tuần 3 (Day 25):
✅ 100% test coverage (E2E + unit)
✅ Production deployment thành công
✅ Zero lỗ hổng bảo mật nghiêm trọng
✅ Email notifications hoạt động
Cập nhật lần cuối: Dựa trên trạng thái codebase hiện tại ngày 13/12/2025

Repository: xuandieu09-mn/smart-badminton-booking

Session tiếp theo: Bắt đầu với Day 13 - Temporary Lock System 🔥