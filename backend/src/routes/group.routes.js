const express = require("express");
const auth = require("../middleware/auth");
const {
    createGroup,
    getGroups,
    getGroup,
    updateGroup,
    archiveGroup,
    deleteGroup,
    generateInviteCode,
    joinGroupByInvite
} = require("../controllers/group.controller");

const router = express.Router();

router.use(auth);

router.post("/", createGroup);
router.get("/", getGroups);
router.get("/:id", getGroup);
router.patch("/:id", updateGroup);
router.patch("/:id/archive", archiveGroup);
router.delete("/:id", deleteGroup);

// === Invite System Routes ===
router.post("/:id/invite", generateInviteCode);           // Generate/Refresh invite code
router.post("/join", joinGroupByInvite);                  // Join using invite code

module.exports = router;