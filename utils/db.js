const mongoose = require("mongoose");

exports.connectDb = async () => {
  try {
    await mongoose
      .connect(
        "mongodb+srv://admin:obxHIrvo9DfU7Yix@cluster0.6el2dvk.mongodb.net/theHive?retryWrites=true&w=majority"
      )
      .then(() => {
        console.log("db is conncted");
      })
      .catch((error) => console.log(error, "some error in inner catch"));
  } catch (error) {
    console.log(error, "some error in outer catch");
    //  "mongodb+srv://zain114567:50I3VPy4fzcsA9t9@myprojects.ztxj7e9.mongodb.net/theHive?retryWrites=true&w=majority"
  }
};
