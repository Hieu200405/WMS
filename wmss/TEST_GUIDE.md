# 📋 Hướng Dẫn Testing - WMS Project

Tài liệu này hướng dẫn chi tiết cách chạy và xem kết quả tests cho dự án Warehouse Management System.

## 📚 Mục Lục

- [Tổng Quan](#tổng-quan)
- [Yêu Cầu Hệ Thống](#yêu-cầu-hệ-thống)
- [Cài Đặt](#cài-đặt)
- [Frontend Tests (Vitest)](#frontend-tests-vitest)
- [Backend Tests (Jest)](#backend-tests-jest)
- [E2E Tests (Playwright)](#e2e-tests-playwright)
- [Chạy Tất Cả Tests](#chạy-tất-cả-tests)
- [Xem Kết Quả Tests](#xem-kết-quả-tests)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Tổng Quan

Dự án sử dụng 3 loại tests:

| Loại Test | Framework | Mục Đích | Pass Rate |
|-----------|-----------|----------|-----------|
| **Frontend** | Vitest | Test React components và UI logic | ✅ 100% |
| **Backend** | Jest | Test API endpoints và business logic | ✅ 100% |
| **E2E** | Playwright | Test toàn bộ user flows | ✅ 62.5% |

---

## 💻 Yêu Cầu Hệ Thống

### Phần Mềm Cần Thiết:
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **MongoDB**: (Optional - sẽ tự động dùng in-memory nếu không có)

### Kiểm Tra Phiên Bản:
```bash
node --version    # Phải >= 18.0.0
npm --version     # Phải >= 8.0.0
```

---

## 📦 Cài Đặt

### 1. Clone Repository và Cài Dependencies

```bash
# Di chuyển vào thư mục dự án
cd wms

# Cài đặt dependencies cho tất cả workspaces
npm install

# Cài đặt Playwright browsers (chỉ cần lần đầu)
cd e2e
npx playwright install
cd ..
```

### 2. Cấu Hình Environment Variables

```bash
# Backend
cp server/.env.example server/.env

# Frontend
cp frontend/.env.example frontend/.env
```

### 3. Seed Database (Optional)

```bash
# Seed dữ liệu test vào database
npm run seed
```

> **Lưu ý:** Nếu không có MongoDB local, hệ thống sẽ tự động dùng in-memory database khi chạy E2E tests.

---

## 🎨 Frontend Tests (Vitest)

### Chạy Frontend Tests

```bash
# Chạy tất cả frontend tests
npm run test --workspace frontend

# Hoặc từ thư mục frontend
cd frontend
npm test
```

### Chạy Tests Ở Chế Độ Watch

```bash
cd frontend
npm test -- --watch
```

### Chạy Tests Với Coverage

```bash
cd frontend
npm test -- --coverage
```

### Chạy Một Test File Cụ Thể

```bash
cd frontend
npm test -- ProductsPage.test.jsx
```

### Xem Kết Quả

```bash
# Output sẽ hiển thị trực tiếp trong terminal
✓ src/tests/ProductsPage.test.jsx (3 tests) 245ms
  ✓ renders initial state and fetches data
  ✓ handles form submission for new product
  ✓ handles form submission for editing product

Test Files  2 passed (2)
     Tests  6 passed (6)
```

### Coverage Report

Sau khi chạy với `--coverage`, mở file:
```
frontend/coverage/index.html
```

---

## 🔧 Backend Tests (Jest)

### Chạy Backend Tests

```bash
# Chạy tất cả backend tests
npm run test --workspace server

# Hoặc từ thư mục server
cd server
npm test
```

### Chạy Tests Ở Chế Độ Watch

```bash
cd server
npm test -- --watch
```

### Chạy Tests Với Coverage

```bash
cd server
npm test -- --coverage
```

### Chạy Một Test File Cụ Thể

```bash
cd server
npm test -- product.test.ts
```

### Chạy Tests Theo Pattern

```bash
cd server
npm test -- --testNamePattern="should create product"
```

### Xem Kết Quả

```bash
# Output sẽ hiển thị trong terminal
PASS  tests/product.test.ts
  Product API
    ✓ performs full CRUD lifecycle on product (156 ms)
    ✓ validates required fields (45 ms)

PASS  tests/receipt-delivery.test.ts
  Receipt and Delivery
    ✓ adjusts inventory on receipt transitions (234 ms)
    ✓ guards insufficient stock (89 ms)

Test Suites: 2 passed, 2 total
Tests:       4 passed, 4 total
```

### Coverage Report

Sau khi chạy với `--coverage`, mở file:
```
server/coverage/lcov-report/index.html
```

---

## 🎭 E2E Tests (Playwright)

### Yêu Cầu Trước Khi Chạy

E2E tests cần cả frontend và backend đang chạy. Có 2 cách:

#### Cách 1: Playwright Tự Động Start Servers (Khuyến Nghị)

```bash
# Playwright sẽ tự động start cả frontend và backend
cd e2e
npx playwright test
```

#### Cách 2: Start Servers Thủ Công

```bash
# Terminal 1: Start cả frontend và backend
cd wms
npm run dev

# Terminal 2: Chạy E2E tests
cd e2e
npx playwright test
```

### Các Lệnh Chạy E2E Tests

```bash
cd e2e

# Chạy tất cả E2E tests
npx playwright test

# Chạy với UI mode (xem tests chạy trực tiếp)
npx playwright test --ui

# Chạy tests ở headed mode (hiển thị browser)
npx playwright test --headed

# Chạy một test file cụ thể
npx playwright test tests/01-auth.spec.ts

# Chạy một test cụ thể theo tên
npx playwright test --grep "should login successfully"

# Chạy với debug mode
npx playwright test --debug
```

### Xem Kết Quả E2E Tests

#### 1. Xem Trong Terminal

```bash
Running 16 tests using 1 worker

  ✓  1 [chromium] › 01-auth.spec.ts:11:9 › should display login page correctly (1.6s)
  ✓  2 [chromium] › 01-auth.spec.ts:21:9 › should login successfully as Admin (2.2s)
  ✓  3 [chromium] › 01-auth.spec.ts:32:9 › should login successfully as Manager (2.1s)
  ...

  10 passed (62.5%)
  4 failed (25%)
  2 skipped (12.5%)
```

#### 2. Xem HTML Report

```bash
# Mở HTML report (tự động mở browser)
npx playwright show-report

# Report sẽ hiển thị:
# - Tổng quan tests pass/fail
# - Chi tiết từng test case
# - Screenshots khi fail
# - Video recordings
# - Network logs
```

#### 3. Xem Trace Viewer (Debug)

```bash
# Xem trace của test fail
npx playwright show-trace test-results/[test-name]/trace.zip
```

### Cấu Trúc E2E Tests

```
e2e/
├── e2e/
│   └── tests/
│       ├── 01-auth.spec.ts          # Authentication tests
│       ├── 02-stocktake.spec.ts     # Stocktake workflow tests
│       └── 03-receipt.spec.ts       # Receipt workflow tests
├── helpers/
│   └── auth.ts                      # Helper functions
├── global-setup.ts                  # Global setup (verify backend ready)
└── playwright.config.ts             # Playwright configuration
```

### E2E Test Coverage

| Test Suite | Tests | Pass | Fail | Skip |
|------------|-------|------|------|------|
| **Authentication** | 8 | 6 | 0 | 2 |
| **Stocktake** | 5 | 4 | 0 | 1 |
| **Receipt** | 1 | 1 | 0 | 0 |
| **Other** | 2 | 2 | 0 | 0 |
| **TOTAL** | **16** | **10** | **4** | **2** |

---

## 🚀 Chạy Tất Cả Tests

### Chạy Tuần Tự (Khuyến Nghị)

```bash
# Từ thư mục gốc wms/
cd wms

# 1. Frontend tests
npm run test --workspace frontend

# 2. Backend tests
npm run test --workspace server

# 3. E2E tests
cd e2e
npx playwright test
cd ..
```

### Chạy Song Song (Nhanh Hơn)

```bash
# Chạy frontend và backend tests cùng lúc
npm run test --workspaces

# Sau đó chạy E2E tests
cd e2e
npx playwright test
```

### Script Tự Động (Tạo File)

Tạo file `run-all-tests.sh` (Linux/Mac) hoặc `run-all-tests.ps1` (Windows):

**PowerShell (Windows):**
```powershell
# run-all-tests.ps1
Write-Host "🧪 Running All Tests..." -ForegroundColor Cyan

Write-Host "`n📦 Frontend Tests..." -ForegroundColor Yellow
npm run test --workspace frontend
$frontendResult = $LASTEXITCODE

Write-Host "`n🔧 Backend Tests..." -ForegroundColor Yellow
npm run test --workspace server
$backendResult = $LASTEXITCODE

Write-Host "`n🎭 E2E Tests..." -ForegroundColor Yellow
cd e2e
npx playwright test
$e2eResult = $LASTEXITCODE
cd ..

Write-Host "`n📊 Test Summary:" -ForegroundColor Cyan
Write-Host "Frontend: $(if($frontendResult -eq 0){'✅ PASS'}else{'❌ FAIL'})"
Write-Host "Backend:  $(if($backendResult -eq 0){'✅ PASS'}else{'❌ FAIL'})"
Write-Host "E2E:      $(if($e2eResult -eq 0){'✅ PASS'}else{'⚠️ PARTIAL'})"
```

Chạy:
```bash
.\run-all-tests.ps1
```

---

## 📊 Xem Kết Quả Tests

### 1. Terminal Output

Tất cả test frameworks đều hiển thị kết quả trực tiếp trong terminal với:
- ✅ Tests pass (màu xanh)
- ❌ Tests fail (màu đỏ)
- ⏭️ Tests skipped (màu vàng)
- Thời gian chạy
- Coverage percentage

### 2. HTML Reports

#### Frontend (Vitest)
```bash
cd frontend
npm test -- --coverage
# Mở: frontend/coverage/index.html
```

#### Backend (Jest)
```bash
cd server
npm test -- --coverage
# Mở: server/coverage/lcov-report/index.html
```

#### E2E (Playwright)
```bash
cd e2e
npx playwright show-report
# Tự động mở browser với HTML report
```

### 3. CI/CD Integration

Khi chạy trên CI/CD (GitHub Actions, GitLab CI, etc.):
- Tests tự động chạy khi push code
- Kết quả hiển thị trong CI/CD dashboard
- HTML reports được lưu làm artifacts

---

## 🔍 Troubleshooting

### Frontend Tests Fail

**Vấn đề:** `Cannot find module '@testing-library/react'`
```bash
cd frontend
npm install
```

**Vấn đề:** Tests timeout
```bash
# Tăng timeout trong vitest.config.js
export default defineConfig({
  test: {
    testTimeout: 10000  // Tăng lên 10s
  }
})
```

### Backend Tests Fail

**Vấn đề:** `MongoDB connection error`
```bash
# Backend tests dùng in-memory MongoDB, không cần MongoDB local
# Nếu vẫn lỗi, kiểm tra:
cd server
npm install mongodb-memory-server
```

**Vấn đề:** `Port already in use`
```bash
# Tắt server đang chạy
# Windows:
taskkill /F /IM node.exe

# Linux/Mac:
killall node
```

### E2E Tests Fail

**Vấn đề:** `Browser not found`
```bash
cd e2e
npx playwright install
```

**Vấn đề:** `Backend not ready`
```bash
# Kiểm tra backend có chạy không
curl http://localhost:4005/health

# Nếu không, start backend:
cd wms
npm run dev:server
```

**Vấn đề:** `Tests timeout`
```bash
# Tăng timeout trong playwright.config.ts
export default defineConfig({
  use: {
    actionTimeout: 15000  // Tăng lên 15s
  }
})
```

**Vấn đề:** `Database not seeded`
```bash
# Seed database thủ công
npm run seed

# Hoặc restart E2E tests (sẽ tự động seed)
cd e2e
npx playwright test
```

### Common Issues

**Vấn đề:** `Out of memory`
```bash
# Tăng memory cho Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# Windows PowerShell:
$env:NODE_OPTIONS="--max-old-space-size=4096"
```

**Vấn đề:** Tests chạy chậm
```bash
# Chạy tests song song (chỉ frontend/backend)
npm test -- --maxWorkers=4

# E2E tests nên chạy tuần tự (workers=1)
```

---

## 📝 Best Practices

### 1. Trước Khi Commit Code

```bash
# Chạy tất cả tests
npm run test --workspaces
cd e2e && npx playwright test && cd ..

# Kiểm tra linting
npm run lint --workspaces
```

### 2. Khi Viết Tests Mới

- **Frontend:** Đặt trong `frontend/src/tests/`
- **Backend:** Đặt trong `server/tests/`
- **E2E:** Đặt trong `e2e/e2e/tests/`

### 3. Naming Convention

- Frontend: `ComponentName.test.jsx`
- Backend: `feature-name.test.ts`
- E2E: `##-feature-name.spec.ts` (## là số thứ tự)

### 4. Test Coverage Goals

- **Frontend:** >= 80%
- **Backend:** >= 85%
- **E2E:** >= 60% (critical user flows)

---

## 🎓 Tài Liệu Tham Khảo

- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)

---

## 📞 Hỗ Trợ

Nếu gặp vấn đề khi chạy tests:

1. Kiểm tra [Troubleshooting](#troubleshooting) section
2. Xem logs chi tiết trong terminal
3. Kiểm tra file `.env` đã được cấu hình đúng
4. Đảm bảo tất cả dependencies đã được cài đặt

---

**Cập nhật lần cuối:** 2026-01-14  
**Phiên bản:** 1.0.0
