const Participant = require("../models/Participant");
const Group = require("../models/Group");
const User = require("../models/User");

exports.addParticipant = async (req, res) => {
  try {
    const { groupId } = req.params;
    const { email } = req.body;

    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!cleanEmail) return res.status(400).json({ success: false, message: "Email is required" });

    const group = await Group.findOne({ _id: groupId, admins: req.user._id });
    if (!group) return res.status(403).json({ success: false, message: "Only admins can add members" });

    const userToAdd = await User.findOne({ email: cleanEmail });
    if (!userToAdd) return res.status(404).json({ success: false, message: "User with this email not found" });

    // Check if already in group
    if (group.members.includes(userToAdd._id)) {
      return res.status(400).json({ success: false, message: "User is already a member" });
    }

    // Add to group members
    group.members.push(userToAdd._id);
    await group.save();

    // Create Participant
    const participant = await Participant.create({
      groupId: group._id,
      name: userToAdd.name,
      email: userToAdd.email,
      linkedUserId: userToAdd._id,
      isActive: true,
      notes: "Added by admin"
    });

    await Group.findByIdAndUpdate(groupId, { $inc: { participantCount: 1 } });

    return res.status(201).json({ success: true, data: participant });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getParticipants = async (req, res) => {
  try {
    const { groupId } = req.params;
    const group = await Group.findOne({ _id: groupId, members: req.user._id });
    if (!group) return res.status(404).json({ success: false, message: "Group not found" });

    const participants = await Participant.find({ groupId, isActive: true })
      .populate('linkedUserId', 'name email avatar');

    return res.json({ success: true, data: participants });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.removeParticipant = async (req, res) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) return res.status(404).json({ success: false, message: "Participant not found" });

    const group = await Group.findOne({ _id: participant.groupId, admins: req.user._id });
    if (!group) return res.status(403).json({ success: false, message: "Only admins can remove members" });

    // Prevent removing the last admin/creator
    if (participant.linkedUserId && group.createdBy.toString() === participant.linkedUserId.toString()) {
      return res.status(400).json({ success: false, message: "Cannot remove group creator" });
    }

    await participant.deleteOne();
    await Group.findByIdAndUpdate(participant.groupId, { $inc: { participantCount: -1 } });

    return res.json({ success: true, message: "Participant removed successfully" });
  } catch (error) {
    const logger = require("../utils/logger");
    logger.error(error.message);
    return res.status(500).json({ success: false, message: error.message });
  }
};