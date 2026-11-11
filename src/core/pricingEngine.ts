/**
 * PRICING ENGINE - V6.3 REV3.2 IMPLEMENTATION
 * Xử lý số học nguyên BigInt, Thuật toán Hare-Niemeyer (Largest Remainder) thuần số nguyên,
 * Phân tách Subsegment theo ranh giới ca kinh doanh (businessDayStartHour),
 * Làm tròn thời gian FLOOR độc lập theo Segment,
 * Khắc phục triệt để nguy cơ áp Mức tối thiểu trùng lặp (MAX_USED_ROOMS kết hợp per_segment).
 */

import {
  PricingConfig,
  PriceMatrixRow,
  RoomUsageSegment,
  PricingSubsegment,
  TimeSlotName,
  DayType,
  Session,
} from '../types';

// Biểu diễn số học nguyên phân số mẫu số 3600 (Exact Rational Number)
export interface ExactRationalAmount {
  numerator: bigint;
  denominator: bigint; // Luôn là 3600n
  toNumber(): number;
  toCeilMoney(roundingUnit: number): number;
}

export function createRational(numerator: bigint): ExactRationalAmount {
  const denominator = 3600n;
  return {
    numerator,
    denominator,
    toNumber() {
      return Number(numerator) / Number(denominator);
    },
    toCeilMoney(roundingUnit: number) {
      if (numerator <= 0n) return 0;
      const bUnit = BigInt(roundingUnit);
      const B = denominator * bUnit;
      // Công thức Ceil số nguyên: ceil(A / B) = (A + B - 1n) / B
      const units = (numerator + B - 1n) / B;
      return Number(units * bUnit);
    },
  };
}

/**
 * Làm tròn thời gian FLOOR theo bước nhảy R phút theo đúng quyết định nghiệp vụ REV3.2 Mục 2.2
 */
export function roundDurationSeconds(seconds: number, roundingMinutes: number): number {
  if (roundingMinutes <= 0) return seconds;
  const stepSeconds = roundingMinutes * 60;
  return Math.floor(seconds / stepSeconds) * stepSeconds;
}


/**
 * Xác định ngày kinh doanh theo mốc businessDayStartHour (Mặc định 08:00 sáng).
 * Nếu thời điểm < businessDayStartHour (ví dụ 00:00 - 07:59), thuộc ca kinh doanh của ngày hôm trước!
 */
export function getBusinessDate(date: Date, businessDayStartHour: number = 8): Date {
  const d = new Date(date);
  if (d.getHours() < businessDayStartHour) {
    d.setDate(d.getDate() - 1);
  }
  return d;
}

/**
 * Xác định loại ngày: LỄ > CUỐI TUẦN > THƯỜNG
 * Có áp dụng mốc ngày kinh doanh businessDayStartHour!
 */
export function determineDayType(
  date: Date,
  holidays: string[] = [],
  businessDayStartHour: number = 8
): DayType {
  const businessDate = getBusinessDate(date, businessDayStartHour);
  const yyyy = businessDate.getFullYear();
  const mm = String(businessDate.getMonth() + 1).padStart(2, '0');
  const dd = String(businessDate.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  if (holidays && holidays.includes(dateStr)) {
    return 'HOLIDAY';
  }

  const dayOfWeek = businessDate.getDay(); // 0: Chủ Nhật, 6: Thứ Bảy
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return 'WEEKEND';
  }

  return 'NORMAL';
}

/**
 * Xác định khung giờ:
 * Buổi Sáng: 07:00:00 - 10:59:59 [07:00, 11:00)
 * Buổi Chiều: 11:00:00 - 16:59:59 [11:00, 17:00)
 * Buổi Tối: 17:00:00 - 23:59:59 [17:00, 24:00)
 * Buổi Khuya: 00:00:00 - 06:59:59 [00:00, 07:00)
 */
export function determineTimeSlot(date: Date): { slot: TimeSlotName; name: string } {
  const hour = date.getHours();
  if (hour >= 7 && hour < 11) {
    return { slot: 'MORNING', name: 'Buổi Sáng' };
  } else if (hour >= 11 && hour < 17) {
    return { slot: 'AFTERNOON', name: 'Buổi Chiều' };
  } else if (hour >= 17 && hour < 24) {
    return { slot: 'EVENING', name: 'Buổi Tối' };
  } else {
    return { slot: 'LATE_NIGHT', name: 'Buổi Khuya' };
  }
}

/**
 * Lấy đơn giá từ PriceMatrixRow
 * Phương thức ONE_PRICE có trường đơn giá cố định riêng (fixedPriceNormal, fixedPriceWeekend, fixedPriceHoliday)
 * Hỗ trợ fallback về morning column nếu chưa cấu hình fixedPrice.
 */
export function getHourlyRate(
  row: PriceMatrixRow,
  method: 'ONE_PRICE' | 'TIME_SLOTS',
  slot: TimeSlotName,
  dayType: DayType
): number {
  if (method === 'ONE_PRICE') {
    if (dayType === 'HOLIDAY') {
      return row.fixedPriceHoliday !== undefined ? row.fixedPriceHoliday : row.morningHoliday;
    }
    if (dayType === 'WEEKEND') {
      return row.fixedPriceWeekend !== undefined ? row.fixedPriceWeekend : row.morningWeekend;
    }
    return row.fixedPriceNormal !== undefined ? row.fixedPriceNormal : row.morningNormal;
  }

  // Phương thức Theo Buổi: Tra cứu theo ma trận 12 ô
  switch (slot) {
    case 'MORNING':
      return dayType === 'HOLIDAY' ? row.morningHoliday : dayType === 'WEEKEND' ? row.morningWeekend : row.morningNormal;
    case 'AFTERNOON':
      return dayType === 'HOLIDAY' ? row.afternoonHoliday : dayType === 'WEEKEND' ? row.afternoonWeekend : row.afternoonNormal;
    case 'EVENING':
      return dayType === 'HOLIDAY' ? row.eveningHoliday : dayType === 'WEEKEND' ? row.eveningWeekend : row.eveningNormal;
    case 'LATE_NIGHT':
      return dayType === 'HOLIDAY' ? row.lateNightHoliday : dayType === 'WEEKEND' ? row.lateNightWeekend : row.lateNightNormal;
  }
}

/**
 * Thuật toán phân bổ số nguyên Hare-Niemeyer (Largest Remainder Method)
 * THUẦN SỐ NGUYÊN BIGINT 100% - Không dùng số thực dấu phẩy động!
 * Bảo đảm tổng số giây sau phân bổ chính xác bằng billedSeconds mà không mất 1 giây.
 */
export function allocateSubsegmentSeconds(
  billedSeconds: number,
  subsegments: { id: string; actualSeconds: number }[]
): { id: string; allocatedSeconds: number }[] {
  if (subsegments.length === 0) return [];
  if (subsegments.length === 1) {
    return [{ id: subsegments[0].id, allocatedSeconds: billedSeconds }];
  }

  const totalActual = subsegments.reduce((acc, s) => acc + s.actualSeconds, 0);
  if (totalActual === 0 || billedSeconds === 0) {
    return subsegments.map((s) => ({ id: s.id, allocatedSeconds: 0 }));
  }

  const bBilled = BigInt(billedSeconds);
  const bTotal = BigInt(totalActual);

  interface ItemCalcBigInt {
    id: string;
    base: bigint;
    remainder: bigint;
    index: number;
  }

  // N_i = B * A_i; base_i = N_i / bTotal; remainder_i = N_i % bTotal
  const calcs: ItemCalcBigInt[] = subsegments.map((s, index) => {
    const numerator = bBilled * BigInt(s.actualSeconds);
    const base = numerator / bTotal;
    const remainder = numerator % bTotal;
    return { id: s.id, base, remainder, index };
  });

  const sumBase = calcs.reduce((acc, c) => acc + c.base, 0n);
  const extraSeconds = Number(bBilled - sumBase);

  // Sắp xếp theo phần dư nguyên remainder giảm dần
  // Nếu remainder bằng nhau thì giữ thứ tự xuất hiện ban đầu (index)
  const sorted = [...calcs].sort((a, b) => {
    if (b.remainder !== a.remainder) {
      return b.remainder > a.remainder ? 1 : -1;
    }
    return a.index - b.index;
  });

  const finalAllocations: Record<string, bigint> = {};
  calcs.forEach((c) => {
    finalAllocations[c.id] = c.base;
  });

  for (let i = 0; i < extraSeconds && i < sorted.length; i++) {
    finalAllocations[sorted[i].id] += 1n;
  }

  return subsegments.map((s) => ({
    id: s.id,
    allocatedSeconds: Number(finalAllocations[s.id] || 0n),
  }));
}

export const allocateHareNiemeyer = (
  subsegments: { actualSeconds: number; [key: string]: unknown }[],
  billedSeconds: number,
  _totalActual?: number
): { billedSeconds: number; [key: string]: unknown }[] => {
  const mapped = subsegments.map((s, idx) => ({ id: `sub_${idx}`, actualSeconds: s.actualSeconds }));
  const result = allocateSubsegmentSeconds(billedSeconds, mapped);
  return subsegments.map((s, idx) => ({
    ...s,
    billedSeconds: result[idx].allocatedSeconds,
  }));
};


/**
 * Cắt thời gian một Segment thành các lát cắt PricingSubsegment liên tục.
 * Phân tách tại các ranh giới:
 * - Khung giờ: 00:00, 07:00, 11:00, 17:00
 * - Ranh giới ngày kinh doanh: businessDayStartHour (mặc định 08:00)
 */
export function sliceSubsegments(
  checkIn: Date,
  checkOut: Date,
  config: PricingConfig,
  matrixRow: PriceMatrixRow
): {
  timeSlot: TimeSlotName;
  timeSlotName: string;
  dayType: DayType;
  dayTypeName: string;
  hourlyRate: number;
  actualSeconds: number;
}[] {
  const result: {
    timeSlot: TimeSlotName;
    timeSlotName: string;
    dayType: DayType;
    dayTypeName: string;
    hourlyRate: number;
    actualSeconds: number;
  }[] = [];

  let current = new Date(checkIn);
  const end = new Date(checkOut);

  if (current >= end) return [];

  const bStartHour = config.businessDayStartHour ?? 8;
  // Tập hợp các mốc giờ ranh giới đổi giá hoặc đổi ngày kinh doanh trong ngày
  const rawTransitionHours = [0, 7, bStartHour, 11, 17];
  const transitionHours = Array.from(new Set(rawTransitionHours)).sort((a, b) => a - b);

  while (current < end) {
    const dayType = determineDayType(current, config.holidays, bStartHour);
    const dayTypeName = dayType === 'HOLIDAY' ? 'Ngày Lễ' : dayType === 'WEEKEND' ? 'Cuối tuần' : 'Ngày thường';
    const { slot, name: slotName } = determineTimeSlot(current);
    const rate = getHourlyRate(matrixRow, config.method, slot, dayType);

    // Tìm mốc chuyển tiếp tiếp theo
    const nextTransition = new Date(current);
    const curHour = current.getHours();

    // Tìm giờ ranh giới nhỏ nhất trong ngày lớn hơn curHour
    const nextHour = transitionHours.find((h) => h > curHour);

    if (nextHour !== undefined) {
      nextTransition.setHours(nextHour, 0, 0, 0);
    } else {
      // Sang 00:00:00 của ngày tiếp theo
      nextTransition.setDate(nextTransition.getDate() + 1);
      nextTransition.setHours(0, 0, 0, 0);
    }

    const chunkEnd = nextTransition < end ? nextTransition : end;
    const actualSeconds = Math.max(0, Math.floor((chunkEnd.getTime() - current.getTime()) / 1000));

    if (actualSeconds > 0) {
      result.push({
        timeSlot: slot,
        timeSlotName: slotName,
        dayType,
        dayTypeName,
        hourlyRate: rate,
        actualSeconds,
      });
    }

    current = chunkEnd;
  }

  return result;
}

/**
 * TÍNH TOÁN CHO MỘT ROOM USAGE SEGMENT ĐỘC LẬP
 * @param applySegmentMinCharge: Nếu false (trong chính sách MAX_USED_ROOMS toàn phiên),
 * Segment không được tự ý áp mức tối thiểu riêng để tránh lỗi tính trùng mức sàn nhiều lần!
 */
export function calculateRoomSegment(
  segment: {
    segmentId: string;
    roomId: string;
    roomCode: string;
    roomName: string;
    categoryName: string;
    checkInTime: string;
    checkOutTime: string;
  },
  config: PricingConfig,
  matrixRow: PriceMatrixRow,
  options?: { applySegmentMinCharge?: boolean }
): RoomUsageSegment {
  const checkIn = new Date(segment.checkInTime);
  const checkOut = new Date(segment.checkOutTime);

  // Bước 1: Tính thời gian thực tế
  const actualSeconds = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000));

  // Bước 2: Làm tròn thời gian theo hàm FLOOR độc lập trên Segment
  const R = config.roundingMinutes;
  let billedSeconds = actualSeconds;
  if (R > 0) {
    const stepSeconds = R * 60;
    billedSeconds = Math.floor(actualSeconds / stepSeconds) * stepSeconds;
  }

  // Bước 3: Cắt Subsegment
  const sliced = sliceSubsegments(checkIn, checkOut, config, matrixRow);
  const subWithIds = sliced.map((s, idx) => ({
    ...s,
    id: `${segment.segmentId}_sub_${idx + 1}`,
  }));

  // Phân bổ billedSeconds qua Hare-Niemeyer (thuần số nguyên BigInt)
  const allocated = allocateSubsegmentSeconds(
    billedSeconds,
    subWithIds.map((s) => ({ id: s.id, actualSeconds: s.actualSeconds }))
  );

  const subMap = new Map(allocated.map((a) => [a.id, a.allocatedSeconds]));

  let segmentNumerator = 0n;
  const processedSubsegments: PricingSubsegment[] = subWithIds.map((sub) => {
    const subBilledSeconds = subMap.get(sub.id) || 0;
    const subNumerator = BigInt(subBilledSeconds) * BigInt(sub.hourlyRate);
    segmentNumerator += subNumerator;
    return {
      id: sub.id,
      timeSlot: sub.timeSlot,
      timeSlotName: sub.timeSlotName,
      dayType: sub.dayType,
      dayTypeName: sub.dayTypeName,
      hourlyRate: sub.hourlyRate,
      actualSeconds: sub.actualSeconds,
      billedSeconds: subBilledSeconds,
      rawAmount: Number(subNumerator) / 3600,
    };
  });

  // Bước 4: Tiền thô của Segment
  const rawRational = createRational(segmentNumerator);
  const rawAmount = rawRational.toNumber();

  // Bước 5: Áp Mức tối thiểu
  // QUAN TRỌNG: Chỉ áp dụng mức tối thiểu cho từng segment khi chính sách là PER_SEGMENT_INDEPENDENT!
  // Với MAX_USED_ROOMS, FIRST_ROOM, LAST_ROOM: Mức tối thiểu do Session xử lý tập trung để không bị lặp.
  const shouldApplyMin = options?.applySegmentMinCharge ?? false;
  const minimumCharge = matrixRow.minimumCharge || 0;
  let amountAfterMinimum = rawAmount;

  if (shouldApplyMin) {
    if (billedSeconds === 0) {
      amountAfterMinimum = config.minChargeZeroBilledPolicy === 'CHARGE_MIN' ? minimumCharge : 0;
    } else if (rawAmount === 0 && processedSubsegments.every((s) => s.hourlyRate === 0)) {
      amountAfterMinimum = config.minChargeZeroPricePolicy === 'CHARGE_MIN' ? minimumCharge : 0;
    } else {
      amountAfterMinimum = Math.max(rawAmount, minimumCharge);
    }
  }

  // Bước 6: Làm tròn tiền của segment
  let payableAmount = 0;
  if (shouldApplyMin) {
    if (amountAfterMinimum > 0) {
      const minChargeNumerator = BigInt(minimumCharge) * 3600n;
      const effectiveNumerator = segmentNumerator > minChargeNumerator ? segmentNumerator : minChargeNumerator;
      payableAmount = createRational(effectiveNumerator).toCeilMoney(config.moneyUnit || 1000);
    }
  } else {
    // Không áp min ở cấp segment: payableAmount là số tiền làm tròn từ tiền thô của segment
    payableAmount = rawRational.toCeilMoney(config.moneyUnit || 1000);
  }

  return {
    segmentId: segment.segmentId,
    roomId: segment.roomId,
    roomCode: segment.roomCode,
    roomName: segment.roomName,
    categoryName: segment.categoryName,
    checkInTime: segment.checkInTime,
    checkOutTime: segment.checkOutTime,
    actualSeconds,
    billedSeconds,
    hourlyRate: processedSubsegments[0]?.hourlyRate || 0,
    minimumCharge,
    rawAmount,
    amountAfterMinimum,
    payableAmount,
    subsegments: processedSubsegments,
  };
}

/**
 * TÍNH TOÁN TIỀN PHÒNG CHO TOÀN BỘ PHIÊN (SESSION)
 * Hỗ trợ Chuyển phòng Option A (tách thời gian liên tục theo từng phòng).
 * Giải quyết chuẩn xác xung đột Q3 x Q6 (MAX_USED_ROOMS kết hợp per_segment không bị nhân đôi min).
 */
export function calculateSessionPricing(
  session: Session,
  currentTime: Date = new Date()
): {
  raw_amount: number;
  amount_after_minimum: number;
  payable_amount: number;
  minimumSurcharge: number;
  calculatedSegments: RoomUsageSegment[];
  totalBilledSeconds: number;
  totalActualSeconds: number;
} {
  const config = session.pricingConfigSnapshot;
  const segments = session.segments || [];

  if (segments.length === 0) {
    return {
      raw_amount: 0,
      amount_after_minimum: 0,
      payable_amount: 0,
      minimumSurcharge: 0,
      calculatedSegments: [],
      totalBilledSeconds: 0,
      totalActualSeconds: 0,
    };
  }

  const isIndependentMin = config.minChargePolicy === 'PER_SEGMENT_INDEPENDENT';

  let totalRawAmount = 0;
  let totalBilledSeconds = 0;
  let totalActualSeconds = 0;
  let maxUsedRoomMin = 0;
  let firstRoomMin = 0;
  let lastRoomMin = 0;

  const calculatedSegments: RoomUsageSegment[] = segments.map((seg, index) => {
    const checkOut = seg.checkOutTime || currentTime.toISOString();
    const matrixRow =
      config.matrix.find((r) => r.categoryName.toLowerCase() === seg.categoryName.toLowerCase()) ||
      config.matrix[0];

    // Chỉ áp min charge cho từng segment nếu policy là PER_SEGMENT_INDEPENDENT
    const calculated = calculateRoomSegment(
      {
        ...seg,
        checkOutTime: checkOut,
      },
      config,
      matrixRow,
      { applySegmentMinCharge: isIndependentMin }
    );

    totalRawAmount += calculated.rawAmount;
    totalBilledSeconds += calculated.billedSeconds;
    totalActualSeconds += calculated.actualSeconds;

    if (index === 0) firstRoomMin = calculated.minimumCharge;
    if (index === segments.length - 1) lastRoomMin = calculated.minimumCharge;
    if (calculated.minimumCharge > maxUsedRoomMin && calculated.actualSeconds > 0) {
      maxUsedRoomMin = calculated.minimumCharge;
    }

    return calculated;
  });

  // Xác định Mức sàn tối thiểu của toàn phiên theo chính sách Q3
  let sessionMinCharge = 0;
  switch (config.minChargePolicy) {
    case 'FIRST_ROOM':
      sessionMinCharge = firstRoomMin;
      break;
    case 'LAST_ROOM':
      sessionMinCharge = lastRoomMin;
      break;
    case 'PER_SEGMENT_INDEPENDENT':
      sessionMinCharge = 0;
      break;
    case 'MAX_USED_ROOMS':
    default:
      sessionMinCharge = maxUsedRoomMin;
      break;
  }

  let amount_after_minimum = totalRawAmount;
  let payable_amount = 0;
  let minimumSurcharge = 0;

  if (isIndependentMin) {
    // Chính sách Q3.4: Làm tròn tiền từng đoạn rồi cộng lại
    payable_amount = calculatedSegments.reduce((sum, s) => sum + s.payableAmount, 0);
    amount_after_minimum = calculatedSegments.reduce((sum, s) => sum + s.amountAfterMinimum, 0);
  } else {
    // Chính sách Q3.1 (MAX_USED_ROOMS), Q3.2 (FIRST_ROOM) hoặc Q3.3 (LAST_ROOM)
    if (totalBilledSeconds === 0 && config.minChargeZeroBilledPolicy === 'WAIVE') {
      amount_after_minimum = 0;
      payable_amount = 0;
    } else {
      amount_after_minimum = Math.max(totalRawAmount, sessionMinCharge);

      if (config.moneyRoundingScope === 'per_segment') {
        // Q6.A kết hợp Q3.1: Sử dụng Phương án 1 (Tách dòng Phụ thu tối thiểu riêng biệt)
        // Mỗi đoạn làm tròn tiền từ tiền thô của đoạn đó, không bị tự ý nâng lên min riêng!
        const sumPerSegmentPayable = calculatedSegments.reduce((sum, s) => sum + s.payableAmount, 0);
        if (sumPerSegmentPayable < sessionMinCharge) {
          minimumSurcharge = sessionMinCharge - sumPerSegmentPayable;
          payable_amount = sessionMinCharge;
        } else {
          minimumSurcharge = 0;
          payable_amount = sumPerSegmentPayable;
        }
      } else {
        // Q6.B (total_session): Làm tròn trần trên tổng phiên
        const mUnit = config.moneyUnit || 1000;
        payable_amount = Math.ceil(amount_after_minimum / mUnit) * mUnit;
        if (totalRawAmount < sessionMinCharge) {
          const rawCeil = Math.ceil(totalRawAmount / mUnit) * mUnit;
          minimumSurcharge = payable_amount > rawCeil ? payable_amount - rawCeil : 0;
        }
      }
    }
  }

  return {
    raw_amount: Math.round(totalRawAmount * 100) / 100,
    amount_after_minimum: Math.round(amount_after_minimum * 100) / 100,
    payable_amount,
    minimumSurcharge,
    calculatedSegments,
    totalBilledSeconds,
    totalActualSeconds,
  };
}

/**
 * Định dạng thời gian hiển thị (VD: "1 giờ 25 phút" hoặc "45 phút")
 */
export function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const sec = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}p`;
  }
  if (minutes > 0) {
    return `${minutes}p ${sec > 0 ? `${sec}s` : ''}`.trim();
  }
  return `${sec}s`;
}

/**
 * Định dạng tiền tệ VNĐ (VD: "250.000 đ")
 */
export function formatMoney(amount: number): string {
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}
