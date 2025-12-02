PROJECT CONTEXT & RULES
Project Overview
Hệ thống đặt lịch sân cầu lông thông minh (Smart Badminton Booking System).

Backend: NestJS (TypeScript), PostgreSQL, Prisma ORM.

Architecture: Modular Monolith (Controller -> Service -> Repository).

Key Feature: Ngăn chặn đặt trùng sân (Double Booking) tuyệt đối bằng Database Constraints.

Tech Stack Rules
NestJS: Sử dụng Dependency Injection, DTO validation với class-validator.

Database: PostgreSQL. Sử dụng kiểu dữ liệu tsrange cho khung giờ đặt.

ORM: Prisma.

Code Style: Tuân thủ ESLint mặc định của NestJS. Luôn viết type rõ ràng (Strict typing).

Critical Business Rules (IMPORTANT)
Booking Time: Một booking bao gồm startTime và endTime.

No Overlap: Không bao giờ cho phép 2 booking đè lên nhau trên cùng 1 sân.

Giải pháp: Sử dụng PostgreSQL Exclusion Constraints (EXCLUDE USING GIST).

KHÔNG dùng logic if (start < end) trong code JS để check trùng, phải để DB lo việc đó.

Instruction for AI
Khi viết code, hãy giải thích ngắn gọn logic.

Nếu đụng đến Database, hãy ưu tiên viết migration SQL thô (Raw SQL) để xử lý các tính năng nâng cao mà Prisma chưa hỗ trợ (như Exclusion Constraint).

Luôn kiểm tra input data bằng DTO.