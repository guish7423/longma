import { useState, useEffect } from 'react';
import GlassPanel from '../../design-system/GlassPanel';

interface HotTopic {
  title: string;
  source: string;
  url: string;
  heat?: string;
}

const sources = [
  { id: 'github', label: 'GitHub Trending', color: '#2da44e' },
  { id: 'hackernews', label: 'Hacker News', color: '#ff6600' },
  { id: 'reddit', label: 'Reddit Hot', color: '#ff4500' },
  { id: 'zhihu', label: '知乎热榜', color: '#0084ff' },
  { id: 'weibo', label: '微博热搜', color: '#ff8200' },
];

// GitHub: trending repos via search API
async function fetchGitHub(): Promise<HotTopic[]> {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  const since = date.toISOString().split('T')[0];
  const res = await fetch(
    `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=10`,
    { headers: { Accept: 'application/vnd.github.v3+json' } }
  );
  if (!res.ok) throw new Error(`GitHub API: ${res.status}`);
  const data = await res.json();
  return (data.items || []).map((item: any) => ({
    title: item.full_name,
    source: 'GitHub Trending',
    url: item.html_url,
    heat: `⭐ ${item.stargazers_count?.toLocaleString() || '?'}`
  }));
}

// Hacker News: top stories
async function fetchHN(): Promise<HotTopic[]> {
  const idsRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
  if (!idsRes.ok) throw new Error('HN API failed');
  const ids: number[] = await idsRes.json();
  const top10 = ids.slice(0, 15);
  const items = await Promise.all(
    top10.map(async (id) => {
      try {
        const r = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
        return await r.json();
      } catch { return null; }
    })
  );
  return items
    .filter((item: any) => item && item.title && item.url)
    .slice(0, 10)
    .map((item: any) => ({
      title: item.title,
      source: 'Hacker News',
      url: item.url,
      heat: `▲ ${item.score || 0}`
    }));
}

// Reddit: /r/all/hot
async function fetchReddit(): Promise<HotTopic[]> {
  const res = await fetch('https://www.reddit.com/r/all/hot.json?limit=10', {
    headers: { 'User-Agent': 'LongMa/1.0' }
  });
  if (!res.ok) throw new Error(`Reddit API: ${res.status}`);
  const data = await res.json();
  return (data.data?.children || []).map((child: any) => {
    const post = child.data;
    return {
      title: post.title,
      source: 'Reddit Hot',
      url: `https://reddit.com${post.permalink}`,
      heat: `👍 ${post.score?.toLocaleString() || '?'}`
    };
  });
}

// 知乎 (simplified — uses zhihu.com api)
async function fetchZhihu(): Promise<HotTopic[]> {
  try {
    const res = await fetch('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=10', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) throw new Error(`Zhihu API: ${res.status}`);
    const data = await res.json();
    return (data.data || []).map((item: any) => ({
      title: item.target?.title || item.target?.question?.name || 'Unknown',
      source: '知乎热榜',
      url: item.target?.url || 'https://www.zhihu.com',
      heat: `🔥 ${(item.detail_text || '').replace('万', '万') || ''}`
    }));
  } catch {
    // Zhihu may block; fallback to empty
    return [];
  }
}

// 微博 (simplified — uses weibo.com api)
async function fetchWeibo(): Promise<HotTopic[]> {
  try {
    const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://weibo.com' }
    });
    if (!res.ok) throw new Error(`Weibo API: ${res.status}`);
    const data = await res.json();
    return (data.data?.realtime || []).slice(0, 10).map((item: any) => ({
      title: item.word,
      source: '微博热搜',
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word)}`,
      heat: `🔥 ${(item.raw_hot || 0).toLocaleString()}`
    }));
  } catch {
    return [];
  }
}

const fetchers: Record<string, () => Promise<HotTopic[]>> = {
  github: fetchGitHub,
  hackernews: fetchHN,
  reddit: fetchReddit,
  zhihu: fetchZhihu,
  weibo: fetchWeibo,
};

export default function HotspotsPanel() {
  const [activeSource, setActiveSource] = useState('all');
  const [topics, setTopics] = useState<HotTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function loadAll() {
      try {
        const results = await Promise.allSettled(
          Object.entries(fetchers).map(([id, fetch]) =>
            fetch().then(topics => ({ id, topics }))
          )
        );

        if (cancelled) return;

        const all: HotTopic[] = [];
        for (const result of results) {
          if (result.status === 'fulfilled') {
            all.push(...result.value.topics);
          }
        }

        // If all failed, show error
        if (all.length === 0) {
          setError('Unable to fetch hot topics. Some sources may be unavailable.');
        }

        setTopics(all);
      } catch (e: any) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAll();
    return () => { cancelled = true; };
  }, []);

  const filtered = activeSource === 'all'
    ? topics
    : topics.filter(t => t.source === sources.find(s => s.id === activeSource)?.label);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-primary)" strokeWidth="2">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          Hot Topics
        </h2>
        <span style={styles.subtitle}>Trending across the web</span>
        {!loading && <span style={styles.liveDot}>● Live</span>}
      </div>

      {/* Source Filters */}
      <div style={styles.filterRow}>
        <button style={{ ...styles.filterBtn, ...(activeSource === 'all' ? styles.filterActive : {}) }} onClick={() => setActiveSource('all')}>
          All {!loading && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({topics.length})</span>}
        </button>
        {sources.map(s => {
          const count = topics.filter(t => t.source === s.label).length;
          return (
            <button
              key={s.id}
              style={{ ...styles.filterBtn, ...(activeSource === s.id ? { ...styles.filterActive, borderColor: s.color, color: s.color } : {}) }}
              onClick={() => setActiveSource(s.id)}
            >
              <span style={{ ...styles.sourceDot, background: s.color }} />
              {s.label}
              {!loading && count > 0 && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div style={styles.loading}>
          <div style={styles.spinner} />
          Fetching latest topics...
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ padding: '12px 16px', background: 'rgba(248, 81, 73, 0.1)', borderRadius: 8, color: 'var(--error)', fontSize: 13, marginBottom: 12 }}>
          {error}
          <button style={{ marginLeft: 12, textDecoration: 'underline', background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer', fontSize: 12 }} onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      )}

      {/* Topic List */}
      {!loading && (
        <div style={styles.list}>
          {filtered.map((topic, i) => (
            <GlassPanel key={`${topic.source}-${i}`} variant="default" style={styles.topicCard}>
              <div style={styles.topicRank}>{i + 1}</div>
              <div style={styles.topicContent}>
                <a href={topic.url} target="_blank" rel="noopener noreferrer" style={styles.topicTitle}>{topic.title}</a>
                <div style={styles.topicMeta}>
                  <span style={styles.topicSource}>{topic.source}</span>
                  {topic.heat && <span style={styles.topicHeat}>{topic.heat}</span>}
                </div>
              </div>
              <a href={topic.url} target="_blank" rel="noopener noreferrer" style={styles.topicLink}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
            </GlassPanel>
          ))}
          {filtered.length === 0 && <div style={styles.empty}>No topics found for this source.</div>}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, any> = {
  container: { flex: 1, padding: 24, overflow: 'auto', maxWidth: 800, margin: '0 auto', width: '100%' },
  header: { display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  title: { fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, margin: 0 },
  subtitle: { fontSize: 13, color: 'var(--text-muted)' },
  liveDot: { fontSize: 11, fontWeight: 600, color: '#3fb950', animation: 'pulse 2s infinite' },
  filterRow: { display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' },
  filterBtn: { padding: '6px 14px', border: '1px solid var(--border-default)', borderRadius: 20, background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 150ms ease' },
  filterActive: { background: 'var(--accent-subtle)', borderColor: 'var(--accent-primary)', color: 'var(--accent-primary)' },
  sourceDot: { width: 6, height: 6, borderRadius: '50%', flexShrink: 0 },
  loading: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 },
  spinner: { width: 20, height: 20, border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  topicCard: { padding: '12px 16px', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 14 },
  topicRank: { width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', flexShrink: 0 },
  topicContent: { flex: 1, minWidth: 0 },
  topicTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  topicMeta: { display: 'flex', gap: 8, marginTop: 4 },
  topicSource: { fontSize: 11, color: 'var(--accent-primary)', fontWeight: 500 },
  topicHeat: { fontSize: 11, color: 'var(--text-muted)' },
  topicLink: { flexShrink: 0, padding: 6, borderRadius: 6, color: 'var(--text-muted)' },
  empty: { textAlign: 'center', padding: 40, color: 'var(--text-muted)', fontSize: 13 },
};
