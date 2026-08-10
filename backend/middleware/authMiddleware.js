const jwt = require("jsonwebtoken");

const authenticateToken = (
    req,
    res,
    next
) => {
    const authorizationHeader =
        req.headers.authorization || "";

    const token =
        authorizationHeader.startsWith(
            "Bearer "
        )
            ? authorizationHeader.slice(7)
            : "";

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
        });
    }

    try {
        const decodedUser = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        req.user = decodedUser;

        return next();
    } catch (error) {
        return res.status(401).json({
            success: false,
            message:
                "Invalid or expired login",
        });
    }
};

const allowRoles = (
    ...allowedRoles
) => {
    /*
      Flatten and normalise roles to prevent spaces,
      capitalisation or nested arrays from causing an
      incorrect 403 response.
    */

    const normalisedAllowedRoles =
        allowedRoles
            .flat()
            .map((role) =>
                String(role)
                    .trim()
                    .toLowerCase()
            );

    return (req, res, next) => {
        const currentRole = String(
            req.user?.role || ""
        )
            .trim()
            .toLowerCase();

        if (
            !currentRole ||
            !normalisedAllowedRoles.includes(
                currentRole
            )
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You are not authorised to perform this action",
            });
        }

        return next();
    };
};

const requireSelf = (
    parameterName = "userId"
) => {
    return (req, res, next) => {
        const requestedUserId = String(
            req.params[parameterName] || ""
        ).trim();

        const authenticatedUserId = String(
            req.user?.id || ""
        ).trim();

        if (
            !requestedUserId ||
            !authenticatedUserId ||
            requestedUserId !==
            authenticatedUserId
        ) {
            return res.status(403).json({
                success: false,
                message:
                    "You cannot access another user's account",
            });
        }

        return next();
    };
};

const adminOnly = [
    authenticateToken,
    allowRoles("admin"),
];

const lecturerOnly = [
    authenticateToken,
    allowRoles("lecturer"),
];

const lecturerSelfOnly = [
    authenticateToken,
    allowRoles("lecturer"),
    requireSelf("userId"),
];

const studentOnly = [
    authenticateToken,
    allowRoles("student"),
];

const studentSelfOnly = [
    authenticateToken,
    allowRoles("student"),
    requireSelf("userId"),
];

module.exports = {
    authenticateToken,
    allowRoles,
    requireSelf,
    adminOnly,
    lecturerOnly,
    lecturerSelfOnly,
    studentOnly,
    studentSelfOnly,
};