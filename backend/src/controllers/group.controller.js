const Group = require("../models/Group");
const Participant = require("../models/Participant");
const User = require("../models/User");

exports.createGroup = async (req, res) => {
  try {
    const { name, description, currency } = req.body;

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanDescription = typeof description === "string" ? description.trim() : "";
    const cleanCurrency = typeof currency === "string" ? currency.trim().toUpperCase() : "INR";

    if (cleanName.length < 2 || cleanName.length > 100) {
      return res.status(400).json({ success: false, message: "Group name must be between 2 and 100 characters" });
    }
    if (cleanDescription.length > 500) {
      return res.status(400).json({ success: false, message: "Description must be 500 characters or fewer" });
    }
    if (!/^[A-Z]{3,8}$/.test(cleanCurrency)) {
      return res.status(400).json({ success: false, message: "Currency must be a valid 3-8 letter code" });
    }

    const group = await Group.create({
      name: cleanName,
      description: cleanDescription,
      currency: cleanCurrency,
      createdBy: req.user._id,
    });

    // Create Participant for creator
    await Participant.create({
      groupId: group._id,
      name: req.user.name,
      email: req.user.email,
      linkedUserId: req.user._id,
      isActive: true,
      notes: "Group creator & admin"
    });

    await Group.findByIdAndUpdate(group._id, { participantCount: 1 });

    const populatedGroup = await Group.findById(group._id)
      .populate('createdBy', 'name email')
      .populate('admins', 'name email');

    return res.status(201).json({
      success: true,
      message: "Group created successfully",
      data: populatedGroup
    });
  } catch (error) {
    console.error("Create Group Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGroups = async (req, res) => {
  try {
    const { search, archived } = req.query;
    const query = { members: req.user._id };

    if (archived === "true") query.isArchived = true;
    else if (archived === "false") query.isArchived = false;

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const groups = await Group.find(query)
      .sort({ createdAt: -1 })
      .select("name description currency isArchived participantCount inviteCode")
      .populate('createdBy', 'name email');

    return res.json({ success: true, data: groups });
  } catch (error) {
    console.error("Get Groups Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getGroup = async (req, res) => {
  try {
    const group = await Group.findOne({
      _id: req.params.id,
      members: req.user._id
    }).populate('createdBy', 'name email')
      .populate('admins', 'name email');

    if (!group) {
      return res.status(404).json({ success: false, message: "Group not found or access denied" });
    }

    const participants = await Participant.find({ groupId: group._id, isActive: true })
      .populate('linkedUserId', 'name email avatar');

    return res.json({
      success: true,
      data: { group, participants }
    });
  } catch (error) {
    console.error("Get Group Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const isAdmin = group.admins.some(id => id.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only admins can update the group" });
    }

    const { name, description, currency } = req.body;

    if (name !== undefined) {
      const cleanName = typeof name === "string" ? name.trim() : "";
      if (cleanName.length < 2 || cleanName.length > 100) {
        return res.status(400).json({ success: false, message: "Name must be between 2 and 100 characters" });
      }
      group.name = cleanName;
    }

    if (description !== undefined) {
      const cleanDescription = typeof description === "string" ? description.trim() : "";
      if (cleanDescription.length > 500) {
        return res.status(400).json({ success: false, message: "Description must be 500 characters or fewer" });
      }
      group.description = cleanDescription;
    }

    if (currency !== undefined) {
      const cleanCurrency = typeof currency === "string" ? currency.trim().toUpperCase() : "";
      if (!/^[A-Z]{3,8}$/.test(cleanCurrency)) {
        return res.status(400).json({ success: false, message: "Invalid currency code" });
      }
      group.currency = cleanCurrency;
    }

    await group.save();
    return res.json({ success: true, data: group });
  } catch (error) {
    console.error("Update Group Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.archiveGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const isAdmin = group.admins.some(id => id.toString() === req.user._id.toString());
    if (!isAdmin) {
      return res.status(403).json({ success: false, message: "Only admins can archive" });
    }

    group.isArchived = !group.isArchived;
    await group.save();

    return res.json({ success: true, data: group });
  } catch (error) {
    console.error("Archive Group Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteGroup = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Only the creator can delete the group" });
    }

    await Participant.deleteMany({ groupId: group._id });
    await group.deleteOne();

    return res.json({ success: true, message: "Group deleted successfully" });
  } catch (error) {
    console.error("Delete Group Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// === Invite System ===
exports.generateInviteCode = async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const isAdmin = group.admins.some(id => id.toString() === req.user._id.toString());
    if (!isAdmin) return res.status(403).json({ success: false, message: "Only admins can generate invite code" });

    group.inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    group.inviteExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    await group.save();

    return res.json({
      success: true,
      data: {
        inviteCode: group.inviteCode,
        inviteLink: `/join/${group.inviteCode}`
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.joinGroupByInvite = async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ success: false, message: "Invite code is required" });

    const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!group) return res.status(404).json({ success: false, message: "Invalid or expired invite code" });

    if (group.members.includes(req.user._id)) {
      return res.json({ success: true, message: "You are already a member" });
    }

    group.members.push(req.user._id);
    await group.save();

    await Participant.create({
      groupId: group._id,
      name: req.user.name,
      email: req.user.email,
      linkedUserId: req.user._id,
      isActive: true,
      notes: "Joined via invite code"
    });

    await Group.findByIdAndUpdate(group._id, { $inc: { participantCount: 1 } });

    return res.json({ success: true, message: "Successfully joined the group" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};