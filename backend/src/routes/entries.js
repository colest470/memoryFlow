import { supabase } from '../supabase';
// import type { Database } from '../types/database';

// type MemoryEntry = Database['public']['Tables']['memory_entries']['Row'];
// type MemoryEntryInsert = Database['public']['Tables']['memory_entries']['Insert'];
// type TimelineLink = Database['public']['Tables']['timeline_links']['Insert'];

// export interface MemoryEntryWithAuthor extends MemoryEntry {
//   author: {
//     full_name: string;
//     department: string | null;
//   };
//   children?: MemoryEntryWithAuthor[];
// }

export async function createMemoryEntry(
  entry,
  parentEntryId
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('memory_entries')
    .insert({
      ...entry,
      author_id: user.id,
    })
    .select()
    .single();

  if (error) throw error;

  if (parentEntryId && data) {
    await createTimelineLink({
      parent_entry_id: parentEntryId,
      child_entry_id: data.id,
      link_type: 'followed_from',
    });
  }

  return data;
}

export async function createTimelineLink(link) {
  const { data, error } = await supabase
    .from('timeline_links')
    .insert(link)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getProjectTimeline(projectId) {
  const { data: entries, error } = await supabase
    .from('memory_entries')
    .select(`
      *,
      author:profiles!memory_entries_author_id_fkey(full_name, department)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const { data: links, error: linksError } = await supabase
    .from('timeline_links')
    .select('*')
    .in('parent_entry_id', entries.map(e => e.id));

  if (linksError) throw linksError;

  const entriesMap = new Map(entries.map(e => [e.id, { ...e, children }]));

  links?.forEach(link => {
    const parent = entriesMap.get(link.parent_entry_id);
    const child = entriesMap.get(link.child_entry_id);
    if (parent && child) {
      parent.children.push(child);
    }
  });

  return Array.from(entriesMap.values());
}

export async function searchMemoryEntries(query, filters ) {
  let dbQuery = supabase
    .from('memory_entries')
    .select(`
      *,
      author:profiles!memory_entries_author_id_fkey(full_name, department),
      project:projects(title)
    `);

  if (filters?.entry_type) {
    dbQuery = dbQuery.eq('entry_type', filters.entry_type);
  }
  if (filters?.status) {
    dbQuery = dbQuery.eq('status', filters.status);
  }
  if (filters?.department) {
    dbQuery = dbQuery.eq('department', filters.department);
  }
  if (filters?.project_id) {
    dbQuery = dbQuery.eq('project_id', filters.project_id);
  }

  if (query) {
    dbQuery = dbQuery.or(`title.ilike.%${query}%,content.ilike.%${query}%`);
  }

  dbQuery = dbQuery.order('created_at', { ascending: false });

  const { data, error } = await dbQuery;

  if (error) throw error;
  return data;
}

export async function updateMemoryEntry(id, updates) {
  const { data, error } = await supabase
    .from('memory_entries')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMemoryEntry(id) {
  const { data, error } = await supabase
    .from('memory_entries')
    .select(`
      *,
      author:profiles!memory_entries_author_id_fkey(full_name, department),
      project:projects(title, id)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
