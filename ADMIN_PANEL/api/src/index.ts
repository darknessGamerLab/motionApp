import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Supabase Client (yalnızca barındırılan proje; service_role .env’de) ─
const supabaseUrl =
    process.env.SUPABASE_URL?.trim() || 'https://mhgxrzejobmkuwylyelx.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY?.trim();
if (!supabaseKey) {
    console.error(
        'ADMIN_PANEL/api: .env içinde SUPABASE_SERVICE_KEY (service_role) zorunlu. Örnek: .env.example'
    );
    process.exit(1);
}
const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Middleware ──────────────────────────────────────────────────────
app.use(cors({
    // Allow local admin panel origins only
    origin: (origin, callback) => {
        const allowed = [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://127.0.0.1:5173',
            undefined, // same-origin / curl
        ];
        if (!origin || allowed.includes(origin)) callback(null, true);
        else callback(new Error('CORS: origin not allowed'));
    },
    credentials: true,
}));
app.use(express.json());

// ─── Admin Auth Middleware ───────────────────────────────────────────
// All /api/* routes require X-Admin-Key header (asla repoda sabit şifre bırakma)
const ADMIN_KEY = process.env.ADMIN_API_KEY?.trim();
if (!ADMIN_KEY) {
    console.error('ADMIN_PANEL/api: .env içinde ADMIN_API_KEY zorunlu. Örnek: .env.example');
    process.exit(1);
}

app.use('/api', (req, res, next) => {
    const key = req.headers['x-admin-key'];
    if (!key || key !== ADMIN_KEY) {
        res.status(401).json({ error: 'Unauthorized — missing or invalid X-Admin-Key header' });
        return;
    }
    next();
});

// Request Logger (development only)
if (process.env.NODE_ENV !== 'production') {
    app.use((req, _res, next) => {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
        next();
    });
}

// Health Check — exempt from auth
app.get('/', (_req, res) => {
    res.json({ name: 'MotionApp Admin API', version: '5.0.1', status: 'ok' });
});

// ═══════════════════════════════════════════════════════════════════
// DASHBOARD & ANALYTICS
// ═══════════════════════════════════════════════════════════════════

/**
 * GET /api/dashboard/summary
 * Platform-wide counters for dashboard cards
 */
app.get('/api/dashboard/summary', async (_req, res) => {
    try {
        const [
            { count: users },
            { count: pending },
            { count: videos },
            { count: comments },
            { count: likes },
            { count: radars },
            { count: reports },
            { count: saves },
            { count: follows },
            { count: notifications },
        ] = await Promise.all([
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('corporate_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
            supabase.from('videos').select('*', { count: 'exact', head: true }),
            supabase.from('comments').select('*', { count: 'exact', head: true }),
            supabase.from('likes').select('*', { count: 'exact', head: true }),
            supabase.from('radars').select('*', { count: 'exact', head: true }),
            supabase.from('reports').select('*', { count: 'exact', head: true }),
            supabase.from('saves').select('*', { count: 'exact', head: true }),
            supabase.from('follows').select('*', { count: 'exact', head: true }),
            supabase.from('notifications').select('*', { count: 'exact', head: true }),
        ]);

        res.json({
            users: users || 0, pending: pending || 0, videos: videos || 0,
            comments: comments || 0, likes: likes || 0, radars: radars || 0,
            reports: reports || 0, saves: saves || 0, follows: follows || 0,
            notifications: notifications || 0,
            health: 99.9,
        });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
});

/**
 * GET /api/analytics/retention
 * DAU from daily_active_users view (if exists)
 */
app.get('/api/analytics/retention', async (_req, res) => {
    const { data, error } = await supabase
        .from('daily_active_users')
        .select('*')
        .order('day', { ascending: true })
        .limit(60);
    if (error) return res.json([]); // graceful fallback
    res.json(data || []);
});

/**
 * GET /api/analytics/feed
 * Latest events across the platform (realtime activity feed)
 */
app.get('/api/analytics/feed', async (_req, res) => {
    const [likes, comments, videos, follows] = await Promise.all([
        supabase.from('likes').select('*, profiles(username, avatar_url)').order('created_at', { ascending: false }).limit(7),
        supabase.from('comments').select('*, profiles(username, avatar_url)').order('created_at', { ascending: false }).limit(7),
        supabase.from('videos').select('*, profiles(username, avatar_url)').order('created_at', { ascending: false }).limit(5),
        supabase.from('follows').select('*, follower:profiles!follower_id(username), following:profiles!following_id(username)').order('created_at', { ascending: false }).limit(5),
    ]);
    const all = [
        ...(likes.data?.map(i => ({ ...i, type: 'like' })) || []),
        ...(comments.data?.map(i => ({ ...i, type: 'comment' })) || []),
        ...(videos.data?.map(i => ({ ...i, type: 'video' })) || []),
        ...(follows.data?.map(i => ({ ...i, type: 'follow' })) || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 15);
    res.json(all);
});

/**
 * GET /api/analytics/growth
 * Day-by-day new user registrations
 */
app.get('/api/analytics/growth', async (_req, res) => {
    const { data } = await supabase.from('profiles').select('created_at').order('created_at', { ascending: true });
    const growth: Record<string, number> = {};
    data?.forEach(u => {
        const date = new Date(u.created_at).toISOString().split('T')[0];
        growth[date] = (growth[date] || 0) + 1;
    });
    res.json(Object.keys(growth).sort().map(date => ({ date, count: growth[date] })));
});

/**
 * GET /api/analytics/content
 * Aggregate content metrics
 */
app.get('/api/analytics/content', async (_req, res) => {
    const { data } = await supabase.from('videos').select('likes_count, comments_count, views_count');
    res.json({
        likes: data?.reduce((a, c) => a + (c.likes_count || 0), 0) || 0,
        comments: data?.reduce((a, c) => a + (c.comments_count || 0), 0) || 0,
        views: data?.reduce((a, c) => a + (c.views_count || 0), 0) || 0,
    });
});

/**
 * GET /api/analytics/top-videos
 * Top 10 videos by engagement
 */
app.get('/api/analytics/top-videos', async (_req, res) => {
    const { data } = await supabase
        .from('videos')
        .select('*, profiles(username, avatar_url)')
        .order('likes_count', { ascending: false })
        .limit(10);
    res.json(data || []);
});

/**
 * GET /api/analytics/top-users
 * Top 10 users by video count + engagement
 */
app.get('/api/analytics/top-users', async (_req, res) => {
    const { data } = await supabase
        .from('profiles')
        .select(`
      *,
      videos:videos!videos_user_id_fkey(count),
      likes:likes!likes_user_id_fkey(count),
      comments:comments!comments_user_id_fkey(count)
    `)
        .eq('is_banned', false)
        .order('created_at', { ascending: false })
        .limit(20);

    const formatted = (data || []).map((u: any) => ({
        ...u,
        metrics: {
            videos: u.videos?.[0]?.count || 0,
            likes: u.likes?.[0]?.count || 0,
            comments: u.comments?.[0]?.count || 0,
        }
    })).sort((a, b) => b.metrics.videos - a.metrics.videos).slice(0, 10);

    res.json(formatted);
});

// ═══════════════════════════════════════════════════════════════════
// USERS (profiles)
// ═══════════════════════════════════════════════════════════════════

app.get('/api/users', async (req, res) => {
    const { search, type, status, limit = '200', offset = '0' } = req.query as any;

    let q = supabase
        .from('profiles')
        .select(`
      *,
      videos:videos!videos_user_id_fkey(count),
      likes:likes!likes_user_id_fkey(count),
      comments:comments!comments_user_id_fkey(count),
      saves:saves!saves_user_id_fkey(count),
      radars_received:radars!individual_id(count),
      radars_sent:radars!corporate_id(count)
    `)
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (type && type !== 'all') q = q.eq('user_type', type);
    if (status === 'banned') q = q.eq('is_banned', true);
    if (status === 'active') q = q.eq('is_banned', false);
    if (search) q = q.or(`username.ilike.%${search}%,full_name.ilike.%${search}%`);

    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });

    res.json((data || []).map((u: any) => ({
        ...u,
        metrics: {
            videos: u.videos?.[0]?.count || 0,
            likes: u.likes?.[0]?.count || 0,
            comments: u.comments?.[0]?.count || 0,
            saves: u.saves?.[0]?.count || 0,
            radar_in: u.radars_received?.[0]?.count || 0,
            radar_out: u.radars_sent?.[0]?.count || 0,
        }
    })));
});

app.get('/api/users/:id', async (req, res) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'User not found' });
    res.json(data);
});

app.put('/api/users/:id', async (req, res) => {
    const { data, error } = await supabase.from('profiles').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.put('/api/users/:id/ban', async (req, res) => {
    const { is_banned } = req.body;
    const { data, error } = await supabase.from('profiles').update({ is_banned }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.put('/api/users/:id/type', async (req, res) => {
    const { user_type } = req.body;
    const { data, error } = await supabase.from('profiles').update({ user_type }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/users/:id', async (req, res) => {
    const { error } = await supabase.from('profiles').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// CORPORATE APPLICATIONS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/corporate-applications', async (_req, res) => {
    const { data, error } = await supabase
        .from('corporate_applications')
        .select('*, profiles(username, full_name, avatar_url, email)')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.get('/api/users/corporate/pending', async (_req, res) => {
    const { data, error } = await supabase
        .from('corporate_applications')
        .select('*, profiles(username, full_name, avatar_url)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data?.map((app: any) => ({
        id: app.id,
        user_id: app.user_id,
        username: app.profiles?.username || 'Unknown',
        full_name: app.company_name || app.profiles?.full_name,
        avatar_url: app.profiles?.avatar_url,
        tax_office: app.tax_office,
        tax_number: app.tax_number,
        phone: app.phone,
        corporate_status: app.status,
        created_at: app.created_at,
    })) || []);
});

app.put('/api/corporate-applications/:id/status', async (req, res) => {
    const { status } = req.body;
    const { data: appl } = await supabase.from('corporate_applications').select('*').eq('id', req.params.id).single();
    if (!appl) return res.status(404).json({ error: 'Application not found' });

    await supabase.from('corporate_applications').update({
        status, reviewed_at: new Date().toISOString()
    }).eq('id', req.params.id);

    if (status === 'approved') {
        await supabase.from('profiles').update({
            user_type: 'corporate',
            tax_office: appl.tax_office,
            tax_number: appl.tax_number,
        }).eq('id', appl.user_id);

        await supabase.from('notifications').insert({
            user_id: appl.user_id,
            type: 'system',
            from_user_id: appl.user_id,
            message: 'Kurumsal başvurunuz onaylanmıştır. Kurumsal deneyime hoş geldiniz!'
        });
    } else if (status === 'rejected') {
        await supabase.from('notifications').insert({
            user_id: appl.user_id,
            type: 'system',
            from_user_id: appl.user_id,
            message: 'Kurumsal başvurunuz değerlendirme sonucunda reddedildi. İtiraz için: memberships@motionapp.com'
        });
    }

    res.json({ success: true, status });
});

// ═══════════════════════════════════════════════════════════════════
// VIDEOS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/videos', async (req, res) => {
    const { limit = '100', offset = '0', sort = 'created_at' } = req.query as any;
    const { data, error } = await supabase
        .from('videos')
        .select('*, profiles(username, full_name, avatar_url)')
        .order(sort, { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.get('/api/videos/:id', async (req, res) => {
    const { data, error } = await supabase.from('videos').select('*, profiles(username, avatar_url)').eq('id', req.params.id).single();
    if (error) return res.status(404).json({ error: 'Video not found' });
    res.json(data);
});

app.delete('/api/videos/:id', async (req, res) => {
    const { error } = await supabase.from('videos').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

app.put('/api/videos/:id', async (req, res) => {
    const { data, error } = await supabase.from('videos').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// ═══════════════════════════════════════════════════════════════════
// SPONSOR BANNERS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/banners', async (_req, res) => {
    const { data, error } = await supabase
        .from('sponsor_banners')
        .select('*')
        .order('slider_pos', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.post('/api/banners', async (req, res) => {
    const { data, error } = await supabase.from('sponsor_banners').insert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.put('/api/banners/:id', async (req, res) => {
    const { data, error } = await supabase.from('sponsor_banners').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/banners/:id', async (req, res) => {
    const { error } = await supabase.from('sponsor_banners').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// Banner event tracking (atomic increment via RPC if available, else read-modify-write)
const incrementField = async (table: string, id: string, field: string) => {
    const { data } = await supabase.from(table).select(field).eq('id', id).single();
    if (data) {
        await supabase.from(table).update({ [field]: ((data as any)[field] || 0) + 1 }).eq('id', id);
    }
};

app.post('/api/banners/:id/view', async (req, res) => {
    await incrementField('sponsor_banners', req.params.id, 'views');
    res.json({ success: true });
});
app.post('/api/banners/:id/idx-view', async (req, res) => {
    await incrementField('sponsor_banners', req.params.id, 'index_views');
    res.json({ success: true });
});
app.post('/api/banners/:id/click', async (req, res) => {
    await incrementField('sponsor_banners', req.params.id, 'clicks');
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// COMMENTS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/comments', async (req, res) => {
    const { limit = '100', offset = '0' } = req.query as any;
    const { data, error } = await supabase
        .from('comments')
        .select('*, user:profiles(username, avatar_url), video:videos(description, thumbnail_url)')
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.delete('/api/comments/:id', async (req, res) => {
    const { error } = await supabase.from('comments').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/reports', async (_req, res) => {
    const { data, error } = await supabase
        .from('reports')
        .select('*, reporter:profiles!reporter_id(username, avatar_url)')
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    // Enrich with target data
    const enriched = await Promise.all((data || []).map(async (r) => {
        let target = null;
        try {
            if (r.target_type === 'account') {
                const { data: t } = await supabase.from('profiles').select('username, full_name, avatar_url').eq('id', r.target_id).single();
                target = t;
            } else {
                const { data: t } = await supabase.from('videos').select('description, thumbnail_url').eq('id', r.target_id).single();
                target = t;
            }
        } catch (e) { }
        return { ...r, targetData: target };
    }));

    res.json(enriched);
});

app.put('/api/reports/:id/status', async (req, res) => {
    const { data, error } = await supabase
        .from('reports')
        .update({ status: req.body.status })
        .eq('id', req.params.id)
        .select()
        .single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/reports/:id', async (req, res) => {
    const { error } = await supabase.from('reports').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// RADARS (B2B Connections)
// ═══════════════════════════════════════════════════════════════════

app.get('/api/radars', async (_req, res) => {
    const { data, error } = await supabase
        .from('radars')
        .select(`
      *,
      corporate:profiles!corporate_id(username, full_name, avatar_url),
      individual:profiles!individual_id(username, full_name, avatar_url)
    `)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.post('/api/radars', async (req, res) => {
    const { corporate_id, individual_id } = req.body;
    const { data, error } = await supabase.from('radars').insert({ corporate_id, individual_id }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/radars/:id', async (req, res) => {
    const { error } = await supabase.from('radars').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/notifications', async (req, res) => {
    const { limit = '100', user_id } = req.query as any;
    let q = supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(parseInt(limit));
    if (user_id) q = q.eq('user_id', user_id);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.post('/api/notifications/send-global', async (req, res) => {
    const { title, content, type = 'system' } = req.body;
    const { data: users } = await supabase.from('profiles').select('id');
    if (users?.length) {
        const batch = users.map(u => ({ user_id: u.id, type, from_user_id: u.id, message: title ? `${title}: ${content}` : content }));
        // Insert in chunks of 500
        for (let i = 0; i < batch.length; i += 500) {
            await supabase.from('notifications').insert(batch.slice(i, i + 500));
        }
    }
    res.json({ success: true, sent: users?.length || 0 });
});

app.post('/api/notifications/send-user', async (req, res) => {
    const { user_id, content, type = 'system' } = req.body;
    const { data, error } = await supabase.from('notifications').insert({ user_id, type, from_user_id: user_id, message: content }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// ═══════════════════════════════════════════════════════════════════
// TALENTS
// ═══════════════════════════════════════════════════════════════════

app.get('/api/talents', async (_req, res) => {
    const { data } = await supabase.from('talents').select('*').order('name');
    res.json(data || []);
});

app.post('/api/talents', async (req, res) => {
    const { data, error } = await supabase.from('talents').insert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.put('/api/talents/:id', async (req, res) => {
    const { data, error } = await supabase.from('talents').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/talents/:id', async (req, res) => {
    const { error } = await supabase.from('talents').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// CATEGORIES
// ═══════════════════════════════════════════════════════════════════

app.get('/api/categories', async (_req, res) => {
    const { data } = await supabase.from('categories').select('*').order('name');
    res.json(data || []);
});

app.post('/api/categories', async (req, res) => {
    const { data, error } = await supabase.from('categories').insert(req.body).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.put('/api/categories/:id', async (req, res) => {
    const { data, error } = await supabase.from('categories').update(req.body).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

app.delete('/api/categories/:id', async (req, res) => {
    const { error } = await supabase.from('categories').delete().eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// ═══════════════════════════════════════════════════════════════════
// SYSTEM CONFIG
// ═══════════════════════════════════════════════════════════════════

app.get('/api/config', async (_req, res) => {
    const { data } = await supabase.from('system_config').select('*');
    const cfg: any = {};
    data?.forEach(i => cfg[i.key] = i.value);
    res.json(cfg);
});

app.put('/api/config/:key', async (req, res) => {
    await supabase.from('system_config').update({
        value: req.body.value,
        updated_at: new Date().toISOString()
    }).eq('key', req.params.key);
    res.json({ success: true });
});

app.post('/api/config', async (req, res) => {
    const { key, value, description } = req.body;
    const { data, error } = await supabase.from('system_config')
        .upsert({ key, value, description, updated_at: new Date().toISOString() })
        .select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// ═══════════════════════════════════════════════════════════════════
// FOLLOWS & LIKES (Read-only analytics)
// ═══════════════════════════════════════════════════════════════════

app.get('/api/follows', async (req, res) => {
    const { limit = '100', offset = '0' } = req.query as any;
    const { data, error } = await supabase
        .from('follows')
        .select('*, follower:profiles!follower_id(username, avatar_url), following:profiles!following_id(username, avatar_url)')
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.get('/api/likes', async (req, res) => {
    const { limit = '100', offset = '0', video_id } = req.query as any;
    let q = supabase.from('likes')
        .select('*, profiles(username, avatar_url), videos(description)')
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (video_id) q = q.eq('video_id', video_id);
    const { data, error } = await q;
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

app.get('/api/saves', async (req, res) => {
    const { limit = '100', offset = '0' } = req.query as any;
    const { data, error } = await supabase
        .from('saves')
        .select('*, profiles(username, avatar_url), videos(description)')
        .order('created_at', { ascending: false })
        .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// ═══════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════

app.listen(PORT, () => {
    console.log(`MotionApp Admin API v5.0.1 running on port ${PORT}`);
});
