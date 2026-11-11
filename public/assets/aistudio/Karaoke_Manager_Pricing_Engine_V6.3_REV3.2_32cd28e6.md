# BÁO CÁO ĐẶC TẢ KỸ THUẬT VÀ THIẾT KẾ PRICING ENGINE
**Mã tài liệu:** `V6.3-REV3.2`  
**Dự án:** Karaoke Manager – Hệ thống quản lý và tính tiền phòng Karaoke  
**Tệp lưu trữ:** `D:\KRO\Karaoke_Manager_Pricing_Engine_V6.3_REV3.2.md`  
**Ngày lập:** 11/11/2026  
**Giai đoạn:** Giai đoạn 0 – Khảo sát, Phân tích Kiến trúc và Hoạch định Nghiệp vụ  
**Trạng thái thẩm định:** Đang chờ Người dùng và ChatGPT thẩm định phê duyệt  

---

## LỜI NÓI ĐẦU VÀ MỤC ĐÍCH PHIÊN BẢN REV3.2

Báo cáo kỹ thuật phiên bản **`V6.3-REV3.2`** được thiết lập trên cơ sở kế thừa bản rà soát `V6.3-REV3.1` và thực hiện toàn diện 6 nội dung hiệu chỉnh kỹ thuật được giao trong tiến độ bàn giao, đồng thời kết hợp các nguyên tắc nghiệp vụ đã được Người dùng xác nhận chính thức:

1. **Ghi nhận 2 quyết định nghiệp vụ đã chốt 100%:** Xác nhận Chuyển phòng theo **Phương án A (Tách thời gian liên tục theo từng phòng, không tính hồi tố)** và Làm tròn thời gian theo **Hàm FLOOR (Làm tròn xuống) độc lập trên từng `RoomUsageSegment`**. Hai nội dung này trở thành nguyên lý bất biến của Engine, không đặt lại thành câu hỏi chờ duyệt.
2. **Làm rõ bản chất dữ liệu 0 trong `bang_gia.md`:** Khẳng định quy tắc tính giá (giá 0 = miễn phí) độc lập với vấn đề cấu hình dữ liệu thực tế của quán.
3. **Mở rộng kịch bản Q1:** Bổ sung ví dụ kinh điển 12 tiếng (22:00 Thứ Sáu đến 10:00 Thứ Bảy) để làm nổi bật sự khác biệt giữa Ngày lịch, Khóa ngày mở phòng và Ngày kinh doanh mốc 08:00 sáng.
4. **Chuẩn hóa điều kiện Q3:** Phân tích định nghĩa phòng "thực sự sử dụng" theo `actual_seconds > 0` và `billed_seconds > 0` để người dùng lựa chọn.
5. **Giải quyết triệt để xung đột Q3 × Q6:** Trình bày 3 phương án xử lý toán học khi kết hợp Minimum toàn phiên (Q3.1) với Làm tròn tiền từng đoạn (Q6.A).
6. **Chuẩn hóa Thuật toán Hare-Niemeyer (Largest Remainder) trong Q7:** Sửa tên tham chiếu học thuật và xây dựng Test Case có phần dư thực tế chứng minh tính bảo toàn nguyên số giây.
7. **Quy định số học nguyên BigInt & Chuẩn hóa Data Contract:** Thiết lập công thức chia nguyên không sai số và thống nhất 4 trường dữ liệu tài chính: `raw_amount`, `amount_after_minimum`, `payable_amount`, `final_amount`.
8. **Bảng vòng đời phòng:** Phân biệt rạch ròi giữa Hủy do mở nhầm, FLOOR về 0 và Miễn/hủy tiền sau khi đã sử dụng.

---

## 1. PHÂN ĐỊNH NGUỒN GỐC VÀ TÍNH CHẤT CỦA CÁC QUY TẮC

Để đảm bảo tính minh bạch, báo cáo phân định tuyệt đối 5 nhóm thông tin:

* **Nhóm 1 – Quyết định nghiệp vụ đã được Người dùng xác nhận chính thức (100% Finalized):**
  - Chuyển phòng Option A (tách thời gian theo từng phòng, không hồi tố).
  - Phương thức tính giá `1 Giá` (chỉ lấy đơn giá Buổi Sáng) và `Theo Buổi` (ma trận 12 cột).
  - Đơn giá = 0 là Miễn phí; Đơn giá = 1 là 1 VNĐ/h.
  - Làm tròn thời gian FLOOR độc lập theo từng `RoomUsageSegment`.
  - Không hard delete dữ liệu tài chính; lưu snapshot cấu hình tại thời điểm mở phòng.
* **Nhóm 2 – Quy tắc kế thừa từ Tài liệu đặc tả nền tảng v0.9:**
  - Mô hình PWA-first (React + TS + Vite + Tailwind + shadcn/ui + IndexedDB + Cloudflare Workers/D1/R2).
  - Kiến trúc tách lớp nghiêm ngặt (UI $\rightarrow$ Domain Logic $\rightarrow$ Repository/Sync $\rightarrow$ Storage Adapter).
  - Xử lý hóa đơn phụ đến muộn khi thiết bị ngoại tuyến gửi món sau khi PC đã thanh toán.
* **Nhóm 3 – Đề xuất kỹ thuật của Coding Agent (Proposed Tech Specs - Đang chờ thẩm định):**
  - Mô hình Số học nguyên phân số mẫu số 3600 dùng `BigInt`.
  - Thuật toán Largest Remainder (Hamilton/Hare-Niemeyer) phân bổ số giây Subsegment.
  - Khung giờ nửa mở $[t_1, t_2)$ khép kín 24h.
  - Pipeline xử lý 7 bước của Pricing Engine.
  - Các kịch bản xử lý kỹ thuật cho xung đột Q3 $\times$ Q6.
* **Nhóm 4 – Bảy câu hỏi nghiệp vụ (Q1 đến Q7) đang chờ Người dùng quyết định:**
  - Q1 (Loại ngày qua đêm), Q2 (Loại ngày ca Khuya), Q3 (Cơ chế Minimum khi chuyển phòng), Q4 (Minimum khi đơn giá 0), Q5 (Minimum khi billed_seconds = 0), Q6 (Phạm vi làm tròn tiền mặc định), Q7 (Phê duyệt thuật toán phân bổ Subsegment).
* **Nhóm 5 – Dữ liệu thực tế cần chủ quán xác nhận:**
  - Cấu hình đơn giá thực tế của các buổi Chiều, Tối, Khuya trong bảng giá của quán (tránh dùng nhầm số liệu 0 mẫu).

---

## 2. HAI MÂU THUẪN NGHIỆP VỤ ĐÃ ĐƯỢC NGƯỜI DÙNG CHỐT CHÍNH THỨC

Trong quá trình rà soát giữa `bang_gia.md`, `Đặc tả v0.9` và `Bản bàn giao tiến độ`, hai điểm sai lệch đã được Người dùng phân xử và xác nhận chính thức:

### 2.1. Quy tắc chuyển phòng: Áp dụng Phương án A
* **Nội dung đã chốt:** Khi khách chuyển phòng, hệ thống áp dụng **Phương án A: Tách thời gian liên tục theo từng phòng**. Mỗi lượt phòng là một `RoomUsageSegment` độc lập. Ở phòng nào áp dụng bảng giá, đơn giá và cấu hình của phòng đó. Tuyệt đối không tính hồi tố toàn bộ phiên theo phòng chuyển đến.
* **Xử lý mâu thuẫn với `bang_gia.md`:** Nội dung tại Mục 2.3 file `bang_gia.md` (*"Ngắt giờ khi chuyển phòng: Không - áp dụng theo giá của phòng chuyển đến"*) là tàn dư cấu hình của phần mềm cũ/Excel, **chính thức bị bãi bỏ** trong hệ thống mới.

### 2.2. Hướng làm tròn thời gian: Áp dụng hàm FLOOR (Làm tròn xuống)
* **Nội dung đã chốt:** Cài đặt bảng giá hỗ trợ bước nhảy $R \in \{0, 5, 10, 15, 20, 25, 30, 60\}$ phút. Với $R > 0$, hệ thống làm tròn **XUỐNG (FLOOR)** theo bội số của $R$:
  $$\text{billed\_seconds} = \left\lfloor \frac{\text{actual\_seconds}}{R \times 60} \right\rfloor \times (R \times 60)$$
  Làm tròn thực hiện độc lập trên từng `RoomUsageSegment`.
* **Xử lý mâu thuẫn với `bang_gia.md` và `Đặc tả v0.9`:** Mô tả "làm tròn lên" tại Mục 2.2 file `bang_gia.md` và Mục 7.3 tài liệu đặc tả gốc được xác nhận là cách hiểu cũ, **chính thức được thay thế bằng hàm FLOOR** nhằm đảm bảo tính công bằng cho khách hàng (không thu vượt thời gian khách chưa sử dụng đủ block).

---

## 3. XÁC NHẬN VỀ BẢNG GIÁ VÀ GIÁ TRỊ 0 TRONG `bang_gia.md`

1. **Quy tắc xử lý giá 0 đã chốt:**
   - Trong phương thức `Theo Buổi`, đơn giá bằng `0` có nghĩa là **Miễn phí tiền phòng (0 VNĐ/giờ)**.
   - Trong phương thức `1 Giá`, hệ thống chỉ lấy đơn giá cột Buổi Sáng, các cột còn lại (kể cả ghi 0) hoàn toàn không được xét đến.
2. **Bản chất của bảng số liệu hiện tại:**
   - Việc các cột Chiều, Tối, Khuya trong file `bang_gia.md` ghi số 0 là **vấn đề xác nhận dữ liệu thực tế (Data Configuration Confirmation)**, không phải là thay đổi quy tắc tính toán của Pricing Engine.
   - Trách nhiệm của chủ quán/người quản lý là nhập bảng giá thực tế trước khi đưa vào vận hành. Pricing Engine tuân thủ nghiêm ngặt nguyên lý Config-Driven: dữ liệu nạp vào là bao nhiêu sẽ tính toán trung thực bấy nhiêu, không tự ý gán giá thay người dùng.


---

## 4. BẢN TẢ KIẾN TRÚC VÀ PIPELINE XỬ LÝ 7 BƯỚC CỦA PRICING ENGINE

### 4.1. Kiến trúc phân tách hai cấp (Two-Tier Time Architecture)
Để giải quyết bài toán phức tạp khi khách chuyển phòng và thời gian vắt qua nhiều khung giờ đổi giá, Pricing Engine thiết lập cấu trúc dữ liệu hai cấp:

``` text
Session (Phiên phòng khách hát)
 │
 ├── RoomUsageSegment 1 (Phòng A: từ t_in_1 đến t_out_1)
 │    ├── PricingSubsegment 1.1 (Buổi Sáng: đơn giá P_A_Sang)
 │    └── PricingSubsegment 1.2 (Buổi Chiều: đơn giá P_A_Chieu)
 │
 └── RoomUsageSegment 2 (Phòng B: từ t_in_2 đến t_out_2, t_in_2 = t_out_1)
      ├── PricingSubsegment 2.1 (Buổi Chiều: đơn giá P_B_Chieu)
      └── PricingSubsegment 2.2 (Buổi Tối: đơn giá P_B_Toi)
```

1. **Cấp 1 – `RoomUsageSegment` (Phân đoạn phòng vật lý):**
   - Đại diện cho một khoảng thời gian khách liên tục ở một phòng vật lý cụ thể.
   - Khi chuyển phòng, segment cũ kết thúc ($t_{\text{out}}$), segment mới bắt đầu ($t_{\text{in}} = t_{\text{out}}$).
   - **Đây là ranh giới duy nhất thực hiện việc làm tròn thời gian FLOOR theo bước nhảy $R$.**
2. **Cấp 2 – `PricingSubsegment` (Lát cắt đơn giá đồng nhất):**
   - Là các lát cắt thời gian con nằm bên trong một `RoomUsageSegment` khi thời gian của segment đó vắt qua một hoặc nhiều ranh giới đổi giá (giữa các buổi trong ngày hoặc qua mốc đổi ngày).
   - Mỗi `PricingSubsegment` có một đơn giá giờ duy nhất $P_{\text{hour}}$ và một loại ngày đồng nhất.
   - **Tuyệt đối không làm tròn thời gian độc lập trên từng `PricingSubsegment`.** Tổng thời gian các Subsegment được chuẩn hóa chính xác bằng số giây tính tiền sau FLOOR của Segment cha thông qua thuật toán phân bổ nguyên số giây.

---

### 4.2. Pipeline xử lý 7 bước (The 7-Step Calculation Pipeline)

Pricing Engine thực thi tuần tự theo 7 bước nghiêm ngặt:

* **Bước 1: Tính thời gian thực tế ($\Delta t_{\text{actual}}$)**
  - Với mỗi `RoomUsageSegment`, tính số giây thực tế: $\Delta t_{\text{actual}} = t_{\text{out}} - t_{\text{in}}$ (chính xác đến từng giây).
* **Bước 2: Làm tròn thời gian theo hàm FLOOR**
  - Đọc cấu hình bước nhảy $R \in \{0, 5, 10, 15, 20, 25, 30, 60\}$ phút được khóa snapshot.
  - Nếu $R = 0$: $\text{billed\_seconds} = \Delta t_{\text{actual}}$.
  - Nếu $R > 0$: $\text{billed\_seconds} = \lfloor \Delta t_{\text{actual}} / (R \times 60) \rfloor \times (R \times 60)$.
  - Nếu $\text{billed\_seconds} = 0$: Phiên kích hoạt quy trình xử lý biên (xem Mục 6).
* **Bước 3: Cắt và phân bổ thời gian Subsegment**
  - Xác định các ranh giới khung giờ $[07:00, 11:00)$, $[11:00, 17:00)$, $[17:00, 00:00)$, $[00:00, 07:00)$ rơi vào khoảng thời gian $[t_{\text{in}}, t_{\text{out}}]$.
  - Nếu segment nằm gọn trong một khung giờ: Toàn bộ $\text{billed\_seconds}$ thuộc về Subsegment duy nhất đó.
  - Nếu segment vắt qua nhiều khung giờ: Phân bổ $\text{billed\_seconds}$ thành các số nguyên $\text{sub\_seconds}_k$ theo tỷ lệ thời gian thực tế bằng **Thuật toán Largest Remainder (Hamilton/Hare-Niemeyer)**, đảm bảo $\sum \text{sub\_seconds}_k = \text{billed\_seconds}$.
* **Bước 4: Tính tiền thô (Raw Amount Calculation)**
  - Với mỗi Subsegment, tính tiền thô bằng số học nguyên BigInt:
    $$\text{sub\_raw} = \frac{\text{sub\_seconds} \times P_{\text{hour}}}{3600}$$
  - Tiền thô của Segment: $\text{segment\_raw} = \sum \text{sub\_raw}_k$.
  - Tiền thô của Phiên: $\text{session\_raw} = \sum \text{segment\_raw}$.
* **Bước 5: Áp dụng Mức sàn tối thiểu (Minimum Charge Engine)**
  - Đọc cấu hình Mức tối thiểu snapshot của phòng.
  - So sánh tiền thô với Mức tối thiểu theo phương án được chọn của Q3 để xác định `amount_after_minimum`.
* **Bước 6: Làm tròn tiền thanh toán (Money Rounding)**
  - Đọc đơn vị làm tròn tiền $r_m$ (ví dụ $1.000$ VNĐ) và hướng làm tròn (mặc định Làm tròn LÊN / CEIL theo thông lệ thương mại Việt Nam).
  - Áp dụng làm tròn theo phạm vi Q6 (theo từng đoạn `per_segment` hoặc theo tổng phiên `total_session`) để xác định trường thẩm quyền `payable_amount`.
* **Bước 7: Tổng hợp và đóng gói Data Contract hóa đơn**
  - Kết hợp `payable_amount` tiền phòng với tiền dịch vụ/món ăn, tiền phục vụ, chiết khấu và phụ phí để xác định tổng tiền thanh toán cuối cùng `final_amount`.
  - Khóa bất biến toàn bộ bản ghi hóa đơn và ghi Audit Log.


---

## 5. MÔ HÌNH SỐ HỌC NGUYÊN BIGINT VÀ CHUẨN HÓA DATA CONTRACT

### 5.1. Quy định số học nguyên BigInt và cấm số thực Floating-Point
Để loại bỏ hoàn toàn sai số làm tròn dấu phẩy động chuẩn IEEE 754 (vấn đề $0.1 + 0.2 \ne 0.3$), Pricing Engine áp dụng kỷ luật số học nguyên tuyệt đối:

1. **Tuyệt đối cấm:** Không sử dụng kiểu số thực `number` của JavaScript/TypeScript để thực hiện các phép nhân, chia, lũy kế tiền tệ hoặc thời gian trung gian.
2. **Mô hình Phân số nguyên chính xác (Exact Fractional Model):**
   - Mọi khoản tiền giờ được biểu diễn dưới dạng phân số có mẫu số cố định $3600\text{n}$ (số giây trong 1 giờ):
     $$\text{raw\_numerator} = \text{BigInt}(\Delta t_{\text{seconds}}) \times \text{BigInt}(P_{\text{hour}})$$
     $$\text{raw\_denominator} = 3600\text{n}$$
3. **Phép chia nguyên có làm tròn trần (Ceiling Integer Division):**
   - Khi làm tròn tiền LÊN bội số $r_m$ (ví dụ $r_m = 1.000\text{n}$ VNĐ), công thức toán học số nguyên chuẩn là:
     $$\left\lceil \frac{A}{B} \right\rceil = \frac{A + B - 1\text{n}}{B} \quad (\text{với } A \ge 0, B > 0)$$
   - Áp dụng vào Pricing Engine với $A = \text{raw\_numerator}$ và $B = 3600\text{n} \times \text{BigInt}(r_m)$:
     $$\text{units} = \frac{\text{raw\_numerator} + (3600\text{n} \times \text{BigInt}(r_m)) - 1\text{n}}{3600\text{n} \times \text{BigInt}(r_m)}$$
     $$\text{payable\_amount} = \text{units} \times \text{BigInt}(r_m)$$
4. **Giới hạn số học:** Trong môi trường V8 (Node.js/Workers/Trình duyệt), `BigInt` không bị giới hạn bởi ngưỡng an toàn $2^{53} - 1$ của kiểu `number`. Phép nhân thời gian hàng trăm ngày ($10^7$ giây) với đơn giá hàng trăm tỷ VNĐ ($10^{11}$ VNĐ) cho ra tử số $10^{18}$, hoàn toàn nằm an toàn trong bộ nhớ máy mà không bao giờ bị tràn số.

---

### 5.2. Chuẩn hóa Data Contract bốn trường dữ liệu tài chính

Để thống nhất danh pháp trên toàn bộ hệ thống (Local IndexedDB, Sync Engine, Cloudflare D1 và Giao diện UI), 4 trường tài chính được định nghĩa chuẩn tắc:

| Tên trường dữ liệu | Kiểu dữ liệu | Ý nghĩa nghiệp vụ | Nguồn thẩm quyền (Source of Truth) |
| :--- | :--- | :--- | :--- |
| **`raw_amount`** | Chuỗi phân số / BigInt | Số tiền giờ thô thuần túy tính từ $\text{billed\_seconds} \times P_{\text{hour}} / 3600$. Chưa xét Mức tối thiểu và chưa làm tròn tiền. | Dữ liệu kiểm toán nội bộ. **Tuyệt đối không dùng để thanh toán.** |
| **`amount_after_minimum`** | Chuỗi phân số / BigInt | Số tiền giờ thô sau khi đã so sánh với Mức sàn tối thiểu cấu hình: $\max(\text{raw\_amount}, \text{minimum\_amount})$. | Dữ liệu trung gian phục vụ bước làm tròn tiền. |
| **`payable_amount`** | Số nguyên (`number` / `BigInt`) | Số tiền phòng chính thức sau khi áp dụng quy tắc làm tròn tiền $r_m$ (theo phạm vi Q6.A hoặc Q6.B). | **NGUỒN THẨM QUYỀN DUY NHẤT CỦA TIỀN PHÒNG.** Dùng cho doanh thu phòng, công nợ và in dòng tiền phòng. |
| **`final_amount`** | Số nguyên (`number` / `BigInt`) | Tổng số tiền phải thanh toán của toàn bộ hóa đơn: $=\text{payable\_amount} + \text{tiền hàng/dịch vụ} - \text{giảm giá} + \text{phụ phí}$. | **NGUỒN THẨM QUYỀN DUY NHẤT CỦA HÓA ĐƠN.** Là số tiền khách phải trả tại quầy thu ngân. |

---

## 6. BẢNG PHÂN LOẠI VÒNG ĐỜI VÀ TRẠNG THÁI KẾT THÚC CỦA PHÒNG

Hệ thống phân biệt rạch ròi 3 tình huống kết thúc phòng để tránh nhầm lẫn giữa lỗi vận hành, cơ chế làm tròn và chính sách miễn giảm:

``` text
+---------------------------------------------------------------------------------------------------+
| Tình huống 1: HỦY DO MỞ NHẦM (Mistake Cancellation)                                               |
| - Điều kiện: actual_seconds == 0 hoặc thao tác hủy tức thời trong ngưỡng cho phép (nhầm phòng).   |
| - Trạng thái: CANCELLED_MISTAKE                                                                   |
| - Xử lý tiền: Tiền phòng = 0 VNĐ. Bỏ qua hoàn toàn Mức tối thiểu.                                 |
| - Hóa đơn: Không phát hành hóa đơn tài chính. Chỉ ghi Audit Log bảo mật.                          |
+---------------------------------------------------------------------------------------------------+
| Tình huống 2: SỬ DỤNG BỊ FLOOR VỀ 0 (Zero Billed Usage)                                           |
| - Điều kiện: actual_seconds > 0 nhưng billed_seconds == 0 do chưa đủ bước nhảy R (ví dụ hát 4p).  |
| - Trạng thái: COMPLETED_ZERO_BILLED                                                               |
| - Xử lý tiền: Tiền thô = 0 VNĐ.                                                                   |
|   + Nếu chọn Q5.A: Thu 0 VNĐ (coi như chưa phát sinh dịch vụ tính phí).                           |
|   + Nếu chọn Q5.B: Thu Minimum cấu hình (vì đã có actual_seconds > 0).                            |
| - Hóa đơn: Phát hành hóa đơn 0 VNĐ (nếu Q5.A) hoặc hóa đơn mức sàn (nếu Q5.B).                    |
+---------------------------------------------------------------------------------------------------+
| Tình huống 3: MIỄN / HỦY TIỀN SAU SỬ DỤNG (Waived / Compensated After Usage)                      |
| - Điều kiện: actual_seconds > 0, billed_seconds > 0. Khách đã hát nhưng gặp sự cố hoặc được đền bù.|
| - Trạng thái: WAIVED_COMPENSATED                                                                  |
| - Xử lý tiền: Tính đầy đủ billed_seconds và raw_amount gốc. Áp dụng khoản Chiết khấu/Đền bù 100%.|
| - Hóa đơn: Hóa đơn ghi rõ số tiền gốc, dòng giảm giá 100%, số tiền thu = 0 VNĐ.                  |
| - Kỷ luật: Yêu cầu mật khẩu cấp 2 của Quản lý/Admin; lưu Audit Log lý do đền bù bất biến.        |
+---------------------------------------------------------------------------------------------------+
```


---

## 7. PHÂN TÍCH CHUYÊN SÂU BẢY CÂU HỎI NGHIỆP VỤ MỞ (Q1 – Q7)

> **LƯU Ý QUAN TRỌNG:** Toàn bộ 7 câu hỏi dưới đây vẫn đang ở trạng thái **CHƯA ĐƯỢC NGƯỜI DÙNG PHÊ DUYỆT**. Các phân tích ưu nhược điểm và phương án kỹ thuật chỉ đóng vai trò luận cứ tham vấn, **Coding Agent tuyệt đối không tự ý lựa chọn phương án thay cho Người dùng**.

---

### Câu hỏi 1 (Q1): Xác định loại ngày khi phiên phòng kéo dài qua ngày mới

* **Ví dụ mẫu kiểm chứng chuyên sâu (Phiên 12 tiếng):**
  - Khách vào phòng NHỎ lúc: **22:00:00 Thứ Sáu** (Thứ Sáu là Ngày thường).
  - Khách thanh toán ra về lúc: **10:00:00 Thứ Bảy** (Thứ Bảy là Cuối tuần).
  - Tổng thời lượng sử dụng: Đúng 12 giờ ($43.200$ giây).
  - Các khung giờ đi qua: Buổi Tối ($22:00 - 24:00$), Buổi Khuya ($00:00 - 07:00$), Buổi Sáng ($07:00 - 10:00$).

* **Phân tích chi tiết 3 phương án:**

| Đặc điểm so sánh | Lựa chọn 1.A (Khóa ngày lúc mở) | Lựa chọn 1.B (Tách 00:00 theo ngày lịch) | Lựa chọn 1.C (Mốc Ngày kinh doanh 08:00) |
| :--- | :--- | :--- | :--- |
| **Cơ chế phân tách** | Toàn bộ 12 giờ bị khóa theo loại ngày lúc Check-in (**Ngày thường**). | Tách thành 2 khoảng lịch lúc 00:00:00: Thứ Sáu (2h) và Thứ Bảy (10h). | Tách tại mốc 08:00:00 sáng Thứ Bảy: Ca Thứ Sáu (10h) và Ca Thứ Bảy (2h). |
| **Phân bổ chi tiết các Subsegment** | - 2h Tối: Ngày thường<br>- 7h Khuya: Ngày thường<br>- 3h Sáng: Ngày thường | - 2h Tối: Ngày thường<br>- 7h Khuya: **Cuối tuần**<br>- 3h Sáng: **Cuối tuần** | - 2h Tối: Ngày thường<br>- 7h Khuya: **Ngày thường**<br>- 1h Sáng ($07-08$h): **Ngày thường**<br>- 2h Sáng ($08-10$h): **Cuối tuần** |
| **Ưu điểm** | Đơn giản nhất cho thu ngân và khách hàng, dễ giải thích. | Khớp tuyệt đối $100\%$ với lịch thiên văn và hệ thống ngày của máy tính. | Phù hợp hoàn hảo với tập quán vận hành quán Karaoke: khách đi ca đêm thứ Sáu xem toàn bộ cuộc vui là của tối thứ Sáu cho đến khi kết thúc ca làm việc sáng. |
| **Nhược điểm** | Quán thất thu nếu khách hát xuyên đêm sang ngày Lễ/Cuối tuần có giá cao hơn. | Khách hát từ 23:30 thứ Sáu, đúng 30 phút sau bị nhảy giá Cuối tuần dễ gây khiếu nại. | Phải cấu hình và quản lý mốc giờ bắt đầu ngày kinh doanh (Business Day Start). |

---

### Câu hỏi 2 (Q2): Xác định loại ngày cho BUỔI KHUYA (00:00 – 07:00) khi mở phòng mới lúc rạng sáng

* **Tình huống:** Khách mở phòng mới lúc **01:30 sáng Thứ Bảy** (theo lịch).
  - **Lựa chọn 2.A (Theo ngày lịch):** Thuộc ngày Thứ Bảy $\rightarrow$ Áp dụng đơn giá Cuối tuần.
  - **Lựa chọn 2.B (Theo ngày kinh doanh ca đêm):** Thuộc ca kinh doanh đêm của ngày Thứ Sáu $\rightarrow$ Áp dụng đơn giá Ngày thường.
* **Mối liên hệ mật thiết:** Nếu Q1 chọn 1.C thì Q2 bắt buộc phải đồng bộ theo 2.B để đảm bảo nhất quán toàn hệ thống.

---

### Câu hỏi 3 (Q3): Cơ chế Mức tối thiểu khi chuyển phòng Option A & Định nghĩa phòng đã dùng

* **Tình huống mẫu:** Khách mở phòng Sảnh (Min = 0đ, đơn giá 1đ/h, thô = 0,5đ), sau đó chuyển sang phòng NHỎ (Min = 100k, thô = 50k).
* **Vấn đề 1 – Tiêu chuẩn xác định phòng "Thực sự sử dụng":**
  - **Tiêu chuẩn 3.X.1 (`actual_seconds > 0`):** Khách chỉ cần nhận phòng có thời gian thực tế $> 0$ là phòng đó được tính vào danh sách xét Mức tối thiểu.
  - **Tiêu chuẩn 3.X.2 (`billed_seconds > 0`):** Chỉ những phòng có thời gian sau FLOOR $> 0$ mới được đưa vào danh sách xét duyệt. (Tránh tình trạng khách vào nhầm phòng 1-2 phút bị kéo mức tối thiểu của phòng đó).
* **Vấn đề 2 – Bốn lựa chọn cơ chế Mức tối thiểu:**
  - **Lựa chọn 3.1 (Mức tối thiểu CAO NHẤT trong các phòng đã dùng):** Xét các phòng đã dùng trong phiên, lấy $\max(\text{Min}_k) = 100.000$ VNĐ áp dụng cho toàn phiên.
  - **Lựa chọn 3.2 (Mức tối thiểu của PHÒNG ĐẦU TIÊN):** Lấy theo Sảnh = 0 VNĐ $\rightarrow$ Toàn phiên chỉ thu theo tiền thô làm tròn.
  - **Lựa chọn 3.3 (Mức tối thiểu của PHÒNG CUỐI CÙNG):** Lấy theo phòng kết thúc phiên (NHỎ = 100.000 VNĐ).
  - **Lựa chọn 3.4 (Áp dụng ĐỘC LẬP TỪNG PHÒNG):** Đoạn Sảnh xét riêng ($\max(0,5đ, 0đ) = 0,5đ$), Đoạn NHỎ xét riêng ($\max(50k, 100k) = 100k$).

---

### Xung đột kỹ thuật chuyên sâu giữa Q3 và Q6 (Minimum toàn phiên × Làm tròn từng đoạn)

Khi người dùng cấu hình đồng thời: **Minimum áp dụng toàn phiên (Q3.1)** và **Làm tròn tiền độc lập từng đoạn (Q6.A)**, xảy ra xung đột toán học khi tổng tiền thô nhỏ hơn Mức sàn tối thiểu ($\text{raw}_{\text{total}} < \text{Session\_Min}$).

* **Ví dụ:** Đoạn 1 thô $= 30.200$đ; Đoạn 2 thô $= 40.300$đ. Tổng thô $= 70.500$đ. Mức tối thiểu toàn phiên $= 100.000$đ.
* **Ba phương án giải quyết kỹ thuật:**
  - **Phương án Giải pháp 1 (Tách dòng Phụ thu tối thiểu riêng biệt - Khuyến nghị):**
    - Đoạn 1 làm tròn: $\text{line}_1 = \text{ceil}(30.200 / 1000) \times 1000 = 31.000$đ.
    - Đoạn 2 làm tròn: $\text{line}_2 = \text{ceil}(40.300 / 1000) \times 1000 = 41.000$đ.
    - Tổng tiền phòng đã làm tròn: $31.000 + 41.000 = 72.000$đ.
    - Vì $72.000 < 100.000$, hóa đơn tạo thêm dòng riêng: **"Phụ thu tối thiểu phiên phòng"** $= 100.000 - 72.000 = 28.000$đ.
    - *Đánh giá:* Rõ ràng, minh bạch 100% trên hóa đơn, khách không thắc mắc vì sao đơn giá phòng bị tăng.
  - **Phương án Giải pháp 2 (Phân bổ tỷ lệ khoản bù vào từng đoạn rồi làm tròn):**
    - Khoản bù $= 100.000 - 70.500 = 29.500$đ. Phân bổ vào Đoạn 1 và Đoạn 2 theo tỷ lệ tiền thô, sau đó mới làm tròn tiền từng đoạn.
    - *Đánh giá:* Dễ gây lệch số học do làm tròn độc lập 2 lần và khách tính lại thời gian $\times$ đơn giá sẽ không khớp với tiền trên hóa đơn.
  - **Phương án Giải pháp 3 (Chuyển chế độ làm tròn sang Tổng phiên):**
    - Nếu phiên bị kích hoạt mức tối thiểu toàn phiên, tự động chuyển chế độ làm tròn của phiên đó sang Q6.B (`total_session`).


---

### Câu hỏi 4 (Q4): Cơ chế áp dụng Mức tối thiểu khi đơn giá giờ bằng 0

* **Tình huống:** Quán áp dụng khung "Giờ vàng tri ân" đơn giá $= 0$ VNĐ/h. Phòng có mức tối thiểu cấu hình $= 100.000$ VNĐ. Khách vào hát 1 giờ trong khung giờ này.
  - **Lựa chọn 4.A (Miễn phí hoàn toàn):** Thu **0 VNĐ**. Tiền thô $= 0$ được xem là khuyến mại toàn phần, triệt tiêu điều kiện áp sàn tối thiểu.
  - **Lựa chọn 4.B (Vẫn thu sàn tối thiểu):** Thu **100.000 VNĐ**. Đơn giá giờ được miễn phí nhưng khách vẫn phải trả phí duy trì dịch vụ/phòng ốc tối thiểu.
* **Đề xuất kỹ thuật chưa duyệt:** Lựa chọn 4.A.

---

### Câu hỏi 5 (Q5): Cơ chế Mức tối thiểu khi thời gian tính tiền bằng 0 do hàm FLOOR

* **Tình huống:** Cấu hình làm tròn $R = 10$ phút ($600$ giây). Khách vào hát thực tế 4 phút ($240$ giây) rồi trả phòng $\rightarrow \text{billed\_seconds} = \lfloor 240 / 600 \rfloor \times 600 = 0$ giây. Mức tối thiểu cấu hình của phòng là $100.000$ VNĐ.
  - **Lựa chọn 5.A (Thu 0 VNĐ):** Thời gian tính tiền bị FLOOR về 0 coi như phiên chưa đủ điều kiện phát sinh nghĩa vụ tài chính tiền phòng.
  - **Lựa chọn 5.B (Thu 100.000 VNĐ):** Vì khách đã có thời gian sử dụng thực tế (`actual_seconds > 0`), khách vẫn phải chịu phí mở phòng tối thiểu.
* *(Lưu ý: Trường hợp nhân viên mở nhầm phòng hủy tức thời `actual_seconds == 0`, mặc định 100% không thu tiền theo Mục 6).*
* **Đề xuất kỹ thuật chưa duyệt:** Lựa chọn 5.A.

---

### Câu hỏi 6 (Q6): Phạm vi làm tròn tiền mặc định và Khả năng cấu hình

* **Tình huống:** Hóa đơn có nhiều đoạn phòng hoặc nhiều khung giá (ví dụ TC-06: Đoạn 1 thô $40.388,89$đ; Đoạn 2 thô $50.347,22$đ). Đơn vị làm tròn $r_m = 1.000$ VNĐ.
  - **Lựa chọn 6.A (`per_segment` - Làm tròn từng đoạn):** Làm tròn độc lập từng phòng: $\text{ceil}(40.388,89) = 41.000$đ; $\text{ceil}(50.347,22) = 51.000$đ. Tổng tiền phòng $= 92.000$ VNĐ.
  - **Lựa chọn 6.B (`total_session` - Làm tròn trên tổng phiên):** Cộng dồn tiền thô trước: $40.388,89 + 50.347,22 = 90.736,11$đ. Làm tròn trên tổng: $\text{ceil}(90.736,11) = 91.000$ VNĐ.
* **Xác nhận cấu hình:** Hệ thống sẽ hỗ trợ cấu hình tùy chọn giữa 6.A và 6.B trong giao diện Cài đặt.
* **Vấn đề chờ Người dùng quyết định:** Lựa chọn nào sẽ được đặt làm **giá trị mặc định ban đầu** khi khởi tạo cửa hàng mới?
* **Đề xuất kỹ thuật chưa duyệt:** Mặc định chọn 6.B (`total_session`).

---

### Câu hỏi 7 (Q7): Phê duyệt Thuật toán phân bổ số nguyên Subsegment (Hare-Niemeyer / Largest Remainder)

* **Chuẩn hóa danh pháp học thuật:** Đây là **Phương pháp Hare-Niemeyer (còn gọi là Phương pháp Hamilton hay Thuật toán Phần dư Lớn nhất - Largest Remainder Method)**, chuẩn mực quốc tế dùng trong phân bổ đại biểu và phân bổ số nguyên không mất mát.
* **Quy trình thuật toán phân bổ nguyên:**
  1. Với mỗi subsegment $k$, tính thời gian lý tưởng: $\text{ideal}_k = \text{billed\_seconds} \times \frac{\Delta t_{\text{actual}, k}}{\Delta t_{\text{actual\_total}}}$.
  2. Lấy phần nguyên sàn: $\text{base}_k = \lfloor \text{ideal}_k \rfloor$.
  3. Tính phần dư thập phân: $\text{fraction}_k = \text{ideal}_k - \text{base}_k$.
  4. Tính tổng phần nguyên: $\text{sum\_base} = \sum \text{base}_k$. Số giây nguyên còn thiếu cần bù là $D = \text{billed\_seconds} - \text{sum\_base}$.
  5. Sắp xếp các subsegment theo $\text{fraction}_k$ giảm dần. Phân bổ thêm $+1$ giây cho $D$ subsegment có phần dư lớn nhất.

* **Test Case chứng minh toán học có phần dư thực tế (TC-LRM):**
  - **Dữ liệu vào:** Bước nhảy $R = 15$ phút ($900$ giây). Phòng mở lúc **10:43:20** (Buổi Sáng), kết thúc lúc **11:31:50** (Buổi Chiều). Mốc chuyển buổi là **11:00:00**.
  - **Thời gian thực tế:**
    - Buổi Sáng: $10:43:20 \rightarrow 11:00:00 = 16$ phút $40$ giây $= 1.000$ giây.
    - Buổi Chiều: $11:00:00 \rightarrow 11:31:50 = 31$ phút $50$ giây $= 1.910$ giây.
    - Tổng thực tế: $\Delta t_{\text{actual\_total}} = 1.000 + 1.910 = 2.910$ giây ($48$ phút $30$ giây).
  - **Thời gian tính tiền sau FLOOR:**
    $$\text{billed\_seconds} = \left\lfloor \frac{2.910}{900} \right\rfloor \times 900 = 3 \times 900 = 2.700 \text{ giây (45 phút)}$$
  - **Thực thi phân bổ Hare-Niemeyer:**
    - Buổi Sáng: $\text{ideal}_{\text{Sáng}} = 2.700 \times \frac{1.000}{2.910} \approx 927,83505$ giây.
      - $\text{base}_{\text{Sáng}} = 927$ giây; $\text{fraction}_{\text{Sáng}} \approx 0,83505$.
    - Buổi Chiều: $\text{ideal}_{\text{Chiều}} = 2.700 \times \frac{1.910}{2.910} \approx 1.772,16494$ giây.
      - $\text{base}_{\text{Chiều}} = 1.772$ giây; $\text{fraction}_{\text{Chiều}} \approx 0,16494$.
    - Tổng phần nguyên: $927 + 1.772 = 2.699$ giây. Số giây thiếu: $D = 2.700 - 2.699 = 1$ giây.
    - So sánh phần dư: $\text{fraction}_{\text{Sáng}} (0,83505) > \text{fraction}_{\text{Chiều}} (0,16494)$.
    - Phân bổ $1$ giây bù vào Buổi Sáng.
  - **Kết quả phân bổ cuối cùng:**
    - Buổi Sáng: $\text{sub\_seconds}_{\text{Sáng}} = 927 + 1 = \mathbf{928 \text{ giây}}$.
    - Buổi Chiều: $\text{sub\_seconds}_{\text{Chiều}} = \mathbf{1.772 \text{ giây}}$.
    - **Kiểm tra bảo toàn:** $928 + 1.772 = \mathbf{2.700 \text{ giây}} \equiv \text{billed\_seconds}$ (Bảo toàn chính xác $100\%$, không mất 1 giây).
* **Đề xuất kỹ thuật chưa duyệt:** Phê duyệt Lựa chọn 7.A (áp dụng thuật toán Hare-Niemeyer).


---

## 8. BỘ TEST CASES CHUẨN HÓA CỦA PRICING ENGINE

### TC-01: Chuyển phòng qua khung giờ đổi giá & Rà soát 2 nhánh Q6
* **Kịch bản:** Phòng TO (giá Sáng 250k, Chiều 250k) mở lúc **10:00:00**, chuyển sang phòng NHỎ (giá Chiều 200k) lúc **11:00:05**, kết thúc lúc **12:00:05**. Cấu hình $R = 5$ phút ($300$ giây), $r_m = 1.000$ VNĐ.
* **Đoạn 1 (Phòng TO):** Thực tế $3.605$ giây $\rightarrow$ FLOOR còn $\text{billed\_seconds} = 3.600$ giây (1 giờ).
  - Ranh giới đổi buổi tại 11:00:00: Sáng có $3.600$s thực tế, Chiều có $5$s thực tế.
  - Thuật toán Hare-Niemeyer phân bổ $3.600$s theo tỷ lệ $3600/3605$ và $5/3605$:
    - $\text{ideal}_{\text{Sáng}} = 3600 \times \frac{3600}{3605} = 3595,0069... \rightarrow \text{base} = 3595$s; phần dư $\approx 0,007$.
    - $\text{ideal}_{\text{Chiều}} = 3600 \times \frac{5}{3605} = 4,993... \rightarrow \text{base} = 4$s; phần dư $\approx 0,993$.
    - Bù $1$s vào Chiều (do phần dư $0,993 > 0,007$): Sáng $= 3.595$s; Chiều $= 5$s.
  - Tiền thô Đoạn 1:
    $$\text{raw}_1 = \frac{3.595 \times 250.000}{3.600} + \frac{5 \times 250.000}{3.600} = \frac{3.600 \times 250.000}{3.600} = 250.000\text{ VNĐ}$$
* **Đoạn 2 (Phòng NHỎ):** Thực tế $3.600$ giây $\rightarrow \text{billed\_seconds} = 3.600$ giây. Nằm trọn trong Buổi Chiều (giá 200k/h).
  $$\text{raw}_2 = \frac{3.600 \times 200.000}{3.600} = 200.000\text{ VNĐ}$$
* **Kết quả tính tiền theo 2 nhánh Q6:**
  - Nhánh 6.A (`per_segment`): Đoạn 1 làm tròn $= 250.000$đ; Đoạn 2 làm tròn $= 200.000$đ $\rightarrow$ **Tổng $= 450.000$ VNĐ**.
  - Nhánh 6.B (`total_session`): Tổng thô $= 450.000$đ $\rightarrow$ Làm tròn $= \mathbf{450.000 \text{ VNĐ}}$.

---

### TC-02: Kiểm thử hàm FLOOR độc lập với các bước nhảy $R$
* **Kịch bản:** Khách hát thực tế $73$ phút $15$ giây ($4.395$ giây).
  - Với $R = 0$: $\text{billed\_seconds} = 4.395$ giây ($73$ phút $15$ giây).
  - Với $R = 5$ phút ($300$s): $\lfloor 4.395 / 300 \rfloor \times 300 = 14 \times 300 = 4.200$s ($70$ phút).
  - Với $R = 10$ phút ($600$s): $\lfloor 4.395 / 600 \rfloor \times 600 = 7 \times 600 = 4.200$s ($70$ phút).
  - Với $R = 15$ phút ($900$s): $\lfloor 4.395 / 900 \rfloor \times 900 = 4 \times 900 = 3.600$s ($60$ phút).
  - Với $R = 30$ phút ($1.800$s): $\lfloor 4.395 / 1.800 \rfloor \times 1.800 = 2 \times 1.800 = 3.600$s ($60$ phút).
  - Với $R = 60$ phút ($3.600$s): $\lfloor 4.395 / 3.600 \rfloor \times 3.600 = 1 \times 3.600 = 3.600$s ($60$ phút).

---

### TC-03: Đơn giá giờ bằng 0 (Giờ vàng khuyến mại)
* **Kịch bản:** Phòng NHỎ (Min cấu hình $100.000$đ), đơn giá giờ $= 0$ VNĐ/h. Khách hát $1$ giờ ($3.600$s). Tiền thô $= 0$ VNĐ.
  - Theo Lựa chọn 4.A: **Thu 0 VNĐ**.
  - Theo Lựa chọn 4.B: **Thu 100.000 VNĐ**.

---

### TC-04: Đơn giá 1 VNĐ/giờ (Phòng Sảnh chờ)
* **Kịch bản:** Phòng Sảnh (đơn giá $1$ VNĐ/h, Min $= 0$đ). Khách ngồi chờ $30$ phút ($1.800$s). Cấu hình $r_m = 1.000$ VNĐ.
  - Tiền thô: $\text{raw} = 1.800 \times 1 / 3.600 = 0,5$ VNĐ.
  - Làm tròn tiền lên bội số $1.000$đ: $\text{ceil}(0,5 / 1.000) \times 1.000 = \mathbf{1.000 \text{ VNĐ}}$.

---

### TC-05: Chuyển phòng Option A và các nhánh của Q3
* **Kịch bản:** Đoạn 1: Sảnh (Min $= 0$đ, giá 1đ/h), dùng $1.800$s $\rightarrow \text{raw}_1 = 0,5$đ. Đoạn 2: Phòng NHỎ (Min $= 100.000$đ, giá 200.000đ/h), dùng $900$s (15 phút) $\rightarrow \text{raw}_2 = 50.000$đ. Tổng thô $= 50.000,5$đ. $r_m = 1.000$đ.
  - Nhánh 3.1 (Min cao nhất $= 100k$): $\max(50.000,5đ, 100.000đ) = 100.000đ \rightarrow \mathbf{100.000 \text{ VNĐ}}$.
  - Nhánh 3.2 (Min phòng đầu $= 0k$): $\max(50.000,5đ, 0đ) = 50.000,5đ \rightarrow \text{ceil} \rightarrow \mathbf{51.000 \text{ VNĐ}}$.
  - Nhánh 3.3 (Min phòng cuối $= 100k$): $\max(50.000,5đ, 100.000đ) = 100.000đ \rightarrow \mathbf{100.000 \text{ VNĐ}}$.
  - Nhánh 3.4 (Độc lập từng phòng):
    - Đoạn Sảnh: $\max(0,5đ, 0đ) = 0,5đ \rightarrow \text{ceil} = 1.000đ$.
    - Đoạn NHỎ: $\max(50.000đ, 100.000đ) = 100.000đ$.
    - Tổng $= 1.000đ + 100.000đ = \mathbf{101.000 \text{ VNĐ}}$.

---

### TC-06: Chuẩn hóa làm tròn tiền theo từng đoạn (Q6.A) vs theo tổng phiên (Q6.B)
* **Kịch bản chuẩn hóa:**
  - Đoạn 1: Tiền thô $= 40.388,89$ VNĐ.
  - Đoạn 2: Tiền thô $= 50.347,22$ VNĐ.
  - Đơn vị làm tròn tiền: $r_m = 1.000$ VNĐ (Làm tròn lên).
* **Kết quả:**
  - Lựa chọn 6.A (`per_segment`): Đoạn 1 $= 41.000$đ; Đoạn 2 $= 51.000$đ $\rightarrow$ **Tổng $= 92.000$ VNĐ**.
  - Lựa chọn 6.B (`total_session`): Tổng thô $= 90.736,11$đ $\rightarrow$ Làm tròn trần $\rightarrow$ **Tổng $= 91.000$ VNĐ**.
  - Chênh lệch do phạm vi làm tròn: đúng $1.000$ VNĐ.


---

## 9. TỔNG KẾT, CÁC ĐIỂM CHỜ PHÊ DUYỆT VÀ CAM KẾT KỶ LUẬT

### 9.1. Danh mục các điểm chờ Người dùng quyết định

| STT | Vấn đề / Câu hỏi | Các lựa chọn có sẵn | Đề xuất kỹ thuật tham khảo | Tình trạng |
| :---: | :--- | :--- | :---: | :---: |
| 1 | **Q1: Loại ngày phiên qua đêm** | 1.A (Khóa lúc mở) / 1.B (00:00 ngày lịch) / 1.C (Mốc 08:00 ca kinh doanh) | 1.C | **Chờ Người dùng duyệt** |
| 2 | **Q2: Loại ngày ca Khuya mở rạng sáng** | 2.A (Theo ngày lịch) / 2.B (Theo ngày kinh doanh ca đêm) | 2.B | **Chờ Người dùng duyệt** |
| 3 | **Q3: Cơ chế Mức tối thiểu khi chuyển phòng** | 3.1 (Cao nhất) / 3.2 (Phòng đầu) / 3.3 (Phòng cuối) / 3.4 (Độc lập từng phòng) | 3.1 | **Chờ Người dùng duyệt** |
| 4 | **Định nghĩa phòng đã sử dụng (cho Q3)** | 3.X.1 (`actual_seconds > 0`) / 3.X.2 (`billed_seconds > 0`) | 3.X.2 | **Chờ Người dùng duyệt** |
| 5 | **Giải pháp xung đột Q3 × Q6** | Phương án 1 (Dòng phụ thu riêng) / PA 2 (Phân bổ tỷ lệ) / PA 3 (Chuyển sang 6.B) | Phương án 1 | **Chờ Người dùng duyệt** |
| 6 | **Q4: Mức tối thiểu khi đơn giá = 0** | 4.A (Thu 0 VNĐ) / 4.B (Vẫn thu sàn tối thiểu) | 4.A | **Chờ Người dùng duyệt** |
| 7 | **Q5: Mức tối thiểu khi thời gian bị FLOOR = 0** | 5.A (Thu 0 VNĐ) / 5.B (Vẫn thu sàn tối thiểu vì actual > 0) | 5.A | **Chờ Người dùng duyệt** |
| 8 | **Q6: Giá trị mặc định khi tạo mới cửa hàng** | 6.A (`per_segment`) / 6.B (`total_session`) | 6.B | **Chờ Người dùng duyệt** |
| 9 | **Q7: Phê duyệt thuật toán Hare-Niemeyer** | 7.A (Phê duyệt thuật toán Hare-Niemeyer) / 7.B (Yêu cầu phương án khác) | 7.A | **Chờ Người dùng duyệt** |
| 10 | **Dữ liệu bảng giá thực tế** | Xác nhận các số 0 tại Chiều/Tối/Khuya trong `bang_gia.md` là dữ liệu mẫu hay thật | Cần nhập giá thật | **Chờ Quán xác nhận** |

---

### 9.2. Cam kết kỷ luật Giai đoạn 0

1. **Tuyệt đối không viết mã nguồn:** Không tạo bất kỳ file mã nguồn `.ts`, `.tsx`, `.js` nào. Toàn bộ logic tính toán vẫn đang ở dạng đặc tả toán học và kiến trúc.
2. **Không sửa đổi tài liệu gốc:** Hai tệp gốc `Karaoke_Manager_Tong_Hop_Dac_Ta_va_Huong_Dan_Phat_Trien.md` và `bang_gia.md` được giữ nguyên vẹn ở chế độ chỉ đọc.
3. **Không can thiệp hệ thống:** Không tạo database, không chạy lệnh migration, không cài đặt thư viện (`npm install`), không thực hiện thao tác Git.
4. **Dừng lại chờ chỉ đạo:** Báo cáo kỹ thuật phiên bản `V6.3-REV3.2` dừng lại tại đây để Người dùng và ChatGPT tiến hành rà soát, phản biện và ra quyết định chính thức.

