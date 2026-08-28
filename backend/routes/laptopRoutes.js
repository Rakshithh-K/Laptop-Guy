const express = require("express");
const router = express.Router();
const {
    getLaptops,
    getLaptopById,
    getLaptopBySerial,
    createLaptop,
    updateLaptop,
    deleteLaptop
} = require("../controllers/laptopController");

router.route("/")
    .get(getLaptops)
    .post(createLaptop);

router.route("/serial/:serialNumber")
    .get(getLaptopBySerial);

router.route("/:id")
    .get(getLaptopById)
    .put(updateLaptop)
    .delete(deleteLaptop);

module.exports = router;
