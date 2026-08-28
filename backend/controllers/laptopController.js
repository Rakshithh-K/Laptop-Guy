const Laptop = require("../models/Laptop");
const Invoice = require("../models/Invoice");

// @desc    Get all laptops with optional search and status filter
// @route   GET /api/laptops
const getLaptops = async (req, res, next) => {
    try {
        const { search, status } = req.query;
        let query = {};

        // Status filter
        if (status && status !== "ALL") {
            query.status = status.toUpperCase();
        }

        // Search across brand, model, serialNumber, processor
        if (search && search.trim() !== "") {
            const searchRegex = new RegExp(search.trim(), "i");
            query.$or = [
                { brand: searchRegex },
                { model: searchRegex },
                { serialNumber: searchRegex },
                { processor: searchRegex }
            ];
        }

        const laptops = await Laptop.find(query).sort({ _id: -1 });
        res.status(200).json(laptops);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single laptop by ID
// @route   GET /api/laptops/:id
const getLaptopById = async (req, res, next) => {
    try {
        const laptop = await Laptop.findById(req.params.id);
        if (!laptop) {
            return res.status(404).json({
                success: false,
                message: "Laptop not found"
            });
        }
        res.status(200).json(laptop);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single laptop by serial number
// @route   GET /api/laptops/serial/:serialNumber
const getLaptopBySerial = async (req, res, next) => {
    try {
        const laptop = await Laptop.findOne({ serialNumber: req.params.serialNumber.trim() });
        if (!laptop) {
            return res.status(404).json({
                success: false,
                message: `No laptop found with serial number ${req.params.serialNumber}`
            });
        }
        res.status(200).json(laptop);
    } catch (error) {
        next(error);
    }
};

// @desc    Create a new laptop in inventory
// @route   POST /api/laptops
const createLaptop = async (req, res, next) => {
    try {
        const {
            brand,
            model,
            serialNumber,
            processor,
            ram,
            storage,
            condition,
            purchasePrice,
            sellingPrice,
            warranty,
            status = "AVAILABLE"
        } = req.body;

        // Validation
        if (!brand || !model || !serialNumber || !processor || !ram || !storage || !condition || purchasePrice === undefined || sellingPrice === undefined) {
            return res.status(400).json({
                success: false,
                message: "Please fill in all required fields (brand, model, serialNumber, processor, ram, storage, condition, purchasePrice, sellingPrice)."
            });
        }

        if (Number(purchasePrice) < 0 || Number(sellingPrice) < 0) {
            return res.status(400).json({
                success: false,
                message: "Purchase price and selling price must be positive numbers."
            });
        }

        // Check for duplicate serial number
        const existingLaptop = await Laptop.findOne({ serialNumber: serialNumber.trim() });
        if (existingLaptop) {
            return res.status(409).json({
                success: false,
                message: `A laptop with serial number '${serialNumber.trim()}' already exists in inventory.`
            });
        }

        const laptop = await Laptop.create({
            brand: brand.trim(),
            model: model.trim(),
            serialNumber: serialNumber.trim().toUpperCase(),
            processor: processor.trim(),
            ram: ram.trim(),
            storage: storage.trim(),
            condition: condition.trim(),
            purchasePrice: Number(purchasePrice),
            sellingPrice: Number(sellingPrice),
            warranty: warranty ? warranty.trim() : "30 Days Hardware Warranty",
            status: status || "AVAILABLE"
        });

        res.status(201).json(laptop);
    } catch (error) {
        next(error);
    }
};

// @desc    Update laptop details
// @route   PUT /api/laptops/:id
const updateLaptop = async (req, res, next) => {
    try {
        const laptop = await Laptop.findById(req.params.id);
        if (!laptop) {
            return res.status(404).json({
                success: false,
                message: "Laptop not found"
            });
        }

        // If laptop is SOLD, prevent changing status back to AVAILABLE without caution
        if (laptop.status === "SOLD" && req.body.status === "AVAILABLE") {
            const hasInvoice = await Invoice.findOne({ laptop: laptop._id });
            if (hasInvoice) {
                return res.status(400).json({
                    success: false,
                    message: "Cannot mark a sold laptop as AVAILABLE because an invoice already exists for it."
                });
            }
        }

        // Check duplicate serial if changing serial
        if (req.body.serialNumber && req.body.serialNumber.trim().toUpperCase() !== laptop.serialNumber) {
            const dup = await Laptop.findOne({ serialNumber: req.body.serialNumber.trim().toUpperCase() });
            if (dup) {
                return res.status(409).json({
                    success: false,
                    message: `Serial number '${req.body.serialNumber}' is already registered.`
                });
            }
            laptop.serialNumber = req.body.serialNumber.trim().toUpperCase();
        }

        if (req.body.brand) laptop.brand = req.body.brand.trim();
        if (req.body.model) laptop.model = req.body.model.trim();
        if (req.body.processor) laptop.processor = req.body.processor.trim();
        if (req.body.ram) laptop.ram = req.body.ram.trim();
        if (req.body.storage) laptop.storage = req.body.storage.trim();
        if (req.body.condition) laptop.condition = req.body.condition.trim();
        if (req.body.purchasePrice !== undefined) laptop.purchasePrice = Number(req.body.purchasePrice);
        if (req.body.sellingPrice !== undefined) laptop.sellingPrice = Number(req.body.sellingPrice);
        if (req.body.warranty !== undefined) laptop.warranty = req.body.warranty.trim();
        if (req.body.status && ["AVAILABLE", "SOLD"].includes(req.body.status)) {
            laptop.status = req.body.status;
        }

        const updated = await laptop.save();
        res.status(200).json(updated);
    } catch (error) {
        next(error);
    }
};

// @desc    Delete a laptop from inventory
// @route   DELETE /api/laptops/:id
const deleteLaptop = async (req, res, next) => {
    try {
        const laptop = await Laptop.findById(req.params.id);
        if (!laptop) {
            return res.status(404).json({
                success: false,
                message: "Laptop not found"
            });
        }

        // Prevent deletion if an invoice exists
        const linkedInvoice = await Invoice.findOne({ laptop: laptop._id });
        if (linkedInvoice) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete this laptop as it has an existing invoice record in the system."
            });
        }

        await Laptop.findByIdAndDelete(req.params.id);
        res.status(200).json({
            success: true,
            message: "Laptop removed from inventory"
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getLaptops,
    getLaptopById,
    getLaptopBySerial,
    createLaptop,
    updateLaptop,
    deleteLaptop
};
