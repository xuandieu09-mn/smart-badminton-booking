## BACKEND

1. Khởi động docker
    docker-compose down -v
    docker-compose up -d

2. Chạy prisma và cài migration
    npx prisma generate
    npx prisma migrate dev

3. Kiểm tra xung đột 
    docker ps
    docker stop <container_id_khong_dung>

4. Tùy chọn hoặc dành lúc dev
    npx prisma db seed ( chạy seed) ( đã chạy từ trước thì không cần)
    npx prisma studio ( chạy localhost để xem cơ sở dữ liệu dạng bảng)

5. Chạy BACKEND

    npm run start:dev