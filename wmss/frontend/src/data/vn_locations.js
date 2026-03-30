// Dữ liệu mẫu Demo cho Hà Nội, TP.HCM, Đà Nẵng
// Trong thực tế nên import từ file JSON đầy đủ hoặc API

export const VN_LOCATIONS = [
    {
        name: "Thành phố Hà Nội",
        code: "01",
        districts: [
            {
                name: "Quận Ba Đình",
                code: "001",
                wards: ["Phường Phúc Xá", "Phường Trúc Bạch", "Phường Vĩnh Phúc", "Phường Cống Vị", "Phường Liễu Giai", "Phường Quán Thánh", "Phường Điện Biên"]
            },
            {
                name: "Quận Hoàn Kiếm",
                code: "002",
                wards: ["Phường Phúc Tân", "Phường Đồng Xuân", "Phường Hàng Mã", "Phường Hàng Buồm", "Phường Hàng Đào", "Phường Hàng Bồ", "Phường Cửa Đông"]
            },
            {
                name: "Quận Cầu Giấy",
                code: "005",
                wards: ["Phường Nghĩa Đô", "Phường Nghĩa Tân", "Phường Mai Dịch", "Phường Dịch Vọng", "Phường Dịch Vọng Hậu", "Phường Quan Hoa", "Phường Yên Hòa", "Phường Trung Hòa"]
            },
            {
                name: "Quận Đống Đa",
                code: "006",
                wards: ["Phường Cát Linh", "Phường Văn Miếu", "Phường Quốc Tử Giám", "Phường Láng Thượng", "Phường Ô Chợ Dừa", "Phường Văn Chương", "Phường Hàng Bột"]
            }
        ]
    },
    {
        name: "Thành phố Hồ Chí Minh",
        code: "79",
        districts: [
            {
                name: "Quận 1",
                code: "760",
                wards: ["Phường Tân Định", "Phường Đa Kao", "Phường Bến Nghé", "Phường Bến Thành", "Phường Nguyễn Thái Bình", "Phường Phạm Ngũ Lão", "Phường Cầu Ông Lãnh"]
            },
            {
                name: "Quận 3",
                code: "770",
                wards: ["Phường 1", "Phường 2", "Phường 3", "Phường 4", "Phường 5", "Phường Vo Thi Sau"]
            },
            {
                name: "Quận 7",
                code: "778",
                wards: ["Phường Tân Thuận Đông", "Phường Tân Thuận Tây", "Phường Tân Kiểng", "Phường Tân Hưng", "Phường Bình Thuận", "Phường Phú Mỹ", "Phường Tân Phong", "Phường Tân Phú"]
            },
            {
                name: "Thành phố Thủ Đức",
                code: "769",
                wards: ["Phường Linh Xuân", "Phường Bình Chiểu", "Phường Linh Trung", "Phường Tam Bình", "Phường Tam Phú", "Phường Hiệp Bình Phước", "Phường Hiệp Bình Chánh"]
            }
        ]
    },
    {
        name: "Thành phố Đà Nẵng",
        code: "48",
        districts: [
            {
                name: "Quận Hải Châu",
                code: "490",
                wards: ["Phường Hải Châu I", "Phường Hải Châu II", "Phường Thạch Thang", "Phường Thanh Bình", "Phường Thuận Phước", "Phường Hòa Thuận Đông"]
            },
            {
                name: "Quận Thanh Khê",
                code: "491",
                wards: ["Phường Tam Thuận", "Phường Thanh Khê Tây", "Phường Thanh Khê Đông", "Phường Xuân Hà", "Phường Tân Chính", "Phường Chính Gián"]
            }
        ]
    }
];
