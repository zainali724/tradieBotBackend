const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const nodemailer = require("nodemailer");
const { catchAsyncError } = require("../middlewares/catchAsyncError");
const quote = require("../models/quote");
const User = require("../models/User");
const { ErrorHandler } = require("../utils/ErrorHandler");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.addQuote = catchAsyncError(async (req, res, next) => {
  const {
    customerName,
    jobDescription,
    quoteAmount,
    customerEmail,
    telegramId,
    userId,
    stripeAccountId,
  } = req.body;

  if (
    !customerName ||
    !jobDescription ||
    !quoteAmount ||
    !customerEmail ||
    !telegramId ||
    !userId ||
    !stripeAccountId
  ) {
    return next(new ErrorHandler("All fields are required", 400));
  }

  const user = await User.findOne({ telegramId });
  if (!user) {
    return next(new ErrorHandler("User not found for this telegramId", 404));
  }

  const newQuote = new quote({
    customerName,
    jobDescription,
    quoteAmount,
    customerEmail,
    telegramId,
    userId,
  });

  // Create Stripe PaymentIntent
  const paymentAmount = Math.round(Number(quoteAmount) * 100); // in cents
  const paymentIntent = await stripe.paymentIntents.create({
    amount: paymentAmount,
    currency: "usd",
    automatic_payment_methods: { enabled: true },
    metadata: {
      quoteId: newQuote._id.toString(),
      userId: user._id.toString(),
    },
    transfer_data: {
      destination: stripeAccountId,
    },
    receipt_email: customerEmail,
    description: `Quote for ${customerName}`,
  });

  // Save paymentIntent ID in quote
  newQuote.paymentIntentId = paymentIntent.id;
  await newQuote.save();

  // Use /tmp directory in Vercel
  const tempDir = "/tmp";
  const pdfPath = path.join(tempDir, `quote_${newQuote._id}.pdf`);
  const paymentLink = `https://peppy-swan-6fdd72.netlify.app/pay/quote/${newQuote._id}`;
  const doc = new PDFDocument();

  // Await PDF generation
  await new Promise((resolve, reject) => {
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(18).text("Quote Summary", { underline: true });
    doc.moveDown();
    doc.fontSize(12).text(`Customer Name: ${customerName}`);
    doc.text(`Job Description: ${jobDescription}`);
    doc.text(`Quote Amount: $${quoteAmount}`);
    doc.text(`Email: ${customerEmail}`);
    doc.moveDown();
    doc
      .fillColor("blue")
      .text("Click here to pay", { link: paymentLink, underline: true });
    doc.end();

    stream.on("finish", resolve);
    stream.on("error", reject);
  });

  // Send Email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER, // better: use env vars
      pass: process.env.EMAIL_PASS,
    },
  });

  await transporter.sendMail({
    from: "UK Tradie Bot",
    to: customerEmail,
    subject: "Your Quote from UK Tradie",
    text: "Please find your quote attached.",
    attachments: [
      {
        filename: `Quote_${newQuote._id}.pdf`,
        path: pdfPath,
      },
    ],
  });

  // Clean up file
  fs.unlinkSync(pdfPath);

  res.status(201).json({
    message: "Quote submitted and emailed successfully",
    quote: newQuote,
  });
});
