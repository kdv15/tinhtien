/**
 * SERVICE TIMER ENGINE - MODULE 18
 * Tính giờ phục vụ nhân viên phòng Karaoke theo đúng công thức đã thống nhất:
 * t = ceil(Δt_raw / r) * r
 * Nếu t <= 10: amount = P_10
 * Nếu t > 10: amount = P_10 + ((t - 10) / 60) * P_hour
 * Thành tiền cuối = làm tròn LÊN bội số 1.000 đồng
 */

import { StaffTicket, ServiceTimerConfig } from '../types';

export function calculateStaffTicket(
  ticket: {
    checkInTime: string;
    checkOutTime?: string;
    first10MinRate: number;
    hourlyRate: number;
  },
  config: ServiceTimerConfig,
  currentTime: Date = new Date()
): {
  actualSeconds: number;
  billedMinutes: number;
  rawAmount: number;
  finalAmount: number;
} {
  const checkIn = new Date(ticket.checkInTime);
  const checkOut = ticket.checkOutTime ? new Date(ticket.checkOutTime) : currentTime;

  const actualSeconds = Math.max(0, Math.floor((checkOut.getTime() - checkIn.getTime()) / 1000));
  const r = config.roundingMinutes || 5;

  // t = ceil(Δt_raw_seconds / (r * 60)) * r (tính bằng phút)
  const billedMinutes = actualSeconds > 0 ? Math.ceil(actualSeconds / (r * 60)) * r : 0;

  const P_10 = ticket.first10MinRate || config.first10MinPrice || 40000;
  const P_hour = ticket.hourlyRate || config.generalHourlyPrice || 250000;

  let rawAmount = 0;
  if (billedMinutes === 0) {
    rawAmount = 0;
  } else if (billedMinutes <= 10) {
    rawAmount = P_10;
  } else {
    rawAmount = P_10 + ((billedMinutes - 10) / 60) * P_hour;
  }

  // Làm tròn LÊN bội số 1.000đ
  const moneyStep = config.roundingMoneyStep || 1000;
  const finalAmount = rawAmount > 0 ? Math.ceil(rawAmount / moneyStep) * moneyStep : 0;

  return {
    actualSeconds,
    billedMinutes,
    rawAmount: Math.round(rawAmount * 100) / 100,
    finalAmount,
  };
}

export const calculateStaffTicketAmount = calculateStaffTicket;

export function updateStaffTicketAmounts(
  ticket: StaffTicket,
  config: ServiceTimerConfig,
  currentTime: Date = new Date()
): StaffTicket {
  const calculated = calculateStaffTicket(
    {
      checkInTime: ticket.checkInTime,
      checkOutTime: ticket.checkOutTime,
      first10MinRate: ticket.first10MinRate,
      hourlyRate: ticket.hourlyRate,
    },
    config,
    currentTime
  );

  return {
    ...ticket,
    actualSeconds: calculated.actualSeconds,
    billedMinutes: calculated.billedMinutes,
    rawAmount: calculated.rawAmount,
    finalAmount: calculated.finalAmount,
  };
}
