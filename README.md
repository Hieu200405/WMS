# Hệ thống Quản lý Kho (WMS) - Nâng Cao

Hệ thống quản lý kho toàn diện được xây dựng theo kiến trúc Monorepo hiện đại, tối ưu hóa cho hiệu suất, khả năng mở rộng và trải nghiệm người dùng.

## 🚀 Tính năng nổi bật

*   **Quản lý tồn kho thời gian thực:** Theo dõi chính xác số lượng hàng hóa tại từng vị trí (Zone, Aisle, Rack, Bin).
*   **Quy trình vận hành chuẩn:** Nhập hàng, Xuất hàng, Kiểm kê, Điều chỉnh tồn kho, Trả hàng, Hủy hàng.
*   **Tài chính tích hợp:** Tự động ghi nhận doanh thu, chi phí từ các hoạt động nhập xuất và thanh toán.
*   **Báo cáo thông minh:** Dashboard trực quan, biểu đồ thống kê, xuất báo cáo PDF.
*   **Hệ thống thông báo:** Cảnh báo tồn kho thấp, thông báo trạng thái đơn hàng realtime.
*   **Phân quyền chặt chẽ:** Admin, Manager, Staff với quyền hạn được kiểm soát chi tiết (RBAC).
*   **Bảo mật cao:** Xác thực JWT, Refresh Token, mã hóa mật khẩu Bcrypt.

## 🛠 Công nghệ sử dụng

*   **Frontend:** React (Vite), TailwindCSS, Recharts, Lucide Icons.
*   **Backend:** Node.js, Express, TypeScript, Mongoose (MongoDB).
*   **Shared:** Gói thư viện chia sẻ type, enum, schema validation (Zod) giữa FE và BE.
*   **DevOps:** Docker, Docker Compose, ESLint, Prettier, Husky.

## 📂 Cấu trúc dự án (Monorepo)

```
wms/
 ├─ frontend/   # Giao diện người dùng (React 18)
 ├─ server/     # API Server (Express + TypeScript)
 ├─ shared/     # Thư viện dùng chung (Types, Schemas, Constants)
 ├─ docker-compose.yml
 ├─ scripts/    # Scripts tiện ích
 └─ package.json
```

## ⚙️ Cài đặt và Chạy ứng dụng

### 1. Chuẩn bị môi trường
*   Node.js >= 18
*   MongoDB (hoặc Docker)

### 2. Cài đặt dependencies
```bash
cd wms
npm install
npm run setup # Tạo file .env từ mẫu .env.example
```

### 3. Cấu hình
Kiểm tra file `server/src/config/env.ts` hoặc `.env` để điều chỉnh các thông số:
*   **Rate Limit:** Đã được tối ưu lên 1000 req/15p cho môi trường phát triển.
*   **Cổng API:** Mặc định 4001 (hoặc theo file .env).

### 4. Khởi tạo dữ liệu mẫu (Seed Data)
Để có dữ liệu ban đầu (Sản phẩm, Kho, Đối tác, Tài chính, Thông báo...):
```bash
npm run seed
```
*Tài khoản mặc định:*
*   **Admin:** `admin@wms.local` / `123456`
*   **Manager:** `manager@wms.local` / `123456`
*   **Staff:** `staff@wms.local` / `123456`

### 5. Chạy ứng dụng (Dev Mode)
```bash
npm run dev
```
*   **Frontend:** http://localhost:5173
*   **Backend API:** http://localhost:4000/api/v1
*   **Swagger Docs:** http://localhost:4000/api-docs

## 🐳 Chạy với Docker

Hệ thống được tối ưu hóa để chạy bằng Docker Compose.

### 1. Khởi động các dịch vụ
```bash
cd wms
docker compose up -d --build
```

### 2. Thiết lập dữ liệu ban đầu
Sau khi các container đã chạy (đặc biệt là MongoDB), bạn cần chạy lệnh seed để có dữ liệu test:
```bash
npm run seed
```

### 3. Lưu ý về Cổng (Ports)
*   **Frontend:** http://localhost:5173
*   **Backend API:** http://localhost:4000
*   **MongoDB (Docker):** Chạy trên cổng **27018** (để tránh xung đột nếu máy bạn đã cài MongoDB ở cổng 27017).
    *   *Lưu ý:* Nếu bạn chạy ứng dụng ở chế độ `dev` (không docker) và muốn kết nối tới MongoDB của Docker, hãy sửa `MONGODB_URI` trong `server/.env` thành `mongodb://127.0.0.1:27018/wms`.

## 🛡️ Các quy tắc nghiệp vụ mới (Business Rules)

Hệ thống đã được cập nhật các quy tắc bảo mật và toàn vẹn dữ liệu:

### 1. Quản lý Sản phẩm & Giá
*   **Ràng buộc giá:** Giá bán (`priceOut`) buộc phải **lớn hơn** giá nhập (`priceIn`). Hệ thống sẽ báo lỗi nếu vi phạm.
*   **Tự động điền giá:** Khi tạo Phiếu xuất, hệ thống tự động điền `Giá xuất` theo `Giá bán` đã quy định của sản phẩm.

### 2. Toàn vẹn dữ liệu (Referential Integrity)
Để đảm bảo lịch sử kho và báo cáo tài chính, hệ thống chặn xóa các đối tượng sau nếu có dữ liệu liên quan:
*   **Sản phẩm:** Không thể xóa nếu còn tồn kho (qty > 0) hoặc có trong các phiếu nhập/xuất chưa hoàn tất.
*   **Đối tác (NCC/Khách hàng):** Không thể xóa nếu đang có phiếu nhập/xuất dở dang hoặc còn công nợ chưa thanh toán.
*   **Danh mục:** Không thể xóa nếu còn sản phẩm thuộc danh mục đó.

### 3. Quy trình Trả hàng (RMA)
*   Chỉ được phép tạo Phiếu trả hàng cho các Phiếu xuất hoặc Phiếu nhập đã ở trạng thái **Hoàn tất (Completed)**.

## 🧪 Testing & Quality Assurance

### Chạy Tests

**Tất cả Tests (Khuyến nghị):**
```bash
# Chạy script tự động
.\run-all-tests.ps1

# Hoặc chạy từng loại test
npm run test --workspaces  # Frontend + Backend
cd e2e && npx playwright test  # E2E tests
```

**Backend Tests (Jest + Supertest):**
```bash
cd wms/server
npm test
```

**Frontend Tests (Vitest + React Testing Library):**
```bash
cd wms/frontend
npm test
```

**E2E Tests (Playwright):**
```bash
cd wms/e2e
npx playwright test
```

### Kết Quả Kiểm Thử

✅ **Backend:** 8 test suites, 21 tests - **100% PASSED**  
✅ **Frontend:** 5 test files, 14 tests - **100% PASSED**  
✅ **E2E:** 10/16 tests - **62.5% PASSED** (critical flows)

**Modules đã kiểm thử:**
- Authentication & Authorization
- Inventory Management
- Product CRUD Operations
- Receipt & Delivery Workflows
- Stocktake & Adjustments
- Warehouse Management
- Reports & Analytics
- UI Components & User Flows

### Tài Liệu Kiểm Thử

Xem chi tiết tại:
- 📋 **[TEST_GUIDE.md](./wms/TEST_GUIDE.md)** - Hướng dẫn chi tiết chạy tests và xem kết quả
- 📚 [PROJECT_GUIDE.md](./PROJECT_GUIDE.md) - Hướng dẫn toàn diện về dự án
- 📊 [SEED_DATA.md](./SEED_DATA.md) - Tài liệu dữ liệu seed chi tiết

## 📚 Tài liệu API
Hệ thống cung cấp tài liệu API chuẩn OpenAPI (Swagger) tại đường dẫn `/api-docs` khi server đang chạy.

## 🌟 Các cải tiến mới (Phiên bản Pro)

Hệ thống đã được nâng cấp với các tính năng chuyên sâu cho vận hành công nghiệp:

### 1. Quản lý kho thông minh (Advanced Inventory)
*   **Chiến lược FEFO Picking:** Tự động gợi ý vị trí lấy hàng dựa trên nguyên tắc **Hết hạn trước - Xuất trước** (First Expired First Out).
*   **Cơ chế Giữ hàng (Stock Reservation):** Tự động giữ chỗ (Reserve) tồn kho ngay khi đơn hàng được duyệt, tránh tình trạng bán quá số lượng thực tế.
*   **Khoá kho kiểm kê (Stocktake Lock):** Tự động khóa vị trí đang kiểm kê, ngăn chặn mọi biến động kho làm sai lệch dữ liệu đối soát.
*   **Theo dõi Serial Number:** Quản lý chi tiết từng đơn vị sản phẩm cao cấp qua mã Serial duy nhất.

### 2. Tự động hóa & DX (Automation)
*   **Hóa đơn PDF Chuyên nghiệp:** Tự động vẽ hóa đơn PDF chuẩn (bao gồm chi tiết Serial) khi xuất kho.
*   **Email Automation:** Tự động gửi email đính kèm hóa đơn cho khách hàng ngay khi hoàn tất giao hàng.
*   **Dịch vụ Lưu trữ Đám mây:** Đã tích hợp **Cloudinary**, sẵn sàng chuyển đổi từ lưu trữ ảnh cục bộ sang Cloud chỉ qua cấu hình.

### 3. Analytics & Giám sát thông minh (Intelligence)
*   **Logistics & Waybill Integration:** Tự động kết nối với các đơn vị vận chuyển (GHTK, GHN,...) để sinh mã vận đơn và tính phí ship ngay khi duyệt đơn hàng.
*   **Kiểm soát chất lượng (QC Quarantine):** Cơ chế "Tạm nhập - Chờ kiểm" cho phép đưa hàng mới nhập vào diện Quarantined để kiểm tra chất lượng trước khi mở bán chính thức.
*   **Quy trình Hoàn hàng (Advanced RMA):** Phân loại rõ hàng hoàn có thể nhập lại kho (Restock) hay cần tiêu hủy (Dispose) sau khi giám định QC.
*   **Bảo mật 2-Layer (Refresh Tokens):** Cơ chế token kép (Access/Refresh Token) đảm bảo an toàn tối đa cho phiên đăng nhập của người dùng.
*   **Dự báo hết hàng (AI Predictive Insights):** Dashboard tự động tính toán tốc độ bán hàng (Sales Velocity) và dự báo ngày hết hàng thực tế cho từng SKU.
*   **Tự động nhập hàng (Auto-Replenishment):** Hệ thống tự động khởi tạo Phiếu nhập hàng nháp (Draft Receipt) khi tồn kho xuống dưới mức tối thiểu.
*   **Phân loại ABC:** Tự động phân loại sản phẩm theo giá trị đóng góp (Loại A: 80%, B: 15%, C: 5%).
*   **Gợi ý Cross-docking:** Tự động phát hiện và cảnh báo khi có hàng nhập về đang trùng với nhu cầu của các đơn hàng chờ xuất, giúp giảm chi phí lưu kho.
*   **Quy tắc Put-away (Rule-based):** Cho phép cấu hình vị trí ưu tiên cho từng sản phẩm hoặc loại hàng hóa.
*   **Nhật ký hoạt động (Audit Logs):** Giao diện tra cứu toàn diện lịch sử thay đổi: ai làm gì, khi nào, dữ liệu cũ/mới là gì.

## 🛠 Cấu hình mở rộng (Team Review)

Để kích hoạt đầy đủ các tính năng thực tế, team member cần bổ sung các biến môi trường sau vào file `.env`:

### 1. Cấu hình Email (SMTP)
```env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_email@example.com
SMTP_PASS=your_app_password
SMTP_FROM_NAME="WMS System"
```

### 2. Cấu hình Cloudinary (Ảnh)
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

## 🗺️ Lộ trình tiếp tục hoàn thiện (Team Roadmap)

Team member có thể tiếp tục cải tiến dựa trên các hướng sau:

1.  **Mobile Scanner:** Mở rộng giao diện `/scanner` để hỗ trợ đầy đủ quy trình Nhập - Cất - Nhặt trên thiết bị cầm tay.
2.  **Bản đồ kho 2D:** Xây dựng Visualization cho các WarehouseNode để quản lý vị trí kệ trực quan hơn.
3.  **Dự báo nhu cầu:** Sử dụng dữ liệu báo cáo để tính toán **Reorder Point (Điểm đặt hàng lại)** tự động cho từng sản phẩm.
4.  **Tích hợp vận chuyển:** Kết nối API với các đơn vị vận chuyển (GHTK, GHN...) để lấy mã vận đơn tự động.

---

## 🛡️ Tác giả & Bản quyền
Dự án được thực hiện bởi Nhóm 3 - OOAD.
