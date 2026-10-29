const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

class Database {
    constructor() {
        if (!Database.instance) {
            const dbConfig = {
                host: process.env.DB_HOST,
                user: process.env.DB_USER,
                password: process.env.DB_PASS,
                database: process.env.DB_NAME,
                port: 3306,
                waitForConnections: true,
                connectionLimit: 10,
                queueLimit: 0,
                connectTimeout: 10000,
                enableKeepAlive: true,
                keepAliveInitialDelay: 10000,
                maxIdle: 10,
                idleTimeout: 60000
            };
            this.pool = mysql.createPool(dbConfig);
            Database.instance = this;
        }
        return Database.instance;
    }

    getPool() {
        return this.pool;
    }
}

const instance = new Database();
module.exports = instance.getPool();


