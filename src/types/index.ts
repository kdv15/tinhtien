/**
 * KARAOKE MANAGER - DATA CONTRACTS & TYPE DEFINITIONS
 * Tuân thủ nghiêm ngặt đặc tả v0.9 và Báo cáo Kỹ thuật Pricing Engine REV3.2
 */

// 1. Phân quyền và tài khoản
export type UserRole = 'owner' | 'admin' | 'store_manager' | 'cashier' | 'staff' | 'viewer';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  storeIds: string[];
  pinCode?: string; // Mã PIN đăng nhập nhanh
  level2Password?: string; // Mật khẩu cấp 2 cho thao tác nhạy cảm
  isActive: boolean;
}

export interface Store {
  id: string;
  name: string;
  address: string;
  phone: string;
  headerGreeting?: string;
  footerThankYou?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  showLogoOnReceipt?: boolean;
  showPhoneOnReceipt?: boolean;
  currency: string;
}

// 2. Khu vực và Phòng
export interface Area {
  id: string;
  storeId: string;
  name: string;
  displayOrder: number;
}

export type RoomCategoryType = 'NHỎ' | 'TO' | 'Sảnh' | 'VIP';

export interface RoomCategory {
  id: string;
  storeId: string;
  name: RoomCategoryType | string;
  defaultMinimumCharge: number; // Mức tiền tối thiểu (VNĐ)
}

export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'WAITING_PAYMENT' | 'MAINTENANCE';

export interface Room {
  id: string;
  storeId: string;
  code: string; // VD: P101, VIP1
  name: string; // VD: Phòng 101, VIP 1
  categoryId: string;
  categoryName: string;
  areaId: string;
  areaName: string;
  status: RoomStatus;
  currentSessionId?: string;
  activeStaffCount?: number;
  displayOrder: number;
}

// 3. Bảng giá và Cấu hình Pricing Engine
export type PricingMethod = 'ONE_PRICE' | 'TIME_SLOTS'; // '1 Giá' hoặc 'Theo Buổi'

export type TimeSlotName = 'MORNING' | 'AFTERNOON' | 'EVENING' | 'LATE_NIGHT';
export type DayType = 'NORMAL' | 'WEEKEND' | 'HOLIDAY';

export interface TimeSlotConfig {
  slot: TimeSlotName;
  name: string; // Buổi Sáng, Buổi Chiều, Buổi Tối, Buổi Khuya
  startHour: number; // 07
  startMinute: number; // 00
  endHour: number; // 10
  endMinute: number; // 59
  endSecond: number; // 59
}

export interface PriceMatrixRow {
  categoryId: string;
  categoryName: string;
  // Đơn giá cố định độc lập cho phương thức ONE_PRICE ('1 Giá')
  fixedPriceNormal?: number;
  fixedPriceWeekend?: number;
  fixedPriceHoliday?: number;
  // 12 ô đơn giá (VNĐ/giờ) cho phương thức TIME_SLOTS ('Theo Buổi')
  morningNormal: number;
  morningWeekend: number;
  morningHoliday: number;
  afternoonNormal: number;
  afternoonWeekend: number;
  afternoonHoliday: number;
  eveningNormal: number;
  eveningWeekend: number;
  eveningHoliday: number;
  lateNightNormal: number;
  lateNightWeekend: number;
  lateNightHoliday: number;
  minimumCharge: number; // Mức tối thiểu cấu hình
}

export type RoundingStepMinutes = 0 | 5 | 10 | 15 | 20 | 25 | 30 | 60;
export type MoneyRoundingScope = 'per_segment' | 'total_session'; // Q6.A hoặc Q6.B

export interface PricingConfig {
  id: string;
  storeId: string;
  method: PricingMethod; // '1 Giá' hoặc 'Theo Buổi'
  roundingMinutes: RoundingStepMinutes; // R in {0, 5, 10, 15, 20, 25, 30, 60}
  moneyUnit: number; // Mặc định 1000 VNĐ
  moneyRoundingScope: MoneyRoundingScope; // Mặc định 'total_session' (theo REV3.2)
  businessDayStartHour: number; // Mặc định 8 (08:00 sáng)
  holidays: string[]; // Danh sách ngày YYYY-MM-DD
  matrix: PriceMatrixRow[];
  minChargePolicy: 'MAX_USED_ROOMS' | 'FIRST_ROOM' | 'LAST_ROOM' | 'PER_SEGMENT_INDEPENDENT'; // Q3
  minChargeZeroPricePolicy: 'WAIVE' | 'CHARGE_MIN'; // Q4
  minChargeZeroBilledPolicy: 'WAIVE' | 'CHARGE_MIN'; // Q5
}

// 4. Cấu trúc phiên phòng và Pricing Subsegments (Two-Tier Architecture)
export interface PricingSubsegment {
  id: string;
  timeSlot: TimeSlotName;
  timeSlotName: string;
  dayType: DayType;
  dayTypeName: string;
  hourlyRate: number;
  actualSeconds: number;
  billedSeconds: number; // Phân bổ qua thuật toán Hare-Niemeyer
  rawAmount: number; // Tiền thô (VNĐ)
}

export interface RoomUsageSegment {
  segmentId: string;
  roomId: string;
  roomCode: string;
  roomName: string;
  categoryName: string;
  checkInTime: string; // ISO String
  checkOutTime: string; // ISO String
  actualSeconds: number;
  billedSeconds: number; // Làm tròn FLOOR độc lập trên segment
  hourlyRate: number; // Giá đại diện nếu là 1 Giá
  minimumCharge: number; // Mức tối thiểu snapshot của phòng này
  rawAmount: number; // Tiền thô của segment
  amountAfterMinimum: number; // Sau khi xét sàn tối thiểu
  payableAmount: number; // Tiền chính thức của segment (nếu theo per_segment)
  subsegments: PricingSubsegment[];
}

export type SessionStatus = 
  | 'ACTIVE' 
  | 'COMPLETED' 
  | 'CANCELLED_MISTAKE' 
  | 'COMPLETED_ZERO_BILLED' 
  | 'WAIVED_COMPENSATED';

export interface Session {
  id: string;
  storeId: string;
  currentRoomId: string;
  currentRoomCode: string;
  initialRoomId: string;
  startTime: string; // ISO String
  endTime?: string; // ISO String
  status: SessionStatus;
  segments: RoomUsageSegment[];
  pricingConfigSnapshot: PricingConfig;
  customerName?: string;
  customerPhone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// 5. Thực đơn & Dịch vụ & Gọi món
export type ProductCategory = 'BEVERAGE' | 'FOOD' | 'SNACK' | 'FRUIT' | 'OTHER';

export interface MenuItem {
  id: string;
  storeId: string;
  code: string;
  name: string;
  category: ProductCategory;
  unit: string; // Lon, Chai, Dĩa, Gói...
  salePrice: number;
  costPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  isActive: boolean;
}

export interface OrderItem {
  id: string;
  sessionId: string;
  storeId: string;
  menuItemId: string;
  code: string;
  name: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  totalAmount: number;
  orderTime: string;
  note?: string;
  status: 'PENDING' | 'SERVED' | 'CANCELLED';
}

// 6. Chức năng 18 - Quản lý nhân viên phục vụ phòng / Tính giờ phục vụ
export interface StaffButtonConfig {
  id: string;
  storeId: string;
  buttonCode: string; // NV1, NV2...
  displayName: string; // NV1, My 1, Đào 01
  customHourlyRate?: number; // Giá riêng của nút (nếu để trống dùng giá chung)
  sortOrder: number;
  isActive: boolean;
}

export interface ServiceTimerConfig {
  storeId: string;
  first10MinPrice: number; // Mặc định 40.000đ
  generalHourlyPrice: number; // Mặc định 250.000đ
  roundingMinutes: number; // Mặc định 5 phút
  roundingMoneyStep: number; // Mặc định 1.000đ
}

export interface StaffTicket {
  ticketId: string;
  buttonCode: string; // Tên nút hiển thị (in hóa đơn)
  displayName: string;
  realStaffName?: string; // Tên thật (chỉ nội bộ, không in hóa đơn)
  managerName?: string; // Tên quản lý (in hóa đơn)
  checkInTime: string; // ISO String
  checkOutTime?: string; // ISO String
  actualSeconds: number;
  billedMinutes: number;
  first10MinRate: number;
  hourlyRate: number;
  rawAmount: number;
  finalAmount: number; // Làm tròn lên 1.000đ
  isCompleted: boolean;
}

export interface ServiceSession {
  id: string;
  storeId: string;
  sessionId: string;
  roomId: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  tickets: StaffTicket[];
  createdAt: string;
  updatedAt: string;
}

// 7. Hóa đơn, Thanh toán, Sổ nợ
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'MULTI' | 'DEBT';
export type InvoiceStatus = 'PAID' | 'UNPAID' | 'CANCELLED' | 'DEBT';

export interface Invoice {
  id: string;
  storeId: string;
  invoiceNumber: string; // VD: HD-20261111-001
  sessionId: string;
  roomCode: string;
  roomName: string;
  checkInTime: string;
  checkOutTime: string;
  totalDurationFormatted: string; // VD: 1h 45p
  
  // 4 trường tài chính chuẩn REV3.2:
  raw_amount: number; // Tiền giờ thô chưa làm tròn
  amount_after_minimum: number; // Sau khi so mức sàn tối thiểu
  payable_amount: number; // NGUỒN THẨM QUYỀN DUY NHẤT CỦA TIỀN PHÒNG
  final_amount: number; // NGUỒN THẨM QUYỀN DUY NHẤT CỦA TOÀN HÓA ĐƠN
  
  // Chi tiết hóa đơn
  segmentsBreakdown: {
    roomName: string;
    durationMinutes: number;
    hourlyRate: number;
    amount: number;
  }[];
  
  // Dịch vụ / món ăn
  orderItems: {
    name: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }[];
  orderTotal: number;

  // Tiền phục vụ nhân viên (Module 18)
  staffServiceTickets: {
    displayName: string;
    managerName?: string;
    durationMinutes: number;
    amount: number;
  }[];
  staffServiceTotal: number;

  // Giảm giá & phụ thu
  discountPercent: number;
  discountAmount: number;
  surchargeAmount: number;
  surchargeReason?: string;

  // Thanh toán
  paymentMethod: PaymentMethod;
  cashReceived?: number;
  bankTransferReceived?: number;
  debtAmount?: number;
  customerName?: string;
  customerPhone?: string;

  status: InvoiceStatus;
  cashierName: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  isReopened?: boolean;
}

// 8. Sổ nợ khách hàng
export interface DebtPaymentRecord {
  id: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  paymentDate: string;
  cashierName: string;
  note?: string;
}

export interface CustomerDebt {
  id: string;
  storeId: string;
  customerName: string;
  phone: string;
  address?: string;
  totalDebt: number;
  totalPaid: number;
  balance: number;
  invoiceIds: string[];
  history: DebtPaymentRecord[];
  updatedAt: string;
}

// 9. Kho & Giao dịch kho
export type InventoryTransactionType = 'IMPORT' | 'EXPORT' | 'ADJUSTMENT';

export interface InventoryTransaction {
  id: string;
  storeId: string;
  type: InventoryTransactionType;
  invoiceId?: string;
  items: {
    menuItemId: string;
    itemName: string;
    quantity: number;
    costPrice?: number;
    reason?: string;
  }[];
  totalCost: number;
  performedBy: string;
  createdAt: string;
  note?: string;
}

// 10. Audit Log bất biến
export type AuditActionType =
  | 'LOGIN'
  | 'LOGOUT'
  | 'ROOM_OPEN'
  | 'ROOM_CHANGE'
  | 'ROOM_CANCEL'
  | 'CHECKOUT_PAID'
  | 'INVOICE_REOPEN'
  | 'INVOICE_EDIT'
  | 'STAFF_TIMER_START'
  | 'STAFF_TIMER_STOP'
  | 'STAFF_TIMER_EDIT'
  | 'STAFF_TIMER_REOPEN'
  | 'PRICE_CONFIG_CHANGE'
  | 'INVENTORY_CHANGE'
  | 'DEBT_PAYMENT'
  | 'SETTINGS_CHANGE';

export interface AuditLog {
  id: string;
  storeId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: AuditActionType;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  deviceId: string;
}
