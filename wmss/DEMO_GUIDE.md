# 🚀 Hướng Dẫn Khởi Động Demo - Hệ Thống Quản Lý Kho (WMS)

Chào mừng bạn đã quay trở lại với dự án WMS! Tài liệu này hướng dẫn chi tiết cách khởi động nhanh demo dự án sau khi đã được xây dựng lại hệ thống Docker và sửa toàn bộ lỗi code/tests.

---

## 🛠 Yêu Cầu Hệ Thống
Để chạy dự án mượt mà nhất, hãy đảm bảo máy tính của bạn đã cài đặt:
1. **Node.js**: Phiên bản `>= 18.0.0` (khuyên dùng Node 20 LTS).
2. **Docker & Docker Compose**: (Nếu bạn muốn chạy bằng môi trường Container).

---

## 🐳 Cách 1: Khởi Động Nhanh Bằng Docker (Khuyên Nghị)
Hệ thống Docker đã được tối ưu hóa toàn diện cho kiến trúc Monorepo và hỗ trợ tải nóng (caching dependencies). Bạn chỉ cần thực hiện 3 bước đơn giản:

### Bước 1: Khởi động các Container
Mở PowerShell hoặc Command Prompt tại thư mục `wmss/` và chạy:
```bash
docker compose up -d --build
```
Lệnh này sẽ tự động tải các image cần thiết, compile package chia sẻ `@wms/shared`, build frontend React + Vite bằng Nginx, build backend API Express và khởi tạo database MongoDB riêng biệt.

### Bước 2: Tạo dữ liệu mẫu (Seed Data)
Sau khi các container đã khởi động thành công (đặc biệt là MongoDB), bạn hãy khởi tạo dữ liệu mẫu (sản phẩm, đối tác, tài chính, tài khoản...) bằng cách chạy lệnh sau tại thư mục dự án:
```bash
npm run seed
```

### Bước 3: Truy cập hệ thống
*   **Giao diện Frontend:** [http://localhost:5173](http://localhost:5173)
*   **Backend API:** [http://localhost:4000/api/v1](http://localhost:4000/api/v1)
*   **Tài liệu API (Swagger Docs):** [http://localhost:4000/api-docs](http://localhost:4000/api-docs)
*   **MongoDB (Docker Container):** Kết nối qua cổng **27018** (để không xung đột với MongoDB mặc định 27017 trên máy của bạn).

---

## 💻 Cách 2: Khởi Động Chế Độ Phát Triển (Local Dev Mode)
Cách này rất phù hợp nếu bạn muốn chỉnh sửa code trực tiếp và tận dụng tính năng hot-reload.

### Bước 1: Tạo các file môi trường `.env`
Hệ thống có sẵn script tự động sao chép các file `.env.example` thành `.env`. Chạy lệnh sau tại thư mục gốc:
```bash
npm run setup
```

### Bước 2: Cài đặt thư viện dependencies
Cài đặt dependencies cho toàn bộ monorepo (frontend, server, shared) chỉ bằng một lệnh duy nhất:
```bash
npm install
```

### Bước 3: Khởi động Database (MongoDB)
*   Nếu bạn đã cài sẵn MongoDB trên máy chạy cổng **27017**: Hãy chắc chắn service MongoDB đang chạy.
*   Nếu bạn muốn tận dụng MongoDB của Docker để đỡ phải cài đặt:
    ```bash
    docker compose up -d mongo
    ```
    *(MongoDB của Docker sẽ chạy ở cổng **27018**. Hãy mở file `server/.env` và cập nhật `MONGODB_URI=mongodb://127.0.0.1:27018/wms`)*

### Bước 4: Khởi tạo dữ liệu mẫu (Seed Data)
Khởi tạo dữ liệu kiểm thử local:
```bash
npm run seed
```

### Bước 5: Chạy ứng dụng song song
Chạy đồng thời cả máy chủ Frontend và Backend chỉ với một lệnh:
```bash
npm run dev
```
*   **Frontend:** [http://localhost:5173](http://localhost:5173)
*   **Backend API:** [http://localhost:4001](http://localhost:4001) *(hoặc theo cổng cấu hình trong file `server/.env`)*

---

## 🔐 Tài Khoản Đăng Nhập Mặc Định
Sau khi đã chạy lệnh `npm run seed`, bạn có thể đăng nhập bằng các tài khoản kiểm thử sau với mật khẩu chung là **`123456`**:

| Vai Trò (Role) | Email Đăng Nhập | Mật Khẩu |
| :--- | :--- | :--- |
| **Admin** (Toàn quyền) | `admin@wms.local` | `123456` |
| **Manager** (Quản lý kho) | `manager@wms.local` | `123456` |
| **Staff** (Nhân viên vận hành) | `staff@wms.local` | `123456` |

---

## 🧪 Xác Minh & Chạy Bộ Test
Để đảm bảo tất cả các chức năng hoạt động hoàn hảo trước khi demo, bạn có thể chạy bộ test tự động:

1. **Chạy song song toàn bộ tests (Frontend + Backend):**
   ```bash
   npm run test --workspaces
   ```
2. **Chạy riêng test Frontend (Vitest):**
   ```bash
   npm run test --workspace frontend -- --run
   ```
3. **Chạy riêng test Backend (Jest):**
   ```bash
   npm run test --workspace server
   ```

Chúc bạn có buổi demo dự án thành công tốt đẹp! Nếu gặp bất kỳ vấn đề gì, hãy nhắn tin ngay cho mình nhé.
