const Expense = require('../models/Expense');

function signedAmountExpression() {
  return {
    $cond: [
      { $in: ['$transactionType', ['refund', 'reimbursement']] },
      { $multiply: ['$amount', -1] },
      '$amount',
    ],
  };
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function parseDate(value, fallback) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function getPeriod(query) {
  const now = new Date();
  const preset = query.range || 'this_month';
  let startDate;
  let endDate;
  let label;

  if (preset === 'this_week') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    startDate = startOfDay(addDays(now, -diff));
    endDate = endOfDay(now);
    label = 'This week';
  } else if (preset === 'last_month') {
    startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    endDate = endOfDay(new Date(now.getFullYear(), now.getMonth(), 0));
    label = 'Last month';
  } else if (preset === 'last_90_days') {
    startDate = startOfDay(addDays(now, -89));
    endDate = endOfDay(now);
    label = 'Last 90 days';
  } else if (preset === 'custom') {
    startDate = startOfDay(parseDate(query.dateFrom, new Date(now.getFullYear(), now.getMonth(), 1)));
    endDate = endOfDay(parseDate(query.dateTo, now));
    if (startDate > endDate) {
      const temp = startDate;
      startDate = startOfDay(endDate);
      endDate = endOfDay(temp);
    }
    label = 'Custom range';
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = endOfDay(now);
    label = 'This month';
  }

  const days = Math.max(1, Math.ceil((endDate - startDate) / 86400000) + 1);
  const previousEndDate = endOfDay(addDays(startDate, -1));
  const previousStartDate = startOfDay(addDays(previousEndDate, -(days - 1)));

  return { startDate, endDate, previousStartDate, previousEndDate, days, label, preset };
}

// GET /api/v1/dashboard
const getDashboard = async function (req, res) {
  try {
    const userId = req.user._id;
    const period = getPeriod(req.query);
    const periodMatch = {
      userId: userId,
      date: { $gte: period.startDate, $lte: period.endDate },
    };
    const previousMatch = {
      userId: userId,
      date: { $gte: period.previousStartDate, $lte: period.previousEndDate },
    };
    const groupFormat = period.days <= 45 ? '%Y-%m-%d' : '%Y-%m';

    const results = await Promise.all([
      Expense.aggregate([
        { $match: periodMatch },
        { $group: { _id: null, total: { $sum: signedAmountExpression() } } },
      ]),
      Expense.aggregate([
        { $match: previousMatch },
        { $group: { _id: null, total: { $sum: signedAmountExpression() } } },
      ]),
      Expense.countDocuments(periodMatch),
      Expense.aggregate([
        { $match: { userId: userId } },
        { $group: { _id: null, total: { $sum: signedAmountExpression() } } },
      ]),
      Expense.aggregate([
        { $match: periodMatch },
        { $group: { _id: '$categoryId', total: { $sum: signedAmountExpression() } } },
        { $lookup: { from: 'categories', localField: '_id', foreignField: '_id', as: 'category' } },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        { $project: { total: 1, name: '$category.name', color: '$category.color', icon: '$category.icon' } },
        { $sort: { total: -1 } },
        { $limit: 5 },
      ]),
      Expense.find(periodMatch)
        .populate('categoryId', 'name color icon')
        .sort({ date: -1 })
        .limit(5),
      Expense.aggregate([
        { $match: periodMatch },
        {
          $group: {
            _id: { $dateToString: { format: groupFormat, date: '$date' } },
            total: { $sum: signedAmountExpression() },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const periodTotal = results[0][0] ? results[0][0].total : 0;
    const previousTotal = results[1][0] ? results[1][0].total : 0;
    const changePercent = previousTotal > 0
      ? Math.round(((periodTotal - previousTotal) / previousTotal) * 100)
      : null;

    res.json({
      success: true,
      data: {
        period: {
          label: period.label,
          preset: period.preset,
          startDate: period.startDate,
          endDate: period.endDate,
          days: period.days,
        },
        totalExpenses: periodTotal,
        previousPeriodExpenses: previousTotal,
        changePercent: changePercent,
        allTimeExpenses: results[3][0] ? results[3][0].total : 0,
        expenseCount: results[2],
        dailyAverage: periodTotal / period.days,
        topCategories: results[4],
        recentExpenses: results[5],
        spendingTrend: results[6],
        budget: null,
        income: null,
        groupBalance: null,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getDashboard: getDashboard };
