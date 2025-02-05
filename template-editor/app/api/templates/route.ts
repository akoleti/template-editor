import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const isPublic = searchParams.get('isPublic');
    
    let queryText = 'SELECT * FROM templates WHERE 1=1';
    const queryParams: any[] = [];
    
    if (userId) {
      queryParams.push(userId);
      queryText += ` AND user_id = $1`;
    }
    
    if (isPublic === 'true') {
      queryText += ' OR is_public = true';
    }
    
    const result = await db.query(queryText, queryParams);
    return NextResponse.json(result.rows);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, isPublic, elements, userId } = await request.json();

    // Create template
    const templateQuery = `
      INSERT INTO templates (name, is_public, user_id)
      VALUES ($1, $2, $3)
      RETURNING id
    `;
    const templateResult = await db.query(templateQuery, [name, isPublic, userId]);
    const templateId = templateResult.rows[0].id;
    
    // Insert elements
    for (const element of elements) {
      const elementQuery = `
        INSERT INTO template_elements (
          template_id, 
          element_type, 
          content, 
          position_x, 
          position_y, 
          width, 
          height, 
          row_order
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      await db.query(elementQuery, [
        templateId,
        element.type,
        JSON.stringify(element.content),
        element.position?.x || 0,
        element.position?.y || 0,
        element.size?.width || 200,
        element.size?.height || 100,
        element.rowOrder || 0
      ]);
    }

    return NextResponse.json({ id: templateId });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}