const express = require("express");
const {
  getStripeData,
  stripeWebhookHandler,
  stripeCallback,
} = require("../controllers/stripeIntegration");

const router = express.Router();

router.get("/quote-payment/:quoteId", getStripeData);
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

router.get("/oauth/callback", stripeCallback);

module.exports = router;
