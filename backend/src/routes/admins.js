import express from "express";
import { authenticateToken } from "../../middleware/tokens.js";
import { promisify } from "util";
import db from "../services/db.js";

db.getAsync = promisify(db.get.bind(db));
db.allAsync = promisify(db.all.bind(db));

db.runAsync = (sql, params) => {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) return reject(err);
            resolve({ lastID: this.lastID, changes: this.changes });
        });
    });
};

const router = express.Router();

router.post("/createOrganization", authenticateToken(), async (req, res) => {
    try {
        const { name, description, userId } = req.body;
        
        const result = await db.runAsync(
            "INSERT INTO organizations (name, description) VALUES (?, ?)",
            [name, description]
        );
        
        await db.runAsync(
            "INSERT INTO user_organizations (user_id, organization_id, role) VALUES (?, ?, ?)",
            [userId, result.lastID, 'admin']
        );
        
        return result.lastID;
    } catch (error) {
        console.error("error creating organization!", error);
    }
});

router.post("/addUserToOrganization", authenticateToken(), async (req, res) => {
    try {
        const role = "member";
        const { userId, organizationId, operatorId } = req.body;

        if (isOrganizationAdmin(operatorId, organizationId)) {
            res.status(401).json({ error: "user not authorized!" });
        }

        await db.runAsync(
            "INSERT INTO user_organizations (user_id, organization_id, role) VALUES (?, ?, ?)",
            [userId, organizationId, role]
        );
    } catch (error) {
        console.error("error creating organization!", error);
    }
});

async function getUserOrganizationRole(userId, organizationId) {
    return await db.getAsync(
        "SELECT role FROM user_organizations WHERE user_id = ? AND organization_id = ?",
        [userId, organizationId]
    );
}

async function isOrganizationAdmin(userId, organizationId) {
    const role = await getUserOrganizationRole(userId, organizationId);
    return role?.role === 'admin';
}

async function getUserOrganizations(userId) {
    return await db.allAsync(`
        SELECT o.*, uo.role, uo.department 
        FROM organizations o
        JOIN user_organizations uo ON o.id = uo.organization_id
        WHERE uo.user_id = ?
    `, [userId]);
}

async function updateUserRole(userId, organizationId, newRole, adminUserId) {
    if (!await isOrganizationAdmin(adminUserId, organizationId)) {
        throw new Error("Unauthorized: Admin access required");
    }
    
    await db.runAsync(
        "UPDATE user_organizations SET role = ? WHERE user_id = ? AND organization_id = ?",
        [newRole, userId, organizationId]
    );
}

export default router;