# 🏸 21-Day Roadmap: Smart Badminton Booking System

> Hướng dẫn chi tiết từng ngày để xây dựng hệ thống đặt sân cầu lông với NestJS + React + PostgreSQL

## 📚 Table of Contents

### Giai đoạn 1: Database Design (Ngày 1-4) ✅
- [Day 1: Thiết kế Prisma Schema](#day-1-thiết-kế-prisma-schema)
- [Day 2: Migration với Exclusion Constraints](#day-2-migration-với-exclusion-constraints)
- [Day 3: Seed Data](#day-3-seed-data)
- [Day 4: Test Database Constraints](#day-4-test-database-constraints)

### Giai đoạn 2: Backend Core (Ngày 5-9)
- [Day 5: Setup NestJS Project Structure](#day-5-setup-nestjs-project-structure)
- [Day 6: Authentication với JWT & bcrypt](#day-6-authentication-với-jwt--bcrypt)
- [Day 7: RBAC - Role-Based Access Control](#day-7-rbac---role-based-access-control)
- [Day 8: Booking Service với Transaction Logic](#day-8-booking-service-với-transaction-logic)
- [Day 9: BullMQ Queue cho 15-min Expiry](#day-9-bullmq-queue-cho-15-min-expiry)

### Giai đoạn 3: Frontend (Ngày 10-14)
- [Day 10: Setup React + Vite + TanStack Query](#day-10-setup-react--vite--tanstack-query)
- [Day 11: Timeline Calendar View](#day-11-timeline-calendar-view)
- [Day 12: Customer Booking Flow](#day-12-customer-booking-flow)
- [Day 13: Staff Check-in Dashboard](#day-13-staff-check-in-dashboard)
- [Day 14: Admin Dashboard & Analytics](#day-14-admin-dashboard--analytics)

### Giai đoạn 4: Payment & Security (Ngày 15-18)
- [Day 15: VNPay Sandbox Integration](#day-15-vnpay-sandbox-integration)
- [Day 16: Wallet Payment & Refund System](#day-16-wallet-payment--refund-system)
- [Day 17: Email Notification (Nodemailer + Queue)](#day-17-email-notification-nodemailer--queue)
- [Day 18: Security (Rate Limiting, CORS, Helmet)](#day-18-security-rate-limiting-cors-helmet)

### Giai đoạn 5: Testing & Deployment (Ngày 19-21)
- [Day 19: Integration Tests (Supertest)](#day-19-integration-tests-supertest)
- [Day 20: Performance Optimization](#day-20-performance-optimization)
- [Day 21: Deployment (Vercel + Railway + Supabase)](#day-21-deployment-vercel--railway--supabase)

---


Day 5: Setup NestJS
Commands khởi tạo project
Prisma Service code
Folder structure chuẩn
App Module config
Test kết nối database
Day 6: Authentication
Install dependencies (@nestjs/jwt, bcrypt...)
DTOs (RegisterDto, LoginDto)
Auth Service (register, login, hash password)
JWT Strategy
Auth Controller
Test với seed users
Day 7: RBAC
Roles Decorator code
Roles Guard implementation
CurrentUser Decorator
Usage examples (admin-only routes)
Test phân quyền
Day 8: Booking Service
CreateBookingDto
Booking Service với Prisma transaction
Calculate price từ PricingRule (logic phức tạp)
Generate booking code (6 ký tự)
Handle exclusion constraint error
Test booking flow
Day 9: BullMQ
Setup Bull Module với Redis
Producer (add job khi tạo booking)
Consumer/Processor (xử lý expired bookings)
Test job execution
Day 10: React Setup
Vite init commands
Install TanStack Query, Axios, React Router
Folder structure (features-based)
API client setup
Query client config
Day 11: Calendar
react-big-calendar setup
Resource view config (courts as resources)
Custom event rendering
Color coding theo status
Click handlers
Day 12: Customer Flow
Booking form với validation
Countdown timer (15 phút)
Payment redirect
Success/Error handling
Day 13: Staff Dashboard
Search booking by code
Check-in button
Thu tiền mặt logic
Timeline view cho staff
Day 14: Admin Dashboard
Revenue charts (Recharts)
Court utilization stats
Best-selling courts
Aggregation queries
Day 15: VNPay
VNPay URL generation
HMAC SHA512 signature
IPN callback handler
Payment verification
Update booking status
Day 16: Wallet
Pay with wallet transaction
Refund logic (cancel booking)
Wallet transaction history
Balance validation
Day 17: Email
Nodemailer config
Email templates (HTML)
Queue processor for emails
Send on booking confirmed/cancelled
Day 18: Security
Helmet middleware
CORS config
Rate limiting (@nestjs/throttler)
Input sanitization
Day 19: Integration Tests
Supertest setup
E2E test cho booking flow
Test double booking prevention
Test payment flow
Day 20: Performance
Database query optimization
EXPLAIN ANALYZE examples
Index strategy
Connection pooling
Caching với Redis
Day 21: Deployment
Vercel deployment (Frontend)
Railway deployment (Backend)
Supabase (PostgreSQL)
Upstash Redis
Environment variables
CI/CD basic
🎯 Acceptance Criteria
File phải:


Có đầy đủ 21 sections

Mỗi section có code examples chạy được

Có links tham khảo docs chính thức

Markdown format chuẩn (headings, code blocks, lists)

Tổng length > 5000 dòng (rất chi tiết)
📚 Output mong đợi
Sau khi tạo file, developer có thể:

✅ Scroll đọc từ đầu đến cuối hiểu toàn bộ roadmap
✅ Ctrl+F tìm kiếm nhanh (VD: "JWT Strategy")
✅ Copy code examples để chạy ngay
✅ Follow checklist để track tiến độ
✅ Click links docs để học sâu hơn



Cụ thể hơn:
ĐỌC BẢNG KẾ HOẠCH PHÁT TRIỂN DỰ ÁN SAU MÀ GEMINI ĐÃ TẠO CHO TÔI Báo cáo Kỹ thuật Chuyên sâu: Kiến trúc và Lộ trình Triển khai Hệ thống Đặt sân Cầu lông Hiệu suất cao (21 Ngày Thực chiến)1. Tổng quan về Thách thức Kỹ thuật và Phạm vi Đồ ánTrong bối cảnh giáo dục kỹ thuật phần mềm hiện đại, các đồ án tốt nghiệp (Capstone Projects) không còn dừng lại ở mức độ xây dựng các ứng dụng CRUD (Create, Read, Update, Delete) đơn giản. Yêu cầu ngày càng khắt khe về tính thực tiễn, khả năng mở rộng (scalability) và độ tin cậy (reliability) đòi hỏi sinh viên phải tiếp cận bài toán với tư duy của một kỹ sư hệ thống thực thụ. Đề tài "Xây dựng Web App đặt sân cầu lông" thoạt nhìn có vẻ đơn giản, nhưng ẩn chứa bên dưới là những thách thức kinh điển của khoa học máy tính: quản lý đồng thời (concurrency control), toàn vẹn dữ liệu trong không gian thời gian (temporal data integrity), và xử lý giao dịch phân tán (distributed transactions).1Báo cáo này cung cấp một lộ trình "thực chiến" kéo dài 21 ngày, được thiết kế để không chỉ hoàn thành một sản phẩm phần mềm chạy được, mà còn để chứng minh năng lực kỹ thuật chuyên sâu trước hội đồng bảo vệ. Lộ trình này sử dụng bộ công nghệ (stack) bao gồm Node.js (NestJS), React, và PostgreSQL. Việc lựa chọn stack này không phải ngẫu nhiên mà dựa trên các phân tích kỹ lưỡng về đặc thù của bài toán đặt chỗ (booking system). Đặc biệt, PostgreSQL đóng vai trò trung tâm với khả năng xử lý kiểu dữ liệu phạm vi (Range Types) và ràng buộc loại trừ (Exclusion Constraints), những tính năng mà các hệ quản trị cơ sở dữ liệu khác như MySQL hay MongoDB khó có thể so sánh trong ngữ cảnh này.31.1 Phân tích Lựa chọn Công nghệViệc lựa chọn công nghệ cho đồ án tốt nghiệp cần cân bằng giữa "tính hiện đại" (để gây ấn tượng) và "tính ổn định" (để đảm bảo hoàn thành đúng hạn).Backend: Tại sao là NestJS thay vì Express?Trong hệ sinh thái Node.js, Express từ lâu đã là tiêu chuẩn nhờ sự đơn giản và linh hoạt. Tuy nhiên, đối với một đồ án tốt nghiệp quy mô lớn, sự "tự do" của Express thường dẫn đến cấu trúc code lộn xộn (spaghetti code), khó bảo trì và thiếu các mẫu thiết kế (design patterns) chuẩn mực.5 NestJS, ngược lại, là một framework "có quan điểm" (opinionated), được xây dựng trên nền tảng TypeScript và lấy cảm hứng từ Angular.NestJS ép buộc lập trình viên tuân thủ kiến trúc Modular, sử dụng Dependency Injection (DI) và các Decorator. Điều này không chỉ giúp code sạch hơn mà còn giúp sinh viên ghi điểm mạnh về kiến trúc phần mềm trong mắt các giảng viên, những người thường đánh giá cao các mô hình phân lớp rõ ràng (Layered Architecture).6 Khả năng tích hợp sẵn của NestJS với các thư viện như TypeORM, Prisma, và BullMQ cũng giúp giảm thiểu thời gian cấu hình ("boilerplate"), cho phép tập trung vào logic nghiệp vụ phức tạp của việc đặt sân.8Database: PostgreSQL và Bài toán "Double Booking"Vấn đề lớn nhất của mọi hệ thống đặt chỗ là "Double Booking" (Đặt trùng). Trong môi trường cạnh tranh cao (ví dụ: giờ vàng 18:00 - 20:00), hai người dùng có thể cùng lúc gửi yêu cầu đặt một sân. Nếu hệ thống chỉ kiểm tra bằng logic ứng dụng thông thường (if start < end), điều kiện đua (Race Condition) sẽ xảy ra, dẫn đến hai bản ghi cùng được tạo ra cho một khung giờ.1 PostgreSQL giải quyết vấn đề này ở cấp độ thấp nhất - cấp độ lưu trữ - thông qua Exclusion Constraints, đảm bảo tính toàn vẹn dữ liệu tuyệt đối mà không cần khóa bảng (table locking) phức tạp.10Frontend: React và Thách thức Hiển thị LịchGiao diện đặt sân không chỉ là các ô input ngày tháng. Người dùng cần một cái nhìn trực quan về tình trạng các sân theo thời gian thực. React với cơ chế Virtual DOM và hệ sinh thái thư viện phong phú (như react-big-calendar, tanstack-query) cho phép xây dựng các giao diện phức tạp này với hiệu năng cao. Việc quản lý trạng thái bất đồng bộ (server state) bằng React Query giúp giao diện luôn đồng bộ với dữ liệu backend mà không cần reload trang, tạo trải nghiệm mượt mà.122. Giai đoạn 1: Thiết kế Kiến trúc và Cơ sở Dữ liệu (Ngày 1 - 4)Bốn ngày đầu tiên là giai đoạn quan trọng nhất. Một sai lầm trong thiết kế cơ sở dữ liệu (CSDL) ở giai đoạn này sẽ dẫn đến chi phí sửa sửa chữa khổng lồ ở các giai đoạn sau.Ngày 1: Mô hình hóa Dữ liệu và Kiểu dữ liệu tsrangeTrong các thiết kế CSDL ngây thơ, một lần đặt sân thường được lưu với hai cột riêng biệt: start_time và end_time. Cách tiếp cận này buộc lập trình viên phải viết các câu truy vấn SQL phức tạp để kiểm tra sự chồng lấn: (StartA <= EndB) AND (EndA >= StartB).1 Tuy nhiên, PostgreSQL cung cấp một giải pháp thanh lịch và mạnh mẽ hơn nhiều: tsrange (timestamp range).Kiểu dữ liệu tsrange gói gọn thời gian bắt đầu và kết thúc vào một thực thể toán học duy nhất. Điều này cho phép sử dụng các toán tử tập hợp như && (overlap - chồng lấn), @> (contains - chứa), và << (strictly left - hoàn toàn trước).2So sánh Chiến lược Lưu trữ:Đặc điểmHai cột (start, end)Một cột tsrangeTruy vấn chồng lấnPhức tạp, dễ sai sót logicĐơn giản: period && query_periodIndexB-Tree (kém hiệu quả cho khoảng)GiST (Tối ưu hóa cho dữ liệu không gian/thời gian)Ràng buộc toàn vẹnPhải dùng Trigger hoặc Application LogicNative Exclusion ConstraintKhả năng mở rộngGiảm khi dữ liệu lớnỔn định nhờ GiST IndexViệc sử dụng tsrange không chỉ là một lựa chọn kỹ thuật mà còn là minh chứng cho sự hiểu biết sâu sắc về hệ quản trị CSDL được chọn.4Ngày 2: Ràng buộc Loại trừ (Exclusion Constraints) và Chỉ mục GiSTĐể ngăn chặn việc đặt trùng sân, chúng ta không thể tin tưởng hoàn toàn vào code ở tầng ứng dụng (Node.js). Node.js xử lý bất đồng bộ, và trong khoảng thời gian vài mili-giây giữa việc "kiểm tra trống" và "ghi dữ liệu", một request khác có thể chen vào. Giải pháp triệt để là Ràng buộc Loại trừ (Exclusion Constraint).Cú pháp SQL để tạo bảng booking chuẩn mực:SQLCREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  court_id INTEGER NOT NULL REFERENCES courts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  period tsrange NOT NULL,
  status VARCHAR(20) DEFAULT 'CONFIRMED',
  EXCLUDE USING GIST (
    court_id WITH =,
    period WITH &&
  )
);
Phân tích câu lệnh EXCLUDE:USING GIST: Chỉ định sử dụng chỉ mục GiST (Generalized Search Tree). GiST là một cấu trúc cây cân bằng, cho phép tìm kiếm nhanh các kiểu dữ liệu hình học và khoảng thời gian.10court_id WITH =: Ràng buộc chỉ áp dụng khi court_id bằng nhau (cùng một sân). Để sử dụng toán tử = trong GiST index, ta cần extension btree_gist.11period WITH &&: Nếu hai khoảng thời gian có sự chồng lấn (overlap), DB sẽ từ chối lệnh INSERT và ném ra lỗi.Đây là cơ chế "Fail-Fast" ở tầng thấp nhất, đảm bảo tính nhất quán dữ liệu (Consistency trong ACID).16Ngày 3: Tích hợp Prisma ORM và Giải quyết Hạn chếMột thách thức thực tế khi sử dụng Prisma với PostgreSQL là Prisma Schema Language (PSL) hiện tại chưa hỗ trợ định nghĩa trực tiếp tsrange và Exclusion Constraints.18 Đây là lúc sinh viên cần thể hiện kỹ năng giải quyết vấn đề (problem-solving) thay vì bỏ cuộc và quay lại cách làm cũ.Chiến lược "Prisma + Raw SQL Migration":Định nghĩa Schema Giả lập: Trong file schema.prisma, ta có thể định nghĩa các trường startTime và endTime kiểu DateTime để Prisma Client có thể sinh ra type an toàn cho TypeScript. Tuy nhiên, ở tầng DB, chúng ta sẽ biến đổi chúng. Hoặc cách tốt hơn là sử dụng type Unsupported("tsrange") nếu chấp nhận hy sinh một phần tính năng auto-generated của Prisma Client.20Quy trình Migration Thủ công:Chạy lệnh: npx prisma migrate dev --create-only --name add_exclusion_constraint. Lệnh này tạo file SQL nhưng không chạy nó.21Mở file migration.sql vừa tạo và viết thủ công các lệnh SQL ALTER TABLE... ADD CONSTRAINT... EXCLUDE... như đã phân tích ở Ngày 2.23Chạy npx prisma migrate dev để áp dụng.Cách tiếp cận này kết hợp được lợi thế của ORM (type-safety, productivity) với sức mạnh của Raw SQL (performance, constraints), một điểm cộng lớn trong mắt hội đồng kỹ thuật.25Ngày 4: Thiết kế Schema Quan hệ Mở rộngNgoài bảng booking, hệ thống cần các thực thể khác để vận hành trơn tru:Users: Quản lý xác thực.Courts: Thông tin sân (tên, loại sân, giá mặc định).PricingRules: Đây là điểm nhấn cho đồ án. Thay vì fix cứng giá tiền, hãy tạo bảng pricing_rules cho phép chủ sân thiết lập giá linh động (Dynamic Pricing). Ví dụ:Giờ thường (09:00 - 17:00): 50k/h.Giờ vàng (17:00 - 21:00): 80k/h.Cuối tuần: Tăng 20%.Việc thiết kế bảng này đòi hỏi tư duy về logic nghiệp vụ, giúp đồ án thoát khỏi mác "bài tập về nhà".93. Giai đoạn 2: Phát triển Backend Core và Logic Nghiệp vụ (Ngày 5 - 9)Giai đoạn này tập trung vào việc hiện thực hóa các quy tắc nghiệp vụ thành mã nguồn (code) có thể chạy được, bảo trì được và kiểm thử được.Ngày 5: Kiến trúc Modular trong NestJSNestJS khuyến khích chia nhỏ ứng dụng thành các Module. Cấu trúc đề xuất cho dự án:src/
├── app.module.ts
├── common/ (Decorators, Guards, Filters)
├── modules/
│   ├── auth/ (Login, Register, JWT)
│   ├── users/
│   ├── courts/
│   ├── bookings/
│   └── payment/
└── prisma/ (Prisma Service)
Mỗi module hoạt động như một đơn vị độc lập, đóng gói logic của riêng nó. Việc sử dụng Dependency Injection (DI) giúp việc viết Unit Test sau này trở nên dễ dàng hơn (có thể mock các service).5Ngày 6: Xác thực và Phân quyền (RBAC)Hệ thống cần ít nhất 3 vai trò: CUSTOMER, STAFF, và ADMIN.Customer: Đặt sân, xem lịch sử, hủy đặt.Staff: Check-in cho khách, đặt hộ (qua điện thoại).Admin: Quản lý sân, giá, xem báo cáo doanh thu.Triển khai với NestJS Guards và Decorators:Thay vì viết logic if (user.role === 'ADMIN') lặp đi lặp lại trong mỗi Controller, ta xây dựng một Custom Decorator @Roles().TypeScript@Post()
@Roles(Role.ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
create(@Body() createCourtDto: CreateCourtDto) {
  return this.courtService.create(createCourtDto);
}
RolesGuard sẽ đọc metadata từ Decorator và so sánh với thông tin user trong JWT request. Đây là cách tiếp cận Declarative (khai báo), giúp code controller cực kỳ gọn gàng và dễ đọc.8Ngày 7: Xử lý Giao dịch (Transactions) và Isolation LevelsQuy trình đặt sân bao gồm nhiều bước: (1) Kiểm tra giá -> (2) Tạo booking -> (3) Tạo transaction thanh toán. Tất cả phải nằm trong một Database Transaction để đảm bảo tính nguyên tử (Atomicity).Tuy nhiên, vấn đề phát sinh khi hệ thống cần giới hạn số lượng booking của một người (ví dụ: tối đa 2 sân cùng lúc). Nếu sử dụng Isolation Level mặc định (Read Committed), hiện tượng "Phantom Read" có thể xảy ra: hai transaction song song cùng đếm thấy user đang có 1 booking, và cùng cho phép tạo thêm booking thứ 2 -> kết quả user có 3 booking, vi phạm quy tắc.28Giải pháp:Sử dụng IsolationLevel.Serializable cho các giao dịch nhạy cảm này.Hoặc sử dụng khóa bi quan SELECT... FOR UPDATE trên bảng người dùng để tuần tự hóa các yêu cầu từ cùng một người dùng.29Việc phân tích và áp dụng đúng Isolation Level chứng tỏ sự am hiểu sâu sắc về lý thuyết cơ sở dữ liệu.Ngày 8: Hàng đợi (Queue) và Quản lý Trạng thái "Pending"Khi người dùng nhấn "Đặt sân", hệ thống giữ chỗ trong vòng 10-15 phút để người dùng thanh toán. Nếu không thanh toán, chỗ phải được nhả ra.Không thể dùng setTimeout của Node.js vì nếu server restart, timer sẽ mất và sân bị khóa vĩnh viễn. Giải pháp chuẩn là sử dụng BullMQ (dựa trên Redis).31Luồng xử lý:User tạo booking -> Status: PENDING_PAYMENT.Server đẩy một Delayed Job vào BullMQ với thời gian trễ 15 phút.Nếu User thanh toán thành công -> Status: CONFIRMED -> Hủy Job trong Queue.Nếu hết 15 phút mà chưa thanh toán -> Worker của BullMQ chạy -> Cập nhật Status: EXPIRED -> Sân trống trở lại.33Redis đóng vai trò là bộ nhớ bền vững cho các tác vụ hẹn giờ này, đảm bảo độ tin cậy của hệ thống ngay cả khi ứng dụng bị crash.Ngày 9: Validation và Error HandlingSử dụng class-validator để kiểm tra dữ liệu đầu vào (DTO). Đặc biệt quan trọng là validate logic thời gian: endTime phải sau startTime, và thời lượng phải là bội số của 30 phút hoặc 60 phút tùy nghiệp vụ sân.9Cần xây dựng một GlobalExceptionFilter để bắt các lỗi từ tầng Database (như lỗi vi phạm Exclusion Constraint code 23P01) và chuyển đổi chúng thành thông báo lỗi thân thiện cho người dùng (ví dụ: "Sân này vừa có người đặt, vui lòng chọn giờ khác") thay vì để lộ lỗi 500 Internal Server Error.164. Giai đoạn 3: Frontend và Trải nghiệm Người dùng (Ngày 10 - 14)Giao diện là nơi người dùng tương tác trực tiếp. Đối với hệ thống đặt sân, trải nghiệm lịch (Calendar) là yếu tố sống còn.Ngày 10: Khởi tạo React với Vite và TanStack QuerySử dụng Vite để có tốc độ build nhanh. Kiến trúc thư mục nên chia theo Features (src/features/booking, src/features/auth) thay vì chia theo loại file (components, hooks).TanStack Query (React Query) là công cụ không thể thiếu. Nó quản lý Server State (dữ liệu từ API). Tính năng quan trọng nhất cần tận dụng là Automatic Background Refetching. Khi một người dùng đặt sân thành công, dữ liệu trên máy người dùng khác cần được cập nhật. Dù không dùng WebSockets, việc cấu hình refetchOnWindowFocus hoặc polling định kỳ 30s của React Query cũng giúp giảm thiểu xung đột.36Ngày 11: Tùy biến react-big-calendarThư viện react-big-calendar rất phổ biến nhưng mặc định chỉ hỗ trợ các view theo Ngày/Tuần/Tháng kiểu truyền thống. Mô hình sân cầu lông cần Resource View: Trục dọc là Thời gian, Trục ngang là Các Sân (Sân 1, Sân 2...).Vì tính năng này thường chỉ có ở các thư viện trả phí (như FullCalendar Premium), sinh viên cần tự xây dựng Custom View trong react-big-calendar.37Tạo component ResourceView nhận props là danh sách events và resources.Sử dụng CSS Grid để chia cột cho các sân.Logic render events: Tính toán vị trí top và height dựa trên thời gian bắt đầu và thời lượng (ví dụ: 1 phút = 2px chiều cao).39Ngày 12: CSS Grid và Logic Hiển thị TimelineĐể hiển thị lịch trực quan:Sử dụng CSS Grid cho bố cục tổng thể.Các ô giờ (Time slots) cần có khả năng tương tác (Click, Drag).Hiển thị trạng thái bằng màu sắc:Xám: Đã qua / Không khả dụng.Đỏ: Đã được đặt (Booked).Vàng: Đang giữ chỗ (Pending).Xanh: Booking của tôi.Xử lý Responsive: Trên Mobile, Resource View ngang sẽ bị vỡ. Cần chuyển đổi sang dạng Dropdown chọn sân + Lịch dọc.41Ngày 13: Xử lý Xung đột ở Frontend (Optimistic Updates)Khi người dùng click "Đặt", frontend có thể áp dụng Optimistic Update: Hiển thị ngay lập tức ô đó là "Đang đặt" (màu vàng) trước khi server phản hồi. Điều này làm tăng độ mượt (perceived performance). Tuy nhiên, phải xử lý trường hợp API trả về lỗi (409 Conflict) thì phải rollback giao diện lại trạng thái cũ và hiện thông báo lỗi.13Ngày 14: Dashboard Người dùng và AdminXây dựng trang quản lý cá nhân:Danh sách booking sắp tới.Lịch sử booking.Nút hủy (chỉ hiện nếu thời gian > 24h trước giờ đá).Admin Dashboard:Thống kê doanh thu theo ngày/tháng (Sử dụng các thư viện biểu đồ như Recharts).Quản lý danh sách sân (Thêm/Sửa/Xóa).5. Giai đoạn 4: Tích hợp Thanh toán và Bảo mật (Ngày 15 - 18)Đồ án sẽ thiếu tính thực tế nếu không có thanh toán online. Tại Việt Nam, VNPay và MoMo là hai cổng phổ biến nhất.Ngày 15: Tích hợp VNPay/MoMo (Sandbox)Quy trình thanh toán chuẩn (Redirect Flow):Backend: Tạo URL thanh toán. Cần ký dữ liệu (checksum) bằng thuật toán HMAC-SHA512 với SecretKey do cổng thanh toán cung cấp để đảm bảo dữ liệu không bị sửa đổi trên đường truyền.43Frontend: Redirect user sang trang của VNPay/MoMo.User: Nhập thẻ/quét QR và thanh toán.Cổng thanh toán: Redirect user về ReturnURL của web app VÀ gọi API ngầm (IPN - Instant Payment Notification) tới server.Lưu ý Bảo mật Cốt tử:Không bao giờ tin tưởng dữ liệu từ ReturnURL (frontend) để cập nhật trạng thái "Đã thanh toán" vì user có thể giả mạo URL này.Chỉ cập nhật trạng thái đơn hàng khi nhận được IPN từ cổng thanh toán và xác thực chữ ký (Signature) thành công.45Ngày 16: Xử lý Idempotency và Race Conditions trong Thanh toánMạng internet không ổn định có thể khiến cổng thanh toán gửi IPN nhiều lần cho cùng một giao dịch (Retry mechanism). Backend phải xử lý tính Idempotency (Tính lũy đẳng): Nếu nhận được IPN cho một giao dịch đã xử lý rồi, hệ thống phải trả về thành công ngay lập tức mà không cộng tiền hay cập nhật trạng thái lần nữa. Điều này ngăn chặn lỗi logic nghiêm trọng trong hạch toán doanh thu.46Ngày 17: Thông báo Email và Hệ thống Sự kiện (Event-Driven)Sử dụng Nodemailer để gửi email xác nhận. Tuy nhiên, việc gửi email tốn thời gian (1-2s). Không nên để user phải chờ request HTTP quay trơ trong khi server đang gửi mail.Giải pháp: Sử dụng Event Emitter trong NestJS.Khi thanh toán thành công -> this.eventEmitter.emit('booking.confirmed', booking).Listener lắng nghe sự kiện này và thực hiện gửi email trong background (hoặc đẩy vào Queue riêng).47Ngày 18: Bảo mật Ứng dụngRate Limiting: Sử dụng @nestjs/throttler để ngăn chặn spam API (ví dụ: spam tạo booking để giữ chỗ ảo).Helmet: Bảo vệ các HTTP header.CORS: Cấu hình chặt chẽ chỉ cho phép domain frontend gọi API.6. Giai đoạn 5: Triển khai, Kiểm thử và Tối ưu hóa (Ngày 19 - 21)Sản phẩm cuối cùng cần được đưa lên môi trường internet (Production) để demo.Ngày 19: Kiểm thử Tích hợp (Integration Testing)Viết Unit Test cho từng hàm là tốt, nhưng với đồ án này, Integration Test quan trọng hơn. Sử dụng Supertest để giả lập các request HTTP gửi vào API.48Kịch bản test bắt buộc (The "Overlap" Test):Tạo Booking A (10:00 - 11:00).Gửi Request tạo Booking B (10:30 - 11:30).Assert: API phải trả về HTTP 409 (Conflict).Kiểm tra DB: Chỉ có 1 bản ghi tồn tại.Đây là bằng chứng thép cho thấy hệ thống hoạt động đúng thiết kế.Ngày 20: Tối ưu hóa Hiệu năng DatabaseIndexing: Kiểm tra lại các index. Ngoài GiST index cho period, cần thêm B-Tree index cho user_id, status để tăng tốc độ trang lịch sử booking và dashboard.10Query Analysis: Sử dụng EXPLAIN ANALYZE để xem Postgres thực thi query như thế nào. Đảm bảo nó đang sử dụng Index Scan thay vì Seq Scan (quét toàn bộ bảng).50Connection Pooling: Node.js mở rất nhiều kết nối tới DB. Trên môi trường serverless hoặc cloud giá rẻ, số lượng kết nối bị giới hạn (ví dụ: 100). Cần sử dụng PgBouncer (hoặc Transaction Pooler của Supabase) để chia sẻ kết nối, tránh lỗi "Too many clients" khi tải cao.51Ngày 21: Chiến lược Deployment Miễn phí (Zero Cost)Cho sinh viên không có kinh phí, combo deployment tối ưu hiện nay (2025):Thành phầnDịch vụGói miễn phí (Free Tier)Lưu ý quan trọngDatabaseSupabase500MB StorageSử dụng port 6543 (Transaction Pooler) trong connection string.51BackendRailway / RenderRailway ($5 credit/tháng) hoặc Render (Free Instance)Render sẽ "ngủ" sau 15p không hoạt động (Cold start). Railway ổn định hơn cho demo.54FrontendVercelUnlimited (Fair use)Tối ưu tuyệt đối cho React/Next.js.RedisUpstashFree tierDùng cho BullMQ Queue. Không cần cài Redis local.33Quy trình CI/CD cơ bản: Kết nối GitHub repo với Vercel và Railway. Mỗi lần push code lên nhánh main, hệ thống tự động build và deploy lại. Điều này giúp quá trình sửa lỗi nhanh chóng trước giờ G.Kết luậnLộ trình 21 ngày này không chỉ là một danh sách các việc cần làm, mà là một bản thiết kế kiến trúc hoàn chỉnh cho một hệ thống phần mềm có độ phức tạp cao. Bằng cách giải quyết triệt để các vấn đề về đồng bộ dữ liệu (Concurrency) thông qua sức mạnh của PostgreSQL và xây dựng một kiến trúc backend chuẩn mực với NestJS, sinh viên sẽ có trong tay một đồ án tốt nghiệp vượt trội. Sản phẩm này không chỉ đáp ứng yêu cầu học thuật mà còn chứng minh năng lực sẵn sàng cho thị trường lao động chuyên nghiệp, nơi các vấn đề về Race Condition và Scalability là chuyện thường ngày.Sự khác biệt giữa một đồ án điểm trung bình và điểm xuất sắc nằm ở chi tiết: cách xử lý một transaction thất bại, cách hiển thị một ô lịch đang chờ, và cách bảo vệ dữ liệu toàn vẹn trong mọi tình huống. Bản báo cáo này cung cấp chìa khóa để mở cánh cửa đó.