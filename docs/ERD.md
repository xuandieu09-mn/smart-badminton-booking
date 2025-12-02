# Entity Relationship Diagram (ERD)

## 📊 Database Schema - Smart Badminton Booking System

This document describes the database schema for the Smart Badminton Booking System using Mermaid diagrams.

## 📈 ERD Diagram

```mermaid
erDiagram
    User ||--o{ Booking : "creates"
    User ||--o| Wallet : "has"
    User ||--o{ Booking : "staff creates"
    User ||--o{ AdminAction : "performs"
    
    Court ||--o{ Booking : "has"
    Court ||--o{ PricingRule : "has"
    
    Booking ||--o| Payment : "has"
    Booking ||--o| BookingCancellation : "has"
    
    Wallet ||--o{ WalletTransaction : "has"

    User {
        int id PK
        string email UK
        string password
        string name
        enum role "CUSTOMER|STAFF|ADMIN"
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Court {
        int id PK
        string name
        string description
        decimal pricePerHour
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    Booking {
        int id PK
        string bookingCode UK
        int courtId FK
        int userId FK "nullable for guests"
        string guestName
        string guestPhone
        datetime startTime
        datetime endTime
        decimal totalPrice
        enum status "PENDING_PAYMENT|CONFIRMED|..."
        enum type "REGULAR|MAINTENANCE"
        enum paymentMethod
        enum paymentStatus
        string createdBy
        int createdByStaffId FK
        datetime checkedInAt
        int checkedInByStaffId
        datetime expiresAt
        datetime createdAt
        datetime updatedAt
    }

    Wallet {
        int id PK
        int userId FK_UK
        decimal balance
        datetime createdAt
        datetime updatedAt
    }

    WalletTransaction {
        int id PK
        int walletId FK
        enum type "DEPOSIT|REFUND|PAYMENT|ADMIN_ADJUSTMENT"
        decimal amount
        int bookingId
        string description
        decimal balanceBefore
        decimal balanceAfter
        datetime createdAt
    }

    Payment {
        int id PK
        int bookingId FK_UK
        enum method "VNPAY|MOMO|WALLET|CASH"
        decimal amount
        string transactionId
        json gatewayResponse
        enum status "UNPAID|PAID|REFUNDED|FAILED"
        datetime paidAt
        datetime createdAt
    }

    PricingRule {
        int id PK
        int courtId FK "nullable = all courts"
        string name
        int dayOfWeek "0=Sun...6=Sat, null=all"
        string startTime
        string endTime
        decimal pricePerHour
        int priority
        boolean isActive
        datetime createdAt
        datetime updatedAt
    }

    BookingCancellation {
        int id PK
        int bookingId FK_UK
        int cancelledBy
        enum cancelledByRole
        string reason
        decimal refundAmount
        string refundMethod
        datetime createdAt
    }

    AdminAction {
        int id PK
        int adminId FK
        string action
        string targetType
        int targetId
        string reason
        json metadata
        datetime createdAt
    }
```

## 📋 Table Descriptions

### Core Tables

| Table | Description |
|-------|-------------|
| **User** | Stores all users (Customers, Staff, Admin) with role-based access |
| **Court** | Badminton courts available for booking |
| **Booking** | Core booking records with status workflow |

### Payment & Wallet

| Table | Description |
|-------|-------------|
| **Wallet** | User's virtual wallet balance (1:1 with User) |
| **WalletTransaction** | Transaction history for wallet operations |
| **Payment** | Payment records for bookings (1:1 with Booking) |

### Business Rules

| Table | Description |
|-------|-------------|
| **PricingRule** | Dynamic pricing rules (golden hours, weekends) |
| **BookingCancellation** | Cancellation records with refund info |
| **AdminAction** | Audit log for admin operations |

## 🔗 Relationships

### One-to-One (1:1)

| Relationship | Description |
|--------------|-------------|
| User ↔ Wallet | Each user has one wallet |
| Booking ↔ Payment | Each booking has one payment record |
| Booking ↔ BookingCancellation | Each cancelled booking has one cancellation record |

### One-to-Many (1:N)

| Relationship | Description |
|--------------|-------------|
| User → Booking | A user can have many bookings |
| User → Booking (StaffCreated) | Staff can create bookings for guests |
| User → AdminAction | Admin can perform many actions |
| Court → Booking | A court can have many bookings |
| Court → PricingRule | A court can have many pricing rules |
| Wallet → WalletTransaction | A wallet has many transactions |

## 📊 Enums

### Role
```
CUSTOMER - Regular customer
STAFF    - Staff member
ADMIN    - Administrator
```

### BookingStatus
```
PENDING_PAYMENT - Waiting for payment (15 min hold)
CONFIRMED       - Payment received
CHECKED_IN      - Customer checked in
COMPLETED       - Session completed
CANCELLED       - Cancelled (>24h before)
CANCELLED_LATE  - Late cancellation (<24h)
EXPIRED         - Payment timeout
BLOCKED         - Maintenance block
```

### BookingType
```
REGULAR     - Normal booking
MAINTENANCE - Court maintenance block
```

### PaymentMethod
```
VNPAY  - VNPay gateway
MOMO   - MoMo wallet
WALLET - Internal wallet
CASH   - Cash payment at counter
```

### PaymentStatus
```
UNPAID   - Not paid
PAID     - Payment successful
REFUNDED - Money refunded
FAILED   - Payment failed
```

### WalletTransactionType
```
DEPOSIT          - Add money to wallet
REFUND           - Refund from cancellation
PAYMENT          - Pay for booking
ADMIN_ADJUSTMENT - Admin manual adjustment
```

## 🔒 Constraints

### Exclusion Constraint (Prevent Double Booking)

The database uses PostgreSQL's exclusion constraint to prevent overlapping bookings:

```sql
ALTER TABLE "Booking"
ADD CONSTRAINT "prevent_double_booking"
EXCLUDE USING GIST (
  "courtId" WITH =,
  tsrange("startTime", "endTime") WITH &&
)
WHERE ("status" NOT IN ('CANCELLED', 'CANCELLED_LATE', 'EXPIRED'));
```

This ensures:
- No two bookings can overlap on the same court
- Cancelled/Expired bookings are excluded from the constraint
- Database-level enforcement (not application logic)

### Indexes for Performance

```sql
CREATE INDEX idx_booking_code ON "Booking"("bookingCode");
CREATE INDEX idx_booking_status ON "Booking"("status");
CREATE INDEX idx_booking_expires_at ON "Booking"("expiresAt") WHERE "expiresAt" IS NOT NULL;
CREATE INDEX idx_booking_court_time ON "Booking"("courtId", "startTime", "endTime");
```

## 📁 Files

- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- Seed data: `prisma/seed.ts`
