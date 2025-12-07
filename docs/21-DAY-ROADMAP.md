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

