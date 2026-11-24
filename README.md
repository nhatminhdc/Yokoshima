# Website YOKOSHIMA

Website tĩnh (HTML/CSS/JS thuần), không cần build.

- `index.html` trang chủ, `san-pham-tat-ca.html` danh sách, `san-pham.html?id=<mã>` chi tiết,
  `so-sanh.html`, `gioi-thieu.html`, `cua-hang.html`, `tin-tuc.html`, `cong-nghe.html`,
  `ho-tro.html`, `lai-thu.html`, `dai-ly.html`.
- `assets/` chứa ảnh, `site.css` và `dc.js` (runtime dựng trang).
- Dữ liệu sản phẩm nằm trong biến `P` ở cuối mỗi trang có danh sách xe.

## Chạy thử trên máy
`python3 -m http.server 8000` rồi mở http://localhost:8000

## Đưa lên Vercel
Import repo này vào Vercel, Framework Preset chọn "Other", không cần lệnh build, thư mục gốc là `/`.

## Chưa hoạt động thật
- Các form (lái thử, liên hệ, đại lý) chưa gửi dữ liệu đi đâu.
- Nút "Mua qua Zalo" sao chép sẵn tin nhắn rồi mở Zalo 0933191866; khách dán và gửi.
