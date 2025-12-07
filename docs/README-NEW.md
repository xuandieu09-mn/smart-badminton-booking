# 🏸 Smart Badminton Booking System

A modern badminton court booking system built with **NestJS**, **Prisma**, and **BullMQ**.

## 🚀 Features

- ✅ **User Authentication** (JWT, Role-based: Customer, Staff, Admin)
- ✅ **Court Management** (CRUD, Availability, Pricing Rules)
- ✅ **Booking System** with multiple payment methods
- ✅ **Auto-expiration** (15-minute timeout for unpaid bookings using BullMQ)
- ✅ **Wallet System** (Deposit, Refund, Payment)
- ✅ **Conflict Prevention** (No double booking)
- ✅ **Guest Booking** (For walk-in customers)

## 🛠️ Tech Stack

- **Backend:** NestJS 11
- **Database:** PostgreSQL + Prisma ORM
- **Queue:** BullMQ (Redis)
- **Authentication:** JWT + Passport
- **Validation:** class-validator
- **Testing:** Jest

## 📋 Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+ (for BullMQ)
- Docker (optional, recommended for Redis)

## ⚡ Quick Start

### 1. Clone repository

```bash
git clone <your-repo-url>
cd smart-badminton-booking
```

### 2. Install dependencies

```bash
npm install
```

### 3. Setup Redis (Docker)

```bash
docker run -d -p 6379:6379 --name redis redis:alpine
```

### 4. Configure environment

```bash
copy .env.example .env
```

Edit `.env`:

```env
DATABASE_URL="postgresql://postgres:123456@localhost:5432/badminton_booking?schema=public"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# Redis for BullMQ
REDIS_HOST="localhost"
REDIS_PORT=6379

PORT=3000
```

### 5. Run database migrations

```bash
npx prisma migrate dev
```

### 6. Seed database (optional)

```bash
npx prisma db seed
```

### 7. Start development server

```bash
npm run start:dev
```

Server runs at: `http://localhost:3000`

## 📚 Documentation

- [**Quick Start Guide**](./docs/QUICK-START.md) - Setup trong 5 phút
- [**Booking Timeout Guide**](./docs/BOOKING-TIMEOUT-GUIDE.md) - Chi tiết về BullMQ implementation
- [**Implementation Checklist**](./docs/BOOKING-TIMEOUT-CHECKLIST.md) - Checklist kiểm tra
- [**Summary**](./docs/SUMMARY.md) - Tổng kết implementation
- [**ERD Diagram**](./docs/ERD.md) - Database schema
- [**21-Day Roadmap**](./docs/21-DAY-ROADMAP.md) - Development plan

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov

# Manual booking timeout test
npx ts-node test/manual-booking-timeout.test.ts
```

## 📊 Database Schema

```prisma
User (Customer/Staff/Admin)
  ├── Booking
  │   ├── Court
  │   ├── Payment
  │   └── BookingCancellation
  └── Wallet
      └── WalletTransaction
```

See [ERD.md](./docs/ERD.md) for detailed schema.

## 🔑 API Endpoints

### Authentication

```bash
POST /auth/register    # Register new user
POST /auth/login       # Login
GET  /auth/profile     # Get current user
```

### Bookings

```bash
POST   /bookings              # Create booking
GET    /bookings              # Get all bookings (Staff/Admin)
GET    /bookings/my-bookings  # Get user's bookings
GET    /bookings/:id          # Get booking by ID
```

### Users (Admin only)

```bash
GET    /users         # Get all users
GET    /users/:id     # Get user by ID
PATCH  /users/:id     # Update user
DELETE /users/:id     # Delete user
```

### Wallet

```bash
GET    /wallet/balance       # Get wallet balance
POST   /wallet/deposit       # Deposit money
GET    /wallet/transactions  # Get transaction history
```

## 🎯 Booking Timeout Flow

```
┌─────────────────────────────────────────┐
│ User tạo booking (PENDING_PAYMENT)      │
└────────────────┬────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────┐
│ Job được thêm vào Queue (delay 15 phút) │
└────────────────┬────────────────────────┘
                 │
                 ↓ (Sau 15 phút)
┌─────────────────────────────────────────┐
│ BookingTimeoutProcessor xử lý           │
└────────────────┬────────────────────────┘
                 │
                 ├─→ Đã thanh toán? → SKIP
                 │
                 └─→ Chưa thanh toán? → EXPIRED
```

## 🐛 Troubleshooting

### Redis connection error

```bash
# Check Redis status
redis-cli ping

# Start Redis (Docker)
docker start redis
```

### Database migration error

```bash
# Reset database (⚠️ WARNING: Deletes all data)
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

### Port already in use

```bash
# Change PORT in .env file
PORT=3001
```

## 📦 Project Structure

```
src/
├── common/              # Shared utilities
│   ├── decorators/      # Custom decorators
│   ├── guards/          # Auth guards
│   └── interfaces/      # TypeScript interfaces
├── modules/
│   ├── auth/            # Authentication
│   ├── bookings/        # Booking management
│   │   └── processors/  # BullMQ processors
│   ├── courts/          # Court management
│   ├── payments/        # Payment processing
│   ├── queue/           # BullMQ configuration
│   ├── users/           # User management
│   └── wallet/          # Wallet system
└── prisma/              # Prisma service

prisma/
├── schema.prisma        # Database schema
├── migrations/          # Migration files
└── seed.ts             # Seed data

docs/                    # Documentation
test/                    # Test files
```

## 🔒 Security

- JWT authentication with secure tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Input validation with class-validator
- SQL injection prevention (Prisma ORM)

## 🚀 Deployment

### Production build

```bash
npm run build
npm run start:prod
```

### Docker (Coming soon)

```bash
docker-compose up -d
```

## 📈 Roadmap

- [x] Basic CRUD operations
- [x] Authentication & Authorization
- [x] Booking timeout with BullMQ
- [ ] Payment gateway integration (VNPay, MoMo)
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Admin dashboard
- [ ] Mobile app (React Native)

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

## 📄 License

This project is [MIT licensed](LICENSE).

## 👨‍💻 Author

**Xuan Dieu**
- GitHub: [@xuandieu09-mn](https://github.com/xuandieu09-mn)

---

⭐ **Star this repo** if you find it helpful!
