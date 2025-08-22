import { neon } from "@neondatabase/serverless";

// Ensure .env has a valid DATABASE_URL (with sslmode=require for Neon)
const sql = neon(process.env.DATABASE_URL);

export default sql;
