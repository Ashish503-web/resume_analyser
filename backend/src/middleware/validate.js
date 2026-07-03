const ApiError = require("../utils/apiError");

const validate = (schema, source = "body") => (req, res, next) => {
    const data = req[source] || {};

    const result = schema.safeParse(data);

    if (!result.success) {
        return next(
            ApiError.badRequest(
                "Validation failed",
                result.error.issues
            )
        );
    }

    req[source] = result.data;
    next();
};

module.exports = { validate };