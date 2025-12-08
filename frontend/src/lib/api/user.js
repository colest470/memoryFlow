import { useAuth } from "../../contexts/AuthContext";

export const loadData = async () => {
try {
    
} catch (error) {
    
}
}

// try {
//     const projectsData = await getProjects();
//     setProjects(projectsData || []);

//     const { count: entriesCount } = await supabase
//     .from('memory_entries')
//     .select('*', { count: 'exact', head: true });

//     const { count: lessonsCount } = await supabase
//     .from('memory_entries')
//     .select('*', { count: 'exact', head: true })
//     .eq('status', 'lesson_learned');

//     const { data: contributorsData } = await supabase
//     .from('profiles')
//     .select('id');

//     setStats({
//     totalEntries: entriesCount || 0,
//     activeProjects: projectsData?.filter(p => p.status === 'active').length || 0,
//     contributors: contributorsData?.length || 0,
//     lessonLearned: lessonsCount || 0,
//     });
// } catch (error) {
//     console.error('Error loading data:', error);
// } finally {
//     setLoading(false);
// }