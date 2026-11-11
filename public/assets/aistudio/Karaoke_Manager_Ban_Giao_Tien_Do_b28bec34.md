# TÀI LIỆU BÀN GIAO TIẾN ĐỘ DỰ ÁN KARAOKE MANAGER
**Tệp:** `D:\KRO\Karaoke_Manager_Ban_Giao_Tien_Do.md`  
**Ngày lập:** 11/11/2026  
**Giai đoạn hiện tại:** Giai đoạn 0 – Khảo sát, Phân tích Kiến trúc và Hoạch định Nghiệp vụ  
**Mục đích:** Bàn giao toàn diện bối cảnh, quy tắc đã chốt, các đề xuất kỹ thuật, các vấn đề mở và trạng thái Pricing Engine để phiên làm việc Cline mới tiếp nối chính xác mà không bị mất mát thông tin khi Context Window vượt giới hạn.

---

## 1. THÔNG TIN DỰ ÁN VÀ BỐI CẢNH VẬN HÀNH

- **Tên dự án:** Karaoke Manager – Hệ thống quản lý và tính tiền phòng Karaoke.
- **Bản chất dự án:** Đây là ứng dụng xây dựng mới hoàn toàn; **tuyệt đối không lấy nền tảng kỹ thuật Excel/VBA cũ làm kiến trúc ứng dụng**.
- **Định hướng nền tảng:**
  - Thiết bị vận hành/thu ngân chính: Máy tính Windows PC.
  - Thiết bị bổ sung cho nhân viên/quản lý: iPhone (qua Wi-Fi hoặc 5G).
  - Kiến trúc cốt lõi: **Offline-first** (mất Internet vẫn vận hành bình thường trên local database) và có khả năng đồng bộ an toàn lên Cloud khi có mạng.
  - Giai đoạn đầu: Chạy PWA (React + TypeScript + Vite + Tailwind CSS + shadcn/ui + IndexedDB + Cloudflare Workers/D1/R2).
  - Giai đoạn sau: Đóng gói Windows Native `.exe` bằng **Tauri + SQLite**, tái sử dụng toàn bộ giao diện và logic nghiệp vụ thuần TypeScript.
- **Đặc thù người dùng:** Người dùng/chủ đầu tư không chuyên về lập trình. Coding Agent phải hướng dẫn từng bước rõ ràng, giải thích cặn kẽ, **tuyệt đối không tự ý thực hiện các thao tác kỹ thuật ngoài phạm vi được giao**.
- **Công cụ làm việc hiện tại:** VS Code, Cline, OmniRoute và Git.
- **Môi trường máy tính phát triển:** Windows 10, Intel Core i5-8500T, RAM 8 GB, SSD 256 GB (ưu tiên công cụ nhẹ, không chạy model local nặng).

---

## 2. TÀI LIỆU NGUỒN QUAN TRỌNG CẦN ĐỌC LẠI TRONG PHIÊN MỚI

Khi khởi tạo phiên Cline mới, Agent bắt buộc phải đọc lại các tài liệu sau ở chế độ chỉ đọc:

1. `D:\KRO\Karaoke_Manager_Tong_Hop_Dac_Ta_va_Huong_Dan_Phat_Trien.md` (Đặc tả tổng thể nền tảng v0.9, 1.138 dòng).
2. `D:\KRO\bang_gia.md` (Đặc tả cấu hình bảng giá và loại phòng).
3. `D:\KRO\Karaoke_Manager_Ban_Giao_Tien_Do.md` (Chính tệp bàn giao này).

*Lưu ý quan trọng:* Tài liệu bàn giao này là bản tóm tắt trạng thái tiến độ và các quyết định, **không thay thế hai tài liệu đặc tả và bảng giá gốc**. Agent mới không được tự khẳng định đã đọc lại tài liệu nếu chưa thực sự gọi công cụ truy cập nội dung tệp.

---

## 3. CÁC QUYẾT ĐỊNH NGHIỆP VỤ ĐÃ ĐƯỢC NGƯỜI DÙNG XÁC NHẬN CHÍNH THỨC

Đây là các quyết định đã chốt $100\%$, Agent mới phải tuân thủ nghiêm ngặt, không được đặt lại câu hỏi hay tự ý suy diễn:

### 3.1. Chuyển phòng (Phương án A)
- Áp dụng **Phương án A: Tách thời gian liên tục theo từng phòng**.
- Mỗi lượt khách ở một phòng vật lý tạo thành một `RoomUsageSegment` độc lập.
- Thời gian ở phòng nào áp dụng đơn giá và quy tắc của phòng đó.
- Tuyệt đối không tính hồi tố toàn bộ thời gian của phiên theo giá của phòng cuối cùng.

### 3.2. Phương thức tính giá phòng
- **Phương thức `1 Giá`:** Chỉ sử dụng duy nhất đơn giá của cột **Buổi Sáng** (ứng với loại ngày tương ứng: Ngày thường, Thứ 7/CN hoặc Ngày lễ) làm đơn giá cố định cho cả ngày. Đơn giá tại các cột Buổi Chiều, Buổi Tối, Buổi Khuya hoàn toàn không có ý nghĩa trong phương thức này (bất kể bằng 0 hay bất kỳ giá trị nào).
- **Phương thức `Theo buổi`:** Mỗi buổi sử dụng đơn giá riêng biệt theo ma trận 12 cột (4 khung buổi $\times$ 3 loại ngày):
  - Giá bằng `0` đồng nghĩa với **Miễn phí tiền phòng**.
  - Giá bằng `1` đồng nghĩa với **1 VNĐ/giờ** (được tính toán chính xác vào tiền thô trước khi làm tròn tiền).
  - Các giá trị khác tính theo đúng đơn giá thực tế.

### 3.3. Quy tắc làm tròn thời gian
- Cài đặt bảng giá hỗ trợ danh sách lựa chọn bước nhảy làm tròn $R$:
  $$\mathbf{R \in \{0, 5, 10, 15, 20, 25, 30, 60\} \text{ phút}}$$
- **Với $R = 0$:** Không làm tròn, giữ nguyên thời gian sử dụng thực tế chính xác đến từng giây.
- **Với $R > 0$:** Làm tròn **XUỐNG (FLOOR)** theo bội số của $R$:
  $$\text{billed\_seconds} = \left\lfloor \frac{\text{actual\_seconds}}{R \times 60} \right\rfloor \times (R \times 60)$$
- **Phạm vi làm tròn:** Thực hiện **độc lập trên từng `RoomUsageSegment`**.
- **Cấm:** Không làm tròn độc lập trên từng `PricingSubsegment` con; không làm tròn trên tổng thời gian cả phiên rồi mới chia ngược về từng phòng.
- **Snapshot:** Cấu hình làm tròn thời gian được khóa snapshot vào phiên khi mở; thay đổi cấu hình sau đó trong Cài đặt không làm thay đổi các phiên đang chạy.

### 3.4. Các nguyên tắc tài chính và kiến trúc cốt lõi khác
- **Khả năng cấu hình (Config-Driven):** Mọi quy tắc tính toán phải cấu hình được qua giao diện Cài đặt bảng giá, tuyệt đối không hardcode trong mã nguồn.
- **Snapshot dữ liệu:** Cấu hình bảng giá, đơn giá, thông tin cửa hàng được khóa snapshot tại thời điểm phát sinh giao dịch/mở phiên; việc thay đổi danh mục sau này không làm sai lệch số liệu lịch sử.
- **Phân định cấp độ tiền:** Phân biệt rõ ràng giữa tiền thô chưa làm tròn (`raw_amount`) và số tiền thanh toán cuối cùng (`final_amount` / `payable_amount`). Tuyệt đối không lấy tiền thô làm tiền thanh toán cuối cùng trên hóa đơn.
- **Toàn vẹn dữ liệu tài chính:** Tuyệt đối không xóa vật lý (No hard delete) bất kỳ giao dịch, hóa đơn hay bản ghi tài chính nào; dùng trạng thái (soft status) và Audit Log bất biến.


---

## 4. TRẠNG THÁI PRICING ENGINE HIỆN TẠI VÀ LỊCH SỬ RÀ SOÁT

- **Báo cáo kỹ thuật mới nhất đã được lập:** Phiên bản **`V6.3-REV3.1`**.
- **Kết quả rà soát của bản REV3.1:**
  - Đã sửa lỗi số học trong TC-01 (áp đúng giá Chiều 250k cho 5 giây chuyển lệch, phân tách 2 nhánh theo Q6).
  - Đã sửa lỗi tính tiền trong Q3.4 (tổng sau minimum là $100.000,5$đ $\rightarrow$ làm tròn lên thành **$101.000$ VNĐ**, sửa lỗi ghi nhầm 100k ở bản REV3).
  - Đã thống nhất một bộ số liệu chuẩn hóa cho TC-06 và Q6.
- **Tình trạng phê duyệt:** Báo cáo **`V6.3-REV3.1` CHƯA ĐƯỢC PHÊ DUYỆT** làm đặc tả kỹ thuật cuối cùng.
- **Yêu cầu hiệu chỉnh tiếp theo từ ChatGPT/Người dùng:** Cần lập báo cáo hiệu chỉnh tiếp theo thành phiên bản **`V6.3-REV3.2`**.
- **Các nội dung trọng tâm cần hoàn thiện trong bản REV3.2:**
  1. *Làm rõ Q1:* Rà soát sự khác biệt giữa ngày lịch và ngày kinh doanh, đặc biệt tại mốc ranh giới 00:00 và 08:00 sáng.
  2. *Sửa bảng vòng đời phòng:* Phân biệt rõ các trường hợp hủy phiếu (actual_seconds = 0), thời gian bị FLOOR về 0 (actual_seconds > 0 nhưng billed_seconds = 0), và trường hợp miễn/hủy tiền sau khi đã sử dụng.
  3. *Xung đột giữa Q3 và Q6:* Hoàn thiện giải pháp kỹ thuật khi chọn Minimum theo phiên (Q3.1) kết hợp Làm tròn tiền theo từng đoạn (Q6.A).
  4. *Thuật toán Largest Remainder:* Sửa tham chiếu và bổ sung test case có phần dư thực sự để kiểm thử độ chính xác tuyệt đối.
  5. *Chuẩn hóa danh pháp Data Contract:* Thống nhất tên các trường tài chính: `raw_amount`, `amount_after_minimum`, `payable_amount` và `final_amount`.
  6. *Điều kiện số học BigInt:* Bổ sung các ràng buộc và kiểm tra giới hạn số học nguyên.
- **Hiện trạng mã nguồn:** **Chưa viết bất kỳ dòng mã nguồn nào cho Pricing Engine và chưa chạy kiểm thử runtime thực tế.** Dự án vẫn đang ở Giai đoạn 0.
- **Hiện trạng các câu hỏi mở:** Vẫn còn **7 câu hỏi nghiệp vụ (Q1 đến Q7)** chưa được người dùng phê duyệt; Agent không được tự ý lựa chọn phương án đề xuất thay cho người dùng.

---

## 5. CÁC ĐỀ XUẤT KỸ THUẬT CHƯA ĐƯỢC PHÊ DUYỆT (PROPOSED TECH SPECS)

Agent mới cần phân biệt rõ ràng: Các mục dưới đây chỉ là **Đề xuất kỹ thuật đang chờ thẩm định**, tuyệt đối không được coi là quy tắc nghiệp vụ đã chốt:

1. **Mô hình số học nguyên phân số mẫu số 3600 (Exact Fractional Arithmetic):** Sử dụng `BigInt` biểu diễn $\text{raw\_numerator} = \Delta t_{\text{seconds}} \times P_{\text{hour}}$ và $\text{raw\_denominator} = 3600\text{n}$ để triệt tiêu hoàn toàn sai số floating-point IEEE 754.
2. **Thuật toán Largest Remainder (Hamilton Method):** Đề xuất dùng để phân bổ thời gian nguyên (`billed_seconds`) giữa các `PricingSubsegment` con khi một phòng đi qua ranh giới đổi giá.
3. **Biểu diễn khung giờ bằng khoảng nửa mở:** $[07:00, 11:00)$, $[11:00, 17:00)$, $[17:00, 00:00)$, $[00:00, 07:00)$ để bảo đảm khép kín 24h không tính trùng và không mất 1 giây.
4. **Kiến trúc phân tách 2 cấp:**
   - `RoomUsageSegment`: Phân đoạn vật lý của một phòng.
   - `PricingSubsegment`: Lát cắt thời gian con có đơn giá đồng nhất.
5. **Pipeline xử lý 7 bước của Pricing Engine:** Từ tính thời gian thực $\rightarrow$ Làm tròn Floor $\rightarrow$ Phân bổ Subsegment $\rightarrow$ Tính tiền thô $\rightarrow$ Áp Minimum $\rightarrow$ Làm tròn tiền $\rightarrow$ Tổng hợp hóa đơn.
6. **Các kịch bản giải quyết xung đột Q3 $\times$ Q6:** Cách phân bổ hoặc tách dòng phụ thu tối thiểu khi Minimum áp dụng toàn phiên nhưng làm tròn tiền lại chạy theo từng đoạn.



---

## 6. DANH SÁCH BẢY CÂU HỎI NGHIỆP VỤ CÒN CHỜ NGƯỜI DÙNG QUYẾT ĐỊNH

*(Tất cả các lựa chọn và đề xuất kỹ thuật đi kèm chỉ mang tính chất tham khảo để người dùng xem xét, chưa phải quyết định cuối cùng):*

### Câu hỏi 1 (Q1): Loại ngày khi phiên phòng kéo dài qua ngày mới
- *Tình huống:* Mở phòng 22:00 Thứ Sáu (Ngày thường, 200k/h), hát đến 02:00 sáng Thứ Bảy (Cuối tuần, 250k/h).
- *Lựa chọn 1.A:* Khóa loại ngày theo lúc mở phòng (toàn bộ tính giá Thứ Sáu = 800k).
- *Lựa chọn 1.B:* Tách đoạn lúc 00:00:00 theo ngày lịch (2h Thứ Sáu + 2h Thứ Bảy = 900k).
- *Lựa chọn 1.C:* Neo theo Ngày kinh doanh mốc 08:00 sáng (trước 08:00 sáng Thứ Bảy vẫn tính ca Thứ Sáu = 800k).
- *Đề xuất kỹ thuật chưa duyệt:* Lựa chọn 1.C.

### Câu hỏi 2 (Q2): Loại ngày áp dụng cho khung BUỔI KHUYA (00:00 – 07:00)
- *Tình huống:* Mở phòng mới lúc 01:00 sáng ngày Thứ Bảy (theo lịch).
- *Lựa chọn 2.A:* Theo ngày lịch thực tế (áp giá Cuối tuần Thứ Bảy).
- *Lựa chọn 2.B:* Theo ngày kinh doanh ca đêm (vẫn thuộc ca Thứ Sáu $\rightarrow$ áp giá Ngày thường).
- *Đề xuất kỹ thuật chưa duyệt:* Lựa chọn 2.B.

### Câu hỏi 3 (Q3): Cơ chế áp dụng Mức tối thiểu khi chuyển phòng Option A
- *Tình huống:* Phòng Sảnh (Min = 0đ, thô = 0,5đ) chuyển sang Phòng NHỎ (Min = 100k, thô = 50k).
- *Lựa chọn 3.1:* Mức tối thiểu CAO NHẤT trong các phòng THỰC SỰ ĐÃ SỬ DỤNG trong phiên (Thu 100k).
  *(Lưu ý: Không lấy phòng chưa dùng trong danh mục; cần xác nhận điều kiện phòng đã dùng là `actual_seconds > 0` hay `billed_seconds > 0`).*
- *Lựa chọn 3.2:* Mức tối thiểu của PHÒNG ĐẦU TIÊN (Lấy theo Sảnh 0đ $\rightarrow$ Thu 51k sau làm tròn).
- *Lựa chọn 3.3:* Mức tối thiểu của PHÒNG CUỐI CÙNG (Lấy theo NHỎ 100k $\rightarrow$ Thu 100k).
- *Lựa chọn 3.4:* Áp dụng ĐỘC LẬP TỪNG ĐOẠN PHÒNG (Sảnh 0,5đ + NHỎ 100k $\rightarrow$ Thu 101k sau làm tròn).
- *Đề xuất kỹ thuật chưa duyệt:* Lựa chọn 3.1.

### Câu hỏi 4 (Q4): Có áp dụng Mức tối thiểu khi đơn giá giờ bằng 0 hay không?
- *Tình huống:* Giờ vàng khuyến mại đơn giá $= 0$ VNĐ/h, phòng có mức tối thiểu cấu hình $= 100.000$ VNĐ. Khách hát 1 giờ.
- *Lựa chọn 4.A:* Miễn phí hoàn toàn giờ hát, không thu tối thiểu (Thu 0 VNĐ).
- *Lựa chọn 4.B:* Miễn phí giờ hát nhưng vẫn thu phí sàn tối thiểu của phòng (Thu 100.000 VNĐ).
- *Đề xuất kỹ thuật chưa duyệt:* Lựa chọn 4.A.

### Câu hỏi 5 (Q5): Có áp dụng Mức tối thiểu khi thời gian tính tiền bằng 0 do FLOOR hay không?
- *Tình huống:* $R = 10$ phút. Khách vào hát thực tế 4 phút rồi về $\rightarrow \text{billed\_seconds} = 0$. Phòng có mức tối thiểu 100k.
- *Lựa chọn 5.A:* Thời gian tính tiền bằng 0 coi như chưa phát sinh dịch vụ tính phí (Thu 0 VNĐ).
- *Lựa chọn 5.B:* Đã có thời gian sử dụng thực tế (`actual_seconds > 0`) là phải chịu mức tối thiểu (Thu 100.000 VNĐ).
- *(Lưu ý: Nếu `actual_seconds = 0` do bấm nhầm hủy ngay, mặc định không thu tiền).*
- *Đề xuất kỹ thuật chưa duyệt:* Lựa chọn 5.A.

### Câu hỏi 6 (Q6): Phạm vi làm tròn tiền mặc định và Khả năng cấu hình
- *Tình huống:* Bộ số liệu TC-06 (Đoạn 1 thô $40.388,89$đ; Đoạn 2 thô $50.347,22$đ). Đơn vị làm tròn tiền $r_m = 1.000$ VNĐ.
- *Lựa chọn 6.A (`per_segment`):* Làm tròn từng đoạn ($41$k + $51$k = 92.000 VNĐ).
- *Lựa chọn 6.B (`total_session`):* Làm tròn trên tổng phiên ($90.736,11 \rightarrow 91.000$ VNĐ).
- *Vấn đề cần quyết định:* Khẳng định Cài đặt sẽ cho phép người quản lý tùy chọn giữa 6.A và 6.B; cần quyết định lựa chọn nào là **giá trị mặc định ban đầu** khi tạo cửa hàng mới.
- *Đề xuất kỹ thuật chưa duyệt:* Mặc định chọn 6.B (`total_session`).

### Câu hỏi 7 (Q7): Phê duyệt Thuật toán phân bổ thời gian Subsegment (Largest Remainder)
- *Lựa chọn 7.A:* Phê duyệt thuật toán Largest Remainder phân bổ số nguyên chính xác giữa các Subsegment.
- *Lựa chọn 7.B:* Yêu cầu phương án phân bổ khác (dồn vào buổi cuối, dồn vào buổi dài hơn...).
- *Đề xuất kỹ thuật chưa duyệt:* Lựa chọn 7.A.

---

## 7. BƯỚC TIẾP THEO KHI KHỞI TẠO PHIÊN CLINE MỚI

Khi phiên làm việc mới bắt đầu, Agent mới cần thực hiện tuần tự:

1. **Bước 1 (Đọc tài liệu nguồn):** Đọc kỹ tài liệu đặc tả tổng hợp (`Karaoke_Manager_Tong_Hop_Dac_Ta_va_Huong_Dan_Phat_Trien.md`), bảng giá (`bang_gia.md`) và tệp bàn giao này (`Karaoke_Manager_Ban_Giao_Tien_Do.md`).
2. **Bước 2 (Kiểm tra lịch sử):** Truy cập lại nội dung báo cáo `V6.3-REV3.1` trong lịch sử hội thoại nếu còn lưu trữ.
3. **Bước 3 (Soạn thảo REV3.2):** Thực hiện hiệu chỉnh toàn diện báo cáo Pricing Engine thành phiên bản **`V6.3-REV3.2`** theo đúng 6 yêu cầu kỹ thuật chi tiết đã nêu tại Mục 4 của tệp này.
4. **Bước 4 (Trình duyệt):** Trình báo cáo REV3.2 cho Người dùng và ChatGPT rà soát; lắng nghe phản hồi.
5. **Bước 5 (Kỷ luật tuyệt đối):** **CHỈ CHUYỂN SANG GIAI ĐOẠN 1 (KHỞI TẠO DỰ ÁN VÀ VIẾT CODE) KHI ĐƯỢC NGƯỜI DÙNG PHÊ DUYỆT RÕ RÀNG.**

---

## 8. GIỚI HẠN VÀ KỶ LUẬT BẮT BUỘC (STRICT CONSTRAINTS)

Trong suốt quá trình làm việc, Agent mới phải tuân thủ tuyệt đối:
- **TUYỆT ĐỐI KHÔNG** viết hoặc tạo bất kỳ file mã nguồn nào (`.ts`, `.tsx`, `.js`...).
- **TUYỆT ĐỐI KHÔNG** chỉnh sửa 2 file đặc tả gốc (`Karaoke_Manager_Tong_Hop_Dac_Ta_va_Huong_Dan_Phat_Trien.md` và `bang_gia.md`).
- **TUYỆT ĐỐI KHÔNG** tạo database, chạy lệnh migration, chạy lệnh `npm install` hay cài đặt bất kỳ thư viện/phần mềm nào.
- **TUYỆT ĐỐI KHÔNG** thực hiện các lệnh Git làm thay đổi trạng thái repository.
- **TUYỆT ĐỐI KHÔNG** tự ý phê duyệt hay tự chọn phương án thay cho Người dùng đối với 7 câu hỏi nghiệp vụ mở.
- **TUYỆT ĐỐI KHÔNG** tự ý tuyên bố dự án đã sẵn sàng $100\%$ khi các câu hỏi nghiệp vụ chưa có quyết định chính thức.

---
*Tài liệu bàn giao tiến độ đã được tạo và lưu trữ thành công tại `D:\KRO\Karaoke_Manager_Ban_Giao_Tien_Do.md`.*

