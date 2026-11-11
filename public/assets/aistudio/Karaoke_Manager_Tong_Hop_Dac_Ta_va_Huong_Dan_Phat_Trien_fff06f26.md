# Karaoke Manager --- Tài liệu tổng hợp đặc tả sản phẩm và hướng dẫn phát triển

**Phiên bản:** 0.9 --- Bản tổng hợp để khởi tạo phát triển\
**Ngày cập nhật:** 10/11/2026\
**Trạng thái:** Đặc tả nền tảng; một số quy tắc nghiệp vụ được đánh dấu
**CHƯA CHỐT** và không được tự ý suy diễn khi lập trình.

> Tài liệu này là nguồn yêu cầu thống nhất ban đầu cho VS Code, Google
> AI Studio hoặc coding agent. AI lập trình phải đọc toàn bộ tài liệu
> trước khi sửa mã nguồn. Khi yêu cầu chưa rõ hoặc có mâu thuẫn, phải
> hỏi lại thay vì tự quyết định.

------------------------------------------------------------------------

# 1. Mục tiêu sản phẩm

Xây dựng phần mềm quản lý và tính tiền karaoke có tên tạm thời **Karaoke
Manager**, sử dụng được trên:

-   Máy tính Windows --- thiết bị vận hành/thu ngân chính.
-   iPhone --- thiết bị bổ sung, có thể thao tác qua Wi-Fi hoặc 5G.
-   Trình duyệt hiện đại dưới dạng PWA ở giai đoạn đầu.
-   Có lộ trình đóng gói thành ứng dụng Windows `.exe` ở giai đoạn sau,
    dùng lại phần lớn giao diện và nghiệp vụ.

Mục tiêu quan trọng:

1.  Giao diện POS nhanh, dễ dùng trong môi trường quán karaoke.
2.  Quản lý nhiều phòng, tính giờ, gọi món, kho, hóa đơn, thanh toán và
    công nợ.
3.  Dữ liệu dùng chung giữa nhiều thiết bị và nhiều cửa hàng.
4.  Offline-first: mất Internet vẫn thao tác được trên thiết bị có dữ
    liệu local.
5.  Đồng bộ an toàn, không tạo giao dịch trùng, không âm thầm ghi đè dữ
    liệu.
6.  Phân quyền theo từng cửa hàng.
7.  Có nhật ký kiểm toán đối với thao tác quan trọng.
8.  Có khả năng mở rộng sang ứng dụng Windows native mà không phải viết
    lại toàn bộ ứng dụng.

## 1.1 Nguyên tắc ưu tiên

-   Độ chính xác của tiền và dữ liệu quan trọng hơn hiệu ứng giao diện.
-   Không làm mất giao dịch khi chuyển màn hình, mất mạng hoặc tải lại
    trang.
-   Không sửa/xóa vật lý các giao dịch tài chính đã phát sinh; dùng
    trạng thái và audit log.
-   Không để AI tự thay đổi nghiệp vụ đã chốt.
-   Không xây toàn bộ tính năng trong một lần. Phát triển theo module,
    kiểm thử và nghiệm thu từng bước.
-   Các quyết định **CHƯA CHỐT** phải được hỏi người dùng trước khi
    triển khai phần liên quan.

------------------------------------------------------------------------

# 2. Kiến trúc công nghệ đã lựa chọn

## 2.1 Giai đoạn đầu: PWA-first

  Thành phần                Công nghệ
  ------------------------- -----------------------------------
  Frontend                  React + TypeScript + Vite
  PWA                       Web App Manifest + Service Worker
  UI framework              shadcn/ui
  CSS                       Tailwind CSS
  Primitive/accessibility   Radix UI thông qua shadcn/ui
  Icon                      Lucide
  Form                      React Hook Form + Zod
  Bảng dữ liệu              TanStack Table
  Biểu đồ                   Recharts
  Local database            IndexedDB
  Backend API               Cloudflare Workers
  Cloud database            Cloudflare D1
  Backup object storage     Cloudflare R2
  Version control           Git
  Package/runtime           Node.js LTS

Không tự ý thay đổi stack công nghệ nếu chưa được duyệt.

## 2.2 Giai đoạn sau: Windows Desktop

Dự kiến đóng gói bằng **Tauri + SQLite**.

-   Giữ React, TypeScript, UI và business logic dùng chung.
-   Tauri cung cấp native capabilities của Windows.
-   SQLite là local database cho ứng dụng desktop.
-   Có kế hoạch migration/export/import dữ liệu từ IndexedDB sang
    SQLite.
-   Giữ nguyên UUID, ID giao dịch, `store_id`, lịch sử và sync queue khi
    chuyển đổi.
-   Chưa triển khai Tauri, SQLite hoặc Windows Service trong giai đoạn
    PWA đầu tiên.

## 2.3 Nguyên tắc tách lớp bắt buộc

Không viết ứng dụng theo kiểu React component truy cập trực tiếp
IndexedDB hoặc gọi Cloudflare D1.

Kiến trúc logic:

``` text
React UI
   |
   v
Application / Business Logic
   |
   v
Repository + Sync Engine
   |                         |
   v                         v
Local Storage Adapter      Cloud API Client
   |                         |
   v                         v
IndexedDB                 Cloudflare Workers REST API
                             |
                             v
                         Cloudflare D1

Backup Adapter <----------> Cloudflare R2

Printing Adapter
Device Capability Adapter
```

Yêu cầu:

-   React screens không truy cập IndexedDB trực tiếp.
-   Business logic không phụ thuộc trình duyệt.
-   Tách adapter cho storage, printing, backup và device capabilities.
-   API contract và schema không phụ thuộc browser.
-   Không dùng browser-specific API trong business logic.
-   Có thể thay IndexedDB bằng SQLite mà không viết lại toàn bộ nghiệp
    vụ.
-   Tách rõ UI, domain/business rules, repository, API client và
    infrastructure.
-   Dùng TypeScript strict; hạn chế `any`.
-   Không nhúng bí mật/API secret trong frontend.

------------------------------------------------------------------------

# 3. Mô hình vận hành nhiều thiết bị và Offline-first

## 3.1 Thiết bị

-   PC quầy: thiết bị vận hành chính, có local database.
-   iPhone: thiết bị bổ sung, có local database riêng.
-   Cloud: nơi đồng bộ dữ liệu dùng chung giữa các thiết bị/cửa hàng.
-   iPhone có thể chuyển sang 5G khi Wi-Fi mất để gọi Cloud API nếu
    Internet di động còn hoạt động.

## 3.2 Quy tắc lưu dữ liệu

1.  Giao dịch phải được ghi local thành công trước khi UI thông báo đã
    lưu.
2.  Khi có mạng, Sync Engine gửi operation/giao dịch cụ thể lên Cloud.
3.  Chỉ đánh dấu `synced` khi Workers/D1 xác nhận thành công.
4.  Không gửi lại theo cách tạo bản ghi mới mỗi lần retry.
5.  Mỗi giao dịch có UUID ổn định và idempotency key.
6.  Mỗi dữ liệu nghiệp vụ cần có `store_id`, `device_id`, thời điểm
    tạo/cập nhật, version và sync status phù hợp.
7.  Không đồng bộ bằng cách ghi đè toàn bộ database.
8.  Có hàng đợi đồng bộ, retry có kiểm soát và trạng thái lỗi.
9.  Dữ liệu local chưa sync phải được giữ lại khi người dùng chuyển màn
    hình, F5 hoặc đóng/mở ứng dụng.
10. UI cần phân biệt trạng thái đã lưu trên thiết bị và đã đồng bộ
    Cloud.

## 3.3 Xung đột dữ liệu

-   Không âm thầm ghi đè nếu hai thiết bị cùng sửa một dữ liệu.
-   Có version/concurrency check.
-   Khi phát hiện xung đột, lưu thông tin cần thiết và thông báo để xử
    lý.
-   Không tự coi PC luôn đúng rồi ghi đè thay đổi từ iPhone.
-   Có thể ưu tiên PC trong quy trình vận hành, nhưng không được dùng ưu
    tiên đó để bỏ dữ liệu không có cảnh báo.
-   Giao dịch tài chính cần quy tắc xử lý riêng, không dùng
    last-write-wins đơn giản.

## 3.4 Hóa đơn phụ đến muộn

Tình huống mẫu:

-   iPhone offline thêm 5 chai bia vào phòng.
-   PC đã thanh toán hóa đơn chính gồm 6 chai bia và nước, sau đó kết
    thúc phiên.
-   iPhone có mạng trở lại và đồng bộ 5 chai bia muộn.

Xử lý bắt buộc:

-   Không tự sửa hóa đơn đã thanh toán.
-   Tạo **hóa đơn phụ / giao dịch bổ sung chờ duyệt** liên kết với hóa
    đơn/phiên gốc.
-   Admin có thể duyệt hoặc từ chối theo quyền.
-   Lưu người tạo, thiết bị, thời điểm, nội dung, người duyệt/từ chối và
    thời điểm xử lý.
-   Không xóa vật lý; dùng trạng thái.
-   Idempotency chống tạo hóa đơn phụ trùng khi retry.
-   Chỉ Admin được duyệt/từ chối theo quy tắc đã thống nhất hiện tại.
    Nếu muốn mở rộng quyền phải hỏi lại.

## 3.5 Tình huống mất điện/mất mạng

-   PC mất điện: giao dịch đã commit local có thể còn; thao tác chưa
    commit có thể mất.
-   Giao dịch đã sync Cloud còn trên D1.
-   Toàn quán mất điện: iPhone có 5G vẫn có thể truy cập Cloud với dữ
    liệu đã đồng bộ; không thể in qua thiết bị trong quán nếu
    Vinabox/máy in mất nguồn.
-   Khuyến nghị UPS cho PC, router, thiết bị in trung gian.
-   Cần có chức năng backup/export và quy trình phục hồi dữ liệu.
-   IndexedDB có thể chịu giới hạn dung lượng/eviction của trình duyệt;
    không được coi đây là nơi lưu trữ duy nhất lâu dài.

------------------------------------------------------------------------

# 4. Nhiều cửa hàng, tài khoản và phân quyền

## 4.1 Mô hình cửa hàng

Chọn mô hình **một tài khoản Owner/Admin quản lý nhiều cửa hàng**:

-   Owner có thể xem/quản lý nhiều cửa hàng và chuyển cửa hàng.
-   Nhân viên chỉ truy cập cửa hàng được phân công.
-   Một tài khoản có thể có toàn quyền ở cửa hàng A nhưng quyền khác
    hoặc không có quyền ở cửa hàng B.
-   Dữ liệu nghiệp vụ đều phải có `store_id`.
-   Một Cloudflare D1 dùng chung ở giai đoạn đầu.
-   Không yêu cầu người dùng nhập D1 Database ID trên giao diện.
-   Cấu hình database nằm ở server/Cloudflare environment.
-   Chỉ tách database khi quy mô thực tế yêu cầu.

## 4.2 Bảo mật phạm vi cửa hàng

-   Workers phải kiểm tra quyền và `store_id` ở server-side trên mọi
    request.
-   Không tin `store_id` do frontend gửi lên.
-   Không được chỉ ẩn menu để bảo vệ dữ liệu.
-   User không thể tự thay `store_id` trong request để đọc/sửa cửa hàng
    khác.
-   Kiểm tra quyền cả khi truy cập trực tiếp API, không chỉ qua UI.

## 4.3 Vai trò và quyền

Vai trò dự kiến:

-   `owner` / `admin`
-   `store_manager`
-   `cashier`
-   `staff`
-   `viewer`

Có thể có quyền override theo từng user/cửa hàng.

Các bảng dữ liệu dự kiến:

-   `stores`
-   `users`
-   `roles`
-   `permissions`
-   `role_permissions`
-   `user_store_roles`
-   `user_permission_overrides`
-   `audit_logs`

Phải phân biệt:

-   Tài khoản đăng nhập (`users`).
-   Hồ sơ nhân viên dùng trong nghiệp vụ (nếu cần).
-   Danh sách nhân viên phục vụ trong chức năng tính giờ phục vụ.
-   Danh sách quản lý phục vụ trong chức năng tính giờ phục vụ.

Không gộp các khái niệm này chỉ vì trùng tên.

------------------------------------------------------------------------

# 5. Định hướng UI/UX và Design System

## 5.1 Phong cách

Chọn phong cách **kết hợp POS + Admin Dashboard**, tông sáng:

-   Admin Dashboard là nền tảng bố cục.
-   Màn hình POS được thiết kế riêng để thao tác nhanh.
-   Không lấy nguyên một template làm toàn bộ ứng dụng.
-   Dùng shadcn/ui làm design system chung.
-   Không để AI tự thiết kế mỗi màn hình theo một phong cách khác nhau.

## 5.2 Màu sắc

  Token            Màu
  ---------------- -----------
  Primary          `#2563EB`
  Success          `#16A34A`
  Warning          `#D97706`
  Danger           `#DC2626`
  Background       `#F8FAFC`
  Surface          `#FFFFFF`
  Text             `#1E293B`
  Secondary text   `#64748B`
  Border           `#E2E8F0`

Màu trạng thái phòng:

-   Xanh lá: đang hoạt động.
-   Xanh dương: phòng trống.
-   Cam: chờ xử lý/thanh toán.
-   Đỏ: cảnh báo/lỗi.
-   Xám: không hoạt động.

## 5.3 Typography

-   Font ưu tiên: Inter, hỗ trợ tiếng Việt.
-   Body: 14--15px.
-   Page title: 20--24px.
-   Section title: 16--18px.
-   Bảo đảm độ tương phản và khả năng đọc trên màn hình POS.

## 5.4 Responsive

Breakpoint tham khảo:

  Kích thước     Nhóm thiết bị
  -------------- ---------------
  dưới 640px     Mobile
  640--767px     Mobile lớn
  768--1023px    Tablet
  1024--1279px   Laptop nhỏ
  từ 1280px      Desktop

PC:

-   Sidebar mặc định mở rộng khoảng 250--260px.
-   Có thể thu gọn còn khoảng 68--76px.
-   Header cố định.
-   Nội dung co giãn theo màn hình.

iPhone:

-   Menu trượt từ trái (drawer).
-   Có lớp overlay.
-   Đóng khi chọn mục hoặc bấm ra ngoài.
-   Không thu nhỏ giao diện desktop để ép vừa điện thoại.
-   Bảng rộng chuyển thành card hoặc vùng cuộn có chủ đích.
-   Nút cảm ứng đủ lớn.
-   Có thể dùng bottom action bar cho thao tác POS thường xuyên; phạm vi
    cụ thể cần chốt.

## 5.5 Điều hướng chính --- quyết định mới nhất

Sau đăng nhập, màn hình đầu tiên luôn là **Quản lý phòng**, không phải
Dashboard.

Sidebar có các nhóm điều hướng chính:

-   **Quản lý**
-   **Danh mục**
-   **Cài đặt**

Danh sách chức năng con chỉ hiện khi người dùng bấm mở nhóm. Mặc định
các nhóm đóng khi đăng nhập mới để menu gọn.

Quy tắc:

1.  Bấm nhóm để mở danh sách chức năng con.
2.  Chọn một nhóm khác thì nhóm trước đó tự đóng để tránh sidebar quá
    dài.
3.  Mục đang xem được tô nổi bật.
4.  Khi chọn chức năng, nhóm chứa chức năng đó tự mở.
5.  PC có thể thu gọn toàn bộ sidebar thành icon.
6.  iPhone dùng drawer, áp dụng nguyên tắc nhóm đóng/mở tương tự.
7.  F5/reload khi session còn hiệu lực: giữ chức năng đang xem nếu có
    thể.
8.  Đổi cửa hàng: trở về màn Quản lý phòng của cửa hàng mới.
9.  Nếu user không có quyền xem Quản lý phòng, chuyển tới chức năng đầu
    tiên được phép.
10. Chuyển chức năng không được làm mất dữ liệu local chưa sync.

### Các mục trong sidebar dự kiến

**QUẢN LÝ --- nghiệp vụ vận hành**

-   Quản lý phòng --- màn hình mặc định.
-   Hóa đơn & thanh toán.
-   Sổ nợ.
-   Quản lý kho.
-   Báo cáo.
-   Thu chi.
-   Ca làm việc.
-   Nhân viên phục vụ --- chức năng tính giờ phục vụ phòng.
-   Dashboard --- không phải màn hình đầu tiên; có thể đặt trong nhóm
    Quản lý.

**DANH MỤC --- dữ liệu cấu hình nghiệp vụ**

-   Danh mục phòng.
-   Thực đơn/sản phẩm.
-   Nhân viên.
-   Quản lý.
-   Bảng giá.
-   Ngày lễ.

**CÀI ĐẶT / HỆ THỐNG**

-   Cửa hàng.
-   Tài khoản & phân quyền.
-   Nhật ký hoạt động.
-   Cài đặt hệ thống.
-   Sao lưu/phục hồi.

Lưu ý phân biệt:

-   "Nhân viên phục vụ" trong Quản lý là chức năng tính giờ/lượt phục
    vụ.
-   "Nhân viên" trong Danh mục là dữ liệu tên/hồ sơ dùng cho nghiệp vụ.
-   "Quản lý" trong Danh mục là danh sách người quản lý phục vụ, không
    phải tài khoản quản trị hệ thống.
-   "Quản lý kho" là nghiệp vụ tồn kho; danh mục sản phẩm là dữ liệu
    hàng hóa.

Danh sách menu có thể được điều chỉnh khi hoàn thiện từng module, nhưng
không được tự ý làm trùng hoặc nhập nhằng khái niệm.

## 5.6 Các nguyên tắc UX chung

-   Có trạng thái loading, empty, error, offline.
-   Hiển thị rõ "Đã lưu trên thiết bị" và "Đã đồng bộ Cloud".
-   Không mất dữ liệu khi chuyển màn hình.
-   Thao tác xóa/hủy quan trọng cần xác nhận.
-   Hỗ trợ chuột, bàn phím và cảm ứng.
-   Không thay đổi nghiệp vụ chỉ để làm UI đẹp hơn.
-   Tránh dialog quá nhỏ; form quan trọng phải dễ đọc và thao tác.
-   Tối ưu thao tác lặp lại tại quầy.

------------------------------------------------------------------------

# 6. Các nhóm chức năng toàn hệ thống

1.  Dashboard.
2.  Quản lý phòng.
3.  Bảng giá và tính tiền giờ phòng.
4.  Quản lý thực đơn và gọi món.
5.  Quản lý kho.
6.  Hóa đơn và thanh toán.
7.  In hóa đơn và QR.
8.  Báo cáo và thống kê.
9.  Tài khoản và phân quyền.
10. Quản lý nhiều cửa hàng.
11. Đồng bộ và hoạt động offline.
12. Cài đặt hệ thống và sao lưu.
13. Quản lý ca làm việc --- phạm vi chi tiết chưa chốt.
14. Quản lý thu chi --- phạm vi chi tiết chưa chốt.
15. Nhật ký hoạt động.
16. Thông báo và cảnh báo.
17. Quản lý công nợ --- Sổ nợ.
18. Quản lý nhân viên phục vụ phòng --- tính giờ.

------------------------------------------------------------------------

# 7. Quản lý phòng và tính tiền phòng

## 7.1 Quản lý phòng

-   Quản lý danh sách phòng và trạng thái phòng.
-   Màn hình Quản lý phòng là trang vận hành đầu tiên sau đăng nhập.
-   Mỗi phòng hiển thị đủ thông tin cần thiết để biết phòng trống/đang
    hoạt động/chờ thanh toán.
-   Từ phòng có thể vào phiên, gọi món, tính giờ phục vụ, xem hóa đơn và
    thanh toán.
-   Chi tiết trạng thái và luồng mở/đóng phòng cần được đặc tả UI ở
    module riêng.

## 7.2 Bảng giá phòng

Bảng giá đã thảo luận theo cấu trúc 12 cột:

-   4 khung giờ: Sáng, Chiều, Tối, Khuya.
-   3 loại ngày: Ngày thường, Thứ 7/CN, Ngày lễ.

Ví dụ khung giờ đang tham khảo:

  Khung giờ   Thời gian
  ----------- -----------------
  Sáng        07:00--10:59:59
  Chiều       11:00--16:59:59
  Tối         17:00--23:59:59
  Khuya       00:00--06:59:59

Các khung giờ phải cấu hình được.

Loại ngày:

-   Ngày thường: Thứ 2--Thứ 6.
-   Cuối tuần: Thứ 7 và Chủ nhật.
-   Ngày lễ: Admin nhập danh sách ngày lễ.
-   Ưu tiên áp dụng: ngày lễ \> cuối tuần \> ngày thường.

Một lượt phòng đi qua ranh giới khung giờ phải chia thành các đoạn thời
gian và áp đúng giá của từng đoạn.

## 7.3 Làm tròn và chuyển phòng

Đã thảo luận:

-   Làm tròn thời gian theo cấu hình, ví dụ mỗi 5 phút, làm tròn lên.
-   Làm tròn tiền phòng theo cấu hình, ví dụ hàng nghìn, làm tròn lên.
-   Chuyển phòng giữ thời gian liên tục.
-   Trước thời điểm chuyển áp giá phòng cũ; sau thời điểm chuyển áp giá
    phòng mới.
-   Snapshot giá áp dụng để thay đổi bảng giá không làm sai dữ liệu đã
    phát sinh.

## 7.4 Các điểm chưa chốt --- không được tự suy diễn

-   Giá bằng 0 nghĩa là không áp dụng hay miễn phí?
-   Giá bằng 1 trong bảng mẫu là giá thật hay placeholder?
-   Có minimum charge theo phiên hay theo từng đoạn không?
-   Làm tròn tiền từng đoạn hay làm tròn tổng sau khi cộng?
-   Có giá ngoại lệ theo từng phòng không?
-   Thay đổi bảng giá có áp dụng ngay cho phiên đang chạy hay chỉ phiên
    mới?
-   Khi một lượt kéo dài qua ngày báo cáo, phân bổ doanh thu theo từng
    đoạn hay gán toàn bộ cho ngày bắt đầu?

------------------------------------------------------------------------

# 8. Thực đơn, sản phẩm, kho và gọi món

Đây là nhóm chức năng cần triển khai theo module riêng.

Các yêu cầu đã xác định ở mức tổng thể:

-   Quản lý danh mục sản phẩm/thực đơn.
-   Gọi món từ màn hình phòng.
-   Theo dõi số lượng và thành tiền trong giỏ.
-   Quản lý kho và tồn kho.
-   Lưu snapshot tên, đơn giá và thông tin sản phẩm tại thời điểm phát
    sinh để thay đổi danh mục không làm đổi giao dịch cũ.
-   Giao dịch gọi món từ thiết bị offline phải được lưu local và đồng bộ
    theo quy tắc chung.
-   Nếu giao dịch đến muộn sau khi hóa đơn/phiên đã kết thúc, áp dụng
    quy trình hóa đơn phụ chờ duyệt, không sửa hóa đơn gốc.

**CHƯA CHỐT:** công thức trừ kho, định lượng/nguyên liệu, đơn vị tính,
kiểm kê, nhập/xuất/điều chỉnh kho, hủy món, đổi món, món tặng/khuyến
mãi, giá vốn và quyền duyệt. Phải hỏi trước khi triển khai.

------------------------------------------------------------------------

# 9. Hóa đơn, thanh toán và công nợ

## 9.1 Hóa đơn

-   Hóa đơn lưu snapshot thông tin cửa hàng, sản phẩm, đơn giá, thông
    tin phòng và các giá trị liên quan tại thời điểm phát sinh.
-   Thay đổi danh mục hoặc bảng giá không làm thay đổi hóa đơn cũ.
-   Hóa đơn đã thanh toán có thể được chỉnh sửa nếu có quyền và xác thực
    mật khẩu cấp 2 theo cấu hình.
-   Khi sửa hóa đơn đã thanh toán, phải lưu audit log trước/sau, người
    sửa, người xác thực, thời điểm và lý do nếu nghiệp vụ yêu cầu.
-   Không xóa vật lý hóa đơn đã phát sinh.
-   Có liên kết giữa hóa đơn, phiên phòng, các lượt gọi món, lượt tính
    giờ phục vụ và thanh toán.

## 9.2 Thanh toán

Phương thức:

-   Tiền mặt.
-   Chuyển khoản.
-   Kết hợp nhiều phương thức.
-   Ghi nợ.

Cần lưu riêng doanh số và tiền thực thu. Ghi nợ không được tính là tiền
mặt/chuyển khoản đã thu.

## 9.3 Sổ nợ

Thông tin khách hàng:

-   Tên khách hàng.
-   Số điện thoại tùy chọn.
-   Địa chỉ tùy chọn.
-   Tổng nợ.
-   Đã trả.
-   Còn nợ.
-   Lịch sử hóa đơn.
-   Lịch sử thanh toán/trả nợ.

Quy tắc:

-   Khách có thể trả nhiều lần.
-   Mỗi lần trả ghi thời điểm, nhân viên thực hiện và phương thức thanh
    toán.
-   Báo cáo phân biệt doanh số ghi nợ và số tiền thực thu.
-   Không sửa số dư trực tiếp mà không có giao dịch/audit phù hợp.

## 9.4 QR chuyển khoản

-   Có thể tạo QR VietQR offline từ cấu hình ngân hàng và tài khoản.
-   QR chỉ tạo thông tin chuyển khoản; không được coi là xác nhận tiền
    đã vào tài khoản.
-   Tự động đối soát ngân hàng chưa được quyết định.

## 9.5 Sửa hóa đơn và mật khẩu cấp 2

-   Có cấu hình bật/tắt yêu cầu mật khẩu cấp 2 cho thao tác nhạy cảm.
-   Dù tắt xác thực cấp 2, hệ thống vẫn phải kiểm tra quyền tài khoản.
-   Xác thực cấp 2 server-side; không lưu mật khẩu dạng plain text.
-   Có giới hạn thử sai và audit.
-   Không được chỉ xác thực ở frontend.

Ngoại lệ đã thống nhất cho **Quản lý danh mục**:

-   Yêu cầu mật khẩu cấp 2 một lần khi vào mục.
-   Trong phiên đang ở mục đó, được chuyển tab và thêm/sửa/xóa mà không
    nhập lại.
-   Thoát mục, logout hoặc chuyển user thì phải xác thực lại.

------------------------------------------------------------------------

# 10. In hóa đơn và thiết bị

## 10.1 Thiết bị hiện có

-   Máy in: Xprinter XP-58IIIA.
-   Giao tiếp: USB, ESC/POS.
-   PC Windows hiện nhận máy in qua driver Windows với hàng đợi tên
    `XP-58`.
-   iPhone cần in qua AirPrint, dự kiến dùng Vinabox X9 Pro chạy
    Armbian/CUPS làm print server trong LAN.

## 10.2 Chiến lược in

PC/PWA:

-   Thử in thông qua hộp thoại in của trình duyệt và driver Windows.
-   Không cam kết in âm thầm từ PWA.
-   Không cam kết điều khiển ESC/POS trực tiếp từ trình duyệt nếu chưa
    kiểm tra khả năng thực tế.
-   Cấu hình máy in mặc định trong phần cài đặt là mong muốn, nhưng việc
    chọn máy in mặc định có thể phụ thuộc trình duyệt/hệ điều hành.
-   Khi đổi máy in, người dùng có thể cần điều chỉnh trong cài đặt hoặc
    hộp thoại in tùy nền tảng.

iPhone:

-   Mục tiêu in qua AirPrint.
-   Vinabox X9 Pro + Armbian + CUPS/AirPrint là phương án dự kiến, cần
    thử nghiệm phần cứng.
-   Khi Vinabox/máy in mất nguồn thì không thể in trong LAN.

Thiết kế phần mềm phải dùng `Printing Adapter`, không gắn nghiệp vụ hóa
đơn vào một công nghệ in cụ thể.

------------------------------------------------------------------------

# 11. Chức năng 18 --- Quản lý nhân viên phục vụ phòng / Tính giờ phục vụ

Đây là module đã được thảo luận chi tiết. Phải giữ nguyên các quy tắc
dưới đây.

## 11.1 Giao diện và phiếu phục vụ

-   Mỗi phòng có nút **Tính giờ phục vụ**.
-   Mỗi phòng có phiếu phục vụ riêng.
-   Một phòng có thể có nhiều nhân viên/lượt phục vụ chạy đồng thời.
-   Bảng hiển thị các cột:

  Cột          Nội dung
  ------------ ---------------------------
  STT          Số thứ tự
  Tên nút      Tên nút nhanh, ví dụ NV1
  Nhân viên    Tên nhân viên thực tế
  Quản lý      Tên quản lý được chọn
  Giờ vào      Thời điểm bắt đầu
  Giờ ra       Thời điểm kết thúc
  Thời gian    Thời lượng đã tính/lũy kế
  Thành tiền   Tiền phục vụ

-   Có lưới nút nhanh mặc định NV1--NV16.
-   Ô chưa cấu hình hiển thị `—`.
-   Bấm nút chưa chạy để tạo lượt và ghi giờ vào.
-   Bấm lại nút đang chạy trong cùng phòng để chốt giờ ra.
-   Nút đang chạy có màu xanh.
-   Có thể thêm nhân viên và quản lý trong phần cài đặt; thao tác này
    yêu cầu mật khẩu cấp 2.

## 11.2 Tên nút, nhân viên thực tế và quản lý

Ba khái niệm độc lập:

1.  **Tên nút/tên hiển thị**: mặc định NV1--NV16, có thể thêm, sửa, đổi
    tên, sắp xếp, ẩn/hiện. Ví dụ NV1, NV2, My 1, Đào 01. Tên nút có thể
    in hóa đơn.
2.  **Tên nhân viên thực tế/tên thật**: nhập tự do hoặc chọn gợi ý; có
    thể để trống. Gõ 1--2 ký tự thì gợi ý tên đã lưu. Chỉ nội bộ/báo
    cáo, không in hóa đơn.
3.  **Tên quản lý**: danh sách cá nhân; có thể để trống, chọn hoặc nhập
    theo thiết kế đã chốt. Tên quản lý có thể in hóa đơn.

Các quy tắc:

-   Giá riêng gắn với **nút/tên hiển thị**, không gắn với tên thật.
-   Nếu dùng cùng nút ở nhiều phòng, giá riêng của nút áp dụng cho mọi
    lượt dùng nút đó.
-   Giá riêng để trống thì dùng giá giờ chung.
-   Tên nhân viên thực tế và tên quản lý đều không bắt buộc.
-   Cho phép nhiều nhân viên trùng tên.
-   Cho phép nhiều quản lý trùng tên.
-   Một quản lý có thể có nhiều lượt/nhân viên cùng tên.
-   Không dùng tên làm khóa chính.
-   Không tự động gộp các bản ghi theo tên.
-   Mỗi lượt có ID riêng.
-   Lưu snapshot tên tại thời điểm phát sinh để lịch sử không thay đổi
    khi danh mục đổi tên.
-   Tên thật không in hóa đơn; tên nút và tên quản lý được in.
-   Mỗi lượt chọn tối đa một quản lý cá nhân hoặc để trống.
-   Báo cáo liệt kê từng lượt một dòng, không gộp theo tên.

## 11.3 Cài đặt chức năng 18

Có 3 tab:

-   Nhân viên.
-   Quản lý.
-   Bảng giá.

Yêu cầu mật khẩu cấp 2 một lần khi vào mục cài đặt; sau đó có thể chuyển
tab và thao tác trong phiên xác thực.

Bảng giá gồm:

-   Giá 10 phút đầu --- ví dụ 40.000đ.
-   Giá 1 giờ --- ví dụ 250.000đ.
-   Làm tròn thời gian --- ví dụ 5 phút.
-   Giá riêng theo từng nút.
-   Giá riêng để trống thì dùng giá giờ chung.

Tên nút có thể chỉnh sửa, thêm mới, sắp xếp và ẩn/hiện. Không dùng tên
nút làm ID kỹ thuật; phải có ID ổn định riêng.

## 11.4 Công thức tính tiền phục vụ

Ký hiệu:

-   `Δt_raw`: thời gian thực tế từ giờ vào đến giờ ra.
-   `r`: số phút làm tròn thời gian.
-   `P_10`: giá 10 phút đầu.
-   `P_hour`: giá một giờ, dùng giá riêng của nút nếu có; nếu không dùng
    giá chung.
-   `t`: thời gian tính tiền sau làm tròn.

Công thức đã thống nhất:

``` text
t = ceil(Δt_raw / r) * r

Nếu t <= 10:
    amount = P_10
Nếu t > 10:
    amount = P_10 + ((t - 10) / 60) * P_hour

Thành tiền cuối = làm tròn LÊN bội số 1.000 đồng
```

Ví dụ cấu hình chỉ để minh họa:

-   10 phút đầu: 40.000đ.
-   Giá giờ: 250.000đ.
-   Làm tròn thời gian: 5 phút.
-   Tiền cuối làm tròn lên bội số 1.000đ.

Yêu cầu:

-   Giá 10 phút đầu dùng chung.
-   Giá giờ có thể khác theo từng nút.
-   Snapshot giá tại thời điểm lượt bắt đầu.
-   Thay bảng giá sau đó không làm thay đổi lượt đã bắt đầu.
-   Thành tiền/thời gian của lượt đang chạy cập nhật realtime.
-   Không tự ý đổi công thức.

## 11.5 Chỉnh sửa thời gian

-   Nhấn đúp cột giờ vào mở hộp thoại lớn để sửa
    ngày/tháng/năm/giờ/phút; có OK/Hủy.
-   Lượt đang chạy: bấm một lần vào giờ ra để chốt thời điểm hiện tại.
-   Nhấn đúp giờ ra đã chốt mở hộp thoại sửa ngày giờ; có nút **Bây
    giờ**, OK/Hủy.
-   Chỉnh sửa lượt đã chốt không yêu cầu mật khẩu cấp 2; vẫn phải kiểm
    tra quyền user và ghi audit log.
-   Phải kiểm tra tính hợp lệ thời gian, ví dụ giờ ra không được trước
    giờ vào, trừ khi có quy tắc đặc biệt được duyệt.

## 11.6 Lưu, kết thúc và mở lại phiếu

-   Auto-save toàn ứng dụng: không bắt buộc nhấn Lưu sau mỗi thao tác.
-   Local commit trước, đồng bộ Cloud sau.
-   Khi bấm **Lưu phiếu/kết thúc**:
    -   Hiện xác nhận "Bạn có muốn lưu phiếu này không?"
    -   Chốt tất cả lượt còn chạy tại cùng một thời điểm.
    -   Tính lại toàn bộ.
    -   Đánh dấu phiếu hoàn tất.
-   Nếu phòng vẫn đang hoạt động, cho phép mở lại phiếu đã kết thúc để
    thêm lượt hoặc chỉnh sửa bình thường.
-   Mở lại phiếu không bắt buộc nhập lý do.
-   Hệ thống tự audit người mở lại, thời điểm, phiếu và các thao tác sau
    khi mở.
-   Không xóa vật lý phiếu/lượt.
-   Có chức năng hủy phiếu: yêu cầu xác nhận, chuyển trạng thái và ghi
    audit log.

## 11.7 Phím tắt dự kiến

  Phím   Chức năng
  ------ -------------------------
  F5     Quay về danh sách phòng
  F6     Mở cài đặt chức năng
  F7     Hủy phiếu
  F9     Lưu/kết thúc phiếu

Nếu trình duyệt/hệ điều hành chiếm phím tắt, cần có nút giao diện thay
thế và xử lý tương thích. Không được để F5 làm mất dữ liệu chưa lưu.

## 11.8 Báo cáo tính giờ phục vụ

-   Tổng lượt.
-   Tổng thời gian.
-   Tổng tiền.
-   Lọc theo ngày, tuần, tháng hoặc khoảng ngày.
-   Lọc theo quản lý.
-   Lọc theo nhân viên.
-   Lọc theo phòng.
-   Mỗi lượt hiển thị một dòng, không tự động gộp theo tên.
-   Mốc ngày báo cáo có thể cấu hình trong Cài đặt chung.
-   Múi giờ mặc định cửa hàng Việt Nam UTC+7.
-   Ví dụ ngày kinh doanh 08:00 đến trước 08:00 ngày hôm sau.

**CHƯA CHỐT:** lượt qua mốc ngày báo cáo được phân bổ theo từng đoạn hay
gán toàn bộ vào ngày bắt đầu. Đề xuất ban đầu là gán theo ngày bắt đầu
và vẫn hiển thị timestamp đầy đủ, nhưng phải xác nhận trước khi lập
trình báo cáo.

------------------------------------------------------------------------

# 12. Cài đặt hệ thống và bảo mật

## 12.1 Cấu hình thông tin cửa hàng trên hóa đơn

Có cấu hình chung để nhập:

-   Tên cửa hàng.
-   Địa chỉ.
-   Số điện thoại.
-   Dòng lời cảm ơn/câu chúc.
-   Checkbox bật/tắt hiển thị các trường phù hợp trên hóa đơn.

Khi cấu hình thay đổi:

-   Hóa đơn mới dùng thông tin mới.
-   Hóa đơn cũ giữ snapshot thông tin tại thời điểm phát sinh.

## 12.2 Cấu hình cửa hàng và tài khoản

-   Owner có thể quản lý nhiều cửa hàng.
-   Có thể tạo tài khoản và phân quyền theo từng cửa hàng.
-   Có thể cấp toàn quyền cho một tài khoản tại một cửa hàng.
-   Không mặc định tài khoản có toàn quyền ở tất cả cửa hàng.
-   Mọi API phải kiểm tra quyền.

## 12.3 Audit log

Ghi nhật ký đối với các thao tác quan trọng, tối thiểu:

-   Đăng nhập/đăng xuất và sự kiện bảo mật phù hợp.
-   Tạo/sửa/hủy giao dịch.
-   Sửa hóa đơn đã thanh toán.
-   Duyệt/từ chối hóa đơn phụ.
-   Mở lại phiếu phục vụ đã kết thúc.
-   Sửa giờ vào/giờ ra.
-   Thay đổi bảng giá.
-   Thay đổi phân quyền.
-   Thao tác sao lưu/phục hồi.
-   Thay đổi cài đặt nhạy cảm.

Audit log cần có người thao tác, thời điểm, cửa hàng, thiết bị, loại
thao tác và dữ liệu trước/sau khi phù hợp.

------------------------------------------------------------------------

# 13. Backup và phục hồi

-   Dùng Cloudflare R2 làm nơi lưu backup theo kiến trúc dự kiến.
-   Có khả năng export dữ liệu để người dùng giữ bản sao độc lập.
-   Có quy trình phục hồi và kiểm tra tính toàn vẹn.
-   Không chạy thao tác restore/migration phá hủy khi chưa có xác nhận
    rõ.
-   Không commit secret, token hoặc thông tin xác thực vào Git.
-   Cần kiểm tra backup định kỳ bằng quy trình restore thử nghiệm.
-   Phải giữ quan hệ ID, `store_id`, audit history và dữ liệu đồng bộ.

Chi tiết retention, lịch backup, mã hóa, phiên bản backup và quy trình
phục hồi cần chốt ở module backup.

------------------------------------------------------------------------

# 14. Các quyết định còn mở cần hỏi trước khi triển khai

Không tự đặt quy tắc thay cho người dùng. Các câu hỏi quan trọng:

## 14.1 UI/UX

-   Mật độ bảng: compact, comfortable hay adaptive?
-   Chỉ dùng theme sáng hay có thêm dark mode?
-   iPhone có bottom action bar cho thao tác thường xuyên hay chỉ dùng
    drawer?
-   POS và Admin dùng chung sidebar chia nhóm (hướng hiện tại) hay có
    chế độ chuyển đổi riêng? Hướng hiện tại là chung sidebar chia nhóm.

## 14.2 Tính tiền phòng

-   Giá 0 là không áp dụng hay miễn phí?
-   Giá 1 trong bảng mẫu là giá thật hay placeholder?
-   Minimum charge?
-   Làm tròn từng đoạn hay tổng?
-   Giá ngoại lệ theo phòng?
-   Thay bảng giá có ảnh hưởng phiên đang chạy?
-   Phân bổ tiền phòng qua mốc ngày báo cáo?

## 14.3 Gọi món và kho

-   Quy tắc tồn kho và trừ kho.
-   Nhập/xuất/kiểm kê/điều chỉnh kho.
-   Hủy món, đổi món, món tặng.
-   Giá vốn và báo cáo lợi nhuận.
-   Quyền duyệt điều chỉnh kho.

## 14.4 Ca làm và thu chi

-   Quy trình mở/đóng ca.
-   Tiền đầu ca, bàn giao ca, chênh lệch.
-   Danh mục thu/chi.
-   Quyền tạo/duyệt thu chi.
-   Liên kết thu chi với tiền mặt và báo cáo.

## 14.5 Đồng bộ và xung đột

-   Quy tắc xử lý từng loại xung đột cụ thể.
-   Thời hạn giữ operation queue.
-   Quy trình xử lý thiết bị bị mất hoặc cài lại.
-   Cách khôi phục local database khi browser xóa dữ liệu.

## 14.6 In ấn và QR

-   Thử nghiệm thực tế in PWA trên PC với driver Xprinter.
-   Thử nghiệm Vinabox + Armbian + CUPS/AirPrint.
-   Chọn mẫu hóa đơn, khổ giấy, font, logo, số liên.
-   Tự động đối soát chuyển khoản có làm hay không.

------------------------------------------------------------------------

# 15. Công cụ phát triển và quy trình làm việc

## 15.1 Bộ công cụ dự kiến

Máy phát triển Windows 10 hiện có RAM 8 GB, không có GPU rời. Ưu tiên
công cụ nhẹ và dịch vụ AI miễn phí.

-   VS Code: IDE chính.
-   Git for Windows: quản lý source code, commit, rollback.
-   Node.js LTS: chạy toolchain.
-   Codex Free: coding agent khi có hạn mức.
-   Antigravity Free: coding agent/IDE agent khi có hạn mức.
-   GitHub Copilot Free: hỗ trợ code trong VS Code theo hạn mức.
-   DeepSeek Web: hỏi đáp, phản biện, review thiết kế khi cần.
-   Chưa cần cài Ollama hoặc chạy model local.
-   Claude Code và DeepSeek API chưa nằm trong bộ công cụ miễn phí ưu
    tiên.

Hạn mức và điều kiện gói miễn phí có thể thay đổi; phải kiểm tra trang
chính thức trước khi đăng ký hoặc dựa vào số liệu quota.

## 15.2 Quy tắc dùng AI coding agent

-   Chỉ để một agent sửa repository tại một thời điểm.
-   Không cho hai agent cùng sửa file song song.
-   Trước khi sửa nhiều file, agent phải nêu kế hoạch.
-   Khi đổi agent, agent mới phải đọc `AGENTS.md`, tài liệu trong
    `docs/`, Git status và tiến độ.
-   Sau mỗi module được nghiệm thu, tạo Git commit.
-   Agent không được tự ý xóa database hoặc chạy migration phá hủy.
-   Không được tự ý thay đổi schema D1, sync, permission hoặc ID
    strategy.
-   Không commit `.env`, API token, secret hoặc private key.
-   Mọi thay đổi phải build/test.
-   Không chấp nhận tuyên bố "đã hoàn thành" nếu không có kết quả
    build/test và hướng dẫn kiểm thử.
-   Nếu thiếu yêu cầu, phải hỏi người dùng.
-   Ghi lại quyết định mới vào tài liệu, không chỉ để trong chat.

## 15.3 Tài liệu trong repository nên có

``` text
/
├── AGENTS.md
├── README.md
├── docs/
│   ├── product-spec.md
│   ├── architecture.md
│   ├── database-schema.md
│   ├── api-contract.md
│   ├── offline-sync.md
│   ├── permissions-security.md
│   ├── ui-ux-guidelines.md
│   ├── business-rules/
│   │   ├── room-pricing.md
│   │   ├── billing-payments.md
│   │   └── service-timer.md
│   ├── modules/
│   ├── testing/
│   └── decisions/
└── ...
```

Tài liệu này có thể lưu ban đầu là `docs/product-spec.md`. Khi dự án lớn
dần, tách thành các file con nhưng phải giữ một nguồn sự thật và liên
kết qua lại.

------------------------------------------------------------------------

# 16. Roadmap triển khai đề xuất

Phát triển theo từng giai đoạn, không yêu cầu AI tạo toàn bộ ứng dụng
hoàn chỉnh trong một lần.

  Giai đoạn   Nội dung
  ----------- ------------------------------------------------------------------
  0           Chốt đặc tả tổng thể, câu hỏi còn mở, UI/UX và kiến trúc
  1           Khởi tạo React + TypeScript + Vite + PWA, design system, routing
  2           Thiết kế schema D1, Workers API, môi trường dev/test/prod
  3           Đăng nhập, tài khoản, multi-store, phân quyền
  4           Quản lý danh mục
  5           Bảng giá, khung giờ, ngày lễ, quy tắc làm tròn
  6           Quản lý phòng, mở phòng, tính giờ, chuyển phòng, kết thúc phiên
  7           Thực đơn, sản phẩm, gọi món, kho
  8           Hóa đơn, thanh toán, ghi nợ, thu nợ, hóa đơn phụ
  9           In hóa đơn, QR, cấu hình thiết bị
  10          Hoàn thiện offline-first, sync queue, retry, xung đột
  11          Báo cáo, ca làm, thu chi, nhật ký, thông báo
  12          Backup, phục hồi, bảo mật, kiểm thử tổng thể
  13          Đóng gói Windows bằng Tauri + SQLite sau khi PWA ổn định

Lưu ý: multi-store, permission và sync phải được thiết kế từ schema/API
đầu tiên; không được để đến cuối mới ghép vào.

------------------------------------------------------------------------

# 17. Tiêu chuẩn nghiệm thu tối thiểu

Một module chỉ được xem là hoàn thành khi:

1.  Đúng nghiệp vụ đã chốt.
2.  Có kiểm tra quyền ở frontend và backend phù hợp.
3.  Có xử lý loading, empty, error và offline.
4.  Dữ liệu được lưu local theo đúng quy tắc.
5.  Đồng bộ có idempotency và xử lý lỗi phù hợp.
6.  Không làm hỏng dữ liệu module khác.
7.  Có kiểm thử các trường hợp bình thường và biên.
8.  Build thành công.
9.  Có hướng dẫn kiểm thử thủ công.
10. Có cập nhật tài liệu và Git commit sau nghiệm thu.

Với chức năng tính tiền, phải có unit tests cho công thức, làm tròn,
thời điểm bắt đầu/kết thúc, sửa giờ và snapshot giá.

Với đồng bộ, phải test retry, gửi trùng, mất mạng giữa chừng, hai thiết
bị cùng sửa và giao dịch đến sau khi hóa đơn đã kết thúc.

Với phân quyền, phải test gọi API trực tiếp bằng tài khoản không có
quyền và thay `store_id` trái phép.

------------------------------------------------------------------------

# 18. Chỉ dẫn khởi tạo cho VS Code / AI Studio

Dùng nội dung sau làm yêu cầu đầu tiên cho coding agent sau khi đặt file
này trong repository:

> Bạn là Senior Software Architect và Senior Full-stack Engineer phụ
> trách phát triển Karaoke Manager.
>
> Trước khi viết code, hãy đọc toàn bộ `docs/product-spec.md` và các
> file hướng dẫn liên quan. Tài liệu này là nguồn yêu cầu nghiệp vụ
> chính. Không tự ý thay đổi quyết định đã chốt.
>
> **Không tạo toàn bộ ứng dụng trong một lần.** Bắt đầu bằng việc:
>
> 1.  Phân tích yêu cầu và liệt kê các phần đã rõ, phần còn thiếu, phần
>     mâu thuẫn.
> 2.  Đề xuất kiến trúc thư mục và ranh giới module phù hợp với React +
>     TypeScript + Vite, Cloudflare Workers + D1, IndexedDB và
>     offline-first.
> 3.  Đề xuất data model cấp cao, API boundaries, repository interfaces
>     và sync strategy. Chưa chạy migration hoặc tạo schema phá hủy.
> 4.  Đề xuất design system và routing theo UI/UX trong tài liệu.
> 5.  Đề xuất roadmap chi tiết, thứ tự triển khai và tiêu chí nghiệm
>     thu.
> 6.  Nêu các câu hỏi cần người dùng xác nhận trước khi quyết định.
>
> Sau khi người dùng duyệt kế hoạch, mới bắt đầu Giai đoạn 1. Mỗi lần
> chỉ triển khai một phạm vi nhỏ, chạy build/test, báo cáo file đã
> tạo/sửa, kết quả kiểm thử, việc còn thiếu và cách kiểm tra.
>
> Không dùng dữ liệu giả để tuyên bố backend đã hoạt động. Không
> hardcode quyền bảo mật ở frontend. Không truy cập IndexedDB trực tiếp
> từ React screen. Không đánh dấu giao dịch đã đồng bộ khi server chưa
> xác nhận. Không xóa hoặc ghi đè dữ liệu cũ nếu chưa được phê duyệt.
>
> Khi yêu cầu chưa rõ, hãy hỏi. Không tự suy diễn các mục được đánh dấu
> **CHƯA CHỐT**.

------------------------------------------------------------------------

# 19. Ghi chú phiên bản và quản lý thay đổi

-   Phiên bản này tổng hợp các quyết định đã thảo luận đến ngày
    10/11/2026.
-   Đây là tài liệu nền tảng, không có nghĩa mọi module đã được đặc tả
    chi tiết đến mức có thể code ngay.
-   Khi người dùng chốt thêm quy tắc, cập nhật tài liệu và tăng version.
-   Mọi thay đổi phải ghi rõ:
    -   Nội dung thay đổi.
    -   Quyết định cũ.
    -   Quyết định mới.
    -   Module bị ảnh hưởng.
    -   Tác động đến database/API/migration.
    -   Kiểm thử cần bổ sung.
-   Không để code và tài liệu mâu thuẫn nhau.
