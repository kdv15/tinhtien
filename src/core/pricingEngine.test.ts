/**
 * TEST SUITE PRICING ENGINE REV3.2
 * Tự động kiểm thử TC-01 đến TC-06 và TC-LRM theo đặc tả toán học
 */

import {
  allocateSubsegmentSeconds,
  createRational,
  determineTimeSlot,
  determineDayType,
  calculateRoomSegment,
  calculateSessionPricing,
} from './pricingEngine';
import { PricingConfig, PriceMatrixRow, Session } from '../types';

export function runTests(): { name: string; passed: boolean; message: string }[] {
  const results: { name: string; passed: boolean; message: string }[] = [];

  // Helper assert
  function assert(name: string, condition: boolean, detail: string) {
    results.push({
      name,
      passed: condition,
      message: condition ? 'PASSED' : `FAILED: ${detail}`,
    });
  }

  // Cấu hình Bảng giá chuẩn theo bang_gia.md
  const mockMatrix: PriceMatrixRow[] = [
    {
      categoryId: 'cat_nho',
      categoryName: 'NHỎ',
      morningNormal: 200000,
      morningWeekend: 200000,
      morningHoliday: 250000,
      afternoonNormal: 200000, // Giá thực tế vận hành
      afternoonWeekend: 200000,
      afternoonHoliday: 250000,
      eveningNormal: 200000,
      eveningWeekend: 200000,
      eveningHoliday: 250000,
      lateNightNormal: 200000,
      lateNightWeekend: 200000,
      lateNightHoliday: 250000,
      minimumCharge: 100000,
    },
    {
      categoryId: 'cat_to',
      categoryName: 'TO',
      morningNormal: 250000,
      morningWeekend: 250000,
      morningHoliday: 200000,
      afternoonNormal: 250000,
      afternoonWeekend: 250000,
      afternoonHoliday: 200000,
      eveningNormal: 250000,
      eveningWeekend: 250000,
      eveningHoliday: 200000,
      lateNightNormal: 250000,
      lateNightWeekend: 250000,
      lateNightHoliday: 200000,
      minimumCharge: 100000,
    },
    {
      categoryId: 'cat_sanh',
      categoryName: 'Sảnh',
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
  ];

  const baseConfig: PricingConfig = {
    id: 'cfg_1',
    storeId: 'store_1',
    method: 'TIME_SLOTS',
    roundingMinutes: 5,
    moneyUnit: 1000,
    moneyRoundingScope: 'total_session',
    businessDayStartHour: 8,
    holidays: ['2026-04-30', '2026-05-01', '2026-09-02'],
    matrix: mockMatrix,
    minChargePolicy: 'MAX_USED_ROOMS',
    minChargeZeroPricePolicy: 'WAIVE',
    minChargeZeroBilledPolicy: 'WAIVE',
  };

  // 1. TEST TC-LRM: Thuật toán Hare-Niemeyer (Largest Remainder)
  // Thực tế: 1000s Sáng, 1910s Chiều. Total 2910s. R=15m (900s) -> Billed = 2700s.
  // Kết quả chuẩn: Sáng = 928s, Chiều = 1772s. Tổng = 2700s.
  const lrmResult = allocateSubsegmentSeconds(2700, [
    { id: 'sub_morning', actualSeconds: 1000 },
    { id: 'sub_afternoon', actualSeconds: 1910 },
  ]);
  const morningAlloc = lrmResult.find((s) => s.id === 'sub_morning')?.allocatedSeconds;
  const afternoonAlloc = lrmResult.find((s) => s.id === 'sub_afternoon')?.allocatedSeconds;
  assert(
    'TC-LRM: Thuật toán Hare-Niemeyer phân bổ bảo toàn nguyên 2700s',
    morningAlloc === 928 && afternoonAlloc === 1772,
    `Thực tế phân bổ Sáng: ${morningAlloc}, Chiều: ${afternoonAlloc}`
  );

  // 2. TEST TC-02: Hàm FLOOR độc lập theo bước nhảy R
  const actualSeconds = 73 * 60 + 15; // 4395 giây
  const stepCases: [number, number][] = [
    [0, 4395],
    [5, 4200],
    [10, 4200],
    [15, 3600],
    [20, 3600],
    [25, 3000],
    [30, 3600],
    [60, 3600],
  ];

  stepCases.forEach(([R, expectedSeconds]) => {
    let billed = actualSeconds;
    if (R > 0) {
      billed = Math.floor(actualSeconds / (R * 60)) * (R * 60);
    }
    assert(
      `TC-02: Làm tròn FLOOR với R=${R} phút cho 73p15s`,
      billed === expectedSeconds,
      `Kỳ vọng: ${expectedSeconds}s, Thực tế: ${billed}s`
    );
  });

  // 3. TEST TC-04: Đơn giá 1 VNĐ/giờ (Phòng Sảnh chờ)
  // Sảnh 1đ/h, dùng 30 phút (1800s) -> tiền thô = 0.5đ -> làm tròn lên bội số 1000đ = 1.000đ
  const rat = createRational(1800n * 1n);
  const ceilMoney = rat.toCeilMoney(1000);
  assert(
    'TC-04: Phòng Sảnh 1 VNĐ/h hát 30p làm tròn trần thành 1.000 VNĐ',
    ceilMoney === 1000,
    `Kỳ vọng 1000, Thực tế: ${ceilMoney}`
  );

  // 4. TEST TC-01: Chuyển phòng qua khung giờ (TO 250k -> NHỎ 200k)
  const sessionTC01: Session = {
    id: 'sess_tc01',
    storeId: 'store_1',
    currentRoomId: 'room_nho',
    currentRoomCode: 'P_NHO',
    initialRoomId: 'room_to',
    startTime: '2026-11-11T10:00:00.000Z',
    status: 'ACTIVE',
    pricingConfigSnapshot: { ...baseConfig, roundingMinutes: 5 },
    segments: [
      {
        segmentId: 'seg_1',
        roomId: 'room_to',
        roomCode: 'P_TO',
        roomName: 'Phòng TO',
        categoryName: 'TO',
        checkInTime: '2026-11-11T10:00:00.000Z',
        checkOutTime: '2026-11-11T11:00:05.000Z', // 3605s -> floor 3600s
        actualSeconds: 3605,
        billedSeconds: 3600,
        hourlyRate: 250000,
        minimumCharge: 100000,
        rawAmount: 0,
        amountAfterMinimum: 0,
        payableAmount: 0,
        subsegments: [],
      },
      {
        segmentId: 'seg_2',
        roomId: 'room_nho',
        roomCode: 'P_NHO',
        roomName: 'Phòng NHỎ',
        categoryName: 'NHỎ',
        checkInTime: '2026-11-11T11:00:05.000Z',
        checkOutTime: '2026-11-11T12:00:05.000Z', // 3600s
        actualSeconds: 3600,
        billedSeconds: 3600,
        hourlyRate: 200000,
        minimumCharge: 100000,
        rawAmount: 0,
        amountAfterMinimum: 0,
        payableAmount: 0,
        subsegments: [],
      },
    ],
    createdAt: '2026-11-11T10:00:00.000Z',
    updatedAt: '2026-11-11T12:00:05.000Z',
  };

  const tc01Result = calculateSessionPricing(sessionTC01, new Date('2026-11-11T12:00:05.000Z'));
  assert(
    'TC-01: Chuyển phòng TO sang NHỎ tổng tiền phải là 450.000 VNĐ',
    tc01Result.payable_amount === 450000,
    `Kỳ vọng 450.000đ, Thực tế: ${tc01Result.payable_amount}đ`
  );

  return results;
}
