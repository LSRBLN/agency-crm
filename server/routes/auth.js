const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { supabase } = require('../services/supabaseClient');
const router = express.Router();

function ensureAuthConfig(res) {
    if (!process.env.JWT_SECRET) {
        res.status(500).json({ error: 'JWT_SECRET fehlt in der Server-Konfiguration' });
        return false;
    }

    if (!supabase) {
        res.status(503).json({ error: 'Datenbank nicht konfiguriert' });
        return false;
    }

    return true;
}

router.post('/login', async (req, res) => {
    if (!ensureAuthConfig(res)) {
        return;
    }

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich' });
    }

    const envAdminEmail = process.env.ADMIN_EMAIL ? String(process.env.ADMIN_EMAIL).toLowerCase() : null;
    const envAdminPassword = process.env.ADMIN_PASSWORD;

    if (
        envAdminEmail &&
        envAdminPassword &&
        String(email).toLowerCase() === envAdminEmail &&
        password === envAdminPassword
    ) {
        const token = jwt.sign(
            { id: 'env-admin', email: envAdminEmail, role: 'admin' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        return res.json({
            token,
            user: {
                id: 'env-admin',
                email: envAdminEmail,
                role: 'admin',
                name: process.env.ADMIN_NAME || 'Admin',
            },
        });
    }

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('id, email, password, role, name')
            .eq('email', String(email).toLowerCase())
            .single();

        if (error || !user || !user.password) {
            return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ error: 'Ungültige Zugangsdaten' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role || 'user',
                name: user.name || null,
            },
        });
    } catch (err) {
        res.status(500).json({ error: 'Login fehlgeschlagen' });
    }
});

router.post('/register', async (req, res) => {
    if (!ensureAuthConfig(res)) {
        return;
    }

    const { email, password, name } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'E-Mail und Passwort sind erforderlich' });
    }

    try {
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', String(email).toLowerCase())
            .maybeSingle();

        if (existing) {
            return res.status(409).json({ error: 'Benutzer existiert bereits' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = {
            email: String(email).toLowerCase(),
            password: hashedPassword,
            name: name || null,
            role: 'user',
        };

        const { data: user, error } = await supabase
            .from('users')
            .insert([newUser])
            .select('id, email, role, name')
            .single();

        if (error || !user) {
            throw error || new Error('User konnte nicht erstellt werden');
        }

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role || 'user' },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ token, user });
    } catch (err) {
        res.status(500).json({ error: 'Registrierung fehlgeschlagen' });
    }
});

module.exports = router;
