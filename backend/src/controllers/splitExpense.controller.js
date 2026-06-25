const SplitExpense = require("../models/SplitExpense");
const Participant = require("../models/Participant");
const Group = require("../models/Group");

async function assertGroupMember(groupId, userId) {
    const group = await Group.findOne({ _id: groupId, members: userId });
    if (!group) throw Object.assign(new Error("Group not found or access denied"), { status: 404 });
    return group;
}

async function assertGroupParticipants(groupId, participantIds) {
    const participants = await Participant.find({
        _id: { $in: participantIds },
        groupId
    });
    if (participants.length !== participantIds.length) {
        throw Object.assign(new Error("One or more participants do not belong to this group"), { status: 400 });
    }
    return participants;
}

function buildEqualSplits(participantIds, totalAmount) {
    const share = Math.round((totalAmount / participantIds.length) * 100) / 100;
    const splits = participantIds.map((id) => ({ participantId: id, amount: share, settled: false }));
    const allocated = splits.reduce((sum, s) => sum + s.amount, 0);
    splits[splits.length - 1].amount = Math.round((splits[splits.length - 1].amount + (totalAmount - allocated)) * 100) / 100;
    return splits;
}

function buildCustomSplits(rawSplits) {
    return rawSplits.map((s) => ({
        participantId: s.participantId,
        amount: Number(s.amount),
        settled: false
    }));
}

function buildPercentageSplits(rawSplits, totalAmount) {
    const totalPct = rawSplits.reduce((sum, s) => sum + Number(s.percentage || 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
        throw Object.assign(new Error("Percentages must add up to 100"), { status: 400 });
    }
    return rawSplits.map((s) => ({
        participantId: s.participantId,
        amount: Math.round((Number(s.percentage) / 100) * totalAmount * 100) / 100,
        percentage: Number(s.percentage),
        settled: false
    }));
}

exports.createSplitExpense = async (req, res) => {
    try {
        const { groupId } = req.params;
        const group = await assertGroupMember(groupId, req.user._id);

        const {
            title, description, amount, paidBy,
            splitType = "equal", splits: rawSplits = [],
            date, category
        } = req.body;

        if (!title || !title.trim()) return res.status(400).json({ success: false, message: "Title is required" });
        const numAmount = Number(amount);
        if (!numAmount || numAmount <= 0) return res.status(400).json({ success: false, message: "Amount must be a positive number" });
        if (!paidBy) return res.status(400).json({ success: false, message: "paidBy participant is required" });

        const payer = await Participant.findOne({ _id: paidBy, groupId });
        if (!payer) return res.status(400).json({ success: false, message: "Paying participant does not belong to this group" });

        let splits;
        if (splitType === "equal") {
            const participantIds = rawSplits.map(s => s.participantId);
            await assertGroupParticipants(groupId, participantIds);
            splits = buildEqualSplits(participantIds, numAmount);
        } else if (splitType === "custom") {
            const participantIds = rawSplits.map(s => s.participantId);
            await assertGroupParticipants(groupId, participantIds);
            splits = buildCustomSplits(rawSplits);
            const total = splits.reduce((sum, s) => sum + s.amount, 0);
            if (Math.abs(total - numAmount) > 0.01) {
                return res.status(400).json({ success: false, message: "Custom split amounts must add up to the total" });
            }
        } else if (splitType === "percentage") {
            const participantIds = rawSplits.map(s => s.participantId);
            await assertGroupParticipants(groupId, participantIds);
            splits = buildPercentageSplits(rawSplits, numAmount);
        } else {
            return res.status(400).json({ success: false, message: "splitType must be equal, custom, or percentage" });
        }

        const expense = await SplitExpense.create({
            groupId,
            title: title.trim(),
            description: (description || "").trim(),
            amount: numAmount,
            currency: group.currency || "INR",
            paidBy,
            splitType,
            splits,
            date: date ? new Date(date) : new Date(),
            category: (category || "").trim(),
            createdBy: req.user._id
        });

        const populated = await expense.populate([
            { path: "paidBy", select: "name email" },
            { path: "splits.participantId", select: "name email" }
        ]);

        res.status(201).json({ success: true, data: populated });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.getSplitExpenses = async (req, res) => {
    try {
        const { groupId } = req.params;
        await assertGroupMember(groupId, req.user._id);

        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const skip = (page - 1) * limit;

        const filter = { groupId, isVoided: false };
        if (req.query.category) filter.category = req.query.category.trim();
        if (req.query.participantId) filter["splits.participantId"] = req.query.participantId;

        const [expenses, total] = await Promise.all([
            SplitExpense.find(filter)
                .sort({ date: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate("paidBy", "name email")
                .populate("splits.participantId", "name email")
                .lean(),
            SplitExpense.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: { expenses, total, page, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.getSplitExpense = async (req, res) => {
    try {
        const expense = await SplitExpense.findById(req.params.id)
            .populate("paidBy", "name email")
            .populate("splits.participantId", "name email")
            .populate("createdBy", "name email");

        if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });

        await assertGroupMember(expense.groupId, req.user._id);
        res.json({ success: true, data: expense });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.updateSplitExpense = async (req, res) => {
    try {
        const expense = await SplitExpense.findById(req.params.id);
        if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });

        await assertGroupMember(expense.groupId, req.user._id);
        if (expense.isVoided) return res.status(400).json({ success: false, message: "Cannot edit a voided expense" });

        const { title, description, date, category } = req.body;
        if (title !== undefined) expense.title = title.trim();
        if (description !== undefined) expense.description = (description || "").trim();
        if (date !== undefined) expense.date = new Date(date);
        if (category !== undefined) expense.category = (category || "").trim();

        await expense.save();
        const populated = await expense.populate([
            { path: "paidBy", select: "name email" },
            { path: "splits.participantId", select: "name email" }
        ]);

        res.json({ success: true, data: populated });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.markSplitSettled = async (req, res) => {
    try {
        const { id, participantId } = req.params;
        const expense = await SplitExpense.findById(id);
        if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });

        await assertGroupMember(expense.groupId, req.user._id);

        const split = expense.splits.find(s => s.participantId.toString() === participantId);
        if (!split) return res.status(404).json({ success: false, message: "Participant not found in this expense" });

        split.settled = !split.settled;
        split.settledAt = split.settled ? new Date() : null;
        await expense.save();

        res.json({ success: true, data: expense });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.voidSplitExpense = async (req, res) => {
    try {
        const expense = await SplitExpense.findById(req.params.id);
        if (!expense) return res.status(404).json({ success: false, message: "Expense not found" });

        const group = await Group.findOne({ _id: expense.groupId, admins: req.user._id });
        if (!group) return res.status(403).json({ success: false, message: "Only admins can void expenses" });

        expense.isVoided = true;
        await expense.save();

        res.json({ success: true, message: "Expense voided" });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};

exports.getGroupBalances = async (req, res) => {
    try {
        const { groupId } = req.params;
        await assertGroupMember(groupId, req.user._id);

        const expenses = await SplitExpense.find({ groupId, isVoided: false })
            .populate("paidBy", "name")
            .populate("splits.participantId", "name")
            .lean();

        const owed = {};
        const owes = {};

        expenses.forEach(expense => {
            const payerId = expense.paidBy._id.toString();
            owed[payerId] = (owed[payerId] || 0) + expense.amount;

            expense.splits.forEach(split => {
                if (!split.settled) {
                    const pid = split.participantId._id.toString();
                    owes[pid] = (owes[pid] || 0) + split.amount;
                }
            });
        });

        const allIds = [...new Set([...Object.keys(owed), ...Object.keys(owes)])];
        const participants = await Participant.find({ _id: { $in: allIds } }).lean();
        const nameMap = {};
        participants.forEach(p => { nameMap[p._id.toString()] = p.name; });

        const balances = allIds.map(id => ({
            participantId: id,
            name: nameMap[id] || "Unknown",
            paid: owed[id] || 0,
            owes: owes[id] || 0,
            net: (owed[id] || 0) - (owes[id] || 0)
        }));

        res.json({ success: true, data: balances });
    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ success: false, message: error.message });
    }
};