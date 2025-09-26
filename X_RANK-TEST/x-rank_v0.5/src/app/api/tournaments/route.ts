// src/app/api/tournaments/route.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL ou Service Role Key manquante ! Vérifie tes variables d’environnement.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, location, date, max_combos, created_by } = body;

    if (!name || !date) {
      return new Response(JSON.stringify({ error: 'Le nom et la date sont obligatoires' }), { status: 400 });
    }

    const { data, error } = await supabase
      .from('tournaments')
      .insert([
        {
          name,
          location,
          date,
          max_combos: max_combos || 3,
          created_by
        }
      ])
      .select();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    return new Response(JSON.stringify({ tournament: data[0] }), { status: 200 });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Erreur inconnue';
    return new Response(JSON.stringify({ error: errorMessage }), { status: 500 });
  }
}
