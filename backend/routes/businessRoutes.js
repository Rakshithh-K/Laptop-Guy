const express = require("express");
const router = express.Router();
const businessConfig = require("../config/businessConfig");

router.get("/", (req, res) => {
    res.status(200).json(businessConfig);
});

module.exports = router;
