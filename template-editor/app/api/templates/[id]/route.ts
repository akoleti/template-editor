import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

// Get a single template with its elements
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await pool.query(
      `SELECT t.*, json_agg(te.*) as elements
       FROM templates t
       LEFT JOIN template_elements te ON t.id = te.template_id
       WHERE t.id = $1
       GROUP BY t.id`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const client = await pool.connect();
  
  try {
    const { name, isPublic, elements } = await request.json();

    await client.query('BEGIN');

    // Update template
    await client.query(
      `UPDATE templates 
       SET name = $1, 
           is_public = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $3`,
      [name, isPublic, params.id]
    );

    // Delete existing elements
    await client.query(
      'DELETE FROM template_elements WHERE template_id = $1',
      [params.id]
    );

    // Insert updated elements
    for (const element of elements) {
      await client.query(
        `INSERT INTO template_elements (
          template_id, 
          element_type, 
          content, 
          position_x, 
          position_y, 
          width, 
          height, 
          row_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          params.id,
          element.type,
          JSON.stringify(element.content),
          element.position?.x || 0,
          element.position?.y || 0,
          element.size?.width || 200,
          element.size?.height || 100,
          element.rowOrder || 0
        ]
      );
    }

    await client.query('COMMIT');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    await client.query('ROLLBACK');
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Template elements will be automatically deleted due to CASCADE
    await pool.query(
      'DELETE FROM templates WHERE id = $1',
      [params.id]
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}