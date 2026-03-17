import { NextResponse } from "next/server"
import { createSQLClient } from "@/lib/db"
import bcrypt from "bcryptjs"

export async function POST() {
  try {
    const sql = createSQLClient()
    
    // Hash the password properly at runtime
    const password = "Admin123!"
    const hashedPassword = await bcrypt.hash(password, 10)
    
    console.log("[v0] Generated hash for Admin123!:", hashedPassword)
    
    // Delete existing test admins
    await sql`
      DELETE FROM users WHERE email IN ('superadmin@privateex.com', 'junior@privateex.com', 'associate@privateex.com', 'admin@privateex.com')
    `
    
    // Insert new admins with properly hashed password
    await sql`
      INSERT INTO users (name, email, password, role)
      VALUES ('Super Admin', 'superadmin@privateex.com', ${hashedPassword}, 'Senior Consultant')
    `
    
    await sql`
      INSERT INTO users (name, email, password, role)
      VALUES ('Junior Admin', 'junior@privateex.com', ${hashedPassword}, 'Junior Consultant')
    `
    
    await sql`
      INSERT INTO users (name, email, password, role)
      VALUES ('Associate Admin', 'associate@privateex.com', ${hashedPassword}, 'Associate')
    `
    
    return NextResponse.json({
      success: true,
      message: "Admin users seeded successfully",
      credentials: {
        email: ["superadmin@privateex.com", "junior@privateex.com", "associate@privateex.com"],
        password: "Admin123!"
      }
    })
  } catch (error) {
    console.error("[v0] Seed error:", error)
    return NextResponse.json({ error: "Failed to seed admin users" }, { status: 500 })
  }
}
