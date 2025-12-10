# 🎯 Kế Hoạch Hoàn Thành Dự Án Smart Badminton Booking

**Ngày tạo**: 2025-12-10  
**Trạng thái hiện tại**: 60% hoàn thành (Day 11/21)  
**Thời gian còn lại**: 10 ngày  
**Mục tiêu**: Hoàn thành 100% và deploy production

---

## 📊 Tổng Quan Tiến Độ

### ✅ Đã Hoàn Thành (60%)

**Phase 1-2: Core Infrastructure (100%)**
- ✅ Database Schema (Prisma + PostgreSQL)
- ✅ Authentication & RBAC (JWT + Passport)
- ✅ Booking System với auto-timeout (BullMQ)
- ✅ Wallet & Transaction Management
- ✅ Courts CRUD với availability checking
- ✅ Payment Module (Wallet-based)
- ✅ 34 Unit Tests (100% passing)

**Phase 3: Frontend Basic (70%)**
- ✅ Calendar UI Component
- ✅ Authentication pages (Login/Register)
- ✅ Basic routing setup
- 🔄 Admin Dashboard (chưa hoàn chỉnh)
- 🔄 Booking history UI (chưa có)
- 🔄 User profile management (chưa đầy đủ)

### 🔄 Cần Hoàn Thành (40%)

**Phase 4: Payment & Notifications (0%)**
- ❌ VNPay payment gateway integration
- ❌ MoMo payment gateway integration
- ❌ Email notifications (Nodemailer)
- ❌ SMS notifications (optional)

**Phase 5: Admin & Staff Features (30%)**
- 🔄 Admin Dashboard (charts, analytics)
- ❌ Staff check-in interface
- ❌ Court management UI
- ❌ User management UI
- ❌ Revenue reports

**Phase 6: Security & Testing (0%)**
- ❌ Rate limiting (@nestjs/throttler)
- ❌ CORS configuration
- ❌ Helmet security headers
- ❌ Integration tests (E2E)
- ❌ Performance optimization

**Phase 7: Deployment (0%)**
- ❌ Production environment setup
- ❌ CI/CD pipeline
- ❌ Database migration strategy
- ❌ Monitoring & logging

---

## 📅 Kế Hoạch Chi Tiết 10 Ngày

### **Day 12: Customer Booking Flow & User Dashboard** (Ưu tiên: CAO)

**Backend Tasks:**
- ✅ API đã sẵn sàng (không cần thêm)

**Frontend Tasks:**
- [ ] **Booking Confirmation Modal** (2-3h)
  - Component: `BookingConfirmationModal.tsx`
  - Hiển thị chi tiết: Court, Time, Price
  - Countdown timer 15 phút
  - Payment method selection (Wallet/VNPay/MoMo)
  - File: `frontend/src/features/booking/components/BookingConfirmationModal.tsx`

- [ ] **My Bookings Page** (3-4h)
  - Component: `MyBookingsPage.tsx`
  - List bookings với status badges
  - Filter by status (PENDING/CONFIRMED/EXPIRED)
  - Cancel booking button (với điều kiện)
  - Real-time updates (TanStack Query polling)
  - File: `frontend/src/features/booking/pages/MyBookingsPage.tsx`

- [ ] **User Dashboard** (2-3h)
  - Component: `UserDashboard.tsx`
  - Hiển thị upcoming bookings
  - Wallet balance widget
  - Quick stats (total bookings, spent)
  - File: `frontend/src/features/dashboard/pages/UserDashboard.tsx`

**Deliverables:**
- ✅ 3 new pages/components
- ✅ Complete customer flow
- ✅ Routing updates

**Testing:**
- [ ] Manual test: Create booking → View in My Bookings → Cancel
- [ ] Test countdown timer hiển thị đúng
- [ ] Test real-time status updates

---

### **Day 13: Staff Check-in Interface** (Ưu tiên: CAO)

**Backend Tasks:**
- [ ] **Check-in API** (1-2h)
  - Endpoint: `POST /api/bookings/:id/check-in`
  - Validate: Booking is CONFIRMED
  - Validate: Staff role required
  - Update: `checkedInAt`, `checkedInByStaffId`, `status = CHECKED_IN`
  - File: `src/modules/bookings/bookings.controller.ts`
  - File: `src/modules/bookings/bookings.service.ts`

- [ ] **Search Booking by Code API** (1h)
  - Endpoint: `GET /api/bookings/search?code=ABC123`
  - Return booking details
  - File: `src/modules/bookings/bookings.controller.ts`

**Frontend Tasks:**
- [ ] **Staff Dashboard** (3-4h)
  - Component: `StaffDashboard.tsx`
  - Search booking by code input
  - Display booking details
  - Check-in button (large, prominent)
  - Cash payment button (nếu PENDING_PAYMENT)
  - File: `frontend/src/features/staff/pages/StaffDashboard.tsx`

- [ ] **Timeline View** (2-3h)
  - Component: `StaffTimelineView.tsx`
  - Display today's bookings by court
  - Color-coded by status
  - Quick check-in from timeline
  - File: `frontend/src/features/staff/components/StaffTimelineView.tsx`

**Deliverables:**
- ✅ 2 new API endpoints
- ✅ Staff interface complete
- ✅ Check-in workflow functional

**Testing:**
- [ ] Test search booking by code
- [ ] Test check-in flow
- [ ] Test cash payment flow
- [ ] Test RBAC (only STAFF/ADMIN can access)

---

### **Day 14: Admin Dashboard & Analytics** (Ưu tiên: CAO)

**Backend Tasks:**
- [ ] **Analytics API** (2-3h)
  - Endpoint: `GET /api/stats/overview`
    - Total revenue (today, this week, this month)
    - Total bookings count
    - Court utilization rate
    - Top courts by revenue
  - Endpoint: `GET /api/stats/revenue-chart?period=7d|30d|90d`
    - Daily revenue data for charts
  - File: `src/modules/stats/stats.controller.ts`
  - File: `src/modules/stats/stats.service.ts`

**Frontend Tasks:**
- [ ] **Admin Dashboard Overview** (4-5h)
  - Component: `AdminDashboard.tsx`
  - Stats cards (Revenue, Bookings, Users, Courts)
  - Revenue chart (Recharts library)
  - Top courts table
  - Recent bookings table
  - File: `frontend/src/features/admin/pages/AdminDashboard.tsx`

- [ ] **Court Management UI** (3-4h)
  - Component: `CourtManagement.tsx`
  - CRUD operations (Create, Edit, Delete courts)
  - Toggle active/inactive
  - Pricing rules management
  - File: `frontend/src/features/admin/pages/CourtManagement.tsx`

- [ ] **User Management UI** (2-3h)
  - Component: `UserManagement.tsx`
  - List all users
  - Role assignment (promote to STAFF/ADMIN)
  - Deactivate/activate users
  - File: `frontend/src/features/admin/pages/UserManagement.tsx`

**Dependencies:**
```bash
npm install recharts date-fns
```

**Deliverables:**
- ✅ 2 analytics endpoints
- ✅ 3 admin pages
- ✅ Complete admin interface

**Testing:**
- [ ] Test analytics data accuracy
- [ ] Test CRUD operations for courts
- [ ] Test user role assignment
- [ ] Test RBAC (only ADMIN can access)

---

### **Day 15: VNPay Payment Gateway Integration** (Ưu tiên: TRUNG BÌNH)

**Backend Tasks:**
- [ ] **VNPay Service** (3-4h)
  - Service: `VNPayService`
  - Method: `createPaymentUrl(bookingId, amount, returnUrl)`
  - Method: `verifyIPN(queryParams)` - Instant Payment Notification
  - HMAC SHA512 signature generation
  - File: `src/modules/payments/services/vnpay.service.ts`

- [ ] **VNPay Controller Endpoints** (2h)
  - Endpoint: `POST /api/payments/vnpay/create`
    - Generate payment URL
    - Return URL to frontend
  - Endpoint: `GET /api/payments/vnpay/callback`
    - Handle VNPay return URL
    - Verify payment
    - Update booking status
  - Endpoint: `POST /api/payments/vnpay/ipn`
    - Handle VNPay IPN
    - Async payment confirmation
  - File: `src/modules/payments/controllers/vnpay.controller.ts`

**Environment Variables:**
```env
VNPAY_TMN_CODE=your_terminal_code
VNPAY_HASH_SECRET=your_secret_key
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:5173/payment/vnpay/callback
```

**Frontend Tasks:**
- [ ] **Payment Selection UI** (2h)
  - Update `BookingConfirmationModal` to support VNPay
  - Radio buttons: Wallet / VNPay / Cash
  - Redirect to VNPay URL on selection

- [ ] **Payment Callback Page** (2h)
  - Component: `VNPayCallbackPage.tsx`
  - Parse query parameters
  - Display success/failure message
  - Redirect to bookings page
  - File: `frontend/src/features/payment/pages/VNPayCallbackPage.tsx`

**Deliverables:**
- ✅ VNPay service complete
- ✅ 3 endpoints (create, callback, IPN)
- ✅ Frontend payment flow

**Testing:**
- [ ] Test payment URL generation
- [ ] Test VNPay sandbox payment
- [ ] Test callback handling
- [ ] Test booking status update after payment

**Resources:**
- [VNPay API Documentation](https://sandbox.vnpayment.vn/apis/docs/huong-dan-tich-hop/)

---

### **Day 16: Wallet Deposit & Transaction History** (Ưu tiên: CAO)

**Backend Tasks:**
- ✅ Wallet APIs đã sẵn sàng (deposit, transactions)
- [ ] **Add Admin Deposit UI Endpoint** (optional, 1h)
  - Endpoint: `POST /api/wallet/admin-deposit`
  - Admin can deposit for any user
  - File: `src/modules/wallet/wallet.controller.ts`

**Frontend Tasks:**
- [ ] **Wallet Page** (3-4h)
  - Component: `WalletPage.tsx`
  - Display current balance
  - Deposit button → modal
  - Transaction history table
  - Pagination for transactions
  - File: `frontend/src/features/wallet/pages/WalletPage.tsx`

- [ ] **Deposit Modal** (2h)
  - Component: `DepositModal.tsx`
  - Input amount (min: 10,000 VND)
  - Payment method selection (VNPay/MoMo)
  - Redirect to gateway
  - File: `frontend/src/features/wallet/components/DepositModal.tsx`

- [ ] **Transaction History Component** (2h)
  - Component: `TransactionHistory.tsx`
  - Table with columns: Date, Type, Amount, Balance Before/After
  - Filter by type (DEPOSIT/PAYMENT/REFUND)
  - Export to CSV (optional)
  - File: `frontend/src/features/wallet/components/TransactionHistory.tsx`

**Deliverables:**
- ✅ Wallet management UI
- ✅ Deposit flow via VNPay
- ✅ Transaction history display

**Testing:**
- [ ] Test deposit flow
- [ ] Test transaction history display
- [ ] Test balance updates in real-time

---

### **Day 17: Email Notifications** (Ưu tiên: TRUNG BÌNH)

**Backend Tasks:**
- [ ] **Email Service Setup** (2h)
  - Install: `npm install nodemailer @nestjs-modules/mailer handlebars`
  - Service: `EmailService`
  - Configure SMTP (Gmail/SendGrid)
  - File: `src/modules/email/email.service.ts`
  - File: `src/modules/email/email.module.ts`

- [ ] **Email Templates** (2-3h)
  - Template: `booking-confirmation.hbs`
    - Booking code, court, date, time, price
  - Template: `booking-cancelled.hbs`
  - Template: `booking-reminder.hbs` (24h before)
  - Template: `payment-success.hbs`
  - Directory: `src/modules/email/templates/`

- [ ] **Email Queue Processor** (2h)
  - Queue: `EMAIL_QUEUE`
  - Processor: `EmailProcessor`
  - Jobs: `sendBookingConfirmation`, `sendCancellation`, etc.
  - File: `src/modules/email/processors/email.processor.ts`

- [ ] **Integration with Booking Flow** (1-2h)
  - After booking confirmed → queue email
  - After booking cancelled → queue email
  - After payment success → queue email
  - Update: `src/modules/bookings/bookings.service.ts`
  - Update: `src/modules/payments/payments.service.ts`

**Environment Variables:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=Smart Badminton <noreply@smartbadminton.com>
```

**Deliverables:**
- ✅ Email service configured
- ✅ 4 email templates
- ✅ Queue processor for emails
- ✅ Integration with booking/payment flows

**Testing:**
- [ ] Test booking confirmation email
- [ ] Test cancellation email
- [ ] Test payment success email
- [ ] Verify email templates rendering correctly

---

### **Day 18: Security Hardening** (Ưu tiên: CAO)

**Backend Tasks:**
- [ ] **Rate Limiting** (1h)
  - Install: `npm install @nestjs/throttler`
  - Configure: 10 requests per minute per IP
  - Apply to auth endpoints (prevent brute force)
  - File: `src/app.module.ts`

- [ ] **CORS Configuration** (30min)
  - Whitelist: `http://localhost:5173`, production domain
  - Allow credentials: true
  - File: `src/main.ts`

- [ ] **Helmet Security Headers** (30min)
  - Install: `npm install helmet`
  - Enable CSP, XSS protection, etc.
  - File: `src/main.ts`

- [ ] **Input Validation** (1-2h)
  - Review all DTOs
  - Add @IsNotEmpty, @IsEmail, @Min, @Max
  - Sanitize user inputs
  - Files: `src/modules/*/dto/*.ts`

- [ ] **SQL Injection Prevention** (1h)
  - Audit Prisma queries
  - Ensure parameterized queries
  - No raw SQL with user input

- [ ] **Environment Variables Validation** (1h)
  - Use @nestjs/config validation schema
  - Fail fast if required vars missing
  - File: `src/config/env.validation.ts`

**Deliverables:**
- ✅ Rate limiting enabled
- ✅ CORS configured
- ✅ Helmet enabled
- ✅ Input validation improved
- ✅ Security audit complete

**Testing:**
- [ ] Test rate limiting (exceed 10 requests)
- [ ] Test CORS from different origins
- [ ] Test invalid inputs rejected
- [ ] Run security audit tools

---

### **Day 19: Integration Testing (E2E)** (Ưu tiên: CAO)

**Backend Tasks:**
- [ ] **E2E Test Setup** (2h)
  - Configure: `test/jest-e2e.json`
  - Test database setup (SQLite or test PostgreSQL)
  - Supertest configuration
  - File: `test/setup.ts`

- [ ] **Authentication E2E Tests** (2h)
  - Test: Register → Login → Get Profile
  - Test: Invalid credentials
  - Test: JWT token expiration
  - File: `test/auth.e2e-spec.ts`

- [ ] **Booking Flow E2E Tests** (3-4h)
  - Test: Full booking flow (browse → book → pay → confirm)
  - Test: Timeout after 15 minutes
  - Test: Double booking prevention
  - Test: Cancel booking with refund
  - File: `test/booking.e2e-spec.ts`

- [ ] **Payment E2E Tests** (2h)
  - Test: Wallet payment
  - Test: Insufficient balance
  - Test: Refund flow
  - File: `test/payment.e2e-spec.ts`

**Frontend Tasks:**
- [ ] **Cypress Setup** (optional, 2h)
  - Install: `npm install -D cypress`
  - Configure: `cypress.config.ts`
  - First test: Login flow

**Deliverables:**
- ✅ E2E test suite (10+ tests)
- ✅ CI pipeline ready tests
- ✅ Test coverage report

**Testing:**
- [ ] Run: `npm run test:e2e`
- [ ] All E2E tests passing
- [ ] Coverage report generated

---

### **Day 20: Performance Optimization** (Ưu tiên: TRUNG BÌNH)

**Backend Tasks:**
- [ ] **Database Indexing** (2h)
  - Add indexes on: `Booking(status)`, `Booking(expiresAt)`, `Booking(courtId, startTime)`
  - Add indexes on: `User(email)`, `Court(isActive)`
  - Run EXPLAIN ANALYZE on slow queries
  - File: Prisma migration

- [ ] **Query Optimization** (2-3h)
  - Use Prisma `select` to fetch only needed fields
  - Batch queries với `findMany`
  - Eager loading relationships
  - Review N+1 query problems
  - Files: All service files

- [ ] **Caching với Redis** (2-3h)
  - Cache: Court list (TTL: 5 minutes)
  - Cache: Available slots (TTL: 1 minute)
  - Cache: User profile (TTL: 10 minutes)
  - Service: `CacheService`
  - File: `src/modules/cache/cache.service.ts`

- [ ] **Response Compression** (30min)
  - Install: `npm install compression`
  - Enable gzip compression
  - File: `src/main.ts`

**Frontend Tasks:**
- [ ] **Code Splitting** (1h)
  - Lazy load routes
  - React.lazy() for heavy components
  - File: `frontend/src/router/index.tsx`

- [ ] **Image Optimization** (1h)
  - Compress images
  - Use WebP format
  - Lazy load images

- [ ] **Bundle Size Optimization** (1h)
  - Analyze bundle: `npm run build -- --analyze`
  - Remove unused dependencies
  - Tree shaking

**Deliverables:**
- ✅ Database indexes added
- ✅ Caching implemented
- ✅ Response time < 200ms
- ✅ Bundle size reduced

**Testing:**
- [ ] Load test với Apache Bench: `ab -n 1000 -c 10 http://localhost:3000/api/courts`
- [ ] Measure response times
- [ ] Check cache hit rate

---

### **Day 21: Production Deployment** (Ưu tiên: CAO)

**Pre-deployment Checklist:**
- [ ] All tests passing (unit + E2E)
- [ ] Security audit complete
- [ ] Environment variables documented
- [ ] Database migrations ready
- [ ] Error logging configured

**Backend Deployment (Railway/Render/Heroku):**
- [ ] **Database Setup** (1h)
  - Provision PostgreSQL on Supabase/Railway
  - Run migrations: `npx prisma migrate deploy`
  - Seed production data

- [ ] **Redis Setup** (30min)
  - Provision Redis on Upstash/Railway
  - Update connection string

- [ ] **Backend Deployment** (2h)
  - Platform: Railway or Render
  - Configure environment variables
  - Deploy: `git push railway main`
  - Health check endpoint: `GET /api/health`

**Frontend Deployment (Vercel/Netlify):**
- [ ] **Build Configuration** (30min)
  - Update API_URL to production backend
  - Build: `npm run build`
  - Test production build locally

- [ ] **Vercel Deployment** (1h)
  - Connect GitHub repo
  - Configure build command: `npm run build`
  - Configure environment variables
  - Deploy: Auto-deploy on push

**CI/CD Setup (GitHub Actions):**
- [ ] **CI Pipeline** (2h)
  - File: `.github/workflows/ci.yml`
  - Jobs: Lint → Test → Build
  - Run on PR and push to main

- [ ] **CD Pipeline** (1h)
  - File: `.github/workflows/deploy.yml`
  - Auto-deploy to production on merge to main

**Monitoring & Logging:**
- [ ] **Error Tracking** (1h)
  - Setup Sentry.io (free tier)
  - Capture backend errors
  - Capture frontend errors

- [ ] **Logging** (1h)
  - Winston logger configuration
  - Log levels: error, warn, info
  - Log to file and console

**Deliverables:**
- ✅ Backend deployed and accessible
- ✅ Frontend deployed and accessible
- ✅ Database migrated
- ✅ CI/CD pipeline active
- ✅ Monitoring configured

**Final Testing:**
- [ ] Test all features on production
- [ ] Test payment gateways (VNPay sandbox)
- [ ] Load test production
- [ ] Security scan (OWASP ZAP)

---

## 📦 Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Frontend (Vercel)               │
│   https://smart-badminton.vercel.app    │
│   - React 18 + Vite                     │
│   - Auto-deploy from GitHub             │
│   - CDN caching                         │
└─────────────┬───────────────────────────┘
              │ API Calls (HTTPS)
              ↓
┌─────────────────────────────────────────┐
│      Backend (Railway/Render)           │
│   https://api.smart-badminton.com       │
│   - NestJS server                       │
│   - Auto-scaling                        │
│   - Health checks                       │
└─────┬───────────────────┬───────────────┘
      │                   │
      ↓                   ↓
┌─────────────┐    ┌─────────────┐
│ PostgreSQL  │    │   Redis     │
│  (Supabase) │    │  (Upstash)  │
│  - Backups  │    │  - Queue    │
│  - Replicas │    │  - Cache    │
└─────────────┘    └─────────────┘
```

---

## 🎯 Success Metrics

**Functionality (100%):**
- ✅ All features working as designed
- ✅ No critical bugs
- ✅ All user flows tested

**Performance:**
- ✅ API response time < 200ms (p95)
- ✅ Frontend load time < 2s
- ✅ Zero downtime deployments

**Security:**
- ✅ No high/critical vulnerabilities
- ✅ OWASP Top 10 addressed
- ✅ Rate limiting active
- ✅ HTTPS enabled

**Code Quality:**
- ✅ All tests passing
- ✅ Test coverage > 80%
- ✅ No linting errors
- ✅ TypeScript strict mode

**Documentation:**
- ✅ API documentation (Swagger)
- ✅ README with setup instructions
- ✅ Environment variables documented
- ✅ Deployment guide

---

## 🚨 Rủi Ro & Mitigation

| Rủi Ro | Mức độ | Mitigation |
|--------|---------|------------|
| VNPay sandbox không hoạt động | Trung bình | Fallback to wallet only |
| Email service bị block | Thấp | Use SendGrid (reliable) |
| Database migration fails | Cao | Backup before migration |
| Performance issues | Trung bình | Load testing before launch |
| Security vulnerabilities | Cao | Security audit on Day 18 |

---

## 📞 Support & Resources

**Documentation:**
- NestJS: https://docs.nestjs.com
- Prisma: https://www.prisma.io/docs
- React Query: https://tanstack.com/query
- VNPay: https://sandbox.vnpayment.vn/apis/docs

**Community:**
- NestJS Discord: https://discord.gg/nestjs
- Stack Overflow: Tag với #nestjs, #prisma

---

## ✅ Final Checklist

Trước khi handoff:

**Code:**
- [ ] All code committed
- [ ] No commented-out code
- [ ] No console.log in production
- [ ] Environment variables in .env.example

**Documentation:**
- [ ] README updated
- [ ] API documentation complete
- [ ] Deployment guide written
- [ ] Known issues documented

**Testing:**
- [ ] All unit tests passing
- [ ] All E2E tests passing
- [ ] Manual testing complete
- [ ] Security testing done

**Deployment:**
- [ ] Production deployed
- [ ] SSL certificate active
- [ ] Monitoring configured
- [ ] Backups enabled

**Handoff:**
- [ ] Demo video recorded
- [ ] Admin credentials provided
- [ ] Deployment access shared
- [ ] Support plan defined

---

**Estimated Total Time:** 80-90 hours (10 days × 8-9 hours/day)

**Recommendation:** Prioritize Days 12-14 first (user-facing features), then Days 18-21 (security & deployment). Days 15-17 can be done in parallel or postponed if time-constrained.

🎉 **Good luck completing the project!**
