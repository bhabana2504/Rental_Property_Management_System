'use strict';

const { Property, Tenant, Payment, Maintenance } = require('../models/index');

// ── Dashboard summary ──────────────────────────────────────────────────────
exports.getDashboard = async (req, res, next) => {
  try {
    const [
      totalProperties,
      rentedProperties,
      activeTenants,
      payments,
      openTickets,
      overduePayments,
    ] = await Promise.all([
      Property.countDocuments({ isActive: true }),
      Property.countDocuments({ status: 'Rented', isActive: true }),
      Tenant.countDocuments({ isActive: true }),
      Payment.find({ status: { $in: ['Paid', 'Pending', 'Overdue'] } }),
      Maintenance.countDocuments({ status: { $in: ['Pending', 'In Progress', 'Acknowledged'] } }),
      Payment.countDocuments({ status: 'Overdue' }),
    ]);

    const monthlyRevenue  = payments.filter(p => p.status === 'Paid').reduce((s, p) => s + p.amount, 0);
    const pendingRevenue  = payments.filter(p => p.status === 'Pending').reduce((s, p) => s + p.amount, 0);
    const occupancyRate   = totalProperties > 0 ? Math.round((rentedProperties / totalProperties) * 100) : 0;

    // Revenue by month (last 6)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const revenueByMonth = await Payment.aggregate([
      { $match: { status: 'Paid', createdAt: { $gte: sixMonthsAgo } } },
      { $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
    ]);

    // Maintenance by category
    const maintenanceByCat = await Maintenance.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Payment collection rate
    const totalPayments = payments.length;
    const paidPayments  = payments.filter(p => p.status === 'Paid').length;
    const collectionRate = totalPayments > 0 ? Math.round((paidPayments / totalPayments) * 100) : 0;

    res.json({
      success: true,
      data: {
        kpis: {
          totalProperties,
          rentedProperties,
          availableProperties: totalProperties - rentedProperties,
          activeTenants,
          occupancyRate,
          monthlyRevenue,
          pendingRevenue,
          openTickets,
          overduePayments,
          collectionRate,
        },
        charts: {
          revenueByMonth,
          maintenanceByCat,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── Payment analytics ──────────────────────────────────────────────────────
exports.getPaymentAnalytics = async (req, res, next) => {
  try {
    const year = parseInt(req.query.year) || new Date().getFullYear();

    const data = await Payment.aggregate([
      { $match: { createdAt: { $gte: new Date(`${year}-01-01`), $lte: new Date(`${year}-12-31`) } } },
      { $group: {
          _id: { month: { $month: '$createdAt' }, status: '$status' },
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Property performance ───────────────────────────────────────────────────
exports.getPropertyPerformance = async (req, res, next) => {
  try {
    const properties = await Property.find({ isActive: true });

    const performance = await Promise.all(properties.map(async (prop) => {
      const payments = await Payment.find({ propertyId: prop._id, status: 'Paid' });
      const totalCollected = payments.reduce((s, p) => s + p.amount, 0);
      const openTickets = await Maintenance.countDocuments({
        propertyId: prop._id,
        status: { $in: ['Pending', 'In Progress'] },
      });
      return {
        propertyId:     prop._id,
        name:           prop.name,
        rent:           prop.rent,
        status:         prop.status,
        totalCollected,
        openTickets,
        roi:            prop.rent > 0 ? Math.round((totalCollected / prop.rent) * 100) : 0,
      };
    }));

    res.json({ success: true, data: performance });
  } catch (err) {
    next(err);
  }
};
