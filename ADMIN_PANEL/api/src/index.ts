import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const supabaseUrl = 'https://mhgxrzejobmkuwylyelx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZ3hyemVqb2Jta3V3eWx5ZWx4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1ODY0NDksImV4cCI6MjA4MzE2MjQ0OX0.8IDCg303cgOsglyydOPm_-GBQaEJNKBFEZk8NrtSK24';
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.get('/', (req, res) => {
    res.send('<h1>MotionApp Admin API 🚀</h1>');
});

// ─── Dashboard ───
app.get('/api/dashboard/summary', async (req, res) => {
    try {
        const { count: totalUsers } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
        const { count: pendingCorporate } = await supabase.from('corporate_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending');
        const { count: totalVideos } = await supabase.from('videos').select('*', { count: 'exact', head: true });
        const { count: totalComments } = await supabase.from('comments').select('*', { count: 'exact', head: true });
        const { count: totalRadar } = await supabase.from('radars').select('*', { count: 'exact', head: true });
        const { count: totalBanners } = await supabase.from('sponsor_banners').select('*', { count: 'exact', head: true });

        res.json({
            totalUsers: totalUsers || 0,
            pendingCorporate: pendingCorporate || 0,
            totalVideos: totalVideos || 0,
            totalBanners: totalBanners || 0,
            totalComments: totalComments || 0,
            totalRadar: totalRadar || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'İstatistikler alınamadı' });
    }
});

// ─── Kullanıcılar ───
app.get('/api/users', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select(`
                *,
                _count_videos:videos(count),
                _count_likes:likes(count),
                _count_comments:comments(count),
                _count_radars_received:radars!individual_id(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const formatted = data.map((u: any) => ({
            ...u,
            _count: {
                videos: u._count_videos[0]?.count || 0,
                likes: u._count_likes[0]?.count || 0,
                comments: u._count_comments[0]?.count || 0,
            },
            radars_count: u._count_radars_received[0]?.count || 0
        }));

        res.json(formatted);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id/ban', async (req, res) => {
    const { is_banned } = req.body;
    const { data, error } = await supabase.from('profiles').update({ is_banned }).eq('id', req.params.id).select();
    if (error) return res.status(500).json(error);
    res.json(data);
});

app.put('/api/users/:id/type', async (req, res) => {
    const { user_type } = req.body;
    const { data, error } = await supabase.from('profiles').update({ user_type }).eq('id', req.params.id).select();
    if (error) return res.status(500).json(error);
    res.json(data);
});

app.delete('/api/users/:id', async (req, res) => {
    const { error } = await supabase.from('profiles').delete().eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
});

// ─── Kurumsal Başvuru ───
app.get('/api/users/corporate/pending', async (req, res) => {
    const { data, error } = await supabase.from('corporate_applications').select('*, profiles(username, full_name)').eq('status', 'pending');
    if (error) return res.status(500).json(error);
    res.json(data.map(app => ({
        id: app.id,
        user_id: app.user_id,
        username: (app.profiles as any)?.username || 'Bilinmiyor',
        full_name: app.company_name || (app.profiles as any)?.full_name,
        tax_office: app.tax_office,
        tax_number: app.tax_number,
        corporate_status: app.status,
        created_at: app.created_at
    })));
});

app.put('/api/corporate-applications/:id/status', async (req, res) => {
    const { status } = req.body;
    const { data: appl } = await supabase.from('corporate_applications').select('*').eq('id', req.params.id).single();
    if (!appl) return res.status(404).json({ error: 'Başvuru bulunamadı' });

    await supabase.from('corporate_applications').update({
        status,
        reviewed_at: new Date().toISOString()
    }).eq('id', req.params.id);

    if (status === 'approved') {
        await supabase.from('profiles').update({
            user_type: 'corporate',
            tax_office: appl.tax_office,
            tax_number: appl.tax_number
        }).eq('id', appl.user_id);

        await supabase.from('notifications').insert({
            user_id: appl.user_id,
            type: 'system',
            content: 'Kurumsal Deneyime Hoşgeldiniz.'
        });
    } else {
        await supabase.from('notifications').insert({
            user_id: appl.user_id,
            type: 'system',
            content: 'Yapılan incelemelerde hesabınızın kurumsal üyeliğe uygun olmadığı tespit edilmiştir. Karara itiraz için rememberships@spotligts.com'
        });
    }
    res.json({ success: true });
});

// ─── Radar (Corporate -> Individual) ───
app.get('/api/radars', async (req, res) => {
    const { data, error } = await supabase
        .from('radars')
        .select(`
            *,
            corporate:profiles!corporate_id(username, full_name, avatar_url),
            individual:profiles!individual_id(username, full_name, avatar_url)
        `)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json(error);
    res.json(data);
});

app.post('/api/radars', async (req, res) => {
    const { corporate_id, individual_id } = req.body;
    const { data, error } = await supabase.from('radars').insert({ corporate_id, individual_id }).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
});

app.delete('/api/radars/:id', async (req, res) => {
    const { error } = await supabase.from('radars').delete().eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
});

// ─── Videolar ───
app.get('/api/videos', async (req, res) => {
    const { data, error } = await supabase.from('videos').select('*, profiles(username, avatar_url)').order('created_at', { ascending: false });
    if (error) return res.status(500).json(error);
    res.json(data);
});

app.delete('/api/videos/:id', async (req, res) => {
    const { error } = await supabase.from('videos').delete().eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
});

// ─── Banner ───
app.get('/api/banners', async (req, res) => {
    const { data, error } = await supabase.from('sponsor_banners').select('*').order('slider_pos', { ascending: true });
    if (error) return res.status(500).json(error);
    res.json(data);
});

app.post('/api/banners', async (req, res) => {
    const { data, error } = await supabase.from('sponsor_banners').insert(req.body).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
});

app.put('/api/banners/:id', async (req, res) => {
    const { data, error } = await supabase.from('sponsor_banners').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
});

app.delete('/api/banners/:id', async (req, res) => {
    const { error } = await supabase.from('sponsor_banners').delete().eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
});

app.post('/api/banners/:id/view', async (req, res) => {
    const { data: b } = await supabase.from('sponsor_banners').select('views').eq('id', req.params.id).single();
    if (b) await supabase.from('sponsor_banners').update({ views: (b.views || 0) + 1 }).eq('id', req.params.id);
    res.json({ success: true });
});

app.post('/api/banners/:id/click', async (req, res) => {
    const { data: b } = await supabase.from('sponsor_banners').select('clicks').eq('id', req.params.id).single();
    if (b) await supabase.from('sponsor_banners').update({ clicks: (b.clicks || 0) + 1 }).eq('id', req.params.id);
    res.json({ success: true });
});

// ─── Yorumlar ───
app.get('/api/comments', async (req, res) => {
    const { data, error } = await supabase.from('comments').select('*, user:profiles(username, avatar_url)').order('created_at', { ascending: false });
    if (error) return res.status(500).json(error);
    res.json(data);
});

app.delete('/api/comments/:id', async (req, res) => {
    const { error } = await supabase.from('comments').delete().eq('id', req.params.id);
    if (error) return res.status(500).json(error);
    res.json({ success: true });
});

// ─── Raporlar ───
app.get('/api/reports', async (req, res) => {
    const { data, error } = await supabase.from('reports').select('*, reporter:profiles!reporter_id(username, avatar_url)').order('created_at', { ascending: false });
    if (error) return res.status(500).json(error);
    const enriched = await Promise.all(data.map(async (r) => {
        let target = null;
        if (r.target_type === 'account') {
            const { data } = await supabase.from('profiles').select('username, full_name').eq('id', r.target_id).single();
            target = data;
        } else {
            const { data } = await supabase.from('videos').select('description, thumbnail_url').eq('id', r.target_id).single();
            target = data;
        }
        return { ...r, targetData: target };
    }));
    res.json(enriched);
});

app.put('/api/reports/:id/status', async (req, res) => {
    const { data, error } = await supabase.from('reports').update({ status: req.body.status }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json(error);
    res.json(data);
});

// ─── Bildirimler ───
app.post('/api/notifications/send-global', async (req, res) => {
    const { title, content } = req.body;
    const { data: users } = await supabase.from('profiles').select('id');
    if (users) {
        const batch = users.map(u => ({ user_id: u.id, type: 'system', content: `${title}: ${content}` }));
        await supabase.from('notifications').insert(batch);
    }
    res.json({ success: true });
});

// ─── Ayarlar ───
app.get('/api/config', async (req, res) => {
    const { data } = await supabase.from('system_config').select('*');
    const cfg: any = {};
    data?.forEach(i => cfg[i.key] = i.value);
    res.json(cfg);
});

app.put('/api/config/:key', async (req, res) => {
    await supabase.from('system_config').update({ value: req.body.value, updated_at: new Date().toISOString() }).eq('key', req.params.key);
    res.json({ success: true });
});

// ─── Radar UI (Legacy Spotlight) ───
app.get('/api/radar', async (req, res) => {
    const { data } = await supabase.from('radar').select('*').order('created_at', { ascending: false });
    res.json(data || []);
});
app.post('/api/radar', async (req, res) => {
    const { data } = await supabase.from('radar').insert(req.body).select().single();
    res.json(data);
});
app.delete('/api/radar/:id', async (req, res) => {
    await supabase.from('radar').delete().eq('id', req.params.id);
    res.json({ success: true });
});

app.listen(PORT, () => console.log(`MotionApp API on ${PORT}`));
