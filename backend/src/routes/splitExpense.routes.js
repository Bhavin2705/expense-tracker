const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const {
    createSplitExpense,
    getSplitExpenses,
    getSplitExpense,
    updateSplitExpense,
    markSplitSettled,
    voidSplitExpense,
    getGroupBalances
} = require("../controllers/splitExpense.controller");

router.use(auth);

// Correct routes (no extra /groups prefix)
router.post("/:groupId/splits", createSplitExpense);
router.get("/:groupId/splits", getSplitExpenses);
router.get("/:groupId/splits/balances", getGroupBalances);

router.get("/splits/:id", getSplitExpense);
router.patch("/splits/:id", updateSplitExpense);
router.patch("/splits/:id/settle/:participantId", markSplitSettled);
router.patch("/splits/:id/void", voidSplitExpense);

module.exports = router;