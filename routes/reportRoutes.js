const express = require("express");

const router = express.Router();

const {
  getDashboardReport,
  getSocietyAnalysis,
  downloadSocietyPdf,
    getMonthlyCollection
} = require("../controllers/reportController");

router.get(
  "/dashboard",
  getDashboardReport
);

router.get(
  "/society-analysis",
  getSocietyAnalysis
);

router.get(
  "/society-pdf/:id",
  downloadSocietyPdf
);

router.get(
"/monthly-collection",
getMonthlyCollection
);


module.exports = router;