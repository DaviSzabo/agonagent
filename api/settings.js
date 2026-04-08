import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .limit(1)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // Ignore not found
      
      return res.status(200).json(data || { yearly_goal: 12 });
    }
    if (req.method === 'PUT') {
      const { yearly_goal } = req.body;
      
      // Try to get first
      const { data: existing } = await supabase.from('settings').select('id').limit(1).single();
      
      if (existing) {
        const { data, error } = await supabase
          .from('settings')
          .update({ yearly_goal })
          .eq('id', existing.id)
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      } else {
        const { data, error } = await supabase
          .from('settings')
          .insert({ yearly_goal })
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json(data);
      }
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
