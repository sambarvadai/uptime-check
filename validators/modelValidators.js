const { body, param, validationResult } = require('express-validator');

const ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

exports.validateMonitors = [
    // ID (route param, optional)
    param('id').optional().isInt().withMessage('Monitor ID must be an integer'),

    // URL
    body('url').exists().withMessage('URL is required')
        .isURL({ protocols: ['http', 'https'], require_tld: true, require_protocol: true })
        .withMessage('Must be a full URL including protocol, e.g. https://x.com'),

    // HTTP method (optional, defaults to GET)
    body('method').optional()
        .toUpperCase()
        .isIn(ALLOWED_METHODS)
        .withMessage(`Method must be one of: ${ALLOWED_METHODS.join(', ')}`),

    // Request headers (optional, must be a plain object)
    body('headers').optional()
        .isObject().withMessage('Headers must be a JSON object'),

    // Request body (optional, string)
    body('body').optional({ nullable: true })
        .isString().withMessage('Body must be a string'),

    // Interval (seconds)
    body('interval').exists().withMessage('Interval is required')
        .isInt({ min: 10, max: 86400 }).withMessage('Interval must be between 10 and 86400 seconds')
        .toInt(),

    // Status codes (optional, defaults to [200] on the backend)
    body('statusCodes').optional()
        .isArray({ min: 1 }).withMessage('statusCodes must be a non-empty array'),
    body('statusCodes.*').optional()
        .isInt({ min: 100, max: 599 }).withMessage('Each status code must be a valid HTTP status code (100-599)')
        .toInt(),

    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];
