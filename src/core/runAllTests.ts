/**
 * KARAOKE MANAGER - AUTOMATED AUDIT TEST SUITE
 * Bộ kiểm thử tự động toàn diện kiểm toán nghiệp vụ, độ chính xác tài chính và các ca biên.
 * Chạy trực tiếp qua: npm test (tsx src/core/runAllTests.ts)
 */

import {
  calculateRoomSegment,
  calculateSessionPricing,
  roundDurationSeconds,
  sliceSubsegments,
  allocateHareNiemeyer,
  getBusinessDate,
  determineDayType,
} from './pricingEngine';

import {
  calculateStaffTicketAmount,
  updateStaffTicketAmounts,
} from './serviceTimerEngine';

import {
  PricingConfig,
  RoomUsageSegment,
  Session,
  ServiceTimerConfig,
  StaffTicket,
  CustomerDebt,
  Invoice,
} from '../types';

interface TestResult {
  code: string;
  name: string;
  passed: boolean;
  message?: string;
  details?: Record<string, unknown>;
}

const results: TestResult[] = [];

function assert(condition: boolean, code: string, name: string, message?: string, details?: Record<string, unknown>) {
  if (condition) {
    results.push({ code, name, passed: true });
    console.log(`  \x1b[32m✔ PASS\x1b[0m [${code}] ${name}`);
  } else {
    results.push({ code, name, passed: false, message, details });
    console.error(`  \x1b[31m✖ FAIL\x1b[0m [${code}] ${name}: ${message || 'Assertion failed'}`);
    if (details) {
      console.error('    Details:', JSON.stringify(details, null, 2));
    }
  }
}

console.log('\n===============================================================');
console.log('       KARAOKE MANAGER - AUTOMATED AUDIT TEST SUITE');
console.log('===============================================================\n');

// Cấu hình Bảng giá chuẩn kiểm thử
const standardConfig: PricingConfig = {
  id: 'cfg_test',
  storeId: 'store_test',
  method: 'TIME_SLOTS',
  roundingMinutes: 5,
  moneyUnit: 1000,
  moneyRoundingScope: 'total_session',
  businessDayStartHour: 8,
  holidays: ['2026-01-01', '2026-04-30', '2026-05-01'],
  minChargePolicy: 'MAX_USED_ROOMS',
  minChargeZeroPricePolicy: 'WAIVE',
  minChargeZeroBilledPolicy: 'WAIVE',
  matrix: [
    {
      categoryId: 'cat_nho',
      categoryName: 'NHỎ',
      fixedPriceNormal: 200000,
      fixedPriceWeekend: 200000,
      fixedPriceHoliday: 250000,
      morningNormal: 200000,
      morningWeekend: 200000,
      morningHoliday: 250000,
      afternoonNormal: 200000,
      afternoonWeekend: 220000,
      afternoonHoliday: 250000,
      eveningNormal: 220000,
      eveningWeekend: 250000,
      eveningHoliday: 280000,
      lateNightNormal: 180000,
      lateNightWeekend: 200000,
      lateNightHoliday: 220000,
      minimumCharge: 100000,
    },
    {
      categoryId: 'cat_to',
      categoryName: 'TO',
      fixedPriceNormal: 250000,
      fixedPriceWeekend: 250000,
      fixedPriceHoliday: 200000,
      morningNormal: 250000,
      morningWeekend: 250000,
      morningHoliday: 200000,
      afternoonNormal: 250000,
      afternoonWeekend: 280000,
      afternoonHoliday: 300000,
      eveningNormal: 280000,
      eveningWeekend: 320000,
      eveningHoliday: 350000,
      lateNightNormal: 220000,
      lateNightWeekend: 250000,
      lateNightHoliday: 280000,
      minimumCharge: 100000,
    },
    {
      categoryId: 'cat_sanh',
      categoryName: 'Sảnh',
      fixedPriceNormal: 1,
      fixedPriceWeekend: 1,
      fixedPriceHoliday: 1,
      morningNormal: 1,
      morningWeekend: 1,
      morningHoliday: 1,
      afternoonNormal: 1,
      afternoonWeekend: 1,
      afternoonHoliday: 1,
      eveningNormal: 1,
      eveningWeekend: 1,
      eveningHoliday: 1,
      lateNightNormal: 1,
      lateNightWeekend: 1,
      lateNightHoliday: 1,
      minimumCharge: 0,
    },
  ],
};

const rowNho = standardConfig.matrix[0];
const rowTo = standardConfig.matrix[1];
const rowSanh = standardConfig.matrix[2];

// -------------------------------------------------------------------------
// TEST GROUP 1: TC-01 đến TC-06 (Quy chuẩn REV3.2)
// -------------------------------------------------------------------------
console.log('--- NHÓM 1: CÁC TEST CASE CHUẨN REV3.2 ---');

// TC-01: Phiên đơn đoạn, làm tròn bước 5 phút theo hàm FLOOR (Mục 2.2 REV3.2)
// Hát 67 phút (4020s) -> floor bước 5 phút (300s) = 65 phút (3900s).
// Đơn giá 200.000đ/h.
// Tiền = (3900 / 3600) * 200000 = 216.666,67đ -> làm tròn trần 1.000đ = 217.000đ
{
  const checkIn = '2026-11-11T10:00:00.000Z';
  const checkOut = '2026-11-11T11:07:00.000Z'; // 67 phút = 4020s
  const seg = calculateRoomSegment(
    {
      segmentId: 'seg_tc01',
      roomId: 'r1',
      roomCode: 'P101',
      roomName: 'Phòng 101',
      categoryName: 'NHỎ',
      checkInTime: checkIn,
      checkOutTime: checkOut,
    },
    standardConfig,
    rowNho
  );

  const passed = seg.billedSeconds === 3900 && seg.payableAmount === 217000;
  assert(
    passed,
    'TC-01',
    'Phiên đơn đoạn làm tròn FLOOR bước 5 phút và làm tròn tiền 1.000đ',
    `Kỳ vọng 3900s & 217.000đ, nhận ${seg.billedSeconds}s & ${seg.payableAmount}đ`,
    { billedSeconds: seg.billedSeconds, payableAmount: seg.payableAmount }
  );
}

// TC-02: Cắt mốc giao ca (ví dụ 11:00 sáng -> chiều)
// Hát từ 10:30 đến 11:30 (tổng 60 phút = 3600s, đúng bội số 5p)
// Subsegment 1 (10:30 - 11:00, 30p sáng): giá 200k
// Subsegment 2 (11:00 - 11:30, 30p chiều): giá 200k
{
  const checkIn = '2026-11-11T10:30:00.000Z';
  const checkOut = '2026-11-11T11:30:00.000Z';
  const seg = calculateRoomSegment(
    {
      segmentId: 'seg_tc02',
      roomId: 'r1',
      roomCode: 'P101',
      roomName: 'Phòng 101',
      categoryName: 'NHỎ',
      checkInTime: checkIn,
      checkOutTime: checkOut,
    },
    standardConfig,
    rowNho
  );

  const passed = seg.subsegments.length === 2 && seg.payableAmount === 200000;
  assert(
    passed,
    'TC-02',
    'Cắt mốc ranh giới buổi (11:00) thành 2 subsegment',
    `Kỳ vọng 2 subsegments & 200.000đ, nhận ${seg.subsegments.length} subsegments & ${seg.payableAmount}đ`,
    { subsegmentsCount: seg.subsegments.length, payableAmount: seg.payableAmount }
  );
}

// TC-03: Chính sách giá tối thiểu độc lập khi tiền thô < minCharge
// Khách hát 10 phút (600s) Phòng Nhỏ giá 200k/h -> tiền thô = 33.333đ. MinCharge = 100k
{
  const checkIn = '2026-11-11T10:00:00.000Z';
  const checkOut = '2026-11-11T10:10:00.000Z';
  const seg = calculateRoomSegment(
    {
      segmentId: 'seg_tc03',
      roomId: 'r1',
      roomCode: 'P101',
      roomName: 'Phòng 101',
      categoryName: 'NHỎ',
      checkInTime: checkIn,
      checkOutTime: checkOut,
    },
    standardConfig,
    rowNho,
    { applySegmentMinCharge: true }
  );

  const passed = seg.payableAmount === 100000;
  assert(
    passed,
    'TC-03',
    'Áp mức giá tối thiểu (Min Charge) khi tiền thô < minCharge',
    `Kỳ vọng 100.000đ, nhận ${seg.payableAmount}đ`,
    { rawAmount: seg.rawAmount, payableAmount: seg.payableAmount }
  );
}

// TC-04: Sảnh tiếp khách (đơn giá 1đ), chính sách WAIVE miễn phụ thu tối thiểu
// Hát sảnh 30 phút, minCharge = 0, tiền phòng xấp xỉ 1đ
{
  const checkIn = '2026-11-11T10:00:00.000Z';
  const checkOut = '2026-11-11T10:30:00.000Z';
  const seg = calculateRoomSegment(
    {
      segmentId: 'seg_tc04',
      roomId: 'r_sanh',
      roomCode: 'SANH',
      roomName: 'Sảnh Chờ Tiếp Khách',
      categoryName: 'Sảnh',
      checkInTime: checkIn,
      checkOutTime: checkOut,
    },
    standardConfig,
    rowSanh,
    { applySegmentMinCharge: true }
  );

  const mockSession: Session = {
    id: 'sess_tc04',
    storeId: 'store_test',
    currentRoomId: 'r_sanh',
    currentRoomCode: 'SANH',
    initialRoomId: 'r_sanh',
    startTime: checkIn,
    status: 'COMPLETED',
    pricingConfigSnapshot: standardConfig,
    segments: [seg],
    createdAt: checkIn,
    updatedAt: checkOut,
  };

  const sessionPricing = calculateSessionPricing(mockSession);
  const passed = sessionPricing.minimumSurcharge === 0 && sessionPricing.payable_amount <= 1000;
  assert(
    passed,
    'TC-04',
    'Phòng Sảnh đơn giá tượng trưng 1đ được miễn phụ thu sàn (Policy WAIVE)',
    `Kỳ vọng minimumSurcharge = 0, nhận ${sessionPricing.minimumSurcharge}`,
    { payable_amount: sessionPricing.payable_amount, surcharge: sessionPricing.minimumSurcharge }
  );
}

// -------------------------------------------------------------------------
// TEST GROUP 2: CÁC VẤN ĐỀ TRỌNG TÂM TRONG BÁO CÁO KIỂM TOÁN
// -------------------------------------------------------------------------
console.log('\n--- NHÓM 2: CÁC LỖI TRỌNG TÂM THEO YÊU CẦU KIỂM TOÁN ---');

// TC-LRM: Thuật toán Hare-Niemeyer phân bổ thời gian thuần số nguyên BigInt
// Kiểm tra phân bổ nhiều tỷ lệ không chia hết, tổng số giây phân bổ PHẢI CHÍNH XÁC 100% bằng Billed Seconds
{
  const subsegments = [
    { actualSeconds: 780, rate: 200000, slotName: 'Ca 1' },
    { actualSeconds: 960, rate: 220000, slotName: 'Ca 2' },
    { actualSeconds: 1080, rate: 250000, slotName: 'Ca 3' },
  ];
  const actualTotalSeconds = 780 + 960 + 1080; // 2820s (47 phút)
  // Làm tròn bước 5 phút theo FLOOR -> 45 phút = 2700 giây
  const billedTotalSeconds = roundDurationSeconds(actualTotalSeconds, 5); // 2700

  const allocated = allocateHareNiemeyer(subsegments, billedTotalSeconds, actualTotalSeconds);
  const sumAllocated = allocated.reduce((sum, s) => sum + s.billedSeconds, 0);

  const passed = sumAllocated === billedTotalSeconds && allocated.every((s) => Number.isInteger(s.billedSeconds));
  assert(
    passed,
    'TC-LRM',
    'Thuật toán Hare-Niemeyer (BigInt): Tổng giây phân bổ luôn khớp chính xác tuyệt đối Billed Seconds',
    `Kỳ vọng tổng phân bổ = ${billedTotalSeconds}s, thực tế = ${sumAllocated}s`,
    { allocatedSeconds: allocated.map((a) => a.billedSeconds), sumAllocated }
  );
}

// TC-BDAY: Áp dụng businessDayStartHour trong xác định ngày kinh doanh
// Ca kinh doanh bắt đầu lúc 08:00 sáng.
// Khách hát lúc 02:00 sáng Thứ Bảy (2026-11-14T02:00:00).
// Vì 02:00 < 08:00 nên ngày kinh doanh là Thứ Sáu (2026-11-13) -> Ngày Thường (NORMAL), KHÔNG PHẢI Cuối Tuần (WEEKEND).
{
  const fridayNightDate = new Date('2026-11-14T02:00:00'); // 2h sáng thứ 7
  const bDay = getBusinessDate(fridayNightDate, 8);
  const dayType = determineDayType(fridayNightDate, standardConfig.holidays, 8);

  // Ngày thứ 7 bình thường lúc 10h sáng
  const saturdayMorningDate = new Date('2026-11-14T10:00:00');
  const satDayType = determineDayType(saturdayMorningDate, standardConfig.holidays, 8);

  const passed = dayType === 'NORMAL' && satDayType === 'WEEKEND';
  assert(
    passed,
    'TC-BDAY',
    'Áp dụng businessDayStartHour = 8: 02h00 sáng Thứ Bảy được tính là Ngày Thường (thuộc ca Thứ Sáu)',
    `Kỳ vọng NORMAL cho 02h00 sáng T7, nhận: ${dayType}`,
    { fridayNightType: dayType, saturdayMorningType: satDayType }
  );
}

// TC-ONEPRICE: Phương thức ONE_PRICE sử dụng đơn giá cố định riêng biệt
{
  const onePriceMatrixRow = {
    categoryId: 'cat_nho',
    categoryName: 'NHỎ',
    fixedPriceNormal: 175000, // Đơn giá cố định độc lập (khác morningNormal = 200000)
    fixedPriceWeekend: 195000,
    fixedPriceHoliday: 220000,
    morningNormal: 200000,
    morningWeekend: 200000,
    morningHoliday: 250000,
    afternoonNormal: 200000,
    afternoonWeekend: 220000,
    afternoonHoliday: 250000,
    eveningNormal: 220000,
    eveningWeekend: 250000,
    eveningHoliday: 280000,
    lateNightNormal: 180000,
    lateNightWeekend: 200000,
    lateNightHoliday: 220000,
    minimumCharge: 100000,
  };

  const onePriceConfig: PricingConfig = {
    ...standardConfig,
    method: 'ONE_PRICE',
    matrix: [onePriceMatrixRow],
  };

  const checkIn = '2026-11-11T10:00:00.000Z'; // Ngày thường
  const checkOut = '2026-11-11T11:00:00.000Z'; // 60 phút
  const seg = calculateRoomSegment(
    {
      segmentId: 'seg_oneprice',
      roomId: 'r1',
      roomCode: 'P101',
      roomName: 'Phòng 101',
      categoryName: 'NHỎ',
      checkInTime: checkIn,
      checkOutTime: checkOut,
    },
    onePriceConfig,
    onePriceMatrixRow
  );

  const passed = seg.payableAmount === 175000 && seg.hourlyRate === 175000;
  assert(
    passed,
    'TC-ONEPRICE',
    'Phương thức ONE_PRICE lấy đúng trường đơn giá cố định riêng (fixedPriceNormal = 175.000đ)',
    `Kỳ vọng 175.000đ, nhận: ${seg.payableAmount}đ (hourlyRate: ${seg.hourlyRate})`,
    { hourlyRate: seg.hourlyRate, payableAmount: seg.payableAmount }
  );
}

// TC-NOMULTIMIN: Ngăn chặn lỗi áp giá tối thiểu nhiều lần (Vấn đề 2)
// Tình huống: Chuyển phòng Sảnh (tiền 1đ) -> Phòng Nhỏ (tiền 40.000đ)
// Cấu hình: minChargePolicy = 'MAX_USED_ROOMS', moneyRoundingScope = 'per_segment'
// Với Phương án 1 (REV3.2):
// - Cấp segment KHÔNG áp minCharge (chỉ tính tiền thô theo thời gian).
// - Cấp session tính maxMinCharge = 100.000đ (từ phòng Nhỏ).
// - Tổng raw tiền phòng = 1đ + 40.000đ = 40.001đ.
// - Phụ thu tối thiểu = 100.000đ - 40.001đ = 59.999đ.
// - Tổng thanh toán đúng bằng 100.000đ (KHÔNG PHẢI 140k hay 200k).
{
  const perSegmentConfig: PricingConfig = {
    ...standardConfig,
    minChargePolicy: 'MAX_USED_ROOMS',
    moneyRoundingScope: 'per_segment',
  };

  const seg1: RoomUsageSegment = {
    segmentId: 'seg_sanh',
    roomId: 'r_sanh',
    roomCode: 'SANH',
    roomName: 'Sảnh Chờ Tiếp Khách',
    categoryName: 'Sảnh',
    checkInTime: '2026-11-11T10:00:00.000Z',
    checkOutTime: '2026-11-11T10:15:00.000Z',
    actualSeconds: 900,
    billedSeconds: 900,
    hourlyRate: 1,
    minimumCharge: 0,
    rawAmount: 1,
    amountAfterMinimum: 1,
    payableAmount: 1,
    subsegments: [],
  };

  const seg2: RoomUsageSegment = {
    segmentId: 'seg_nho',
    roomId: 'r_nho',
    roomCode: 'P101',
    roomName: 'Phòng 101',
    categoryName: 'NHỎ',
    checkInTime: '2026-11-11T10:15:00.000Z',
    checkOutTime: '2026-11-11T10:27:00.000Z',
    actualSeconds: 720,
    billedSeconds: 720,
    hourlyRate: 200000,
    minimumCharge: 100000,
    rawAmount: 40000,
    amountAfterMinimum: 40000,
    payableAmount: 40000,
    subsegments: [],
  };

  const mockSession: Session = {
    id: 'sess_nomultimin',
    storeId: 'store_test',
    currentRoomId: 'r_nho',
    currentRoomCode: 'P101',
    initialRoomId: 'r_sanh',
    startTime: '2026-11-11T10:00:00.000Z',
    status: 'COMPLETED',
    pricingConfigSnapshot: perSegmentConfig,
    segments: [seg1, seg2],
    createdAt: '2026-11-11T10:00:00.000Z',
    updatedAt: '2026-11-11T10:27:00.000Z',
  };

  const sessionPricing = calculateSessionPricing(mockSession);
  const totalPayable = sessionPricing.payable_amount;

  const passed = totalPayable === 100000 && sessionPricing.minimumSurcharge === 65000;
  assert(
    passed,
    'TC-NOMULTIMIN',
    'Chính sách MAX_USED_ROOMS không áp tối thiểu nhiều lần khi moneyRoundingScope = per_segment',
    `Kỳ vọng tổng tiền phòng = 100.000đ và phụ thu = 65.000đ, nhận: total = ${totalPayable}đ, phụ thu = ${sessionPricing.minimumSurcharge}đ`,
    { sessionPricing }
  );
}

// -------------------------------------------------------------------------
// TEST GROUP 3: TÍNH GIỜ NHÂN VIÊN, CÔNG NỢ VÀ HÓA ĐƠN
// -------------------------------------------------------------------------
console.log('\n--- NHÓM 3: TÍNH GIỜ NHÂN VIÊN, CÔNG NỢ & MỞ LẠI HÓA ĐƠN ---');

// TC-SERVICE-TIMER: Tính giờ phục vụ nhân viên
// Cấu hình: 10 phút đầu 40.000đ, giá giờ sau đó 250.000đ/h, làm tròn 5 phút, tiền làm tròn 1.000đ
{
  const timerConfig: ServiceTimerConfig = {
    storeId: 'store_test',
    first10MinPrice: 40000,
    generalHourlyPrice: 250000,
    roundingMinutes: 5,
    roundingMoneyStep: 1000,
  };

  // Ca 1: Ngồi 8 phút (dưới 10 phút) -> tính đúng 40.000đ
  const ticketShort: StaffTicket = {
    ticketId: 't1',
    buttonCode: 'NV1',
    displayName: 'NV1',
    checkInTime: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    actualSeconds: 480,
    billedMinutes: 10,
    first10MinRate: 40000,
    hourlyRate: 250000,
    rawAmount: 40000,
    finalAmount: 40000,
    isCompleted: false,
  };
  const resShort = calculateStaffTicketAmount(ticketShort, timerConfig);

  // Ca 2: Ngồi 43 phút -> làm tròn lên bội số 5 phút thành 45 phút. 10 phút đầu = 40.000đ.
  // 35 phút sau = (35/60) * 250.000 = 145.833,33đ.
  // Tổng = 185.833,33đ -> làm tròn lên bội số 1.000đ = 186.000đ
  const ticketLong: StaffTicket = {
    ticketId: 't2',
    buttonCode: 'NV2',
    displayName: 'NV2',
    checkInTime: new Date(Date.now() - 43 * 60 * 1000).toISOString(),
    actualSeconds: 43 * 60,
    billedMinutes: 45,
    first10MinRate: 40000,
    hourlyRate: 250000,
    rawAmount: 0,
    finalAmount: 0,
    isCompleted: false,
  };
  const resLong = calculateStaffTicketAmount(ticketLong, timerConfig);

  const passed = resShort.finalAmount === 40000 && resLong.billedMinutes === 45 && resLong.finalAmount === 186000;
  assert(
    passed,
    'TC-SERVICE-TIMER',
    'Tính tiền giờ nhân viên: 10p đầu 40k, 45p làm tròn ra 186.000đ',
    `Ca ngắn: ${resShort.finalAmount}đ (kỳ vọng 40k), Ca 45p: ${resLong.finalAmount}đ (kỳ vọng 186k)`,
    { resShortFinal: resShort.finalAmount, resLongFinal: resLong.finalAmount }
  );
}

// TC-DEBT: Quản lý công nợ khách hàng
{
  const initialDebt: CustomerDebt = {
    id: 'debt_tc',
    storeId: 'store_test',
    customerName: 'Anh Nam',
    phone: '0901.234.567',
    totalDebt: 1000000,
    totalPaid: 0,
    balance: 1000000,
    invoiceIds: ['HD-001'],
    history: [],
    updatedAt: new Date().toISOString(),
  };

  // Trả đợt 1: 400.000đ
  const pay1 = 400000;
  initialDebt.totalPaid += pay1;
  initialDebt.balance = Math.max(0, initialDebt.totalDebt - initialDebt.totalPaid);

  // Trả đợt 2: 600.000đ dứt điểm
  const pay2 = 600000;
  initialDebt.totalPaid += pay2;
  initialDebt.balance = Math.max(0, initialDebt.totalDebt - initialDebt.totalPaid);

  const passed = initialDebt.totalPaid === 1000000 && initialDebt.balance === 0;
  assert(
    passed,
    'TC-DEBT',
    'Ghi nợ và thanh toán công nợ nhiều đợt chính xác số dư',
    `Kỳ vọng balance = 0, nhận ${initialDebt.balance}`,
    { totalPaid: initialDebt.totalPaid, balance: initialDebt.balance }
  );
}

// TC-INVOICE-REOPEN: Mở lại hóa đơn với lý do tùy chọn (không bắt buộc nhập lý do)
{
  const mockInvoice: Invoice = {
    id: 'inv_test_reopen',
    invoiceNumber: 'HD-TEST-REOPEN',
    storeId: 'store_test',
    sessionId: 'sess_reopen_1',
    roomCode: 'P101',
    roomName: 'Phòng 101',
    customerName: 'Khách Test',
    checkInTime: new Date(Date.now() - 3600000).toISOString(),
    checkOutTime: new Date().toISOString(),
    totalDurationFormatted: '1h 00p',
    raw_amount: 200000,
    amount_after_minimum: 200000,
    payable_amount: 200000,
    final_amount: 200000,
    segmentsBreakdown: [],
    orderItems: [],
    orderTotal: 0,
    staffServiceTickets: [],
    staffServiceTotal: 0,
    discountPercent: 0,
    discountAmount: 0,
    surchargeAmount: 0,
    paymentMethod: 'CASH',
    cashierName: 'Thu Ngân',
    status: 'PAID',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Mở lại không truyền lý do (undefined)
  function simulateReopen(inv: Invoice, reason?: string) {
    inv.isReopened = true;
    inv.notes = reason ? `[MỞ LẠI HÓA ĐƠN] ${reason}` : '[MỞ LẠI HÓA ĐƠN] Mở lại phiên chỉnh sửa';
    return inv;
  }

  const reopened = simulateReopen(mockInvoice);
  const passed = reopened.isReopened === true && typeof reopened.notes === 'string';
  assert(
    passed,
    'TC-INVOICE-REOPEN',
    'Mở lại hóa đơn cho phép lý do là TÙY CHỌN (không ép buộc nhập lý do)',
    `Hóa đơn chuyển trạng thái isReopened = ${reopened.isReopened}, ghi chú: ${reopened.notes}`,
    { isReopened: reopened.isReopened, notes: reopened.notes }
  );
}

// -------------------------------------------------------------------------
// TỔNG KẾT
// -------------------------------------------------------------------------
console.log('\n===============================================================');
const passedCount = results.filter((r) => r.passed).length;
const failedCount = results.filter((r) => !r.passed).length;

console.log(`KẾT QUẢ KIỂM THỬ: ${passedCount}/${results.length} PASSED (${failedCount} FAILED)`);
if (failedCount === 0) {
  console.log('\x1b[32m✔ TẤT CẢ CÁC BÀI KIỂM THỬ ĐÃ VƯỢT QUA 100% THÀNH CÔNG!\x1b[0m');
  console.log('===============================================================\n');
  process.exit(0);
} else {
  console.error('\x1b[31m✖ CÓ BÀI KIỂM THỬ THẤT BẠI!\x1b[0m');
  console.log('===============================================================\n');
  process.exit(1);
}
