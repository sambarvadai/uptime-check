
require('dotenv').config();
const { Pool } = require('pg');

const dbConfig = {
  connectionString: process.env.DATABASE_URL,
};

const setupDatabase = async () => {
  // Connect to the default 'postgres' database to create the new database
  // The connection string is parsed to extract user, host, port, password
  const pgPool = new Pool({
    ...dbConfig,
    database: 'postgres',
  });

  const dbName = 'uptime_check';
  const client = await pgPool.connect();

  try {
    // Check if the database exists
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (res.rowCount === 0) {
      console.log(`Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Database ${dbName} created.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
  } catch (err) {
    console.error('Error creating database:', err);
    // Don't exit if the database already exists
    if (err.code !== '42P04') { // 42P04 is duplicate_database
      process.exit(1);
    }
  } finally {
    client.release();
    await pgPool.end();
  }

  // Now connect to the newly created database to create tables
  const appPool = new Pool({
    ...dbConfig,
    database: dbName,
  });

  const appClient = await appPool.connect();
  try {
    console.log('Creating tables...');

    await appClient.query(`
      CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table "users" created or already exists.');

    await appClient.query(`
      CREATE TABLE IF NOT EXISTS monitors (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          url VARCHAR(2048) NOT NULL,
          name VARCHAR(255),
          method VARCHAR(10) DEFAULT 'GET',
          headers JSONB DEFAULT '{}',
          body TEXT,
          interval INTEGER NOT NULL,
          status_codes INTEGER[] DEFAULT '{200}',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Migrate existing databases that don't have the new columns yet
    await appClient.query(`ALTER TABLE monitors ADD COLUMN IF NOT EXISTS method VARCHAR(10) DEFAULT 'GET'`);
    await appClient.query(`ALTER TABLE monitors ADD COLUMN IF NOT EXISTS headers JSONB DEFAULT '{}'`);
    await appClient.query(`ALTER TABLE monitors ADD COLUMN IF NOT EXISTS body TEXT`);
    console.log('Table "monitors" created or already exists.');

    await appClient.query(`
      CREATE TABLE IF NOT EXISTS monitor_checks (
          id SERIAL PRIMARY KEY,
          monitor_id INTEGER NOT NULL REFERENCES monitors(id) ON DELETE CASCADE,
          up_status BOOLEAN NOT NULL,
          status_code INTEGER,
          response_time INTEGER,
          error TEXT,
          checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Table "monitor_checks" created or already exists.');

    console.log('Database setup complete.');
  } catch (err) {
    console.error('Error creating tables:', err);
    process.exit(1);
  } finally {
    appClient.release();
    await appPool.end();
  }
};

setupDatabase();
