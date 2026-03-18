import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Op } from 'sequelize';
import {
  BOOKINGS_REPOSITORY,
  WEDDING_GROUPS_REPOSITORY,
  GUESTS_REPOSITORY,
  PAYMENTS_REPOSITORY,
  REFUNDS_REPOSITORY,
  ADMINS_REPOSITORY,
} from 'src/config/constants';
import {
  Bookings,
  WeddingGroups,
  Guests,
  Payments,
  Refunds,
  Hotels,
  BookingRooms,
  GroupRoomBlocks,
  RoomTypes,
  Admins,
  BookingAddons,
  GroupAddons,
} from 'src/models';
import { ReportQueryDto, DateRangeType } from './dto/ReportQueryDto';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(BOOKINGS_REPOSITORY)
    private readonly bookingsRepository: typeof Bookings,
    @Inject(WEDDING_GROUPS_REPOSITORY)
    private readonly weddingGroupsRepository: typeof WeddingGroups,
    @Inject(GUESTS_REPOSITORY)
    private readonly guestsRepository: typeof Guests,
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: typeof Payments,
    @Inject(REFUNDS_REPOSITORY)
    private readonly refundsRepository: typeof Refunds,
    @Inject(ADMINS_REPOSITORY)
    private readonly adminsRepository: typeof Admins,
  ) {}

  /**
   * Helper to get couple names from wedding group
   */
  private getCoupleNames(group: any): string {
    if (group?.bride_name && group?.groom_name) {
      return `${group.bride_name} & ${group.groom_name}`;
    }
    return group?.name || 'N/A';
  }

  /**
   * Get date range based on filter type
   * Uses UTC to ensure consistent filtering regardless of server timezone
   */
  private getDateRange(query: ReportQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const day = now.getUTCDate();

    let startDate: Date;
    let endDate = new Date(Date.UTC(year, month, day, 23, 59, 59, 999));

    switch (query.date_range) {
      case DateRangeType.THIS_MONTH:
        startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
        break;
      case DateRangeType.LAST_MONTH:
        startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Last day of previous month
        break;
      case DateRangeType.THIS_QUARTER:
        const currentQuarter = Math.floor(month / 3);
        startDate = new Date(Date.UTC(year, currentQuarter * 3, 1, 0, 0, 0, 0));
        break;
      case DateRangeType.LAST_QUARTER:
        const lastQuarter = Math.floor(month / 3) - 1;
        const lastQuarterYear = lastQuarter < 0 ? year - 1 : year;
        const actualLastQuarter = lastQuarter < 0 ? 3 : lastQuarter;
        startDate = new Date(Date.UTC(lastQuarterYear, actualLastQuarter * 3, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(lastQuarterYear, (actualLastQuarter + 1) * 3, 0, 23, 59, 59, 999));
        break;
      case DateRangeType.YTD:
        startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0, 0));
        break;
      case DateRangeType.LAST_YEAR:
        startDate = new Date(Date.UTC(year - 1, 0, 1, 0, 0, 0, 0));
        endDate = new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999));
        break;
      case DateRangeType.CUSTOM:
        if (query.date_from) {
          startDate = new Date(query.date_from + 'T00:00:00.000Z');
        } else {
          startDate = new Date(0);
        }
        if (query.date_to) {
          endDate = new Date(query.date_to + 'T23:59:59.999Z');
        }
        break;
      case DateRangeType.ALL_TIME:
      default:
        startDate = new Date(0);
        break;
    }

    return { startDate, endDate };
  }

  /**
   * DASHBOARD SUMMARY
   * Single endpoint aggregating all key dashboard metrics
   */
  async getDashboardSummary(filterAdminId: number | null) {
    // Build wedding group filter
    const groupFilter: any = {};
    if (filterAdminId) {
      groupFilter.created_by = filterAdminId;
    }

    // Get all wedding groups
    const weddingGroups = await this.weddingGroupsRepository.findAll({
      where: groupFilter,
      attributes: ['id', 'uuid', 'name', 'bride_name', 'groom_name', 'status', 'event_start_date', 'event_end_date', 'booking_window_end'],
      include: [{ model: Hotels, as: 'hotel', attributes: ['name'] }],
    });

    const groupIds = weddingGroups.map(g => g.id);
    const activeGroups = weddingGroups.filter(g => g.status === 'active' || g.status === 'published').length;

    if (groupIds.length === 0) {
      return {
        active_groups: 0,
        total_bookings: 0,
        deposits_collected: 0,
        outstanding_balance: 0,
        upcoming_payments_count: 0,
        groups_with_upcoming_deadlines: [],
        bookings_by_group: [],
      };
    }

    // Get all non-cancelled bookings
    const bookings = await this.bookingsRepository.findAll({
      where: {
        wedding_group_id: { [Op.in]: groupIds },
        status: { [Op.notIn]: ['cancelled', 'failed'] },
      },
      attributes: [
        'id', 'wedding_group_id', 'total_amount', 'deposit_amount',
        'deposit_paid_at', 'final_amount', 'final_paid_at', 'status',
      ],
    });

    // Calculate financial metrics
    let depositsCollected = 0;
    let totalCollected = 0;
    let totalAmount = 0;
    let upcomingPaymentsCount = 0;

    bookings.forEach((b) => {
      const total = Number(b.total_amount || 0);
      totalAmount += total;

      if (b.deposit_paid_at) {
        depositsCollected += Number(b.deposit_amount || 0);
        totalCollected += Number(b.deposit_amount || 0);
      }
      if (b.final_paid_at) {
        totalCollected += Number(b.final_amount || 0);
      }

      // Count bookings where deposit paid but final not yet paid
      if (b.deposit_paid_at && !b.final_paid_at) {
        upcomingPaymentsCount++;
      }
    });

    const outstandingBalance = totalAmount - totalCollected;

    // Groups with upcoming deadlines (booking_window_end within next 60 days)
    const now = new Date();
    const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

    const groupsWithDeadlines = weddingGroups
      .filter(g => {
        if (!g.booking_window_end) return false;
        const deadline = new Date(g.booking_window_end);
        return deadline >= now && deadline <= sixtyDaysFromNow;
      })
      .map(g => ({
        uuid: g.uuid,
        couple_name: this.getCoupleNames(g),
        hotel_name: (g as any).hotel?.name || 'N/A',
        deadline_date: g.booking_window_end,
        event_start_date: g.event_start_date,
      }))
      .sort((a, b) => new Date(a.deadline_date).getTime() - new Date(b.deadline_date).getTime());

    // Bookings by group (for chart)
    const bookingsByGroup = weddingGroups
      .map(g => {
        const groupBookings = bookings.filter(b => b.wedding_group_id === g.id);
        const groupRevenue = groupBookings.reduce((sum, b) => {
          let collected = 0;
          if (b.deposit_paid_at) collected += Number(b.deposit_amount || 0);
          if (b.final_paid_at) collected += Number(b.final_amount || 0);
          return sum + collected;
        }, 0);

        return {
          uuid: g.uuid,
          couple_name: this.getCoupleNames(g),
          bookings_count: groupBookings.length,
          revenue: groupRevenue,
        };
      })
      .filter(g => g.bookings_count > 0)
      .sort((a, b) => b.bookings_count - a.bookings_count);

    return {
      active_groups: activeGroups,
      total_bookings: bookings.length,
      deposits_collected: depositsCollected,
      outstanding_balance: outstandingBalance,
      upcoming_payments_count: upcomingPaymentsCount,
      groups_with_upcoming_deadlines: groupsWithDeadlines,
      bookings_by_group: bookingsByGroup,
    };
  }

  /**
   * 1. BOOKING SUMMARY REPORT
   * - Total guests
   * - Booked vs invited
   * - Room/package selection
   */
  async getBookingSummary(query: ReportQueryDto, filterAdminId: number | null) {
    const { startDate, endDate } = this.getDateRange(query);
    const dateFilter: any = {};

    if (query.date_range && query.date_range !== DateRangeType.ALL_TIME) {
      dateFilter.created_at = { [Op.between]: [startDate, endDate] };
    }

    // Build wedding group filter
    const groupFilter: any = {};
    if (query.wedding_group_uuid) {
      groupFilter.uuid = query.wedding_group_uuid;
    }
    if (filterAdminId) {
      groupFilter.created_by = filterAdminId;
    }

    // Get wedding groups
    const weddingGroups = await this.weddingGroupsRepository.findAll({
      where: groupFilter,
      attributes: ['id', 'uuid', 'name', 'bride_name', 'groom_name', 'status'],
      include: [{ model: Hotels, as: 'hotel', attributes: ['name'] }],
    });

    const groupIds = weddingGroups.map(g => g.id);

    if (groupIds.length === 0) {
      return {
        summary: {
          total_guests: 0,
          total_adults: 0,
          total_children: 0,
          total_invited: 0,
          total_booked: 0,
          booking_rate: 0,
          total_bookings: 0,
        },
        room_selection: [],
        package_selection: [],
        by_group: [],
      };
    }

    // Get invited guests count
    const invitedCount = await this.guestsRepository.count({
      where: { wedding_group_id: { [Op.in]: groupIds } },
    });

    // Get bookings with room and addon details
    const bookings = await this.bookingsRepository.findAll({
      where: {
        wedding_group_id: { [Op.in]: groupIds },
        status: { [Op.notIn]: ['cancelled'] },
        ...dateFilter,
      },
      attributes: [
        'id',
        'uuid',
        'wedding_group_id',
        'guest_id',
        'total_adults',
        'total_children',
        'status',
      ],
      include: [
        {
          model: BookingRooms,
          as: 'booking_rooms',
          attributes: ['quantity', 'total_nights', 'adults', 'children'],
          include: [
            {
              model: GroupRoomBlocks,
              as: 'room_block',
              attributes: ['id'],
              include: [
                { model: RoomTypes, as: 'room_type', attributes: ['name'] },
              ],
            },
          ],
        },
        {
          model: BookingAddons,
          as: 'booking_addons',
          attributes: ['quantity'],
          include: [
            {
              model: GroupAddons,
              as: 'group_addon',
              attributes: ['name', 'addon_type'],
            },
          ],
        },
      ],
    });

    // Calculate totals
    const totalAdults = bookings.reduce((sum, b) => sum + Number(b.total_adults || 0), 0);
    const totalChildren = bookings.reduce((sum, b) => sum + Number(b.total_children || 0), 0);
    const totalGuests = totalAdults + totalChildren;

    // Unique guests who booked
    const bookedGuestIds = new Set(bookings.map(b => b.guest_id));
    const totalBooked = bookedGuestIds.size;

    // Room selection breakdown
    const roomCounts: Record<string, number> = {};
    bookings.forEach((booking) => {
      (booking as any).booking_rooms?.forEach((br: any) => {
        const roomName = br.room_block?.room_type?.name || 'Unknown';
        roomCounts[roomName] = (roomCounts[roomName] || 0) + (br.quantity || 1);
      });
    });

    const roomSelection = Object.entries(roomCounts)
      .map(([name, count]) => ({ room_type: name, count }))
      .sort((a, b) => b.count - a.count);

    // Package/Addon selection breakdown
    const addonCounts: Record<string, { count: number; type: string }> = {};
    bookings.forEach((booking) => {
      (booking as any).booking_addons?.forEach((ba: any) => {
        const addonName = ba.group_addon?.name || 'Unknown';
        const addonType = ba.group_addon?.addon_type || 'other';
        if (!addonCounts[addonName]) {
          addonCounts[addonName] = { count: 0, type: addonType };
        }
        addonCounts[addonName].count += ba.quantity || 1;
      });
    });

    const packageSelection = Object.entries(addonCounts)
      .map(([name, data]) => ({ addon_name: name, type: data.type, count: data.count }))
      .sort((a, b) => b.count - a.count);

    // By group breakdown
    const byGroup = await Promise.all(
      weddingGroups.map(async (group) => {
        const groupInvited = await this.guestsRepository.count({
          where: { wedding_group_id: group.id },
        });

        const groupBookings = bookings.filter(b => b.wedding_group_id === group.id);
        const groupBookedIds = new Set(groupBookings.map(b => b.guest_id));
        const groupAdults = groupBookings.reduce((sum, b) => sum + Number(b.total_adults || 0), 0);
        const groupChildren = groupBookings.reduce((sum, b) => sum + Number(b.total_children || 0), 0);

        return {
          wedding_group_uuid: group.uuid,
          couple_names: this.getCoupleNames(group),
          hotel_name: (group as any).hotel?.name || 'N/A',
          guest_list_count: groupInvited,
          guests_booked: groupBookedIds.size,
          total_guests: groupAdults + groupChildren,
          adults: groupAdults,
          children: groupChildren,
          bookings: groupBookings.length,
          booking_rate: groupInvited > 0
            ? parseFloat(((groupBookedIds.size / groupInvited) * 100).toFixed(1))
            : 0,
        };
      })
    );

    return {
      summary: {
        total_guests: totalGuests,
        total_adults: totalAdults,
        total_children: totalChildren,
        guest_list_count: invitedCount,
        guests_booked: totalBooked,
        booking_rate: invitedCount > 0
          ? parseFloat(((totalBooked / invitedCount) * 100).toFixed(1))
          : 0,
        total_bookings: bookings.length,
      },
      room_selection: roomSelection,
      package_selection: packageSelection,
      by_group: byGroup,
    };
  }

  /**
   * 2. PAYMENT STATUS REPORT
   * - Paid / partially paid / unpaid
   * - Outstanding balances
   */
  async getPaymentStatusReport(query: ReportQueryDto, filterAdminId: number | null) {
    const { startDate, endDate } = this.getDateRange(query);
    const dateFilter: any = {};

    if (query.date_range && query.date_range !== DateRangeType.ALL_TIME) {
      dateFilter.created_at = { [Op.between]: [startDate, endDate] };
    }

    // Build wedding group filter
    const groupFilter: any = {};
    if (query.wedding_group_uuid) {
      groupFilter.uuid = query.wedding_group_uuid;
    }
    if (filterAdminId) {
      groupFilter.created_by = filterAdminId;
    }

    const weddingGroups = await this.weddingGroupsRepository.findAll({
      where: groupFilter,
      attributes: ['id', 'uuid', 'name', 'bride_name', 'groom_name', 'timezone'],
      include: [{ model: Hotels, as: 'hotel', attributes: ['name'] }],
    });

    const groupIds = weddingGroups.map(g => g.id);
    const groupMap = new Map(weddingGroups.map(g => [g.id, g]));

    if (groupIds.length === 0) {
      return {
        summary: {
          total_bookings: 0,
          fully_paid: 0,
          partially_paid: 0,
          total_amount: 0,
          total_collected: 0,
          total_outstanding: 0,
        },
        bookings: [],
      };
    }

    // Get bookings with payment status
    const bookings = await this.bookingsRepository.findAll({
      where: {
        wedding_group_id: { [Op.in]: groupIds },
        status: { [Op.notIn]: ['cancelled'] },
        ...dateFilter,
      },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['name', 'email', 'phone'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Categorize bookings
    let fullyPaid = 0;
    let partiallyPaid = 0;
    let totalAmount = 0;
    let totalCollected = 0;

    const bookingDetails = bookings.map((booking) => {
      const group = groupMap.get(booking.wedding_group_id);
      const total = Number(booking.total_amount || 0);
      let collected = 0;

      if (booking.deposit_paid_at) {
        collected += Number(booking.deposit_amount || 0);
      }
      if (booking.final_paid_at) {
        collected += Number(booking.final_amount || 0);
      }

      const outstanding = total - collected;
      totalAmount += total;
      totalCollected += collected;

      let paymentStatus: 'fully_paid' | 'partially_paid';
      if (collected >= total && total > 0) {
        paymentStatus = 'fully_paid';
        fullyPaid++;
      } else {
        paymentStatus = 'partially_paid';
        partiallyPaid++;
      }

      return {
        booking_uuid: booking.uuid,
        booking_reference: booking.booking_reference,
        guest_name: booking.guest?.name || 'N/A',
        guest_email: booking.guest?.email,
        guest_phone: booking.guest?.phone,
        couple_names: this.getCoupleNames(group),
        hotel_name: (group as any)?.hotel?.name || 'N/A',
        timezone: (group as any)?.timezone || 'UTC',
        total_amount: total,
        amount_collected: collected,
        outstanding: outstanding,
        payment_status: paymentStatus,
        deposit_paid: !!booking.deposit_paid_at,
        deposit_paid_at: booking.deposit_paid_at,
        final_paid: !!booking.final_paid_at,
        final_paid_at: booking.final_paid_at,
        booking_status: booking.status,
        created_at: booking.created_at,
      };
    });

    return {
      summary: {
        total_bookings: bookings.length,
        fully_paid: fullyPaid,
        partially_paid: partiallyPaid,
        total_amount: totalAmount,
        total_collected: totalCollected,
        total_outstanding: totalAmount - totalCollected,
      },
      bookings: bookingDetails,
    };
  }

  /**
   * 3. REVENUE REPORT
   * - Total revenue per wedding
   * - Revenue by date range
   * - Revenue by group manager
   */
  async getRevenueReport(query: ReportQueryDto, filterAdminId: number | null) {
    // Build wedding group filter
    const groupFilter: any = {};
    if (query.wedding_group_uuid) {
      groupFilter.uuid = query.wedding_group_uuid;
    }
    if (filterAdminId) {
      groupFilter.created_by = filterAdminId;
    }

    const weddingGroups = await this.weddingGroupsRepository.findAll({
      where: groupFilter,
      attributes: ['id', 'uuid', 'name', 'bride_name', 'groom_name', 'created_by'],
      include: [
        { model: Hotels, as: 'hotel', attributes: ['name'] },
        { model: Admins, as: 'created_by_admin', attributes: ['id', 'name', 'email'] },
      ],
    });

    const groupIds = weddingGroups.map(g => g.id);

    if (groupIds.length === 0) {
      return {
        summary: {
          gross_revenue: 0,
          collected_revenue: 0,
          pending_revenue: 0,
          refunded_amount: 0,
          net_revenue: 0,
        },
        by_wedding: [],
        by_group_manager: [],
        by_date_range: [],
      };
    }

    // Get active bookings for all calculations (consistent data source)
    const activeBookings = await this.bookingsRepository.findAll({
      where: {
        wedding_group_id: { [Op.in]: groupIds },
        status: { [Op.notIn]: ['cancelled'] },
      },
      attributes: [
        'id',
        'wedding_group_id',
        'total_amount',
        'deposit_amount',
        'deposit_paid_at',
        'final_amount',
        'final_paid_at',
        'created_at',
      ],
    });

    // Get active booking IDs for refund filtering
    const activeBookingIds = activeBookings.map(b => b.id);

    // Get refunds from ACTIVE bookings only (partial refunds)
    const activeRefunds = activeBookingIds.length > 0
      ? await this.refundsRepository.findAll({
          where: {
            status: 'processed',
            booking_id: { [Op.in]: activeBookingIds },
          },
          include: [
            {
              model: Bookings,
              as: 'booking',
              attributes: ['wedding_group_id'],
            },
          ],
          attributes: ['amount', 'created_at', 'booking_id'],
        })
      : [];

    // Get refunds from CANCELLED bookings (shown separately for visibility)
    const cancelledRefunds = await this.refundsRepository.findAll({
      where: {
        status: 'processed',
        ...(activeBookingIds.length > 0
          ? { booking_id: { [Op.notIn]: activeBookingIds } }
          : {}),
      },
      include: [
        {
          model: Bookings,
          as: 'booking',
          required: true,
          where: { wedding_group_id: { [Op.in]: groupIds } },
          attributes: ['wedding_group_id'],
        },
      ],
      attributes: ['amount', 'created_at'],
    });

    // Calculate summary (all from active bookings for consistency)
    // Gross = Expected revenue from active bookings
    const grossRevenue = activeBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
    // Collected = Money received from active bookings
    const collectedRevenue = activeBookings.reduce((sum, b) => {
      let collected = 0;
      if (b.deposit_paid_at) collected += Number(b.deposit_amount || 0);
      if (b.final_paid_at) collected += Number(b.final_amount || 0);
      return sum + collected;
    }, 0);
    // Pending = Outstanding from active bookings
    const pendingRevenue = grossRevenue - collectedRevenue;
    // Active Refunds = Refunds from active bookings (for Net calculation)
    const activeRefundedAmount = activeRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    // Cancelled Refunds = Refunds from cancelled bookings
    const cancelledRefundedAmount = cancelledRefunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    // Total Refunded = All refunds (for visibility)
    const totalRefundedAmount = activeRefundedAmount + cancelledRefundedAmount;
    // Net = Collected - Active Refunds (practical cash position from active bookings)
    const netRevenue = collectedRevenue - activeRefundedAmount;

    // Revenue by wedding (all from active bookings for consistency)
    const byWedding = weddingGroups.map((group) => {
      // Active bookings only
      const groupActiveBookings = activeBookings.filter(b => b.wedding_group_id === group.id);
      const groupGross = groupActiveBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
      const groupCollected = groupActiveBookings.reduce((sum, b) => {
        let collected = 0;
        if (b.deposit_paid_at) collected += Number(b.deposit_amount || 0);
        if (b.final_paid_at) collected += Number(b.final_amount || 0);
        return sum + collected;
      }, 0);

      // Refunds from active bookings (for Net calculation)
      const groupActiveRefunds = activeRefunds
        .filter(r => (r as any).booking?.wedding_group_id === group.id)
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);

      // Cancelled refunds
      const groupCancelledRefunds = cancelledRefunds
        .filter(r => (r as any).booking?.wedding_group_id === group.id)
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);

      // Total refunds (for visibility)
      const groupTotalRefunds = groupActiveRefunds + groupCancelledRefunds;

      return {
        wedding_group_uuid: group.uuid,
        couple_names: this.getCoupleNames(group),
        hotel_name: (group as any).hotel?.name || 'N/A',
        group_manager: (group as any).created_by_admin?.name || 'N/A',
        gross_revenue: groupGross,
        collected_revenue: groupCollected,
        pending_revenue: groupGross - groupCollected,
        refunded: groupTotalRefunds,
        net_revenue: groupCollected - groupActiveRefunds,
        booking_count: groupActiveBookings.length,
      };
    }).sort((a, b) => b.gross_revenue - a.gross_revenue);

    // Revenue by group manager (all from active bookings for consistency)
    const managerMap: Record<number, {
      id: number;
      name: string;
      email: string;
      gross: number;
      collected: number;
      activeRefunds: number;
      totalRefunds: number;
      weddings: number;
      bookings: number;
    }> = {};

    weddingGroups.forEach((group) => {
      const managerId = group.created_by;
      const manager = (group as any).created_by_admin;

      if (!managerMap[managerId]) {
        managerMap[managerId] = {
          id: managerId,
          name: manager?.name || 'Unknown',
          email: manager?.email || '',
          gross: 0,
          collected: 0,
          activeRefunds: 0,
          totalRefunds: 0,
          weddings: 0,
          bookings: 0,
        };
      }

      managerMap[managerId].weddings++;

      // Active bookings only
      const groupActiveBookings = activeBookings.filter(b => b.wedding_group_id === group.id);
      managerMap[managerId].bookings += groupActiveBookings.length;

      // Gross and Collected from active bookings
      groupActiveBookings.forEach((b) => {
        managerMap[managerId].gross += Number(b.total_amount || 0);
        if (b.deposit_paid_at) managerMap[managerId].collected += Number(b.deposit_amount || 0);
        if (b.final_paid_at) managerMap[managerId].collected += Number(b.final_amount || 0);
      });

      // Refunds from active bookings (for Net calculation)
      const groupActiveRefunds = activeRefunds
        .filter(r => (r as any).booking?.wedding_group_id === group.id)
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);
      managerMap[managerId].activeRefunds += groupActiveRefunds;

      // Cancelled refunds
      const groupCancelledRefunds = cancelledRefunds
        .filter(r => (r as any).booking?.wedding_group_id === group.id)
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);

      // Total refunds (for visibility)
      managerMap[managerId].totalRefunds += groupActiveRefunds + groupCancelledRefunds;
    });

    const byGroupManager = Object.values(managerMap)
      .map(m => ({
        manager_id: m.id,
        manager_name: m.name,
        manager_email: m.email,
        total_weddings: m.weddings,
        total_bookings: m.bookings,
        gross_revenue: m.gross,
        collected_revenue: m.collected,
        refunded: m.totalRefunds,
        net_revenue: m.collected - m.activeRefunds,
      }))
      .sort((a, b) => b.gross_revenue - a.gross_revenue);

    // Revenue by date range (monthly for last 12 months)
    const byDateRange: Array<{
      period: string;
      gross: number;
      collected: number;
      refunded: number;
      net: number;
    }> = [];

    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);
      const periodLabel = monthStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

      // Gross from active bookings created in this month
      const monthActiveBookings = activeBookings.filter(b => {
        const createdAt = new Date(b.created_at);
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      const monthGross = monthActiveBookings.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

      // Collected in this month (from active bookings only, based on payment dates)
      let monthCollected = 0;
      activeBookings.forEach((b) => {
        if (b.deposit_paid_at) {
          const depositDate = new Date(b.deposit_paid_at);
          if (depositDate >= monthStart && depositDate <= monthEnd) {
            monthCollected += Number(b.deposit_amount || 0);
          }
        }
        if (b.final_paid_at) {
          const finalDate = new Date(b.final_paid_at);
          if (finalDate >= monthStart && finalDate <= monthEnd) {
            monthCollected += Number(b.final_amount || 0);
          }
        }
      });

      // Refunds from active bookings in this month (for Net calculation)
      const monthActiveRefunds = activeRefunds
        .filter(r => {
          const refundDate = new Date(r.created_at);
          return refundDate >= monthStart && refundDate <= monthEnd;
        })
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);

      // Cancelled refunds in this month
      const monthCancelledRefunds = cancelledRefunds
        .filter(r => {
          const refundDate = new Date(r.created_at);
          return refundDate >= monthStart && refundDate <= monthEnd;
        })
        .reduce((sum, r) => sum + Number(r.amount || 0), 0);

      // Total refunds (for visibility)
      const monthTotalRefunds = monthActiveRefunds + monthCancelledRefunds;

      byDateRange.push({
        period: periodLabel,
        gross: monthGross,
        collected: monthCollected,
        refunded: monthTotalRefunds,
        net: monthCollected - monthActiveRefunds,
      });
    }

    return {
      summary: {
        gross_revenue: grossRevenue,
        collected_revenue: collectedRevenue,
        pending_revenue: pendingRevenue,
        refunded_amount: totalRefundedAmount,
        net_revenue: netRevenue,
      },
      by_wedding: byWedding,
      by_group_manager: byGroupManager,
      by_date_range: byDateRange,
    };
  }

  /**
   * 4. TRANSACTION REPORT (Accounting)
   * - Stripe transaction-level detail
   * - Refunds issued
   * - Net vs gross
   */
  async getTransactionReport(query: ReportQueryDto, filterAdminId: number | null) {
    const { startDate, endDate } = this.getDateRange(query);
    const dateFilter: any = {};

    if (query.date_range && query.date_range !== DateRangeType.ALL_TIME) {
      dateFilter.created_at = { [Op.between]: [startDate, endDate] };
    }

    // Build wedding group filter
    const groupFilter: any = {};
    if (query.wedding_group_uuid) {
      groupFilter.uuid = query.wedding_group_uuid;
    }
    if (filterAdminId) {
      groupFilter.created_by = filterAdminId;
    }

    const weddingGroups = await this.weddingGroupsRepository.findAll({
      where: groupFilter,
      attributes: ['id'],
    });

    const groupIds = weddingGroups.map(g => g.id);

    if (groupIds.length === 0) {
      return {
        summary: {
          total_transactions: 0,
          gross_amount: 0,
          refunds_issued: 0,
          net_amount: 0,
          by_gateway: {},
        },
        transactions: [],
      };
    }

    // Get payments with Stripe details
    const payments = await this.paymentsRepository.findAll({
      where: {
        status: 'success',
        ...dateFilter,
      },
      include: [
        {
          model: Bookings,
          as: 'booking',
          required: true,
          where: { wedding_group_id: { [Op.in]: groupIds } },
          attributes: ['uuid', 'booking_reference'],
          include: [
            { model: Guests, as: 'guest', attributes: ['name', 'email'] },
            { model: WeddingGroups, as: 'wedding_group', attributes: ['name', 'bride_name', 'groom_name', 'timezone'] },
          ],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Get refunds
    const refunds = await this.refundsRepository.findAll({
      where: {
        status: 'processed',
        ...dateFilter,
      },
      include: [
        {
          model: Bookings,
          as: 'booking',
          required: true,
          where: { wedding_group_id: { [Op.in]: groupIds } },
          attributes: ['uuid', 'booking_reference'],
          include: [
            { model: Guests, as: 'guest', attributes: ['name', 'email'] },
            { model: WeddingGroups, as: 'wedding_group', attributes: ['name', 'bride_name', 'groom_name', 'timezone'] },
          ],
        },
        {
          model: Payments,
          as: 'payment',
          attributes: ['payment_intent_id', 'transaction_id'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    // Build transactions list
    const transactions: any[] = [];

    // Add payments
    payments.forEach((p) => {
      const wg = (p as any).booking?.wedding_group;
      transactions.push({
        type: 'payment',
        uuid: p.uuid,
        date: p.created_at,
        paid_at: p.paid_at,
        amount: Number(p.amount || 0),
        currency: p.currency,
        payment_type: p.payment_type,
        payment_gateway: p.payment_gateway,
        stripe_payment_intent_id: p.payment_intent_id,
        stripe_transaction_id: p.transaction_id,
        booking_reference: (p as any).booking?.booking_reference,
        guest_name: (p as any).booking?.guest?.name || 'N/A',
        guest_email: (p as any).booking?.guest?.email,
        couple_names: this.getCoupleNames(wg),
        timezone: wg?.timezone || 'UTC',
        status: p.status,
      });
    });

    // Add refunds
    refunds.forEach((r) => {
      const wg = (r as any).booking?.wedding_group;
      transactions.push({
        type: 'refund',
        uuid: r.uuid,
        date: r.created_at,
        paid_at: r.processed_at,
        amount: -Number(r.amount || 0),
        currency: r.currency,
        payment_type: null,
        payment_gateway: r.refund_gateway,
        stripe_payment_intent_id: (r as any).payment?.payment_intent_id || null,
        stripe_transaction_id: (r as any).payment?.transaction_id || null,
        booking_reference: (r as any).booking?.booking_reference,
        guest_name: (r as any).booking?.guest?.name || 'N/A',
        guest_email: (r as any).booking?.guest?.email,
        couple_names: this.getCoupleNames(wg),
        timezone: wg?.timezone || 'UTC',
        status: r.status,
        refund_reason: r.reason,
      });
    });

    // Sort by date descending
    transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate summary
    const grossAmount = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const refundsIssued = refunds.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const netAmount = grossAmount - refundsIssued;

    // By gateway breakdown
    const byGateway: Record<string, { payments: number; amount: number }> = {};
    payments.forEach((p) => {
      const gateway = p.payment_gateway || 'unknown';
      if (!byGateway[gateway]) {
        byGateway[gateway] = { payments: 0, amount: 0 };
      }
      byGateway[gateway].payments++;
      byGateway[gateway].amount += Number(p.amount || 0);
    });

    return {
      summary: {
        total_transactions: transactions.length,
        total_payments: payments.length,
        total_refunds: refunds.length,
        gross_amount: grossAmount,
        refunds_issued: refundsIssued,
        net_amount: netAmount,
        by_gateway: byGateway,
      },
      transactions,
    };
  }

  /**
   * 5. GUEST-LEVEL REPORT
   * - Guest name
   * - Wedding group
   * - Payment history
   * - Status
   */
  async getGuestReport(query: ReportQueryDto, filterAdminId: number | null) {
    // Build wedding group filter
    const groupFilter: any = {};
    if (query.wedding_group_uuid) {
      groupFilter.uuid = query.wedding_group_uuid;
    }
    if (filterAdminId) {
      groupFilter.created_by = filterAdminId;
    }

    const weddingGroups = await this.weddingGroupsRepository.findAll({
      where: groupFilter,
      attributes: ['id', 'uuid', 'name', 'bride_name', 'groom_name'],
      include: [{ model: Hotels, as: 'hotel', attributes: ['name'] }],
    });

    const groupIds = weddingGroups.map(g => g.id);
    const groupMap = new Map(weddingGroups.map(g => [g.id, g]));

    if (groupIds.length === 0) {
      return { guests: [], summary: { total: 0, booked: 0, not_booked: 0 } };
    }

    // Get all guests
    const guests = await this.guestsRepository.findAll({
      where: { wedding_group_id: { [Op.in]: groupIds } },
      attributes: [
        'id',
        'uuid',
        'name',
        'email',
        'phone',
        'relationship',
        'side',
        'wedding_group_id',
        'created_at',
      ],
      order: [['name', 'ASC']],
    });

    // Get bookings for these guests with payment details
    const bookings = await this.bookingsRepository.findAll({
      where: {
        guest_id: { [Op.in]: guests.map(g => g.id) },
      },
      attributes: [
        'id',
        'uuid',
        'booking_reference',
        'guest_id',
        'status',
        'total_amount',
        'deposit_amount',
        'deposit_paid_at',
        'final_amount',
        'final_paid_at',
        'created_at',
      ],
    });

    // Get payments for these bookings
    const bookingIds = bookings.map(b => b.id);
    const payments = bookingIds.length > 0 ? await this.paymentsRepository.findAll({
      where: {
        booking_id: { [Op.in]: bookingIds },
        status: 'success',
      },
      attributes: [
        'booking_id',
        'amount',
        'currency',
        'payment_type',
        'payment_gateway',
        'paid_at',
        'created_at',
      ],
      order: [['created_at', 'ASC']],
    }) : [];

    // Get refunds for these bookings
    const refunds = bookingIds.length > 0 ? await this.refundsRepository.findAll({
      where: {
        booking_id: { [Op.in]: bookingIds },
        status: 'processed',
      },
      attributes: [
        'booking_id',
        'amount',
        'currency',
        'reason',
        'processed_at',
        'created_at',
      ],
    }) : [];

    // Build payment history map
    const paymentsByBooking = new Map<number, any[]>();
    payments.forEach((p) => {
      if (!paymentsByBooking.has(p.booking_id)) {
        paymentsByBooking.set(p.booking_id, []);
      }
      paymentsByBooking.get(p.booking_id)!.push({
        type: 'payment',
        amount: Number(p.amount),
        currency: p.currency,
        payment_type: p.payment_type,
        payment_gateway: p.payment_gateway,
        date: p.paid_at || p.created_at,
      });
    });

    refunds.forEach((r) => {
      if (!paymentsByBooking.has(r.booking_id)) {
        paymentsByBooking.set(r.booking_id, []);
      }
      paymentsByBooking.get(r.booking_id)!.push({
        type: 'refund',
        amount: -Number(r.amount),
        currency: r.currency,
        reason: r.reason,
        date: r.processed_at || r.created_at,
      });
    });

    // Build booking map
    const bookingMap = new Map(bookings.map(b => [b.guest_id, b]));

    const guestData = guests.map((guest) => {
      const group = groupMap.get(guest.wedding_group_id);
      const booking = bookingMap.get(guest.id);
      const paymentHistory = booking ? paymentsByBooking.get(booking.id) || [] : [];

      // Sort payment history by date
      paymentHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Calculate totals
      let totalPaid = 0;
      let totalRefunded = 0;
      paymentHistory.forEach((ph) => {
        if (ph.type === 'payment') {
          totalPaid += ph.amount;
        } else {
          totalRefunded += Math.abs(ph.amount);
        }
      });

      // Determine status
      let guestStatus: string;
      if (!booking) {
        guestStatus = 'not_booked';
      } else if (booking.status === 'cancelled') {
        guestStatus = 'cancelled';
      } else if (booking.final_paid_at) {
        guestStatus = 'fully_paid';
      } else if (booking.deposit_paid_at) {
        guestStatus = 'deposit_paid';
      } else {
        guestStatus = 'pending_payment';
      }

      return {
        guest_uuid: guest.uuid,
        guest_name: guest.name,
        email: guest.email,
        phone: guest.phone,
        relationship: guest.relationship,
        side: guest.side,
        wedding_group_uuid: group?.uuid,
        couple_names: this.getCoupleNames(group),
        hotel_name: (group as any)?.hotel?.name || 'N/A',
        has_booked: !!booking,
        booking_reference: booking?.booking_reference || null,
        booking_status: booking?.status || null,
        booking_amount: booking ? Number(booking.total_amount || 0) : 0,
        total_paid: totalPaid,
        total_refunded: totalRefunded,
        net_paid: totalPaid - totalRefunded,
        outstanding: booking ? Number(booking.total_amount || 0) - totalPaid + totalRefunded : 0,
        guest_status: guestStatus,
        payment_history: paymentHistory,
        booking_created_at: booking?.created_at || null,
      };
    });

    // Summary
    const bookedCount = guestData.filter(g => g.has_booked).length;
    const fullyPaidCount = guestData.filter(g => g.guest_status === 'fully_paid').length;
    const depositPaidCount = guestData.filter(g => g.guest_status === 'deposit_paid').length;
    const pendingCount = guestData.filter(g => g.guest_status === 'pending_payment').length;

    return {
      guests: guestData,
      summary: {
        total_guests: guestData.length,
        booked: bookedCount,
        not_booked: guestData.length - bookedCount,
        fully_paid: fullyPaidCount,
        deposit_paid: depositPaidCount,
        pending_payment: pendingCount,
        cancelled: guestData.filter(g => g.guest_status === 'cancelled').length,
        booking_rate: guestData.length > 0
          ? parseFloat(((bookedCount / guestData.length) * 100).toFixed(1))
          : 0,
      },
    };
  }

  /**
   * HOTEL MANIFEST
   * Guest list formatted for hotel check-in
   */
  async getHotelManifest(weddingGroupUuid: string, filterAdminId: number | null) {
    const groupFilter: any = { uuid: weddingGroupUuid };
    if (filterAdminId) {
      groupFilter.created_by = filterAdminId;
    }

    const weddingGroup = await this.weddingGroupsRepository.findOne({
      where: groupFilter,
      include: [
        {
          model: Hotels,
          as: 'hotel',
          attributes: ['name', 'address', 'city', 'country'],
        },
      ],
    });

    if (!weddingGroup) {
      throw new NotFoundException('Wedding group not found');
    }

    // Get all confirmed bookings with room details
    const bookings = await this.bookingsRepository.findAll({
      where: {
        wedding_group_id: weddingGroup.id,
        status: { [Op.in]: ['deposit_paid', 'confirmed', 'completed'] },
      },
      include: [
        {
          model: Guests,
          as: 'guest',
          attributes: ['name', 'email', 'phone'],
        },
        {
          model: BookingRooms,
          as: 'booking_rooms',
          include: [
            {
              model: GroupRoomBlocks,
              as: 'room_block',
              include: [
                { model: RoomTypes, as: 'room_type', attributes: ['name'] },
              ],
            },
          ],
        },
      ],
      order: [['check_in_date', 'ASC']],
    });

    const manifest = bookings.map((booking) => {
      const rooms = (booking as any).booking_rooms?.map((br: any) => ({
        room_type: br.room_block?.room_type?.name || 'N/A',
        quantity: br.quantity,
        adults: br.adults || 0,
        children: br.children || 0,
      })) || [];

      return {
        booking_reference: booking.booking_reference,
        guest_name: booking.guest?.name || 'N/A',
        guest_email: booking.guest?.email,
        guest_phone: booking.guest?.phone,
        check_in_date: booking.check_in_date,
        check_out_date: booking.check_out_date,
        adults: booking.total_adults,
        children: booking.total_children,
        rooms: rooms,
        special_requests: booking.special_requests || '',
        status: booking.status,
      };
    });

    return {
      wedding_group: {
        uuid: weddingGroup.uuid,
        couple_names: this.getCoupleNames(weddingGroup),
        wedding_date: weddingGroup.event_start_date,
        hotel: {
          name: (weddingGroup as any).hotel?.name,
          address: (weddingGroup as any).hotel?.address,
          city: (weddingGroup as any).hotel?.city,
          country: (weddingGroup as any).hotel?.country,
        },
      },
      total_guests: manifest.reduce((sum, m) => sum + m.adults + m.children, 0),
      total_rooms: manifest.reduce((sum, m) => sum + m.rooms.reduce((rs: number, r: any) => rs + r.quantity, 0), 0),
      total_bookings: manifest.length,
      manifest,
    };
  }

  /**
   * Get list of wedding groups for filter dropdown
   */
  async getWeddingGroupsForFilter(filterAdminId: number | null) {
    const where: any = {};
    if (filterAdminId) {
      where.created_by = filterAdminId;
    }

    const groups = await this.weddingGroupsRepository.findAll({
      where,
      attributes: ['uuid', 'name', 'bride_name', 'groom_name', 'status'],
      order: [['name', 'ASC']],
    });

    return groups.map(g => ({
      uuid: g.uuid,
      couple_names: this.getCoupleNames(g),
      status: g.status,
    }));
  }
}
