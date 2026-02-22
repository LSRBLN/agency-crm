// Local DB Client Service (SQLite)
// NOTE: File name kept for compatibility with existing routes (`require('../services/supabaseClient')`).
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const dbPath = path.resolve(
    process.cwd(),
    process.env.DB_PATH || 'data/crm.sqlite'
);

fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

function nowIso() {
    return new Date().toISOString();
}

function migrate() {
    // Keep types SQLite-friendly. Store JSON as TEXT.
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password TEXT,
            name TEXT,
            role TEXT DEFAULT 'user',
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS user_settings (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            key TEXT NOT NULL,
            value TEXT,
            created_at TEXT,
            updated_at TEXT
        );
        CREATE TABLE IF NOT EXISTS contacts (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            first_name TEXT,
            last_name TEXT,
            mobile_phone TEXT,
            email TEXT,
            phone TEXT,
            company TEXT,
            position TEXT,
            status TEXT DEFAULT 'lead',
            source TEXT,
            attribution_source TEXT,
            attribution_campaign TEXT,
            notes TEXT,
            website TEXT,
            street_address TEXT,
            city TEXT,
            state TEXT,
            zip_code TEXT,
            country TEXT,
            birthday TEXT,
            tags TEXT,
            custom_fields TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS companies (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            website TEXT,
            industry TEXT,
            address TEXT,
            city TEXT,
            phone TEXT,
            email TEXT,
            notes TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS deals (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            value REAL DEFAULT 0,
            stage TEXT DEFAULT 'new',
            probability INTEGER DEFAULT 10,
            contact_id TEXT,
            company_id TEXT,
            expected_close TEXT,
            notes TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS tickets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'open',
            priority TEXT DEFAULT 'medium',
            category TEXT,
            contact_id TEXT,
            assigned_to TEXT,
            due_date TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            status TEXT DEFAULT 'planning',
            start_date TEXT,
            due_date TEXT,
            budget REAL,
            contact_id TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS activities (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            type TEXT,
            description TEXT,
            due_date TEXT,
            completed INTEGER DEFAULT 0,
            contact_id TEXT,
            deal_id TEXT,
            project_id TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS calendar_events (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            start_time TEXT NOT NULL,
            end_time TEXT,
            all_day INTEGER DEFAULT 0,
            color TEXT,
            contact_id TEXT,
            deal_id TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS knowledge_base (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT,
            category TEXT,
            tags TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS segments (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            criteria TEXT,
            created_at TEXT
        );

        CREATE TABLE IF NOT EXISTS audits (
            id TEXT PRIMARY KEY,
            lead_id TEXT,
            business_name TEXT,
            url TEXT,
            status TEXT,
            totalScore REAL DEFAULT 0,
            details TEXT,
            created_at TEXT,
            updated_at TEXT
        );

        CREATE TABLE IF NOT EXISTS grid_rank_scans (
            id TEXT PRIMARY KEY,
            place_id TEXT,
            place_name TEXT,
            website TEXT,
            domain TEXT,
            query TEXT,
            near TEXT,
            center_lat REAL,
            center_lng REAL,
            grid_size INTEGER,
            step_km REAL,
            radius INTEGER,
            result_limit INTEGER,
            summary TEXT,
            matrix TEXT,
            points TEXT,
            generated_at TEXT,
            created_at TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);
        CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
        CREATE INDEX IF NOT EXISTS idx_activities_type_created ON activities(type, created_at);
        CREATE INDEX IF NOT EXISTS idx_activities_contact_type_created ON activities(contact_id, type, created_at);
        CREATE INDEX IF NOT EXISTS idx_audits_lead_created ON audits(lead_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_user_settings_user_key ON user_settings(user_id, key);
        CREATE INDEX IF NOT EXISTS idx_grid_rank_scans_created_at ON grid_rank_scans(created_at);
        CREATE INDEX IF NOT EXISTS idx_grid_rank_scans_place_id ON grid_rank_scans(place_id);
    `);

    // Lightweight migrations for existing DB files (SQLite doesn't add columns on CREATE IF NOT EXISTS)
    ensureColumns('contacts', [
        { name: 'first_name', ddl: 'TEXT' },
        { name: 'last_name', ddl: 'TEXT' },
        { name: 'mobile_phone', ddl: 'TEXT' },
        { name: 'attribution_source', ddl: 'TEXT' },
        { name: 'attribution_campaign', ddl: 'TEXT' },
        { name: 'website', ddl: 'TEXT' },
        { name: 'street_address', ddl: 'TEXT' },
        { name: 'city', ddl: 'TEXT' },
        { name: 'state', ddl: 'TEXT' },
        { name: 'zip_code', ddl: 'TEXT' },
        { name: 'country', ddl: 'TEXT' },
        { name: 'birthday', ddl: 'TEXT' },
        { name: 'custom_fields', ddl: 'TEXT' },
    ]);
}

function ensureColumns(table, columns = []) {
    try {
        const existing = db
            .prepare(`PRAGMA table_info(${quoteIdent(table)})`)
            .all()
            .map((row) => String(row.name));

        for (const col of columns) {
            if (!col?.name || existing.includes(col.name)) continue;
            const ddl = String(col.ddl || 'TEXT');
            db.exec(`ALTER TABLE ${quoteIdent(table)} ADD COLUMN ${quoteIdent(col.name)} ${ddl}`);
        }
    } catch {
        // ignore migration failures; worst case routes will surface errors
    }
}

migrate();

function parseMaybeJson(value) {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return value;
    try {
        return JSON.parse(trimmed);
    } catch {
        return value;
    }
}

function normalizeRow(table, row) {
    if (!row || typeof row !== 'object') return row;

    const normalized = { ...row };

    if (table === 'contacts' && typeof normalized.tags === 'string') {
        const parsed = parseMaybeJson(normalized.tags);
        normalized.tags = Array.isArray(parsed) ? parsed : [];
    }

    if (table === 'contacts' && typeof normalized.custom_fields === 'string') {
        const parsed = parseMaybeJson(normalized.custom_fields);
        // Only replace when we actually parsed JSON; otherwise keep original string.
        if (parsed !== normalized.custom_fields) {
            normalized.custom_fields = parsed;
        }
    }

    if (table === 'knowledge_base' && typeof normalized.tags === 'string') {
        const parsed = parseMaybeJson(normalized.tags);
        normalized.tags = Array.isArray(parsed) ? parsed : [];
    }

    if (table === 'segments' && typeof normalized.criteria === 'string') {
        normalized.criteria = parseMaybeJson(normalized.criteria);
    }

    if (table === 'audits' && typeof normalized.details === 'string') {
        normalized.details = parseMaybeJson(normalized.details);
    }

    if (table === 'activities') {
        if (typeof normalized.completed === 'number') normalized.completed = Boolean(normalized.completed);
    }

    if (table === 'calendar_events') {
        if (typeof normalized.all_day === 'number') normalized.all_day = Boolean(normalized.all_day);
    }

    return normalized;
}

function preparePayload(table, payload) {
    const prepared = { ...payload };

    for (const [key, value] of Object.entries(prepared)) {
        if (value instanceof Date) {
            prepared[key] = value.toISOString();
        }
    }

    if (table === 'contacts') {
        if (prepared.tags !== undefined) {
            prepared.tags = JSON.stringify(Array.isArray(prepared.tags) ? prepared.tags : []);
        }

        if (prepared.custom_fields !== undefined && prepared.custom_fields !== null && typeof prepared.custom_fields !== 'string') {
            prepared.custom_fields = JSON.stringify(prepared.custom_fields);
        }
    }

    if (table === 'knowledge_base') {
        if (prepared.tags !== undefined) {
            prepared.tags = JSON.stringify(Array.isArray(prepared.tags) ? prepared.tags : []);
        }
    }

    if (table === 'segments') {
        if (prepared.criteria !== undefined && prepared.criteria !== null && typeof prepared.criteria !== 'string') {
            prepared.criteria = JSON.stringify(prepared.criteria);
        }
    }

    if (table === 'audits') {
        if (prepared.details !== undefined && prepared.details !== null && typeof prepared.details !== 'string') {
            prepared.details = JSON.stringify(prepared.details);
        }
    }

    if (table === 'activities') {
        if (prepared.completed !== undefined) {
            prepared.completed = prepared.completed ? 1 : 0;
        }
    }

    if (table === 'calendar_events') {
        if (prepared.all_day !== undefined) {
            prepared.all_day = prepared.all_day ? 1 : 0;
        }
    }

    return prepared;
}

function quoteIdent(identifier) {
    // Minimal quoting; table/column names are internal constants.
    return `"${String(identifier).replace(/"/g, '""')}"`;
}

function parseOrFilter(filter) {
    // Supports patterns used in this codebase, e.g.:
    //   name.ilike.%foo%,email.ilike.%foo%,company.ilike.%foo%
    const raw = String(filter || '').trim();
    if (!raw) return [];
    return raw
        .split(',')
        .map((chunk) => chunk.trim())
        .filter(Boolean)
        .map((chunk) => {
            const match = chunk.match(/^([a-zA-Z0-9_]+)\.ilike\.(.+)$/);
            if (!match) return null;
            return { column: match[1], pattern: match[2] };
        })
        .filter(Boolean);
}

class QueryBuilder {
    constructor(table) {
        this.table = table;
        this._operation = 'select';
        this._select = '*';
        this._returning = null;
        this._insertRows = null;
        this._updateFields = null;
        this._delete = false;
        this._where = [];
        this._or = [];
        this._order = null;
        this._limit = null;
        this._singleMode = null; // null | 'single' | 'maybe'
    }

    select(columns = '*') {
        // In supabase, select() can be used for returning after insert/update.
        if (this._operation === 'insert' || this._operation === 'update') {
            this._returning = columns;
        } else {
            this._select = columns;
        }
        return this;
    }

    insert(rows) {
        this._operation = 'insert';
        this._insertRows = Array.isArray(rows) ? rows : [rows];
        return this;
    }

    update(fields) {
        this._operation = 'update';
        this._updateFields = fields || {};
        return this;
    }

    delete() {
        this._operation = 'delete';
        this._delete = true;
        return this;
    }

    eq(column, value) {
        this._where.push({ op: 'eq', column, value });
        return this;
    }

    in(column, values) {
        this._where.push({ op: 'in', column, value: Array.isArray(values) ? values : [] });
        return this;
    }

    gte(column, value) {
        this._where.push({ op: 'gte', column, value });
        return this;
    }

    lte(column, value) {
        this._where.push({ op: 'lte', column, value });
        return this;
    }

    order(column, options = {}) {
        const ascending = options?.ascending !== false;
        this._order = { column, ascending };
        return this;
    }

    limit(value) {
        this._limit = Number(value);
        return this;
    }

    or(filter) {
        this._or = parseOrFilter(filter);
        return this;
    }

    single() {
        this._singleMode = 'single';
        return this;
    }

    maybeSingle() {
        this._singleMode = 'maybe';
        return this;
    }

    then(resolve, reject) {
        return this._execute().then(resolve, reject);
    }

    async _execute() {
        const run = () => {
            if (this._operation === 'select') {
                return this._execSelect();
            }
            if (this._operation === 'insert') {
                return this._execInsert();
            }
            if (this._operation === 'update') {
                return this._execUpdate();
            }
            if (this._operation === 'delete') {
                return this._execDelete();
            }
            return { data: null, error: { message: 'Unsupported operation' } };
        };

        try {
            return run();
        } catch (err) {
            const message = err?.message || String(err);
            // If DB existed before and schema changed, we may hit "no such table".
            // Auto-run migrations and retry once.
            if (/no such table/i.test(message)) {
                try {
                    migrate();
                    return run();
                } catch (retryErr) {
                    const retryMessage = retryErr?.message || String(retryErr);
                    return { data: null, error: { message: retryMessage } };
                }
            }

            return { data: null, error: { message } };
        }
    }

    _buildWhereClause(params) {
        const clauses = [];

        for (const cond of this._where) {
            const col = quoteIdent(cond.column);
            if (cond.op === 'eq') {
                clauses.push(`${col} = ?`);
                params.push(cond.value);
                continue;
            }
            if (cond.op === 'gte') {
                clauses.push(`${col} >= ?`);
                params.push(cond.value);
                continue;
            }
            if (cond.op === 'lte') {
                clauses.push(`${col} <= ?`);
                params.push(cond.value);
                continue;
            }
            if (cond.op === 'in') {
                const values = Array.isArray(cond.value) ? cond.value : [];
                if (values.length === 0) {
                    // Equivalent to false
                    clauses.push('1=0');
                } else {
                    clauses.push(`${col} IN (${values.map(() => '?').join(',')})`);
                    params.push(...values);
                }
            }
        }

        if (Array.isArray(this._or) && this._or.length > 0) {
            const orParts = this._or.map((entry) => {
                const col = quoteIdent(entry.column);
                params.push(entry.pattern);
                return `LOWER(${col}) LIKE LOWER(?)`;
            });
            clauses.push(`(${orParts.join(' OR ')})`);
        }

        if (clauses.length === 0) return '';
        return `WHERE ${clauses.join(' AND ')}`;
    }

    _applySingleMode(rows) {
        if (this._singleMode === 'maybe') {
            if (!rows || rows.length === 0) return { data: null, error: null };
            if (rows.length > 1) {
                return { data: null, error: { message: 'Multiple rows returned', code: 'PGRST116' } };
            }
            return { data: rows[0], error: null };
        }

        if (this._singleMode === 'single') {
            if (!rows || rows.length === 0) {
                return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
            }
            if (rows.length > 1) {
                return { data: null, error: { message: 'Multiple rows returned', code: 'PGRST116' } };
            }
            return { data: rows[0], error: null };
        }

        return { data: rows, error: null };
    }

    _execSelect() {
        const params = [];
        const whereClause = this._buildWhereClause(params);

        let sql;
        const cols = String(this._select || '*').trim();
        if (cols === 'count') {
            sql = `SELECT COUNT(*) as count FROM ${quoteIdent(this.table)} ${whereClause}`;
        } else {
            sql = `SELECT ${cols} FROM ${quoteIdent(this.table)} ${whereClause}`;
        }

        if (this._order?.column) {
            sql += ` ORDER BY ${quoteIdent(this._order.column)} ${this._order.ascending ? 'ASC' : 'DESC'}`;
        }
        if (Number.isFinite(this._limit) && this._limit > 0) {
            sql += ` LIMIT ${Math.floor(this._limit)}`;
        }

        const stmt = db.prepare(sql);
        const rows = stmt.all(params).map((row) => normalizeRow(this.table, row));
        return this._applySingleMode(rows);
    }

    _execInsert() {
        const rows = Array.isArray(this._insertRows) ? this._insertRows : [];
        if (rows.length === 0) {
            return { data: null, error: { message: 'No rows to insert' } };
        }

        const inserted = [];
        const insertTx = db.transaction(() => {
            for (const raw of rows) {
                const record = preparePayload(this.table, raw || {});

                if (!record.id) {
                    record.id = crypto.randomUUID();
                }

                if (record.created_at === undefined && ['users', 'contacts', 'companies', 'deals', 'tickets', 'projects', 'knowledge_base', 'audits'].includes(this.table)) {
                    record.created_at = nowIso();
                }
                if (record.updated_at === undefined && ['users', 'contacts', 'companies', 'deals', 'tickets', 'projects', 'knowledge_base', 'audits'].includes(this.table)) {
                    record.updated_at = nowIso();
                }
                if (record.created_at === undefined && ['activities', 'calendar_events', 'segments'].includes(this.table)) {
                    record.created_at = nowIso();
                }

                const keys = Object.keys(record);
                const cols = keys.map(quoteIdent).join(',');
                const placeholders = keys.map(() => '?').join(',');
                const values = keys.map((k) => record[k]);

                const stmt = db.prepare(`INSERT INTO ${quoteIdent(this.table)} (${cols}) VALUES (${placeholders})`);
                stmt.run(values);
                inserted.push(record);
            }
        });

        insertTx();

        // Returning behavior
        const wantsReturn = Boolean(this._returning);
        if (!wantsReturn) {
            return { data: null, error: null };
        }

        // Mimic supabase: select('*').single() usually after insert of one record
        if (this._singleMode) {
            const id = inserted[0]?.id;
            if (!id) return { data: null, error: { message: 'Insert failed' } };
            const row = db.prepare(`SELECT * FROM ${quoteIdent(this.table)} WHERE id = ? LIMIT 2`).all([id]).map((r) => normalizeRow(this.table, r));
            return this._applySingleMode(row);
        }

        const ids = inserted.map((r) => r.id).filter(Boolean);
        if (ids.length === 0) {
            return { data: [], error: null };
        }
        const placeholders = ids.map(() => '?').join(',');
        const selected = db
            .prepare(`SELECT * FROM ${quoteIdent(this.table)} WHERE id IN (${placeholders})`)
            .all(ids)
            .map((r) => normalizeRow(this.table, r));
        return { data: selected, error: null };
    }

    _execUpdate() {
        const updates = preparePayload(this.table, this._updateFields || {});
        delete updates.id;

        const keys = Object.keys(updates);
        if (keys.length === 0) {
            return { data: null, error: { message: 'No fields to update' } };
        }

        const params = [];
        const setClause = keys.map((k) => `${quoteIdent(k)} = ?`).join(', ');
        params.push(...keys.map((k) => updates[k]));
        const whereParams = [];
        const whereClause = this._buildWhereClause(whereParams);
        params.push(...whereParams);

        const sql = `UPDATE ${quoteIdent(this.table)} SET ${setClause} ${whereClause}`;
        const info = db.prepare(sql).run(params);

        const wantsReturn = Boolean(this._returning);
        if (!wantsReturn) {
            return { data: null, error: null };
        }

        // If single requested, attempt to re-select with same where and limit 2.
        const selectParams = [];
        const selectWhere = this._buildWhereClause(selectParams);
        let selectSql = `SELECT * FROM ${quoteIdent(this.table)} ${selectWhere}`;
        selectSql += ` LIMIT 2`;
        const rows = db.prepare(selectSql).all(selectParams).map((r) => normalizeRow(this.table, r));

        // If update matched 0 rows, behave like not found.
        if (info.changes === 0 && this._singleMode === 'single') {
            return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
        }

        return this._applySingleMode(rows);
    }

    _execDelete() {
        const params = [];
        const whereClause = this._buildWhereClause(params);
        const sql = `DELETE FROM ${quoteIdent(this.table)} ${whereClause}`;
        db.prepare(sql).run(params);
        return { data: null, error: null };
    }
}

const supabase = {
    from(table) {
        return new QueryBuilder(table);
    },
};

const hasSupabaseCredentials = true;

async function testConnection() {
    try {
        db.prepare('SELECT 1').get();
        // ensure at least one known table exists
        db.prepare('SELECT name FROM sqlite_master WHERE type = ? AND name = ?').get('table', 'contacts');
        console.log('✅ Local SQLite connected successfully');
        return true;
    } catch (err) {
        console.error('❌ Local SQLite connection failed:', err.message);
        return false;
    }
}

async function initializeTables() {
    // Kept for backward compatibility; tables are auto-created via migrate().
    return true;
}

module.exports = { supabase, testConnection, initializeTables, hasSupabaseCredentials, dbPath };
