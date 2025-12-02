import { supabase } from '../supabase';
// import type { Database } from '../types/database';

// type Project = Database['public']['Tables']['projects']['Row'];
// type ProjectInsert = Database['public']['Tables']['projects']['Insert'];

export async function createProject(project) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...project,
      owner_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(full_name, department)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function getProject(id) {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      owner:profiles!projects_owner_id_fkey(full_name, department)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateProject(id, updates) {
  const { data, error } = await supabase
    .from('projects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
