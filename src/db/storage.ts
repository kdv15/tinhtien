/**
 * LOCAL STORAGE & REPOSITORY ENGINE (OFFLINE-FIRST)
 * Đảm bảo dữ liệu bền vững, phản ứng tức thì (Reactive Listeners),
 * ghi Audit Log bất biến và quản lý trạng thái tài chính an toàn.
 */

import {
  Store,
  User,
  Area,
  RoomCategory,
  Room,
  PricingConfig,
  MenuItem,
  OrderItem,
  StaffButtonConfig,
  ServiceTimerConfig,
  Session,
  ServiceSession,
  StaffTicket,
  Invoice,
  CustomerDebt,
  AuditLog,
  AuditActionType,
  UserRole,
} from '../types';

import {
  INITIAL_STORE,
  INITIAL_USERS,
  INITIAL_AREAS,
  INITIAL_CATEGORIES,
  INITIAL_PRICING_CONFIG,
  INITIAL_ROOMS,
  INITIAL_MENU_ITEMS,
  INITIAL_STAFF_BUTTONS,
  INITIAL_SERVICE_TIMER_CONFIG,
  INITIAL_ACTIVE_SESSION,
  INITIAL_ACTIVE_SERVICE_SESSION,
  INITIAL_CUSTOMER_DEBTS,
} from './mockSeed';

import { calculateRoomSegment, calculateSessionPricing } from '../core/pricingEngine';
import { updateStaffTicketAmounts } from '../core/serviceTimerEngine';

const STORAGE_KEYS = {
  STORE: 'km_store',
  USERS: 'km_users',
  CURRENT_USER: 'km_current_user',
  AREAS: 'km_areas',
  CATEGORIES: 'km_categories',
  ROOMS: 'km_rooms',
  PRICING_CONFIG: 'km_pricing_config',
  MENU_ITEMS: 'km_menu_items',
  STAFF_BUTTONS: 'km_staff_buttons',
  SERVICE_TIMER_CONFIG: 'km_service_timer_config',
  SESSIONS: 'km_sessions',
  SERVICE_SESSIONS: 'km_service_sessions',
  ORDER_ITEMS: 'km_order_items',
  INVOICES: 'km_invoices',
  DEBTS: 'km_debts',
  AUDIT_LOGS: 'km_audit_logs',
};

type Listener = () => void;
const listeners: Set<Listener> = new Set();

export function subscribeToStore(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch (e) {
      console.error('Error notifying listener:', e);
    }
  });
}

function getJson<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch {
    return defaultValue;
  }
}

// Đồng bộ cơ sở dữ liệu lên Server Express (data/db.json)
let syncTimeout: ReturnType<typeof setTimeout> | null = null;
export function syncToServer(): void {
  if (typeof window === 'undefined') return;
  const snapshot: Record<string, unknown> = {};
  Object.values(STORAGE_KEYS).forEach((k) => {
    const raw = localStorage.getItem(k);
    if (raw) {
      try {
        snapshot[k] = JSON.parse(raw);
      } catch {
        snapshot[k] = raw;
      }
    }
  });

  fetch('/api/data/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
  }).catch(() => {
    // Chế độ Offline: nếu server không phản hồi, client vẫn hoạt động 100% bằng localStorage
  });
}

function setJson<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notifyListeners();

    // Tự động đẩy snapshot lên máy chủ với debounce 400ms
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      syncToServer();
    }, 400);
  } catch (e) {
    console.error(`Failed to save key ${key}:`, e);
  }
}

// Khởi tạo dữ liệu mẫu nếu chưa có & đồng bộ với Server DB
export function initDatabase(): void {
  if (typeof window !== 'undefined') {
    // Kéo dữ liệu từ Server nếu có sẵn trên data/db.json
    fetch('/api/data')
      .then((res) => (res.ok ? res.json() : null))
      .then((res) => {
        if (res && res.data && Object.keys(res.data).length > 0) {
          let hasUpdated = false;
          Object.values(STORAGE_KEYS).forEach((k) => {
            if (res.data[k] !== undefined && !localStorage.getItem(k)) {
              localStorage.setItem(k, JSON.stringify(res.data[k]));
              hasUpdated = true;
            }
          });
          if (hasUpdated) {
            notifyListeners();
          }
        }
      })
      .catch(() => {
        // Server chưa sẵn sàng hoặc offline
      });
  }

  if (!localStorage.getItem(STORAGE_KEYS.STORE)) {
    localStorage.setItem(STORAGE_KEYS.STORE, JSON.stringify(INITIAL_STORE));
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(INITIAL_USERS[0]));
    localStorage.setItem(STORAGE_KEYS.AREAS, JSON.stringify(INITIAL_AREAS));
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
    localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(INITIAL_ROOMS));
    localStorage.setItem(STORAGE_KEYS.PRICING_CONFIG, JSON.stringify(INITIAL_PRICING_CONFIG));
    localStorage.setItem(STORAGE_KEYS.MENU_ITEMS, JSON.stringify(INITIAL_MENU_ITEMS));
    localStorage.setItem(STORAGE_KEYS.STAFF_BUTTONS, JSON.stringify(INITIAL_STAFF_BUTTONS));
    localStorage.setItem(STORAGE_KEYS.SERVICE_TIMER_CONFIG, JSON.stringify(INITIAL_SERVICE_TIMER_CONFIG));
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify([INITIAL_ACTIVE_SESSION]));
    localStorage.setItem(STORAGE_KEYS.SERVICE_SESSIONS, JSON.stringify([INITIAL_ACTIVE_SERVICE_SESSION]));
    localStorage.setItem(STORAGE_KEYS.DEBTS, JSON.stringify(INITIAL_CUSTOMER_DEBTS));

    // Thêm các món order mẫu cho phòng 101
    const sampleOrders: OrderItem[] = [
      {
        id: 'ord_1',
        sessionId: 'sess_active_101',
        storeId: INITIAL_STORE.id,
        menuItemId: 'menu_ken_bac',
        code: 'KEN_SILVER',
        name: 'Bia Heineken Silver',
        unit: 'Lon',
        unitPrice: 38000,
        quantity: 6,
        totalAmount: 228000,
        orderTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: 'SERVED',
      },
      {
        id: 'ord_2',
        sessionId: 'sess_active_101',
        storeId: INITIAL_STORE.id,
        menuItemId: 'menu_fruit_big',
        code: 'FRUIT_VIP',
        name: 'Đĩa trái cây thập cẩm VIP',
        unit: 'Dĩa',
        unitPrice: 180000,
        quantity: 1,
        totalAmount: 180000,
        orderTime: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
        status: 'SERVED',
      },
      {
        id: 'ord_3',
        sessionId: 'sess_active_101',
        storeId: INITIAL_STORE.id,
        menuItemId: 'menu_khan_lanh',
        code: 'KHAN_LANH',
        name: 'Khăn lạnh cao cấp',
        unit: 'Cái',
        unitPrice: 5000,
        quantity: 4,
        totalAmount: 20000,
        orderTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: 'SERVED',
      },
    ];
    localStorage.setItem(STORAGE_KEYS.ORDER_ITEMS, JSON.stringify(sampleOrders));
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));

    // Khởi tạo audit log đầu tiên
    const initialLog: AuditLog = {
      id: `log_init_${Date.now()}`,
      storeId: INITIAL_STORE.id,
      userId: INITIAL_USERS[0].id,
      userName: INITIAL_USERS[0].fullName,
      userRole: INITIAL_USERS[0].role,
      action: 'LOGIN',
      description: 'Hệ thống Karaoke Manager khởi động thành công với cơ sở dữ liệu ban đầu',
      createdAt: new Date().toISOString(),
      deviceId: 'Windows-PC-Cashier',
    };
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([initialLog]));
  }
}

// ----------------------------------------------------
// AUDIT LOG SERVICE
// ----------------------------------------------------
export function addAuditLog(action: AuditActionType, description: string, metadata?: Record<string, unknown>): void {
  const currentUser = getCurrentUser();
  const store = getStore();
  const logs = getJson<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);

  const newLog: AuditLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    storeId: store.id,
    userId: currentUser?.id || 'system',
    userName: currentUser?.fullName || 'Hệ thống',
    userRole: (currentUser?.role as UserRole) || 'cashier',
    action,
    description,
    metadata,
    createdAt: new Date().toISOString(),
    deviceId: navigator.userAgent.includes('iPhone') ? 'iPhone-Mobile' : 'Windows-PC-POS',
  };

  logs.unshift(newLog); // Thêm vào đầu danh sách
  // Giữ tối đa 1000 log gần nhất
  if (logs.length > 1000) logs.pop();
  setJson(STORAGE_KEYS.AUDIT_LOGS, logs);

  // Ghi nhật ký đồng thời lên máy chủ
  if (typeof window !== 'undefined') {
    fetch('/api/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newLog),
    }).catch(() => {});
  }
}

export function getAuditLogs(): AuditLog[] {
  return getJson<AuditLog[]>(STORAGE_KEYS.AUDIT_LOGS, []);
}

// ----------------------------------------------------
// USER & AUTH SERVICE
// ----------------------------------------------------
export function getCurrentUser(): User {
  return getJson<User>(STORAGE_KEYS.CURRENT_USER, INITIAL_USERS[0]);
}

export function setCurrentUser(user: User): void {
  setJson(STORAGE_KEYS.CURRENT_USER, user);
  addAuditLog('LOGIN', `Người dùng ${user.fullName} (${user.role}) đăng nhập vào phiên làm việc`);
}

export function getAllUsers(): User[] {
  return getJson<User[]>(STORAGE_KEYS.USERS, INITIAL_USERS);
}

export function verifyLevel2Password(inputPassword: string): boolean {
  const currentUser = getCurrentUser();
  const allUsers = getAllUsers();
  // Ưu tiên mật khẩu cấp 2 của admin/owner hoặc chính user hiện tại
  const admin = allUsers.find((u) => u.role === 'owner' || u.role === 'admin');
  const validPass = currentUser.level2Password || admin?.level2Password || '9999';
  return inputPassword === validPass;
}

// ----------------------------------------------------
// STORE & CONFIG SERVICE
// ----------------------------------------------------
export function getStore(): Store {
  return getJson<Store>(STORAGE_KEYS.STORE, INITIAL_STORE);
}

export function updateStore(store: Store): void {
  setJson(STORAGE_KEYS.STORE, store);
  addAuditLog('SETTINGS_CHANGE', `Cập nhật thông tin cửa hàng: ${store.name}`);
}

export function getPricingConfig(): PricingConfig {
  return getJson<PricingConfig>(STORAGE_KEYS.PRICING_CONFIG, INITIAL_PRICING_CONFIG);
}

export function updatePricingConfig(config: PricingConfig): void {
  setJson(STORAGE_KEYS.PRICING_CONFIG, config);
  addAuditLog('PRICE_CONFIG_CHANGE', `Cập nhật Bảng giá phòng: Phương thức ${config.method}, R = ${config.roundingMinutes}p`);
}

export function getServiceTimerConfig(): ServiceTimerConfig {
  return getJson<ServiceTimerConfig>(STORAGE_KEYS.SERVICE_TIMER_CONFIG, INITIAL_SERVICE_TIMER_CONFIG);
}

export function updateServiceTimerConfig(config: ServiceTimerConfig): void {
  setJson(STORAGE_KEYS.SERVICE_TIMER_CONFIG, config);
  addAuditLog('SETTINGS_CHANGE', `Cập nhật cấu hình tính giờ phục vụ: 10p đầu ${config.first10MinPrice}đ, giá giờ ${config.generalHourlyPrice}đ`);
}

export function getStaffButtons(): StaffButtonConfig[] {
  return getJson<StaffButtonConfig[]>(STORAGE_KEYS.STAFF_BUTTONS, INITIAL_STAFF_BUTTONS);
}

export function updateStaffButtons(buttons: StaffButtonConfig[]): void {
  setJson(STORAGE_KEYS.STAFF_BUTTONS, buttons);
}

// ----------------------------------------------------
// ROOMS & ROOM MANAGEMENT SERVICE
// ----------------------------------------------------
export function getAllRooms(): Room[] {
  return getJson<Room[]>(STORAGE_KEYS.ROOMS, INITIAL_ROOMS);
}

export function getAllAreas(): Area[] {
  return getJson<Area[]>(STORAGE_KEYS.AREAS, INITIAL_AREAS);
}

export function getAllCategories(): RoomCategory[] {
  return getJson<RoomCategory[]>(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
}

export function updateRooms(rooms: Room[]): void {
  setJson(STORAGE_KEYS.ROOMS, rooms);
}

/**
 * MỞ PHÒNG MỚI (CHECK-IN)
 * Khóa snapshot cấu hình bảng giá và làm tròn thời gian vào phiên!
 */
export function openRoom(
  roomId: string,
  options?: { customerName?: string; customerPhone?: string; notes?: string }
): Session {
  const rooms = getAllRooms();
  const room = rooms.find((r) => r.id === roomId);
  if (!room) throw new Error('Không tìm thấy phòng');

  const config = getPricingConfig();
  const now = new Date().toISOString();
  const sessionId = `sess_${Date.now()}_${room.code}`;

  const matrixRow =
    config.matrix.find((r) => r.categoryName.toLowerCase() === room.categoryName.toLowerCase()) ||
    config.matrix[0];

  const initialSegment = calculateRoomSegment(
    {
      segmentId: `seg_${Date.now()}_${room.code}`,
      roomId: room.id,
      roomCode: room.code,
      roomName: room.name,
      categoryName: room.categoryName,
      checkInTime: now,
      checkOutTime: now,
    },
    config,
    matrixRow
  );

  const newSession: Session = {
    id: sessionId,
    storeId: room.storeId,
    currentRoomId: room.id,
    currentRoomCode: room.code,
    initialRoomId: room.id,
    startTime: now,
    status: 'ACTIVE',
    customerName: options?.customerName || '',
    customerPhone: options?.customerPhone || '',
    notes: options?.notes || '',
    pricingConfigSnapshot: JSON.parse(JSON.stringify(config)), // Khóa Snapshot cấu hình
    segments: [initialSegment],
    createdAt: now,
    updatedAt: now,
  };

  // Cập nhật trạng thái phòng
  room.status = 'OCCUPIED';
  room.currentSessionId = sessionId;
  updateRooms(rooms);

  // Lưu phiên
  const sessions = getJson<Session[]>(STORAGE_KEYS.SESSIONS, []);
  sessions.push(newSession);
  setJson(STORAGE_KEYS.SESSIONS, sessions);

  // Tạo ServiceSession rỗng cho tính giờ phục vụ
  const serviceSessions = getJson<ServiceSession[]>(STORAGE_KEYS.SERVICE_SESSIONS, []);
  serviceSessions.push({
    id: `srv_${sessionId}`,
    storeId: room.storeId,
    sessionId: sessionId,
    roomId: room.id,
    status: 'ACTIVE',
    tickets: [],
    createdAt: now,
    updatedAt: now,
  });
  setJson(STORAGE_KEYS.SERVICE_SESSIONS, serviceSessions);

  addAuditLog('ROOM_OPEN', `Mở ${room.name} (${room.code}) lúc ${new Date(now).toLocaleTimeString('vi-VN')}`, {
    sessionId,
    customer: options?.customerName,
  });

  return newSession;
}

/**
 * CHUYỂN PHÒNG - THEO ĐÚNG PHƯƠNG ÁN A ĐÃ CHỐT 100%
 * Tách thời gian liên tục theo từng phòng, thời gian ở phòng nào áp giá phòng đó.
 * Tuyệt đối không tính hồi tố!
 */
export function transferRoom(sessionId: string, targetRoomId: string): void {
  const sessions = getJson<Session[]>(STORAGE_KEYS.SESSIONS, []);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error('Không tìm thấy phiên hát');

  const rooms = getAllRooms();
  const currentRoom = rooms.find((r) => r.id === session.currentRoomId);
  const targetRoom = rooms.find((r) => r.id === targetRoomId);

  if (!currentRoom || !targetRoom) throw new Error('Phòng không hợp lệ');
  if (targetRoom.status !== 'AVAILABLE') throw new Error(`Phòng ${targetRoom.name} đang không trống`);

  const now = new Date().toISOString();
  const config = session.pricingConfigSnapshot; // Dùng snapshot của phiên!

  // Đóng segment hiện tại
  const currentSegment = session.segments[session.segments.length - 1];
  if (currentSegment) {
    currentSegment.checkOutTime = now;
    const currentMatrixRow =
      config.matrix.find((r) => r.categoryName.toLowerCase() === currentSegment.categoryName.toLowerCase()) ||
      config.matrix[0];

    const recalculated = calculateRoomSegment(currentSegment, config, currentMatrixRow);
    session.segments[session.segments.length - 1] = recalculated;
  }

  // Mở segment mới cho phòng chuyển đến (ngay tại thời điểm now liên tục)
  const targetMatrixRow =
    config.matrix.find((r) => r.categoryName.toLowerCase() === targetRoom.categoryName.toLowerCase()) ||
    config.matrix[0];

  const newSegment = calculateRoomSegment(
    {
      segmentId: `seg_${Date.now()}_${targetRoom.code}`,
      roomId: targetRoom.id,
      roomCode: targetRoom.code,
      roomName: targetRoom.name,
      categoryName: targetRoom.categoryName,
      checkInTime: now,
      checkOutTime: now,
    },
    config,
    targetMatrixRow
  );

  session.segments.push(newSegment);
  session.currentRoomId = targetRoom.id;
  session.currentRoomCode = targetRoom.code;
  session.updatedAt = now;

  // Cập nhật trạng thái phòng
  currentRoom.status = 'AVAILABLE';
  currentRoom.currentSessionId = undefined;
  currentRoom.activeStaffCount = 0;

  targetRoom.status = 'OCCUPIED';
  targetRoom.currentSessionId = sessionId;

  // Chuyển ServiceSession sang phòng mới
  const serviceSessions = getJson<ServiceSession[]>(STORAGE_KEYS.SERVICE_SESSIONS, []);
  const serviceSess = serviceSessions.find((s) => s.sessionId === sessionId);
  if (serviceSess) {
    serviceSess.roomId = targetRoom.id;
    serviceSess.updatedAt = now;
    setJson(STORAGE_KEYS.SERVICE_SESSIONS, serviceSessions);
  }

  updateRooms(rooms);
  setJson(STORAGE_KEYS.SESSIONS, sessions);

  addAuditLog(
    'ROOM_CHANGE',
    `Chuyển phòng: ${currentRoom.name} -> ${targetRoom.name} (Tách phân đoạn Option A liên tục lúc ${new Date(now).toLocaleTimeString('vi-VN')})`,
    {
      sessionId,
      fromRoom: currentRoom.name,
      toRoom: targetRoom.name,
    }
  );
}

/**
 * HỦY PHÒNG / TRẢ PHÒNG NHẦM (MISTAKE CANCELLATION)
 * Áp dụng Mục 6 REV3.2: Không phát sinh hóa đơn tài chính, tiền phòng = 0, ghi Audit Log
 */
export function cancelRoomSession(sessionId: string, reason: string): void {
  const sessions = getJson<Session[]>(STORAGE_KEYS.SESSIONS, []);
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) return;

  const rooms = getAllRooms();
  const room = rooms.find((r) => r.id === session.currentRoomId);
  if (room) {
    room.status = 'AVAILABLE';
    room.currentSessionId = undefined;
    room.activeStaffCount = 0;
    updateRooms(rooms);
  }

  session.status = 'CANCELLED_MISTAKE';
  session.endTime = new Date().toISOString();
  session.notes = `${session.notes ? session.notes + ' | ' : ''}Lý do hủy: ${reason}`;
  setJson(STORAGE_KEYS.SESSIONS, sessions);

  // Hủy các món nếu chưa phục vụ
  const orderItems = getOrderItemsBySession(sessionId);
  orderItems.forEach((item) => {
    item.status = 'CANCELLED';
  });
  setJson(STORAGE_KEYS.ORDER_ITEMS, getJson<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS, []));

  addAuditLog('ROOM_CANCEL', `Hủy phiên phòng ${session.currentRoomCode}. Lý do: ${reason}`, { sessionId });
}

export function getSessionById(sessionId: string): Session | undefined {
  const sessions = getJson<Session[]>(STORAGE_KEYS.SESSIONS, []);
  return sessions.find((s) => s.id === sessionId);
}

// ----------------------------------------------------
// ORDER & MENU ITEMS SERVICE
// ----------------------------------------------------
export function getAllMenuItems(): MenuItem[] {
  return getJson<MenuItem[]>(STORAGE_KEYS.MENU_ITEMS, INITIAL_MENU_ITEMS);
}

export function updateMenuItems(items: MenuItem[]): void {
  setJson(STORAGE_KEYS.MENU_ITEMS, items);
}

export function getOrderItemsBySession(sessionId: string): OrderItem[] {
  const allOrders = getJson<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS, []);
  return allOrders.filter((o) => o.sessionId === sessionId && o.status !== 'CANCELLED');
}

export function addOrderItemToSession(
  sessionId: string,
  menuItemId: string,
  quantity: number,
  note?: string
): void {
  const menuItems = getAllMenuItems();
  const item = menuItems.find((m) => m.id === menuItemId);
  if (!item) throw new Error('Không tìm thấy mặt hàng');

  const allOrders = getJson<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS, []);
  const store = getStore();

  // Kiểm tra món đã có trong phiên chưa để cộng dồn
  const existing = allOrders.find(
    (o) => o.sessionId === sessionId && o.menuItemId === menuItemId && o.status === 'SERVED'
  );

  if (existing) {
    existing.quantity += quantity;
    existing.totalAmount = existing.quantity * existing.unitPrice;
    if (note) existing.note = note;
  } else {
    allOrders.push({
      id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sessionId,
      storeId: store.id,
      menuItemId: item.id,
      code: item.code,
      name: item.name,
      unit: item.unit,
      unitPrice: item.salePrice,
      quantity,
      totalAmount: item.salePrice * quantity,
      orderTime: new Date().toISOString(),
      note,
      status: 'SERVED',
    });
  }

  // Tự động trừ tồn kho
  item.stockQuantity = Math.max(0, item.stockQuantity - quantity);
  updateMenuItems(menuItems);
  setJson(STORAGE_KEYS.ORDER_ITEMS, allOrders);

  addAuditLog('INVENTORY_CHANGE', `Gọi món: ${item.name} x${quantity} (${item.unit}) cho phiên ${sessionId}`);
}

export function updateOrderItemQuantity(orderItemId: string, newQuantity: number): void {
  const allOrders = getJson<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS, []);
  const order = allOrders.find((o) => o.id === orderItemId);
  if (!order) return;

  const menuItems = getAllMenuItems();
  const menuItem = menuItems.find((m) => m.id === order.menuItemId);

  const diff = newQuantity - order.quantity;
  if (menuItem) {
    menuItem.stockQuantity = Math.max(0, menuItem.stockQuantity - diff);
    updateMenuItems(menuItems);
  }

  if (newQuantity <= 0) {
    order.status = 'CANCELLED';
  } else {
    order.quantity = newQuantity;
    order.totalAmount = order.unitPrice * newQuantity;
  }

  setJson(STORAGE_KEYS.ORDER_ITEMS, allOrders);
}

// ----------------------------------------------------
// SERVICE TIMER (MODULE 18) REPOSITORY
// ----------------------------------------------------
export function getServiceSessionBySessionId(sessionId: string): ServiceSession | undefined {
  const all = getJson<ServiceSession[]>(STORAGE_KEYS.SERVICE_SESSIONS, []);
  return all.find((s) => s.sessionId === sessionId);
}

export function toggleStaffTimer(
  sessionId: string,
  buttonCode: string,
  options?: { realStaffName?: string; managerName?: string }
): void {
  const all = getJson<ServiceSession[]>(STORAGE_KEYS.SERVICE_SESSIONS, []);
  let serviceSession = all.find((s) => s.sessionId === sessionId);
  const now = new Date().toISOString();
  const timerConfig = getServiceTimerConfig();
  const buttons = getStaffButtons();
  const buttonConfig = buttons.find((b) => b.buttonCode === buttonCode);

  if (!serviceSession) {
    const session = getSessionById(sessionId);
    serviceSession = {
      id: `srv_${sessionId}`,
      storeId: session?.storeId || 'store_1',
      sessionId,
      roomId: session?.currentRoomId || 'room_1',
      status: 'ACTIVE',
      tickets: [],
      createdAt: now,
      updatedAt: now,
    };
    all.push(serviceSession);
  }

  // Kiểm tra xem nút này đang có lượt nào đang chạy không
  const activeTicket = serviceSession.tickets.find((t) => t.buttonCode === buttonCode && !t.isCompleted);

  if (activeTicket) {
    // Chốt giờ ra cho lượt đang chạy
    activeTicket.checkOutTime = now;
    activeTicket.isCompleted = true;
    const updated = updateStaffTicketAmounts(activeTicket, timerConfig, new Date(now));
    Object.assign(activeTicket, updated);

    addAuditLog('STAFF_TIMER_STOP', `Chốt giờ ra cho ${buttonCode} (${activeTicket.realStaffName || ''}) tại thời điểm ${new Date(now).toLocaleTimeString('vi-VN')}`);
  } else {
    // Bắt đầu lượt mới
    const customRate = buttonConfig?.customHourlyRate || timerConfig.generalHourlyPrice;
    const newTicket: StaffTicket = {
      ticketId: `tkt_${Date.now()}_${buttonCode}`,
      buttonCode,
      displayName: buttonConfig?.displayName || buttonCode,
      realStaffName: options?.realStaffName || '',
      managerName: options?.managerName || '',
      checkInTime: now,
      actualSeconds: 0,
      billedMinutes: 0,
      first10MinRate: timerConfig.first10MinPrice,
      hourlyRate: customRate,
      rawAmount: 0,
      finalAmount: 0,
      isCompleted: false,
    };
    serviceSession.tickets.push(newTicket);

    addAuditLog('STAFF_TIMER_START', `Bắt đầu tính giờ cho ${buttonCode} (${newTicket.realStaffName || ''}) lúc ${new Date(now).toLocaleTimeString('vi-VN')}`);
  }

  serviceSession.updatedAt = now;

  // Cập nhật số nhân viên đang phục vụ trên phòng
  const rooms = getAllRooms();
  const room = rooms.find((r) => r.id === serviceSession?.roomId);
  if (room) {
    room.activeStaffCount = serviceSession.tickets.filter((t) => !t.isCompleted).length;
    updateRooms(rooms);
  }

  setJson(STORAGE_KEYS.SERVICE_SESSIONS, all);
}

export function editStaffTicketTime(
  sessionId: string,
  ticketId: string,
  newCheckInTime: string,
  newCheckOutTime?: string
): void {
  const all = getJson<ServiceSession[]>(STORAGE_KEYS.SERVICE_SESSIONS, []);
  const serviceSession = all.find((s) => s.sessionId === sessionId);
  if (!serviceSession) return;

  const ticket = serviceSession.tickets.find((t) => t.ticketId === ticketId);
  if (!ticket) return;

  const timerConfig = getServiceTimerConfig();
  ticket.checkInTime = newCheckInTime;
  if (newCheckOutTime) {
    ticket.checkOutTime = newCheckOutTime;
    ticket.isCompleted = true;
  }

  const updated = updateStaffTicketAmounts(ticket, timerConfig);
  Object.assign(ticket, updated);

  serviceSession.updatedAt = new Date().toISOString();
  setJson(STORAGE_KEYS.SERVICE_SESSIONS, all);

  addAuditLog(
    'STAFF_TIMER_EDIT',
    `Chỉnh sửa thời gian phục vụ vé ${ticket.buttonCode}: Vào ${new Date(newCheckInTime).toLocaleTimeString('vi-VN')}, Ra ${newCheckOutTime ? new Date(newCheckOutTime).toLocaleTimeString('vi-VN') : 'Đang chạy'}`
  );
}

export function completeServiceSession(sessionId: string): void {
  const all = getJson<ServiceSession[]>(STORAGE_KEYS.SERVICE_SESSIONS, []);
  const serviceSession = all.find((s) => s.sessionId === sessionId);
  if (!serviceSession) return;

  const now = new Date().toISOString();
  const timerConfig = getServiceTimerConfig();

  // Chốt tất cả các lượt còn đang chạy
  serviceSession.tickets.forEach((ticket) => {
    if (!ticket.isCompleted) {
      ticket.checkOutTime = now;
      ticket.isCompleted = true;
      const updated = updateStaffTicketAmounts(ticket, timerConfig, new Date(now));
      Object.assign(ticket, updated);
    }
  });

  serviceSession.status = 'COMPLETED';
  serviceSession.updatedAt = now;

  const rooms = getAllRooms();
  const room = rooms.find((r) => r.id === serviceSession.roomId);
  if (room) {
    room.activeStaffCount = 0;
    updateRooms(rooms);
  }

  setJson(STORAGE_KEYS.SERVICE_SESSIONS, all);
  addAuditLog('STAFF_TIMER_STOP', `Lưu phiếu / hoàn tất tính giờ phục vụ cho phiên ${sessionId}`);
}

export function reopenServiceSession(sessionId: string): void {
  const all = getJson<ServiceSession[]>(STORAGE_KEYS.SERVICE_SESSIONS, []);
  const serviceSession = all.find((s) => s.sessionId === sessionId);
  if (!serviceSession) return;

  serviceSession.status = 'ACTIVE';
  serviceSession.updatedAt = new Date().toISOString();
  setJson(STORAGE_KEYS.SERVICE_SESSIONS, all);

  addAuditLog('STAFF_TIMER_REOPEN', `Mở lại phiếu tính giờ phục vụ cho phiên ${sessionId} để chỉnh sửa/thêm lượt`);
}

// ----------------------------------------------------
// INVOICE & CHECKOUT SERVICE
// ----------------------------------------------------
export function getAllInvoices(): Invoice[] {
  return getJson<Invoice[]>(STORAGE_KEYS.INVOICES, []);
}

export function checkoutAndCreateInvoice(
  sessionId: string,
  paymentData: {
    paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'MULTI' | 'DEBT';
    cashReceived?: number;
    bankTransferReceived?: number;
    debtAmount?: number;
    customerName?: string;
    customerPhone?: string;
    discountPercent?: number;
    discountAmount?: number;
    surchargeAmount?: number;
    surchargeReason?: string;
    notes?: string;
  }
): Invoice {
  const session = getSessionById(sessionId);
  if (!session) throw new Error('Không tìm thấy phiên phòng');

  const now = new Date();
  const nowIso = now.toISOString();
  const store = getStore();
  const currentUser = getCurrentUser();

  // 1. Tính toán tiền phòng chuẩn Pricing Engine
  const pricingResult = calculateSessionPricing(session, now);

  // 2. Chốt và tính toán tiền phục vụ nhân viên
  const serviceSession = getServiceSessionBySessionId(sessionId);
  let staffTicketsBreakdown: { displayName: string; managerName?: string; durationMinutes: number; amount: number }[] = [];
  let staffServiceTotal = 0;

  if (serviceSession) {
    completeServiceSession(sessionId);
    staffTicketsBreakdown = serviceSession.tickets.map((t) => ({
      displayName: t.displayName,
      managerName: t.managerName,
      durationMinutes: t.billedMinutes,
      amount: t.finalAmount,
    }));
    staffServiceTotal = serviceSession.tickets.reduce((sum, t) => sum + t.finalAmount, 0);
  }

  // 3. Tính tiền dịch vụ / món ăn
  const orderItems = getOrderItemsBySession(sessionId);
  const itemsBreakdown = orderItems.map((item) => ({
    name: item.name,
    unit: item.unit,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalAmount: item.totalAmount,
  }));
  const orderTotal = orderItems.reduce((sum, item) => sum + item.totalAmount, 0);

  // 4. Giảm giá và phụ phí
  const discountPercent = paymentData.discountPercent || 0;
  let discountAmount = paymentData.discountAmount || 0;
  if (discountPercent > 0 && discountAmount === 0) {
    discountAmount = Math.round(((pricingResult.payable_amount + orderTotal) * discountPercent) / 100);
  }
  const surchargeAmount = paymentData.surchargeAmount || 0;

  // 5. Tổng tiền thanh toán cuối cùng (final_amount)
  const final_amount = Math.max(
    0,
    pricingResult.payable_amount + orderTotal + staffServiceTotal - discountAmount + surchargeAmount
  );

  // 6. Số hiệu hóa đơn HD-YYYYMMDD-XXX
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const existingInvoices = getAllInvoices();
  const seq = String(existingInvoices.length + 1).padStart(3, '0');
  const invoiceNumber = `HD-${ymd}-${seq}`;

  const segmentsBreakdown = pricingResult.calculatedSegments.map((seg) => ({
    roomName: seg.roomName,
    durationMinutes: Math.floor(seg.billedSeconds / 60),
    hourlyRate: seg.hourlyRate,
    amount: seg.payableAmount,
  }));

  const totalMinutes = Math.floor(pricingResult.totalBilledSeconds / 60);
  const totalDurationFormatted = `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}p`;

  const newInvoice: Invoice = {
    id: `inv_${Date.now()}`,
    storeId: store.id,
    invoiceNumber,
    sessionId,
    roomCode: session.currentRoomCode,
    roomName: session.segments[session.segments.length - 1]?.roomName || session.currentRoomCode,
    checkInTime: session.startTime,
    checkOutTime: nowIso,
    totalDurationFormatted,
    raw_amount: pricingResult.raw_amount,
    amount_after_minimum: pricingResult.amount_after_minimum,
    payable_amount: pricingResult.payable_amount,
    final_amount,
    segmentsBreakdown,
    orderItems: itemsBreakdown,
    orderTotal,
    staffServiceTickets: staffTicketsBreakdown,
    staffServiceTotal,
    discountPercent,
    discountAmount,
    surchargeAmount,
    surchargeReason: paymentData.surchargeReason,
    paymentMethod: paymentData.paymentMethod,
    cashReceived: paymentData.cashReceived,
    bankTransferReceived: paymentData.bankTransferReceived,
    debtAmount: paymentData.debtAmount || 0,
    customerName: paymentData.customerName || session.customerName,
    customerPhone: paymentData.customerPhone || session.customerPhone,
    status: paymentData.paymentMethod === 'DEBT' ? 'DEBT' : 'PAID',
    cashierName: currentUser.fullName,
    notes: paymentData.notes || session.notes,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  // Lưu hóa đơn
  existingInvoices.unshift(newInvoice);
  setJson(STORAGE_KEYS.INVOICES, existingInvoices);

  // Đóng phiên phòng
  session.status = 'COMPLETED';
  session.endTime = nowIso;
  const sessions = getJson<Session[]>(STORAGE_KEYS.SESSIONS, []);
  const idx = sessions.findIndex((s) => s.id === sessionId);
  if (idx >= 0) sessions[idx] = session;
  setJson(STORAGE_KEYS.SESSIONS, sessions);

  // Giải phóng phòng
  const rooms = getAllRooms();
  const room = rooms.find((r) => r.id === session.currentRoomId);
  if (room) {
    room.status = 'AVAILABLE';
    room.currentSessionId = undefined;
    room.activeStaffCount = 0;
    updateRooms(rooms);
  }

  // Nếu là Ghi Nợ, cập nhật Sổ Nợ
  if (paymentData.paymentMethod === 'DEBT' && (paymentData.debtAmount || final_amount) > 0) {
    const debtAmount = paymentData.debtAmount || final_amount;
    recordCustomerDebt(
      paymentData.customerName || 'Khách vãng lai',
      paymentData.customerPhone || '',
      debtAmount,
      invoiceNumber
    );
  }

  addAuditLog(
    'CHECKOUT_PAID',
    `Thanh toán hóa đơn ${invoiceNumber} (${room?.name}): Tiền phòng ${pricingResult.payable_amount.toLocaleString('vi-VN')}đ, Tổng cộng ${final_amount.toLocaleString('vi-VN')}đ [${paymentData.paymentMethod}]`,
    { invoiceId: newInvoice.id, finalAmount: final_amount }
  );

  return newInvoice;
}

export function reopenInvoice(invoiceId: string, reason?: string): Invoice {
  const invoices = getAllInvoices();
  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) throw new Error('Không tìm thấy hóa đơn');

  invoice.isReopened = true;
  const timeStr = new Date().toLocaleTimeString('vi-VN');
  const noteAddition = reason && reason.trim() ? `Mở lại lúc ${timeStr}: ${reason.trim()}` : `Mở lại lúc ${timeStr}`;
  invoice.notes = invoice.notes ? `${invoice.notes} | ${noteAddition}` : noteAddition;
  invoice.updatedAt = new Date().toISOString();
  setJson(STORAGE_KEYS.INVOICES, invoices);

  addAuditLog(
    'INVOICE_REOPEN',
    `Mở lại hóa đơn ${invoice.invoiceNumber}${reason && reason.trim() ? `. Lý do: ${reason.trim()}` : ''}`,
    { invoiceId, reason: reason?.trim() }
  );
  return invoice;
}

// ----------------------------------------------------
// DEBT (SỔ NỢ) SERVICE
// ----------------------------------------------------
export function getAllDebts(): CustomerDebt[] {
  return getJson<CustomerDebt[]>(STORAGE_KEYS.DEBTS, INITIAL_CUSTOMER_DEBTS);
}

export function recordCustomerDebt(
  customerName: string,
  phone: string,
  debtAmount: number,
  invoiceNumber: string
): void {
  const debts = getAllDebts();
  let customerDebt = debts.find((d) => d.phone === phone && phone.length > 0);

  if (!customerDebt) {
    customerDebt = debts.find((d) => d.customerName.toLowerCase() === customerName.toLowerCase());
  }

  const now = new Date().toISOString();
  if (customerDebt) {
    customerDebt.totalDebt += debtAmount;
    customerDebt.balance += debtAmount;
    if (!customerDebt.invoiceIds.includes(invoiceNumber)) {
      customerDebt.invoiceIds.push(invoiceNumber);
    }
    customerDebt.updatedAt = now;
  } else {
    debts.unshift({
      id: `debt_${Date.now()}`,
      storeId: getStore().id,
      customerName,
      phone,
      totalDebt: debtAmount,
      totalPaid: 0,
      balance: debtAmount,
      invoiceIds: [invoiceNumber],
      history: [],
      updatedAt: now,
    });
  }

  setJson(STORAGE_KEYS.DEBTS, debts);
  addAuditLog('DEBT_PAYMENT', `Ghi nhận nợ mới: ${customerName} (+${debtAmount.toLocaleString('vi-VN')}đ) từ ${invoiceNumber}`);
}

export function payCustomerDebt(
  debtId: string,
  amount: number,
  paymentMethod: 'CASH' | 'BANK_TRANSFER',
  note?: string
): void {
  const debts = getAllDebts();
  const customer = debts.find((d) => d.id === debtId);
  if (!customer) return;

  const actualPay = Math.min(amount, customer.balance);
  customer.totalPaid += actualPay;
  customer.balance = Math.max(0, customer.balance - actualPay);
  const now = new Date().toISOString();

  customer.history.unshift({
    id: `pay_${Date.now()}`,
    amount: actualPay,
    paymentMethod,
    paymentDate: now,
    cashierName: getCurrentUser().fullName,
    note,
  });
  customer.updatedAt = now;

  setJson(STORAGE_KEYS.DEBTS, debts);
  addAuditLog('DEBT_PAYMENT', `Khách trả nợ: ${customer.customerName} trả ${actualPay.toLocaleString('vi-VN')}đ qua ${paymentMethod}`);
}

// ----------------------------------------------------
// BACKUP, EXPORT & RESTORE SERVICE
// ----------------------------------------------------
export function exportDatabaseBackup(): string {
  const dump: Record<string, unknown> = {};
  Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
    dump[key] = getJson(storageKey, null);
  });
  return JSON.stringify(dump, null, 2);
}

export function restoreDatabaseBackup(jsonString: string): boolean {
  try {
    const data = JSON.parse(jsonString);
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      if (data[key] !== undefined) {
        localStorage.setItem(storageKey, JSON.stringify(data[key]));
      }
    });
    notifyListeners();
    addAuditLog('SETTINGS_CHANGE', 'Phục hồi cơ sở dữ liệu từ bản sao lưu JSON thành công');
    return true;
  } catch (err) {
    console.error('Failed to restore backup:', err);
    return false;
  }
}

export function resetDatabaseToDefault(): void {
  localStorage.clear();
  initDatabase();
  notifyListeners();
}
