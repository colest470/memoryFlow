async function createOrganization(name, description, userId) {
    const result = await db.runAsync(
        "INSERT INTO organizations (name, description) VALUES (?, ?)",
        [name, description]
    );
    
    // Make creator an admin
    await db.runAsync(
        "INSERT INTO user_organizations (user_id, organization_id, role) VALUES (?, ?, ?)",
        [userId, result.lastID, 'admin']
    );
    
    return result.lastID;
}

async function addUserToOrganization(userId, organizationId, role = 'member') {
    await db.runAsync(
        "INSERT INTO user_organizations (user_id, organization_id, role) VALUES (?, ?, ?)",
        [userId, organizationId, role]
    );
}

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
    // First check if admin has permission
    if (!await isOrganizationAdmin(adminUserId, organizationId)) {
        throw new Error("Unauthorized: Admin access required");
    }
    
    await db.runAsync(
        "UPDATE user_organizations SET role = ? WHERE user_id = ? AND organization_id = ?",
        [newRole, userId, organizationId]
    );
}