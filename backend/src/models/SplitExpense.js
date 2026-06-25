const mongoose = require("mongoose");

const splitSchema = new mongoose.Schema(
    {
        groupId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Group",
            required: true,
            index: true
        },
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 200
        },
        description: {
            type: String,
            default: "",
            trim: true,
            maxlength: 500
        },
        amount: {
            type: Number,
            required: true,
            min: 0
        },
        currency: {
            type: String,
            default: "INR",
            trim: true,
            uppercase: true
        },
        paidBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Participant",
            required: true
        },
        splitType: {
            type: String,
            enum: ["equal", "custom", "percentage"],
            default: "equal"
        },
        splits: [
            {
                participantId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Participant",
                    required: true
                },
                amount: {
                    type: Number,
                    required: true,
                    min: 0
                },
                percentage: {
                    type: Number,
                    min: 0,
                    max: 100
                },
                settled: {
                    type: Boolean,
                    default: false
                },
                settledAt: {
                    type: Date,
                    default: null
                }
            }
        ],
        date: {
            type: Date,
            default: Date.now
        },
        category: {
            type: String,
            default: "",
            trim: true,
            maxlength: 100
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        isVoided: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

splitSchema.index({ groupId: 1, date: -1 });
splitSchema.index({ "splits.participantId": 1 });

module.exports =
    mongoose.models.SplitExpense ||
    mongoose.model("SplitExpense", splitSchema);