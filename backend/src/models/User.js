const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
     {
          email: {
               type: String,
               required: [true, "Email is required"],
               unique: true,
               lowercase: true,
               trim: true,
               match: [
                         /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 
                         "Please provide a valid email address"
                    ],
               index: true,
          },
          passwordHash: { type: String, required: true, select: false },
          name: { type: String, required: true, trim: true, maxLength: 80}
     },
     {
          timestamps : true 
     }
);

userSchema.statics.hashPassword = function (plain) {
     return bcrypt.hash(plain, 12);
};

userSchema.method.comparePassword = function (plain) {
     return bcrypt.compare(plain, this.passwordHash)
}

userSchema.method.toJSON = function () {
     const obj = this.toObject();
     delete obj.passwordHash;
     delete obj._v;
     return obj;
};

module.exports = mongoose.model("User", userSchema);