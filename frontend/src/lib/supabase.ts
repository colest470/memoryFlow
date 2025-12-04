import { createClient } from '@supabase/supabase-js';
import type { Database } from './types/database';

let supabaseUrl = "https://google.com";
let supabaseAnonKey= "https://google.com";

// if (!supabaseUrl || !supabaseAnonKey) {
//   throw new Error('Missing Supabase environment variables');
// }

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
