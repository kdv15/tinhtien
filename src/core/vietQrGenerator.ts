/**
 * VIETQR GENERATOR
 * Tạo mã QR thanh toán ngân hàng chuẩn VietQR cho quầy thu ngân Karaoke
 */

export interface VietQRConfig {
  bankId: string; // VD: VCB, MB, TCB, ACB, BIDV...
  bankName: string; // Ngân hàng Quân Đội (MB Bank)
  accountNo: string; // Số tài khoản
  accountName: string; // Tên chủ tài khoản
}

export function getVietQRImageUrl(
  config: VietQRConfig,
  amount: number,
  description: string
): string {
  if (!config.bankId || !config.accountNo) return '';
  const bank = config.bankId.toUpperCase();
  const accNo = config.accountNo.trim();
  const accName = encodeURIComponent(config.accountName || '');
  const addInfo = encodeURIComponent(description || '');
  const amt = Math.round(amount);

  return `https://img.vietqr.io/image/${bank}-${accNo}-compact2.png?amount=${amt}&addInfo=${addInfo}&accountName=${accName}`;
}

export const POPULAR_VIETNAMESE_BANKS = [
  { id: 'MB', name: 'MBBank - Ngân hàng Quân Đội' },
  { id: 'VCB', name: 'Vietcombank - Ngân hàng Ngoại Thương' },
  { id: 'TCB', name: 'Techcombank - Ngân hàng Kỹ Thương' },
  { id: 'ACB', name: 'ACB - Ngân hàng Á Châu' },
  { id: 'BIDV', name: 'BIDV - Đầu tư và Phát triển' },
  { id: 'ICB', name: 'VietinBank - Ngân hàng Công Thương' },
  { id: 'VPB', name: 'VPBank - Ngân hàng Việt Nam Thịnh Vượng' },
  { id: 'TPB', name: 'TPBank - Ngân hàng Tiên Phong' },
  { id: 'STB', name: 'Sacombank - Ngân hàng Sài Gòn Thương Tín' },
];
