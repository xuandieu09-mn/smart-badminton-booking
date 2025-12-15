# 📧 Email Notifications - Quick Test Guide

## ✅ Prerequisites

1. **Redis running:**
   ```bash
   docker-compose up -d redis
   ```

2. **Backend running:**
   ```bash
   npm run start:dev
   ```

3. **Email configured in `.env`:**
   ```env
   EMAIL_ENABLED=true
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   EMAIL_FROM=noreply@badminton.com
   ```

---

## 🧪 Test 1: Admin Test Email

```bash
# Login as admin
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password123"
}

# Copy token from response
```

```bash
# Send test email
POST http://localhost:3000/api/notifications/test-email?to=your-email@gmail.com
Authorization: Bearer <admin_token>
```

**Expected:**
- ✅ Response: `{"success": true, "message": "Test email sent successfully..."}`
- ✅ Check inbox: Email "Xác nhận đặt sân - TEST-20241214-0000"
- ✅ Backend logs: `Email sent successfully to your-email@gmail.com`

---

## 🧪 Test 2: Payment Success Email

```bash
# 1. Login as customer
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "email": "customer1@example.com",
  "password": "password123"
}
```

```bash
# 2. Create booking
POST http://localhost:3000/api/bookings
Authorization: Bearer <customer_token>
Content-Type: application/json

{
  "courtId": 1,
  "startTime": "2025-12-15T10:00:00Z",
  "endTime": "2025-12-15T11:00:00Z",
  "paymentMethod": "WALLET"
}

# Note the bookingId from response
```

```bash
# 3. Pay with wallet (triggers email)
POST http://localhost:3000/api/payments/pay/:bookingId
Authorization: Bearer <customer_token>
```

**Expected:**
- ✅ Response: Payment successful
- ✅ Check inbox: Email "Thanh toán thành công - BK241215-XXXX"
- ✅ Email contains QR code image
- ✅ Backend logs: `Payment success email queued for booking BK241215-XXXX`

---

## 🧪 Test 3: Cancellation Email

```bash
# Cancel booking
POST http://localhost:3000/api/bookings/:id/cancel
Authorization: Bearer <customer_token>
```

**Expected:**
- ✅ Response: Booking cancelled successfully
- ✅ Check inbox: Email "Hủy đặt sân - BK241215-XXXX"
- ✅ Email shows refund amount (if applicable)
- ✅ Backend logs: `Cancellation email queued for booking BK241215-XXXX`

---

## 📊 Check Email Queue (Redis)

```bash
redis-cli

# List all email jobs
> KEYS email-notifications:*

# View job details
> HGETALL email-notifications:1

# Count pending jobs
> LLEN email-notifications:wait

# Count completed jobs
> LLEN email-notifications:completed
```

---

## 🐛 Troubleshooting

### Issue: Email not sent (EMAIL_ENABLED=false)

**Logs:**
```
Email sending skipped (disabled): Thanh toán thành công to customer1@example.com
```

**Fix:** Set `EMAIL_ENABLED=true` in `.env` và restart backend

---

### Issue: Gmail authentication failed

**Error:**
```
Error: Invalid login: 535-5.7.8 Username and Password not accepted
```

**Fix:**
1. Tạo Gmail App Password: https://myaccount.google.com/apppasswords
2. Copy 16-char password vào `EMAIL_PASS` trong `.env`
3. Restart backend

---

### Issue: Template not found

**Error:**
```
Template not found: booking-confirmation
```

**Fix:**
1. Kiểm tra `src/modules/notifications/templates/booking-confirmation.hbs` tồn tại
2. Rebuild: `npm run build`
3. Restart backend

---

## ✅ Success Checklist

- [ ] Test email được gửi thành công
- [ ] Payment success email có QR code
- [ ] Cancellation email có refund amount
- [ ] Email arrive trong 10 giây
- [ ] No errors trong backend logs
- [ ] Redis queue hoạt động (jobs được process)

---

**Last Updated:** December 14, 2025
