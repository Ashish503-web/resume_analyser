const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema(
     {
          userId: {
               type: mongoose.Schema.Types.ObjectId,
               ref: "User",
               required: true,
               index: true,
          },
          title: { type:String, required: true, trim: true, maxLength: 120 },
          currentVersionNumber: { 
               type: mongoose.Schema.Types.ObjectId,
               ref: "ResumeVersion",
               default: null,
          },
          lastedVersionNumber: { type: Number, default:0}
     },
     
)