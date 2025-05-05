import sqlite3
from flask import g, current_app
import os

def get_db():
    """Connect to the application's configured database."""
    if 'db' not in g:
        # Ensure the directory for the database exists
        os.makedirs(os.path.dirname(os.path.abspath(current_app.config['DATABASE'])), exist_ok=True)
        
        g.db = sqlite3.connect(
            current_app.config['DATABASE'],
            detect_types=sqlite3.PARSE_DECLTYPES
        )
        g.db.row_factory = sqlite3.Row
    
    return g.db

def close_db(e=None):
    """Close the database connection."""
    db = g.pop('db', None)
    
    if db is not None:
        db.close()

def init_db():
    """Initialize the database with required tables."""
    db = get_db()
    
    with current_app.open_resource('schema.sql', mode='r') as f:
        db.executescript(f.read())

def init_app(app):
    """Register database functions with the Flask app."""
    app.teardown_appcontext(close_db)

# Create schema.sql file
def create_schema_file():
    schema = """
    -- Contacts table
    CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        company TEXT,
        position TEXT,
        custom_fields TEXT,
        created_at TEXT NOT NULL
    );

    -- Email templates table
    CREATE TABLE IF NOT EXISTS email_templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL
    );

    -- Campaigns table
    CREATE TABLE IF NOT EXISTS campaigns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        template_id INTEGER NOT NULL,
        contact_ids TEXT NOT NULL,
        status TEXT NOT NULL,
        send_time TEXT,
        stats TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (template_id) REFERENCES email_templates (id)
    );

    -- Campaign results table
    CREATE TABLE IF NOT EXISTS campaign_results (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        campaign_id INTEGER NOT NULL,
        contact_id INTEGER NOT NULL,
        tracking_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL,
        sent_at TEXT NOT NULL,
        opened_at TEXT,
        clicked_at TEXT,
        error TEXT,
        FOREIGN KEY (campaign_id) REFERENCES campaigns (id),
        FOREIGN KEY (contact_id) REFERENCES contacts (id)
    );

    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    """
    
    # Write schema to file
    with open('schema.sql', 'w') as f:
        f.write(schema)

# Create schema file when this module is imported
create_schema_file()
