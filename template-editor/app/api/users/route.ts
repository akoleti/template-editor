import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Get users
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    let query = sql`SELECT id, email, name, created_at FROM users`;
    
    if (email) {
      query = sql`${query} WHERE email = ${email}`;
    }
    
    const result = await query;
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Create a new user
export async function POST(request: NextRequest) {
  try {
    const { email, name } = await request.json();

    const result = await sql`
      INSERT INTO users (email, name)
      VALUES (${email}, ${name})
      RETURNING id, email, name, created_at
    `;

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    // Handle unique email constraint violation
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}