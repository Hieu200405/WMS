import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import { connectMongo, disconnectMongo } from '../src/db/mongo.js';
import { env } from '../src/config/env.js';
import {
  UserModel,
  CategoryModel,
  ProductModel,
  PartnerModel,
  WarehouseNodeModel,
  InventoryModel
} from '../src/models/index.js';
import { logger } from '../src/utils/logger.js';
import fs from 'node:fs';
console.log('Seed script loaded, checking entry point...');
console.log('Current:', import.meta.url);
console.log('Process:', process.argv[1]);

const ADMIN_EMAIL = 'admin@wms.local';
const DEFAULT_PASSWORD = '123456';

const SEED_LIMITS = {
  categories: 5,
  suppliers: 5,
  customers: 5,
  products: 5,
  warehouses: 1,
  zonesPerWarehouse: 1,
  aislesPerZone: 1,
  racksPerAisle: 1,
  binsPerRack: 5,
  inventoryPerProduct: 1,
  notifications: 5,
  financialTransactions: 5
};

// Vietnamese name generators
const VIETNAMESE_FIRST_NAMES = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const VIETNAMESE_MIDDLE_NAMES = ['Văn', 'Thị', 'Minh', 'Hoàng', 'Quốc', 'Hữu', 'Đức', 'Anh', 'Thanh', 'Tuấn', 'Hải', 'Phương'];
const VIETNAMESE_LAST_NAMES = ['An', 'Bình', 'Cường', 'Dũng', 'Hoa', 'Hùng', 'Khánh', 'Linh', 'Long', 'Mai', 'Nam', 'Phúc', 'Quân', 'Tâm', 'Thắng', 'Tú', 'Vân', 'Yến'];

const COMPANY_TYPES = ['Công ty TNHH', 'Công ty CP', 'Công ty Cổ phần', 'Tập đoàn', 'Doanh nghiệp'];
const COMPANY_SUFFIXES = ['Việt Nam', 'Quốc Tế', 'Á Châu', 'Thái Bình Dương', 'Đông Nam Á', 'Toàn Cầu', 'Miền Bắc', 'Miền Nam', 'Trung Ương'];

const CITIES = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ', 'Biên Hòa', 'Nha Trang', 'Huế', 'Vũng Tàu', 'Quy Nhơn'];
const DISTRICTS = ['Quận 1', 'Quận 2', 'Quận 3', 'Quận 4', 'Quận 5', 'Quận 7', 'Quận 10', 'Hoàn Kiếm', 'Ba Đình', 'Cầu Giấy', 'Thanh Xuân', 'Hải Châu', 'Sơn Trà'];
const STREETS = ['Nguyễn Huệ', 'Lê Lợi', 'Trần Hưng Đạo', 'Hai Bà Trưng', 'Lý Thường Kiệt', 'Điện Biên Phủ', 'Võ Văn Kiệt', 'Phan Chu Trinh'];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateVietnameseName(): string {
  return `${randomElement(VIETNAMESE_FIRST_NAMES)} ${randomElement(VIETNAMESE_MIDDLE_NAMES)} ${randomElement(VIETNAMESE_LAST_NAMES)}`;
}

function generateCompanyName(industry: string): string {
  return `${randomElement(COMPANY_TYPES)} ${industry} ${randomElement(COMPANY_SUFFIXES)}`;
}

function generateAddress(): string {
  return `${randomInt(1, 999)} ${randomElement(STREETS)}, ${randomElement(DISTRICTS)}, ${randomElement(CITIES)}`;
}

function generatePhone(): string {
  return `09${randomInt(10000000, 99999999)}`;
}

function generateTaxCode(): string {
  return `${randomInt(1000000000, 9999999999)}`;
}

function generateProductImage(category: string): string {
  // Generate placeholder image URL
  const colors = ['3498db', 'e74c3c', '2ecc71', 'f39c12', '9b59b6', '1abc9c'];
  const color = randomElement(colors);
  return `https://placehold.co/400x400/${color}/ffffff?text=${encodeURIComponent(category)}`;
}

// Categories
const CATEGORIES = [
  { name: 'Điện tử - Máy tính', code: 'COMP', description: 'Máy tính, laptop, linh kiện PC' },
  { name: 'Điện tử - Di động', code: 'MOBI', description: 'Điện thoại, tablet, phụ kiện di động' },
  { name: 'Điện tử - Âm thanh', code: 'AUDI', description: 'Tai nghe, loa, thiết bị âm thanh' },
  { name: 'Điện tử - Hình ảnh', code: 'VISU', description: 'Màn hình, TV, máy chiếu' },
  { name: 'Điện tử - Gaming', code: 'GAME', description: 'Console, phụ kiện gaming' },
  { name: 'Thực phẩm - Đồ uống', code: 'BEVE', description: 'Cà phê, trà, nước giải khát' },
  { name: 'Thực phẩm - Khô', code: 'DRYF', description: 'Mì, gạo, bột, đồ khô' },
  { name: 'Thực phẩm - Gia vị', code: 'SPIC', description: 'Gia vị, nước chấm, dầu ăn' },
  { name: 'Thực phẩm - Snack', code: 'SNAC', description: 'Bánh kẹo, snack, đồ ăn vặt' },
  { name: 'Dược phẩm - Thuốc', code: 'DRUG', description: 'Thuốc kê đơn, thuốc OTC' },
  { name: 'Dược phẩm - TPCN', code: 'SUPP', description: 'Thực phẩm chức năng, vitamin' },
  { name: 'Dược phẩm - Y tế', code: 'MEDI', description: 'Dụng cụ y tế, vật tư tiêu hao' },
  { name: 'Văn phòng phẩm - Viết', code: 'WRIT', description: 'Bút, mực, bảng viết' },
  { name: 'Văn phòng phẩm - Giấy', code: 'PAPE', description: 'Giấy in, sổ, tập' },
  { name: 'Văn phòng phẩm - Dụng cụ', code: 'TOOL', description: 'Dụng cụ văn phòng, kẹp, ghim' },
  { name: 'Gia dụng - Nội thất', code: 'FURN', description: 'Bàn, ghế, tủ, kệ' },
  { name: 'Gia dụng - Nhà bếp', code: 'KITC', description: 'Dụng cụ nhà bếp, nồi, chảo' },
  { name: 'Gia dụng - Điện gia dụng', code: 'APPL', description: 'Quạt, bàn ủi, máy hút bụi' },
  { name: 'Thời trang - Nam', code: 'MENS', description: 'Quần áo nam, giày dép nam' },
  { name: 'Thời trang - Nữ', code: 'WOME', description: 'Quần áo nữ, giày dép nữ' },
  { name: 'Thời trang - Trẻ em', code: 'KIDS', description: 'Quần áo trẻ em' },
  { name: 'Thời trang - Phụ kiện', code: 'ACCE', description: 'Túi, balo, ví, thắt lưng' },
  { name: 'Mỹ phẩm - Chăm sóc da', code: 'SKIN', description: 'Kem dưỡng, sữa rửa mặt' },
  { name: 'Mỹ phẩm - Trang điểm', code: 'MAKE', description: 'Son, phấn, mascara' },
  { name: 'Mỹ phẩm - Chăm sóc tóc', code: 'HAIR', description: 'Dầu gội, dầu xả, thuốc nhuộm' },
  { name: 'Mỹ phẩm - Cơ thể', code: 'BODY', description: 'Sữa tắm, kem body' },
  { name: 'Đồ chơi - Trẻ em', code: 'TOYS', description: 'Đồ chơi cho trẻ nhỏ' },
  { name: 'Đồ chơi - Giáo dục', code: 'EDUT', description: 'Đồ chơi giáo dục, STEM' },
  { name: 'Đồ chơi - Mô hình', code: 'MODE', description: 'Mô hình, figure, collectible' },
  { name: 'Thể thao - Dụng cụ', code: 'SPOR', description: 'Bóng, vợt, dụng cụ tập' },
  { name: 'Thể thao - Trang phục', code: 'SPWE', description: 'Quần áo thể thao, giày thể thao' },
  { name: 'Thể thao - Phụ kiện', code: 'SPAC', description: 'Bình nước, túi, băng đô' },
  { name: 'Sách - Văn học', code: 'LITE', description: 'Tiểu thuyết, truyện ngắn' },
  { name: 'Sách - Kỹ năng', code: 'SKIL', description: 'Sách kỹ năng sống, kinh doanh' },
  { name: 'Sách - Học tập', code: 'STUD', description: 'Sách giáo khoa, tham khảo' },
  { name: 'Sách - Thiếu nhi', code: 'CHIL', description: 'Sách cho trẻ em' },
  { name: 'Đồ dùng học tập', code: 'SCHO', description: 'Cặp, hộp bút, thước kẻ' },
  { name: 'Điện tử - Phụ kiện', code: 'ELAC', description: 'Cáp, sạc, ốp lưng' },
  { name: 'Nông sản', code: 'AGRI', description: 'Rau củ quả sấy, hạt dinh dưỡng' },
  { name: 'Đồ uống có cồn', code: 'ALCO', description: 'Bia, rượu, vang' },
];

// Product name templates for ALL categories
const PRODUCT_NAMES: Record<string, string[]> = {
  COMP: ['Laptop Dell Inspiron', 'Laptop HP Pavilion', 'Laptop Asus VivoBook', 'Laptop Lenovo ThinkPad', 'Laptop Acer Aspire', 'PC Gaming RGB', 'PC Văn phòng', 'iMac', 'Mac Mini', 'RAM DDR4', 'RAM DDR5', 'SSD Samsung', 'SSD Kingston', 'HDD Seagate'],
  MOBI: ['iPhone 15', 'iPhone 14', 'Samsung Galaxy S24', 'Samsung Galaxy A54', 'Xiaomi 14', 'OPPO Reno 11', 'Vivo V30', 'Realme GT', 'iPad Air', 'iPad Pro', 'Samsung Tab S9'],
  AUDI: ['Tai nghe Sony WH-1000XM5', 'Tai nghe Bose QC45', 'AirPods Pro', 'Tai nghe JBL', 'Loa JBL Flip', 'Loa Sony SRS', 'Loa Marshall', 'Loa Harman Kardon'],
  VISU: ['Màn hình LG UltraWide', 'Màn hình Samsung Odyssey', 'TV Samsung QLED', 'TV LG OLED', 'Máy chiếu Epson', 'Máy chiếu BenQ'],
  GAME: ['PlayStation 5', 'Xbox Series X', 'Nintendo Switch', 'Tay cầm PS5', 'Tay cầm Xbox', 'Gaming Chair', 'Gaming Keyboard', 'Gaming Mouse'],
  BEVE: ['Cà phê Trung Nguyên G7', 'Cà phê Highlands', 'Cà phê Nescafe', 'Trà Lipton', 'Trà Ô Long', 'Nước ép TH True', 'Coca Cola', 'Pepsi', 'Sting', 'Red Bull'],
  DRYF: ['Gạo ST25', 'Gạo Jasmine', 'Mì Hảo Hảo', 'Mì Omachi', 'Mì Kokomi', 'Bột mì Meizan', 'Đường Biên Hòa', 'Muối I-ốt'],
  SPIC: ['Dầu ăn Neptune', 'Dầu ăn Simply', 'Nước mắm Nam Ngư', 'Nước mắm Phú Quốc', 'Tương ớt Cholimex', 'Hạt nêm Knorr', 'Bột canh Ajinomoto'],
  SNAC: ['Snack Oishi', 'Bánh Oreo', 'Kẹo Alpenliebe', 'Socola Kitkat', 'Kẹo dẻo Haribo', 'Bánh quy Cosy'],
  DRUG: ['Paracetamol 500mg', 'Amoxicillin 500mg', 'Vitamin B Complex', 'Aspirin 100mg', 'Ibuprofen 400mg'],
  SUPP: ['Vitamin C 1000mg', 'Vitamin D3', 'Omega 3', 'Canxi + D3', 'Sắt + Acid Folic', 'Probiotics'],
  MEDI: ['Khẩu trang y tế', 'Găng tay y tế', 'Cồn sát khuẩn', 'Băng cá nhân', 'Nhiệt kế điện tử', 'Máy đo huyết áp'],
  WRIT: ['Bút bi Thiên Long', 'Bút gel Pentel', 'Bút lông Artline', 'Bút chì 2B', 'Bút dạ quang Stabilo', 'Mực in HP', 'Mực in Canon'],
  PAPE: ['Giấy A4 Double A', 'Giấy A4 IK Plus', 'Sổ tay Campus', 'Sổ lò xo Hồng Hà', 'Tập vở ô ly', 'Giấy note Post-it'],
  TOOL: ['Dập ghim Deli', 'Kéo văn phòng', 'Dao rọc giấy', 'Bấm lỗ giấy', 'Hộp đựng bút', 'Kẹp bướm'],
  FURN: ['Ghế văn phòng Ergonomic', 'Bàn làm việc gỗ', 'Tủ hồ sơ', 'Kệ sách', 'Ghế sofa', 'Bàn ăn'],
  KITC: ['Nồi cơm điện Philips', 'Bếp từ Sunhouse', 'Lò vi sóng Sharp', 'Máy xay sinh tố', 'Bộ nồi inox', 'Chảo chống dính'],
  APPL: ['Quạt điện Senko', 'Bàn ủi Philips', 'Máy hút bụi Electrolux', 'Máy lọc không khí', 'Máy sấy tóc'],
  MENS: ['Áo thun nam', 'Quần jean nam', 'Áo sơ mi nam', 'Quần kaki nam', 'Giày thể thao nam', 'Giày tây nam'],
  WOME: ['Áo thun nữ', 'Váy liền', 'Quần jean nữ', 'Áo kiểu nữ', 'Giày cao gót', 'Giày búp bê'],
  KIDS: ['Áo thun trẻ em', 'Quần short trẻ em', 'Váy bé gái', 'Áo khoác trẻ em'],
  ACCE: ['Balo laptop', 'Túi xách nữ', 'Ví da nam', 'Thắt lưng da', 'Cặp công sở'],
  SKIN: ['Kem dưỡng Olay', 'Sữa rửa mặt Cetaphil', 'Serum Vitamin C', 'Kem chống nắng Nivea', 'Mặt nạ giấy'],
  MAKE: ['Son môi Maybelline', 'Phấn nước Cushion', 'Mascara Loreal', 'Kẻ mắt nước', 'Phấn phủ'],
  HAIR: ['Dầu gội Dove', 'Dầu xả Sunsilk', 'Thuốc nhuộm tóc', 'Dầu dưỡng tóc', 'Gội khô Batiste'],
  BODY: ['Sữa tắm Lifebuoy', 'Sữa tắm Dove', 'Kem body Vaseline', 'Xà phòng Lux'],
  TOYS: ['LEGO Classic', 'Búp bê Barbie', 'Xe điều khiển', 'Đồ chơi gỗ', 'Xếp hình Rubik'],
  EDUT: ['Bộ thí nghiệm STEM', 'Đồ chơi lắp ráp', 'Tranh ghép puzzle', 'Bảng vẽ từ tính'],
  MODE: ['Mô hình Gundam', 'Figure One Piece', 'Mô hình xe hơi', 'Mô hình máy bay'],
  SPOR: ['Bóng đá Molten', 'Vợt cầu lông Yonex', 'Thảm yoga', 'Tạ tay', 'Dây nhảy'],
  SPWE: ['Áo thể thao Nike', 'Quần thể thao Adidas', 'Giày chạy bộ', 'Giày bóng đá'],
  SPAC: ['Bình nước Thermos', 'Túi thể thao', 'Băng đô thể thao', 'Găng tay tập gym'],
  LITE: ['Đắc Nhân Tâm', 'Nhà Giả Kim', 'Sapiens', 'Tuổi Trẻ Đáng Giá Bao Nhiêu', 'Cà Phê Cùng Tony'],
  SKIL: ['7 Thói Quen', 'Nghĩ Giàu Làm Giàu', 'Quản Trị Thời Gian', 'Kỹ Năng Giao Tiếp'],
  STUD: ['Sách Toán lớp 10', 'Sách Văn lớp 11', 'Sách Anh lớp 12', 'Đề thi THPT'],
  CHIL: ['Doraemon', 'Conan', 'Truyện cổ tích', 'Sách tô màu'],
  SCHO: ['Cặp học sinh', 'Hộp bút', 'Thước kẻ', 'Bút chì màu'],
  ELAC: ['Cáp sạc iPhone', 'Cáp USB-C', 'Sạc nhanh 65W', 'Ốp lưng điện thoại', 'Kính cường lực'],
  AGRI: ['Hạt điều rang', 'Nho khô', 'Mơ sấy', 'Hạt óc chó'],
  ALCO: ['Bia Heineken', 'Bia Tiger', 'Rượu vang Đà Lạt', 'Whisky Johnnie Walker'],
};

const seedUsers = async () => {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, env.saltRounds);
  const users = [];

  users.push({ email: ADMIN_EMAIL, fullName: 'Nguyễn Văn An', role: 'Admin' as const });

  for (let i = 0; i < 5; i++) {
    users.push({
      email: `manager${i + 1}@wms.local`,
      fullName: generateVietnameseName(),
      role: 'Manager' as const
    });
  }

  for (let i = 0; i < 14; i++) {
    users.push({
      email: `staff${i + 1}@wms.local`,
      fullName: generateVietnameseName(),
      role: 'Staff' as const
    });
  }

  await UserModel.insertMany(
    users.map((user) => ({
      ...user,
      passwordHash,
      isActive: true
    }))
  );

  logger.info(`✓ Seeded ${users.length} users`);
};

const seedCategories = async () => {
  const inserted = await CategoryModel.insertMany(CATEGORIES.slice(0, SEED_LIMITS.categories));
  logger.info(`✓ Seeded ${inserted.length} categories`);
  return inserted.map((cat) => ({ _id: cat._id as Types.ObjectId, code: cat.code, name: cat.name, description: cat.description }));
};

const seedPartners = async () => {
  const partners = [];

  const supplierIndustries = ['Điện Tử', 'Thực Phẩm', 'Dược Phẩm', 'Văn Phòng Phẩm', 'Nội Thất', 'Thời Trang', 'Mỹ Phẩm', 'Đồ Chơi', 'Thể Thao', 'Sách'];
  for (let i = 0; i < SEED_LIMITS.suppliers; i++) {
    const industry = randomElement(supplierIndustries);
    partners.push({
      type: 'supplier' as const,
      code: `SUP-${String(i + 1).padStart(4, '0')}`,
      name: `${generateCompanyName(industry)} ${i + 1}`,
      taxCode: generateTaxCode(),
      contact: `${generateVietnameseName()} - ${generatePhone()}`,
      address: generateAddress(),
      businessType: randomElement(['Nhà sản xuất', 'Nhà phân phối', 'Nhà bán lẻ'] as const),
      paymentTerm: randomElement(['3 Ngày', '7 ngày', '15 ngày', '30 ngày', '60 ngày']),
      isActive: true
    });
  }

  const customerTypes = ['Siêu Thị', 'Cửa Hàng', 'Nhà Thuốc', 'Chuỗi Bán Lẻ', 'Đại Lý', 'Nhà Phân Phối'];
  for (let i = 0; i < SEED_LIMITS.customers; i++) {
    const type = randomElement(customerTypes);
    partners.push({
      type: 'customer' as const,
      code: `CUST-${String(i + 1).padStart(4, '0')}`,
      name: `${type} ${randomElement(CITIES)} ${i + 1}`,
      taxCode: Math.random() > 0.3 ? generateTaxCode() : undefined,
      contact: `${generateVietnameseName()} - ${generatePhone()}`,
      address: generateAddress(),
      customerType: randomElement(['Cá nhân', 'Doanh nghiệp'] as const),
      creditLimit: randomInt(10000000, 500000000),
      paymentTerm: randomElement(['3 Ngày', '7 ngày', '15 ngày', '30 ngày']),
      isActive: true
    });
  }

  await PartnerModel.insertMany(partners);
  logger.info(`✓ Seeded ${partners.length} partners (50 suppliers, 100 customers)`);

  return await PartnerModel.find({});
};

const seedProducts = async (categories: any[], partners: any[]) => {
  const products = [];
  const suppliers = partners.filter(p => p.type === 'supplier');

  const desiredProductCount = SEED_LIMITS.products;
  const productsPerCategory = Math.max(1, Math.ceil(desiredProductCount / categories.length));

  for (const category of categories) {
    const productNames = PRODUCT_NAMES[category.code] || [`${category.name} Sản phẩm`];
    const variants = ['', 'Pro', 'Plus', 'Max', 'Ultra', 'Premium', 'Standard', 'Lite', 'Mini'];
    const colors = ['', 'Đen', 'Trắng', 'Xanh', 'Đỏ', 'Vàng', 'Xám', 'Hồng'];
    const sizes = ['', 'S', 'M', 'L', 'XL', '32GB', '64GB', '128GB', '256GB', '512GB'];

    for (let i = 0; i < productsPerCategory && products.length < desiredProductCount; i++) {
      const baseName = randomElement(productNames);
      const variant = i < variants.length ? variants[i] : '';
      const color = randomElement(colors);
      const size = randomElement(sizes);

      const nameParts = [baseName, variant, color, size].filter(Boolean);
      const name = nameParts.join(' ');

      const sku: string = `${category.code}-${String(products.length + 1).padStart(5, '0')}`;

      const priceIn = randomInt(10000, 50000000);
      const priceOut = Math.floor(priceIn * (1.2 + Math.random() * 0.5));

      const selectedSuppliers = suppliers
        .sort(() => 0.5 - Math.random())
        .slice(0, randomInt(1, 3))
        .map(s => s._id);

      products.push({
        sku,
        name,
        categoryId: category._id,
        unit: randomElement(['cái', 'hộp', 'chai', 'gói', 'túi', 'thùng', 'bộ', 'cặp', 'quyển']),
        priceIn,
        priceOut,
        minStock: randomInt(10, 100),
        image: generateProductImage(category.name),
        description: `${name} - Hàng chính hãng, bảo hành ${randomInt(6, 36)} tháng. ${category.description}`,
        supplierIds: selectedSuppliers
      });
    }
  }

  const inserted = await ProductModel.insertMany(products.slice(0, desiredProductCount));
  logger.info(`✓ Seeded ${inserted.length} products`);
  return inserted;
};
const createWarehouseTree = async () => {
  const allBins = [];

  const warehouseNames = ['Kho Trung Tâm Hà Nội', 'Kho Phân Phối TP.HCM', 'Kho Miền Trung Đà Nẵng'];
  const warehouseCodes = ['WH-HN', 'WH-HCM', 'WH-DN'];

  for (let w = 0; w < SEED_LIMITS.warehouses; w++) {
    const warehouse = await WarehouseNodeModel.create({
      type: 'warehouse',
      name: warehouseNames[w],
      code: `${warehouseCodes[w]}-001`,
      warehouseType: 'General'
    });

    const zoneNames = ['Khu A', 'Khu B', 'Khu C', 'Khu D', 'Khu E'];
    for (let z = 0; z < SEED_LIMITS.zonesPerWarehouse; z++) {
      const zone = await WarehouseNodeModel.create({
        type: 'zone',
        name: `${zoneNames[z]} - ${warehouse.name}`,
        code: `${warehouse.code}-Z${z + 1}`,
        parentId: warehouse._id
      });

      for (let a = 0; a < SEED_LIMITS.aislesPerZone; a++) {
        const aisle = await WarehouseNodeModel.create({
          type: 'aisle',
          name: `${zone.name} - Lối ${a + 1}`,
          code: `${zone.code}-A${a + 1}`,
          parentId: zone._id
        });

        for (let r = 0; r < SEED_LIMITS.racksPerAisle; r++) {
          const rack = await WarehouseNodeModel.create({
            type: 'rack',
            name: `${aisle.name} - Kệ ${r + 1}`,
            code: `${aisle.code}-R${r + 1}`,
            parentId: aisle._id
          });

          const bins = await WarehouseNodeModel.insertMany(
            Array.from({ length: SEED_LIMITS.binsPerRack }).map((_, b) => ({
              type: 'bin',
              name: `${rack.name} - Ngăn ${b + 1}`,
              code: `${rack.code}-B${b + 1}`,
              parentId: rack._id
            }))
          );

          allBins.push(...bins);
        }
      }
    }
  }

  logger.info(`✓ Created warehouse structure: ${SEED_LIMITS.warehouses} warehouses, ${SEED_LIMITS.warehouses * SEED_LIMITS.zonesPerWarehouse} zones, ${allBins.length} bins`);
  return allBins;
};

const seedInventory = async (products: any[], bins: any[]) => {
  const items = [];
  const desiredBinCount = Math.min(bins.length, SEED_LIMITS.inventoryPerProduct);

  for (const product of products) {
    const selectedBins = bins.sort(() => 0.5 - Math.random()).slice(0, desiredBinCount);

    for (const bin of selectedBins) {
      const baseQty = product.minStock || 50;
      let quantity;
      const rand = Math.random();

      // 10% Out of Stock, 20% Low Stock, 70% Normal
      if (rand < 0.1) {
        quantity = 0;
      } else if (rand < 0.3) {
        quantity = randomInt(1, baseQty - 1);
      } else {
        quantity = randomInt(baseQty, baseQty * 5);
      }

      items.push({
        productId: product._id,
        locationId: bin._id,
        quantity,
        status: 'available'
      });
    }
  }

  await InventoryModel.insertMany(items);
  logger.info(`✓ Seeded ${items.length} inventory records`);
  return items.length;
};

const seedNotifications = async (users: any[]) => {
  const notifications = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const targetUsers = users.slice(0, SEED_LIMITS.notifications);
  for (const user of targetUsers) {
    const count = 1;

    for (let i = 0; i < count; i++) {
      notifications.push({
        userId: user._id,
        type: randomElement(['info', 'warning', 'success', 'error']),
        title: randomElement([
          'Đơn hàng mới',
          'Cảnh báo tồn kho',
          'Phiếu nhập cần duyệt',
          'Kiểm kê định kỳ',
          'Hệ thống cập nhật',
          'Thanh toán đến hạn'
        ]),
        message: `Thông báo số ${i + 1} cho ${user.fullName}`,
        isRead: Math.random() > 0.5,
        createdAt: new Date(now - randomInt(0, 30) * dayMs)
      });
    }
  }

  const { NotificationModel } = await import('../src/models/notification.model.js');
  if (NotificationModel) {
    await NotificationModel.insertMany(notifications);
    logger.info(`✓ Seeded ${notifications.length} notifications`);
    return notifications.length;
  }
};

const seedFinancials = async (partners: any[]) => {
  const transactions = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const suppliers = partners.filter(p => p.type === 'supplier');
  const customers = partners.filter(p => p.type === 'customer');

  const expenseCount = Math.min(SEED_LIMITS.financialTransactions, suppliers.length)
    ? Math.ceil(SEED_LIMITS.financialTransactions / 2)
    : 0;
  const incomeCount = Math.min(SEED_LIMITS.financialTransactions, customers.length)
    ? SEED_LIMITS.financialTransactions - expenseCount
    : 0;

  for (let i = 0; i < expenseCount; i++) {
    const supplier = randomElement(suppliers);
    transactions.push({
      partnerId: supplier._id,
      type: 'expense',
      status: randomElement(['completed', 'completed', 'completed', 'pending']),
      amount: randomInt(5000000, 100000000),
      referenceType: 'Receipt',
      note: `Thanh toán nhập hàng ${supplier.name}`,
      date: new Date(now - randomInt(0, 90) * dayMs)
    });
  }

  for (let i = 0; i < incomeCount; i++) {
    const customer = randomElement(customers);
    transactions.push({
      partnerId: customer._id,
      type: 'income',
      status: randomElement(['completed', 'completed', 'pending']),
      amount: randomInt(10000000, 200000000),
      referenceType: 'Delivery',
      note: `Thu tiền bán hàng ${customer.name}`,
      date: new Date(now - randomInt(0, 90) * dayMs)
    });
  }

  const { FinancialTransactionModel } = await import('../src/models/transaction.model.js');
  if (FinancialTransactionModel) {
    await FinancialTransactionModel.insertMany(transactions);
    logger.info(`✓ Seeded ${transactions.length} financial transactions`);
    return transactions.length;
  }
};

const seedReceipts = async (partners: any[], products: any[], users: any[]) => {
  const receipts = [];
  const suppliers = partners.filter(p => p.type === 'supplier');
  const now = Date.now();
  const dayMs = 86400000;

  for (let i = 0; i < 30; i++) {
    const supplier = randomElement(suppliers);
    const date = new Date(now - randomInt(1, 60) * dayMs);
    const status = randomElement(['draft', 'approved', 'completed', 'completed', 'completed']);

    // Random 1-5 lines
    const lines = [];
    const lineCount = randomInt(1, 5);
    let totalAmount = 0;

    for (let j = 0; j < lineCount; j++) {
      const product = randomElement(products);
      const qty = randomInt(10, 100);
      const price = product.priceIn;
      totalAmount += qty * price;

      lines.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        qty: qty, // Required by schema
        orderQuantity: qty,
        receivedQuantity: status === 'completed' ? qty : 0,
        priceIn: price,
        subtotal: qty * price
      });
    }

    receipts.push({
      code: `REC-${Date.now().toString().slice(-6)}-${i + 100}`,
      type: 'Standard',
      status,
      supplierId: supplier._id,
      supplierName: supplier.name,
      warehouseId: null, // Global or specific
      expectedDate: new Date(date.getTime() + 3 * dayMs),
      date: date,
      lines: lines, // FIXED: items -> lines
      totalAmount,
      createdBy: randomElement(users)._id,
      createdAt: date,
      updatedAt: date
    });
  }

  const { ReceiptModel } = await import('../src/models/receipt.model.js');
  if (ReceiptModel) {
    await ReceiptModel.insertMany(receipts);
    logger.info(`✓ Seeded ${receipts.length} receipts`);
    return receipts.length;
  }
};

const seedDeliveries = async (partners: any[], products: any[], users: any[]) => {
  const deliveries = [];
  const customers = partners.filter(p => p.type === 'customer');
  const now = Date.now();
  const dayMs = 86400000;

  for (let i = 0; i < 30; i++) {
    const customer = randomElement(customers);
    const date = new Date(now - randomInt(1, 60) * dayMs);
    const status = randomElement(['draft', 'approved', 'delivered', 'completed', 'completed']);

    const lines = [];
    const lineCount = randomInt(1, 5);
    let totalAmount = 0;

    for (let j = 0; j < lineCount; j++) {
      const product = randomElement(products);
      const qty = randomInt(1, 20);
      const price = product.priceOut;
      totalAmount += qty * price;

      lines.push({
        productId: product._id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        qty: qty, // Required by schema
        orderQuantity: qty,
        shippedQuantity: ['delivered', 'completed'].includes(status) ? qty : 0,
        priceOut: price,
        subtotal: qty * price
      });
    }

    deliveries.push({
      code: `DEL-${Date.now().toString().slice(-6)}-${i + 100}`,
      status,
      customerId: customer._id,
      customerName: customer.name,
      date: date,
      expectedDate: new Date(date.getTime() + 2 * dayMs),
      lines: lines, // FIXED: items -> lines
      totalAmount,
      createdBy: randomElement(users)._id,
      createdAt: date,
      updatedAt: date
    });
    if (i === 0) console.log('Debug Delivery:', JSON.stringify(deliveries[0], null, 2));
  }

  const { DeliveryModel } = await import('../src/models/delivery.model.js');
  if (DeliveryModel) {
    await DeliveryModel.insertMany(deliveries);
    logger.info(`✓ Seeded ${deliveries.length} deliveries`);
    return deliveries.length;
  }
};

const seedIncidents = async (products: any[], users: any[]) => {
  const { ReceiptModel } = await import('../src/models/receipt.model.js');
  const { DeliveryModel } = await import('../src/models/delivery.model.js');
  const { IncidentModel } = await import('../src/models/incident.model.js');

  if (!IncidentModel || !ReceiptModel || !DeliveryModel) return;

  const sampleReceipts = await ReceiptModel.find().limit(5);
  const sampleDeliveries = await DeliveryModel.find().limit(5);
  const incidents = [];
  const now = Date.now();

  for (let i = 0; i < 10; i++) {
    const isReceipt = Math.random() > 0.5;
    const refSource = (isReceipt ? sampleReceipts : sampleDeliveries) as any[];
    if (refSource.length === 0) continue;

    const refItem = randomElement(refSource);
    const product = randomElement(products);

    incidents.push({
      type: randomElement(['damaged', 'shortage', 'rejected']),
      refType: isReceipt ? 'receipt' : 'delivery',
      refId: refItem._id,
      status: randomElement(['open', 'inProgress', 'resolved']),
      note: `Sự cố mẫu ${i + 1} - Hàng hóa bị lỗi`,
      lines: [{
        productId: product._id,
        quantity: randomInt(1, 5)
      }],
      action: randomElement(['replenish', 'return', 'refund']),
      createdBy: randomElement(users)._id,
      createdAt: new Date(now - randomInt(1, 30) * 86400000)
    });
  }

  await IncidentModel.insertMany(incidents);
  logger.info(`✓ Seeded ${incidents.length} incidents`);
};

const seedStocktakes = async (users: any[]) => {
  const { StocktakeModel } = await import('../src/models/stocktake.model.js');
  if (!StocktakeModel) return;

  const { InventoryModel } = await import('../src/models/inventory.model.js');
  const inventoryItems = await InventoryModel.find().limit(50).lean();

  const stocktakes = [];
  const now = Date.now();

  for (let i = 0; i < 5; i++) {
    const isPass = Math.random() > 0.4; // 60% pass

    // Select 3-8 items
    const selectedItems = inventoryItems
      .sort(() => 0.5 - Math.random())
      .slice(0, randomInt(3, 8));

    const stocktakeItems = selectedItems.map((inv: any) => {
      const systemQty = inv.quantity;
      // If stocktake is 'diff', items MIGHT have diff
      const hasDiff = !isPass && Math.random() > 0.3;
      const countedQty = hasDiff ? Math.max(0, systemQty + randomInt(-5, 5)) : systemQty;

      return {
        productId: inv.productId,
        locationId: inv.locationId,
        systemQty,
        countedQty,
        serials: []
      };
    });

    stocktakes.push({
      code: `STK-${202500 + i}`,
      date: new Date(now - randomInt(0, 30) * 86400000),
      status: isPass ? 'pass' : 'diff',
      items: stocktakeItems,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  await StocktakeModel.insertMany(stocktakes);
  logger.info(`✓ Seeded ${stocktakes.length} stocktakes`);
};

import { fileURLToPath } from 'node:url';

export const seed = async (skipConnect = false) => {
  if (!skipConnect) {
    await connectMongo();
  }
  logger.info('🌱 Starting MASSIVE seed process...\n');

  const collections = [UserModel, CategoryModel, ProductModel, PartnerModel, WarehouseNodeModel, InventoryModel];

  try {
    const { NotificationModel } = await import('../src/models/notification.model.js');
    if (NotificationModel) await NotificationModel.deleteMany({});

    const { FinancialTransactionModel } = await import('../src/models/transaction.model.js');
    if (FinancialTransactionModel) await FinancialTransactionModel.deleteMany({});

    const { ReceiptModel } = await import('../src/models/receipt.model.js');
    if (ReceiptModel) await ReceiptModel.deleteMany({});

    const { DeliveryModel } = await import('../src/models/delivery.model.js');
    if (DeliveryModel) await DeliveryModel.deleteMany({});

    const { StocktakeModel } = await import('../src/models/stocktake.model.js');
    if (StocktakeModel) await StocktakeModel.deleteMany({});

    const { AdjustmentModel } = await import('../src/models/adjustment.model.js');
    if (AdjustmentModel) await AdjustmentModel.deleteMany({});
  } catch (e) {
    logger.warn('Some collections skipped during wipe');
  }

  // await Promise.all(collections.map((model) => (model as any).deleteMany({})));
  logger.info('✓ Wiped all collections (SKIPPED)\n');

  // Ensure core data exists
  let users = await UserModel.find({});
  if (users.length === 0) {
    logger.info('Users missing, re-seeding...');
    await seedUsers();
    users = await UserModel.find({});
  }

  let categories = await CategoryModel.find({});
  if (categories.length === 0) {
    categories = await seedCategories();
  }

  let partners = await PartnerModel.find({});
  if (partners.length === 0) {
    partners = await seedPartners();
  }

  let products = await ProductModel.find({});
  if (products.length === 0) {
    products = await seedProducts(categories, partners);
  }

  const bins = await WarehouseNodeModel.find({ type: 'bin' });
  if (bins.length === 0) {
    await createWarehouseTree();
  }

  await seedReceipts(partners, products, users);
  await seedDeliveries(partners, products, users);
  await seedIncidents(products, users);
  await seedStocktakes(users);

  // await seedNotifications(users);
  await seedFinancials(partners);

  logger.info('\n✅ MASSIVE Seed completed successfully!');
  logger.info(`
📊 Summary:
   - Users: ${users.length}
   - Categories: ${categories.length}
   - Products: ${products.length}
   - Partners: ${partners.length}
   - Warehouse Bins: ${bins.length}
   - Inventory Records: ~${products.length * 3}
   - Notifications: ~${users.length * 5}
   - Financial Transactions: 250
  `);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seed()
    .catch((error) => {
      console.log('Seed failed logic (STDOUT):', JSON.stringify(error, null, 2));
      fs.writeFileSync('error.json', JSON.stringify(error, null, 2));
      logger.error('Seed failed', { error });
      process.exitCode = 1;
    })
    .finally(async () => {
      await disconnectMongo();
    });
}
