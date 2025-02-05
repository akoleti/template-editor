// lib/db.ts
const fetchWithAuth = async (query: string, values: any[] = []) => {
    const response = await fetch(process.env.NEON_API_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEON_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        params: values,
      }),
    });
  
    if (!response.ok) {
      throw new Error(`Database error: ${response.statusText}`);
    }
  
    return response.json();
  };
  
  export const db = {
    query: fetchWithAuth,
  };