import express from "express";
import { promisify } from 'util';
import bycrypt from "bcryptjs"
import db from "../services/db.js";
import { body, validationResult } from 'express-validator';

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

router.post("/register", [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match');
    }
    return true;
  }),
  body("name").notEmpty().withMessage("Name is required"),
], async (req, res) => {
    try {
        console.log("Registerign users");

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;
        const existingUser = await db.runAsync(`SELECT * FROM profiles WHERE email = ?`, [email]); // UNIQUE THINS TO IDENTIFY AN ORGANIZATION

        if (existingUser) {
            console.log("User already exists");
            return res.status(400).json({ error: "User already exists" });
        }

        const saltRounds = 12;
        const passwordHash = await bycrypt.hash(password, saltRounds);

        let result = await db.runAsync(`INSERT INTO profiles (email, ) values ()`, [email, passwordHash, ]);
    } catch (error) {
        
    }
});

export default router;
