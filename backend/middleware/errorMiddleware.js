// Centralized error handling middleware

const notFoundHandler = (req, res, next) => {
    const error = new Error(`Resource not found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    let message = err.message || "Internal Server Error";

    // Handle Mongoose Bad ObjectId (CastError)
    if (err.name === "CastError" && err.kind === "ObjectId") {
        statusCode = 400;
        message = `Invalid ID format for ${err.path}`;
    }

    // Handle Mongoose Validation Error
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = Object.values(err.errors).map(val => val.message).join(", ");
    }

    // Handle Duplicate Key Error (e.g. unique serialNumber or invoiceNumber)
    if (err.code === 11000) {
        statusCode = 409;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        const val = err.keyValue ? err.keyValue[field] : "";
        message = `A record with ${field} '${val}' already exists.`;
    }

    res.status(statusCode).json({
        success: false,
        message,
        error: process.env.NODE_ENV === "production" ? undefined : err.stack
    });
};

module.exports = {
    notFoundHandler,
    errorHandler
};
