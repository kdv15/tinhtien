# BẢNG CÀI ĐẶT TÍNH TIỀN PHÒNG

## 1. BẢNG GIÁ 1 GIỜ

| STT | LOẠI PHÒNG | BUỔI SÁNG (Thường) | BUỔI SÁNG (Thứ 7 / CN) | BUỔI SÁNG (Ngày Lễ) | BUỔI CHIỀU (Thường) | BUỔI CHIỀU (Thứ 7 / CN) | BUỔI CHIỀU (Ngày Lễ) | BUỔI TỐI (Thường) | BUỔI TỐI (Thứ 7 / CN) | BUỔI TỐI (Ngày Lễ) | BUỔI KHUYA (Thường) | BUỔI KHUYA (Thứ 7 / CN) | BUỔI KHUYA (Ngày Lễ) | Thành tiền tối thiểu | GHI CHÚ |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | NHỎ | 200,000 | 200,000 | 250,000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 100,000 | |
| 2 | TO | 250,000 | 250,000 | 200,000 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 100,000 | |
| 3 | Sảnh | 1 | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | |

---

## 2. BẢNG CÀI ĐẶT TÍNH TIỀN PHÒNG CHI TIẾT

### Cấu hình chung

* **Phương thức tính tiền giờ:** `1 Giá` (Tùy chọn: `1 Giá` / `Theo Buổi`)
  * *Giải thích:* Tiền giờ = Số giờ $\times$ Giá cố định.

---

### 2.1. Cài đặt thời gian (Áp dụng tính giá theo buổi)

| Khung buổi | Giờ bắt đầu | Giờ kết thúc | Diễn giải quy tắc |
| :--- | :---: | :---: | :--- |
| **Buổi Sáng** | 07:00:00 | 10:59:59 | Từ 07:00 giờ đến 10:59 giờ sẽ áp dụng tính theo giá BUỔI SÁNG |
| **Buổi Chiều** | 11:00:00 | 16:59:59 | Từ 11:00 giờ đến 16:59 giờ sẽ áp dụng tính theo giá BUỔI CHIỀU |
| **Buổi Tối** | 17:00:00 | 23:59:59 | Từ 17:00 giờ đến 23:59 giờ sẽ áp dụng tính theo giá BUỔI TỐI |
| **Buổi Khuya** | 00:00:00 | 06:59:59 | Từ 00:00 giờ đến 06:59 giờ sẽ áp dụng tính theo giá BUỔI KHUYA |

---

### 2.2. Cài đặt làm tròn số

* **Làm tròn số giờ hát:** `5 phút`
  * *Diễn giải:* Số giờ sử dụng sẽ làm tròn lên 5 phút.
* **Làm tròn tiền giờ:** `Hàng nghìn`
  * *Diễn giải:* Ví dụ số tiền = $175.654$ thì làm tròn thành $176.000$.

---

### 2.3. Cài đặt chuyển phòng

* **Ngắt giờ khi chuyển phòng:** `Không`
  * *Diễn giải:* Khi chuyển phòng tiền giờ sẽ áp dụng theo giá của phòng chuyển đến (không ngắt giờ).