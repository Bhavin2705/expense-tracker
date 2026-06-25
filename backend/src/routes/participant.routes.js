const express = require("express");
const auth = require("../middleware/auth");
const {
    addParticipant,
    getParticipants,
    removeParticipant
} = require("../controllers/participant.controller");

const router = express.Router();

router.use(auth);

// Participant Management
router.post("/groups/:groupId/participants", addParticipant);     // Add member by email (Admin only)
router.get("/groups/:groupId/participants", getParticipants);     // Get all participants in group
router.delete("/participants/:id", removeParticipant);            // Remove participant (Admin only)

module.exports = router;