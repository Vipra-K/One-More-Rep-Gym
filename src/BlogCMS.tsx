import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bold,
  Calendar,
  Check,
  ChevronDown,
  Code,
  Eye,
  File,
  Film,
  GripVertical,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  LogOut,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Quote,
  Save,
  Search,
  Tag,
  Trash2,
  Type,
  Upload,
  Video,
  X,
} from 'lucide-react';
import { BLOG_BUCKET, assetUrl, publicMediaUrl, slugify, supabase } from './lib/supabase';

type BlockType =
  | 'paragraph'
  | 'heading'
  | 'image'
  | 'gallery'
  | 'video'
  | 'quote'
  | 'divider'
  | 'list'
  | 'embed'
  | 'button'
  | 'callout'
  | 'file';

type Block = {
  id?: string;
  type: BlockType;
  position?: number;
  content: Record<string, any>;
};

type Post = {
  id?: string;
  title: string;
  slug: string;
  excerpt: string;
  cover_path: string | null;
  category: string;
  tags: string[];
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  scheduled_for: string | null;
  author: string;
  published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  content_version?: number;
  blocks?: Block[];
};

const CATEGORIES = ['Events', 'Workouts', 'Challenges', 'Member Stories', 'Fitness Tips', 'Announcements', 'Transformations', 'Gym Life', 'General'];

const emptyPost = (): Post => ({
  title: '',
  slug: '',
  excerpt: '',
  cover_path: null,
  category: 'Events',
  tags: [],
  status: 'draft',
  scheduled_for: null,
  author: 'One More Rep',
  blocks: [],
});

function emitBlogChange() {
  window.dispatchEvent(new CustomEvent('omr-blog-changed'));
}

async function loadPublicPosts() {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', 'published')
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  const now = Date.now();
  return (data || []).filter((p: any) => !p.scheduled_for || new Date(p.scheduled_for).getTime() <= now);
}

async function loadPostBySlug(slug: string) {
  const { data: post, error } = await supabase.from('blog_posts').select('*').eq('slug', slug).eq('status', 'published').single();
  if (error || !post) return null;
  if (post.scheduled_for && new Date(post.scheduled_for).getTime() > Date.now()) return null;
  const { data: blocks, error: blockError } = await supabase.from('blog_blocks').select('*').eq('post_id', post.id).order('position', { ascending: true });
  if (blockError) throw blockError;
  return { ...post, blocks: blocks || [] } as Post;
}

async function uploadFile(file: File) {
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const path = `posts/${crypto.randomUUID()}/${safe}`;
  const { error } = await supabase.storage.from(BLOG_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  return path;
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|\[.*?\]\(.*?\))/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={i}>{part.slice(1, -1)}</em>;
    const match = part.match(/^\[(.*?)\]\((.*?)\)$/);
    if (match) return <a key={i} href={match[2]} target="_blank" rel="noreferrer">{match[1]}</a>;
    return <span key={i}>{part}</span>;
  });
}

function ArticleView({ post }: { post: Post }) {
  const blocks = post.blocks || [];
  return (
    <article className="cms-article">
      <div className="cms-article-meta"><span>{post.category}</span><span>{post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : ''}</span></div>
      <h1>{post.title}</h1>
      <p className="cms-article-excerpt">{post.excerpt}</p>
      {post.cover_path && <img className="cms-cover" src={publicMediaUrl(post.cover_path)} alt={post.title} />}
      <div className="cms-article-body">
        {blocks.map((b, index) => {
          const c = b.content || {};
          if (b.type === 'paragraph') return <p key={b.id || index}>{renderInline(c.text || '')}</p>;
          if (b.type === 'heading') {
            const level = c.level || 2;
            const Heading = `h${level}` as keyof JSX.IntrinsicElements;
            return <Heading key={b.id || index}>{c.text || 'Section heading'}</Heading>;
          }
          if (b.type === 'image') return <figure key={b.id || index}><img src={publicMediaUrl(c.path)} alt={c.alt || post.title} /><figcaption>{c.caption}</figcaption></figure>;
          if (b.type === 'gallery') return <div className="cms-gallery" key={b.id || index}>{(c.items || []).map((item: any, i: number) => <figure key={item.path || i}><img src={publicMediaUrl(item.path)} alt={item.alt || post.title} /><figcaption>{item.caption}</figcaption></figure>)}</div>;
          if (b.type === 'video') return <figure key={b.id || index} className="cms-video"><video src={publicMediaUrl(c.path)} poster={publicMediaUrl(c.poster)} controls playsInline /><figcaption>{c.caption}</figcaption></figure>;
          if (b.type === 'quote') return <blockquote key={b.id || index}>{c.text}<cite>{c.author ? '— ' + c.author : ''}</cite></blockquote>;
          if (b.type === 'divider') return <hr key={b.id || index} />;
          if (b.type === 'list') {
            const items = String(c.text || '').split('\n').filter(Boolean);
            const ListTag = c.style === 'numbered' ? 'ol' : 'ul';
            return <ListTag key={b.id || index}>{items.map((item: string, i: number) => <li key={i}>{renderInline(item)}</li>)}</ListTag>;
          }
          if (b.type === 'embed') return <div key={b.id || index} className="cms-embed"><iframe src={c.url} title={c.title || 'Embedded media'} loading="lazy" allowFullScreen /></div>;
          if (b.type === 'button') return <div key={b.id || index} className="cms-button-wrap"><a className="cms-button" href={c.url} target="_blank" rel="noreferrer">{c.label || 'Learn More'} <ArrowRight size={15} /></a></div>;
          if (b.type === 'callout') return <aside key={b.id || index} className="cms-callout"><strong>{c.title}</strong><p>{c.text}</p></aside>;
          if (b.type === 'file') return <a key={b.id || index} className="cms-file" href={publicMediaUrl(c.path)} target="_blank" rel="noreferrer"><File size={18} /> {c.name || 'Download file'}</a>;
          return null;
        })}
      </div>
      {post.tags?.length > 0 && <div className="cms-tags">{post.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
    </article>
  );
}

function PublicBlogList() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');

  const refresh = () => loadPublicPosts().then(setPosts).catch((e) => console.error(e));
  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('omr-blog-changed', handler);
    return () => window.removeEventListener('omr-blog-changed', handler);
  }, []);

  const filtered = useMemo(() => posts.filter((p) => {
    const text = `${p.title} ${p.excerpt} ${(p.tags || []).join(' ')}`.toLowerCase();
    return (category === 'All' || p.category === category) && text.includes(query.toLowerCase());
  }), [posts, query, category]);

  return (
    <div className="blog-page">
      <header className="blog-top"><a href="#/" className="blog-logo"><img src={assetUrl('resources/logo.png" alt="" /> ONE MORE <span>REP</span></a><a href="#/" className="blog-back"><ArrowLeft size={16} /> BACK TO WEBSITE</a></header>
      <main className="cms-public-list">
        <div className="cms-journal-head"><div><p className="section-tag">ONE MORE REP JOURNAL</p><h1>STORIES.<br /><span>TRAINING.</span><br />COMMUNITY.</h1><p>Events, workouts, challenges, transformations and moments from the studio.</p></div><div className="cms-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search stories..." /></div></div>
        <div className="cms-category-bar"><button className={category === 'All' ? 'active' : ''} onClick={() => setCategory('All')}>ALL</button>{CATEGORIES.map((c) => <button key={c} className={category === c ? 'active' : ''} onClick={() => setCategory(c)}>{c}</button>)}</div>
        {filtered.length === 0 ? <div className="blog-empty"><h2>NO STORIES YET.</h2><p>Weekly events and workout highlights will appear here when the studio publishes them.</p></div> : <div className="cms-public-grid">{filtered.map((post, i) => <a key={post.id} href={`#/blog/${post.slug}`} className={`cms-public-card ${i === 0 ? 'featured' : ''}`}><div className="cms-card-media">{post.cover_path ? <img src={publicMediaUrl(post.cover_path)} alt={post.title} /> : <div className="cms-card-placeholder"><Film size={30} /></div>}<span>{post.category}</span></div><div className="cms-card-copy"><small>{post.published_at ? new Date(post.published_at).toLocaleDateString('en-IN') : ''}</small><h2>{post.title}</h2><p>{post.excerpt}</p><strong>READ STORY <ArrowRight size={14} /></strong></div></a>)}</div>}
      </main>
    </div>
  );
}

function PublicBlogDetail({ slug }: { slug: string }) {
  const [post, setPost] = useState<Post | null>(null);
  useEffect(() => { loadPostBySlug(slug).then(setPost).catch((e) => console.error(e)); }, [slug]);
  if (!post) return <div className="blog-page"><header className="blog-top"><a href="#/blog" className="blog-back"><ArrowLeft size={16} /> ALL STORIES</a></header><div className="blog-empty"><h2>LOADING STORY...</h2></div></div>;
  return <div className="blog-page"><header className="blog-top"><a href="#/blog" className="blog-logo"><img src={assetUrl('resources/logo.png" alt="" /> ONE MORE <span>REP</span></a><a href="#/blog" className="blog-back"><ArrowLeft size={16} /> ALL STORIES</a></header><main className="cms-detail-wrap"><ArticleView post={post} /><div className="cms-detail-footer"><a href="#/blog">← BACK TO ALL STORIES</a></div></main></div>;
}

function BlockToolbar({ addBlock }: { addBlock: (type: BlockType) => void }) {
  const items: [BlockType, string, any][] = [
    ['paragraph', 'Paragraph', Type],
    ['heading', 'Heading', Type],
    ['image', 'Image', ImageIcon],
    ['gallery', 'Gallery', ImageIcon],
    ['video', 'Video', Video],
    ['quote', 'Quote', Quote],
    ['divider', 'Divider', MoreHorizontal],
    ['list', 'Bullet / Numbered List', List],
    ['embed', 'YouTube / Vimeo', Play],
    ['button', 'Button', ArrowRight],
    ['callout', 'Callout', File],
    ['file', 'File', File],
  ];
  return <div className="cms-block-menu">{items.map(([type, label, Icon]) => <button key={type} onClick={() => addBlock(type)}><Icon size={16} /> {label}</button>)}</div>;
}

function TextTools({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const wrap = (left: string, right: string) => {
    const el = ref.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = value.slice(start, end) || 'text';
    const next = value.slice(0, start) + left + selected + right + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => { el.focus(); el.setSelectionRange(start + left.length, start + left.length + selected.length); });
  };
  return <div className="cms-text-tools"><button type="button" onClick={() => wrap('**', '**')}><Bold size={15} /></button><button type="button" onClick={() => wrap('*', '*')}><Italic size={15} /></button><button type="button" onClick={() => wrap('[', '](https://)')}><LinkIcon size={15} /></button></div>;
}

function BlockEditor({ block, index, update, remove, move, upload }: { block: Block; index: number; update: (patch: Partial<Block>) => void; remove: () => void; move: (direction: -1 | 1) => void; upload: (file: File) => Promise<string> }) {
  const c = block.content || {};
  const [busy, setBusy] = useState(false);

  const setContent = (patch: Record<string, any>) => update({ content: { ...c, ...patch } });
  const handleFile = async (file: File) => {
    setBusy(true);
    try { setContent({ path: await upload(file), name: file.name }); } catch (e) { alert(e instanceof Error ? e.message : 'Upload failed'); } finally { setBusy(false); }
  };

  return (
    <div className="cms-block-editor">
      <div className="cms-block-handle"><GripVertical size={16} /><span>{block.type.toUpperCase()}</span><div><button type="button" onClick={() => move(-1)}>↑</button><button type="button" onClick={() => move(1)}>↓</button><button type="button" onClick={remove}><Trash2 size={14} /></button></div></div>
      {block.type === 'paragraph' && <><TextTools value={c.text || ''} onChange={(text) => setContent({ text })} /><textarea ref={undefined} value={c.text || ''} onChange={(e) => setContent({ text: e.target.value })} placeholder="Start writing your story..." /></>}
      {block.type === 'heading' && <div className="cms-inline-fields"><select value={c.level || 2} onChange={(e) => setContent({ level: Number(e.target.value) })}><option value="2">H2</option><option value="3">H3</option><option value="4">H4</option></select><input value={c.text || ''} onChange={(e) => setContent({ text: e.target.value })} placeholder="Section heading" /></div>}
      {block.type === 'image' && <div className="cms-media-editor">{c.path ? <img src={publicMediaUrl(c.path)} alt="" /> : <label className="cms-upload-zone"><Upload size={24} /><span>{busy ? 'UPLOADING...' : 'UPLOAD IMAGE'}</span><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} /></label>}<input value={c.caption || ''} onChange={(e) => setContent({ caption: e.target.value })} placeholder="Caption (optional)" /><input value={c.alt || ''} onChange={(e) => setContent({ alt: e.target.value })} placeholder="Alt text" /></div>}
      {block.type === 'gallery' && <GalleryEditor content={c} setContent={setContent} upload={upload} />}
      {block.type === 'video' && <div className="cms-media-editor">{c.path ? <video src={publicMediaUrl(c.path)} controls /> : <label className="cms-upload-zone"><Upload size={24} /><span>{busy ? 'UPLOADING...' : 'UPLOAD VIDEO'}</span><input type="file" accept="video/*" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} /></label>}<input value={c.caption || ''} onChange={(e) => setContent({ caption: e.target.value })} placeholder="Video caption" /></div>}
      {block.type === 'quote' && <div className="cms-two-inputs"><textarea value={c.text || ''} onChange={(e) => setContent({ text: e.target.value })} placeholder="Write a quote..." /><input value={c.author || ''} onChange={(e) => setContent({ author: e.target.value })} placeholder="Author / member name" /></div>}
      {block.type === 'divider' && <div className="cms-divider-preview">SECTION DIVIDER</div>}
      {block.type === 'list' && <div className="cms-two-inputs"><select value={c.style || 'bullet'} onChange={(e) => setContent({ style: e.target.value })}><option value="bullet">Bullet list</option><option value="numbered">Numbered list</option></select><textarea value={c.text || ''} onChange={(e) => setContent({ text: e.target.value })} placeholder="One item per line" /></div>}
      {block.type === 'embed' && <div className="cms-two-inputs"><input value={c.url || ''} onChange={(e) => setContent({ url: e.target.value })} placeholder="YouTube or Vimeo embed URL" /><input value={c.title || ''} onChange={(e) => setContent({ title: e.target.value })} placeholder="Embed title" /></div>}
      {block.type === 'button' && <div className="cms-two-inputs"><input value={c.label || ''} onChange={(e) => setContent({ label: e.target.value })} placeholder="Button label" /><input value={c.url || ''} onChange={(e) => setContent({ url: e.target.value })} placeholder="https://..." /></div>}
      {block.type === 'callout' && <div className="cms-two-inputs"><input value={c.title || ''} onChange={(e) => setContent({ title: e.target.value })} placeholder="Callout title" /><textarea value={c.text || ''} onChange={(e) => setContent({ text: e.target.value })} placeholder="Important information..." /></div>}
      {block.type === 'file' && <div className="cms-media-editor">{c.path ? <div className="cms-file-chip"><File size={17} /> {c.name}</div> : <label className="cms-upload-zone"><Upload size={24} /><span>{busy ? 'UPLOADING...' : 'UPLOAD FILE'}</span><input type="file" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} /></label>}<input value={c.name || ''} onChange={(e) => setContent({ name: e.target.value })} placeholder="Download label" /></div>}
    </div>
  );
}

function GalleryEditor({ content, setContent, upload }: { content: Record<string, any>; setContent: (patch: Record<string, any>) => void; upload: (file: File) => Promise<string> }) {
  const items = content.items || [];
  const [busy, setBusy] = useState(false);
  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      const uploaded = await Promise.all(Array.from(files).map(async (file) => ({ path: await upload(file), caption: '', alt: file.name })));
      setContent({ items: [...items, ...uploaded] });
    } catch (e) { alert(e instanceof Error ? e.message : 'Gallery upload failed'); } finally { setBusy(false); }
  };
  return <div className="cms-gallery-editor"><label className="cms-upload-zone"><ImageIcon size={24} /><span>{busy ? 'UPLOADING...' : 'ADD MULTIPLE IMAGES'}</span><input type="file" accept="image/*" multiple onChange={(e) => addFiles(e.target.files)} /></label><div className="cms-gallery-thumbs">{items.map((item: any, i: number) => <div key={item.path} className="cms-gallery-thumb"><img src={publicMediaUrl(item.path)} alt="" /><button type="button" onClick={() => setContent({ items: items.filter((_: any, j: number) => j !== i) })}><X size={13} /></button><input value={item.caption || ''} onChange={(e) => setContent({ items: items.map((x: any, j: number) => j === i ? { ...x, caption: e.target.value } : x) })} placeholder="Caption" /></div>)}</div></div>;
}

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      localStorage.setItem('omr_admin', '1');
      onSuccess();
    } else {
      setError('Invalid admin credentials');
    }
  };

  return <div className="login-page"><div className="login-card"><a href="#/" className="back"><ArrowLeft size={17} /> BACK TO WEBSITE</a><img src={assetUrl('resources/logo.png" alt="One More Rep" /><p className="red">ADMIN ACCESS</p><h1>CONTENT <em>STUDIO.</em></h1><form onSubmit={submit}><label>USERNAME<input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" /></label><label>PASSWORD<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" /></label>{error && <div className="login-error">{error}</div>}<button className="admin-add">LOGIN <ArrowRight size={17} /></button></form><small className="dummy">Dummy credentials: <b>admin</b> / <b>admin123</b></small></div></div>;
}

function AdminDashboard({ onExit }: { onExit: () => void }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [post, setPost] = useState<Post>(emptyPost());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tagInput, setTagInput] = useState('');

  const loadAdmin = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false });
    if (error) alert(error.message);
    setPosts(data || []);
    setLoading(false);
  };

  useEffect(() => { loadAdmin(); }, []);

  const loadEditor = async (id: string) => {
    const { data, error } = await supabase.from('blog_posts').select('*').eq('id', id).single();
    if (error) return alert(error.message);
    const { data: blocks } = await supabase.from('blog_blocks').select('*').eq('post_id', id).order('position', { ascending: true });
    setPost({ ...data, blocks: blocks || [] });
    setEditingId(id);
    setPreview(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updatePost = (patch: Partial<Post>) => setPost((current) => ({ ...current, ...patch }));

  const addBlock = (type: BlockType) => {
    setPost((current) => ({ ...current, blocks: [...(current.blocks || []), { type, content: {} }] }));
    setShowMenu(false);
  };

  const updateBlock = (index: number, patch: Partial<Block>) => setPost((current) => ({ ...current, blocks: (current.blocks || []).map((b, i) => i === index ? { ...b, ...patch } : b) }));
  const removeBlock = (index: number) => setPost((current) => ({ ...current, blocks: (current.blocks || []).filter((_, i) => i !== index) }));
  const moveBlock = (index: number, direction: -1 | 1) => setPost((current) => {
    const next = [...(current.blocks || [])];
    const target = index + direction;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return { ...current, blocks: next };
  });

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '');
    if (tag && !post.tags.includes(tag)) updatePost({ tags: [...post.tags, tag] });
    setTagInput('');
  };

  const upload = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) throw new Error('This demo currently accepts files up to 50MB. Large-video resumable upload is the next storage upgrade.');
    return uploadFile(file);
  };

  const save = async (status: Post['status'] = post.status) => {
    if (!post.title.trim()) return alert('Add a title first.');
    const normalized = { ...post, status, slug: slugify(post.slug || post.title), excerpt: post.excerpt.trim() };
    if (!normalized.slug) return alert('Add a valid slug.');
    setSaving(true);
    try {
      let postId = editingId;
      if (editingId) {
        const { error } = await supabase.from('blog_posts').update({
          title: normalized.title,
          slug: normalized.slug,
          excerpt: normalized.excerpt,
          cover_path: normalized.cover_path,
          category: normalized.category,
          tags: normalized.tags,
          status: normalized.status,
          scheduled_for: normalized.scheduled_for,
          author: normalized.author,
          published: normalized.status === 'published',
          published_at: normalized.status === 'published' ? (normalized.published_at || new Date().toISOString()) : normalized.published_at,
          updated_at: new Date().toISOString(),
        }).eq('id', editingId);
        if (error) throw error;
        const { error: deleteError } = await supabase.from('blog_blocks').delete().eq('post_id', editingId);
        if (deleteError) throw deleteError;
      } else {
        const { data, error } = await supabase.from('blog_posts').insert({
          title: normalized.title,
          slug: normalized.slug,
          excerpt: normalized.excerpt,
          cover_path: normalized.cover_path,
          category: normalized.category,
          tags: normalized.tags,
          status: normalized.status,
          scheduled_for: normalized.scheduled_for,
          author: normalized.author,
          published: normalized.status === 'published',
          published_at: normalized.status === 'published' ? new Date().toISOString() : null,
        }).select().single();
        if (error) throw error;
        postId = data.id;
      }
      if (normalized.blocks?.length) {
        const { error } = await supabase.from('blog_blocks').insert(normalized.blocks.map((b, i) => ({ post_id: postId, type: b.type, position: i, content: b.content || {} })));
        if (error) throw error;
      }
      const { data: saved } = await supabase.from('blog_posts').select('*').eq('id', postId).single();
      setPost({ ...saved, blocks: normalized.blocks || [] });
      setEditingId(postId || null);
      await loadAdmin();
      emitBlogChange();
      alert(status === 'published' ? 'Blog published successfully.' : status === 'scheduled' ? 'Blog scheduled successfully.' : 'Draft saved successfully.');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Could not save the blog.');
    } finally {
      setSaving(false);
    }
  };

  const deletePost = async (id: string) => {
    if (!confirm('Delete this blog permanently?')) return;
    const { data: blocks } = await supabase.from('blog_blocks').select('content').eq('post_id', id);
    const { data: existing } = await supabase.from('blog_posts').select('cover_path').eq('id', id).single();
    const paths: string[] = [];
    if (existing?.cover_path) paths.push(existing.cover_path);
    (blocks || []).forEach((b: any) => {
      if (b.content?.path) paths.push(b.content.path);
      if (Array.isArray(b.content?.items)) b.content.items.forEach((item: any) => item.path && paths.push(item.path));
    });
    if (paths.length) await supabase.storage.from(BLOG_BUCKET).remove([...new Set(paths)]);
    await supabase.from('blog_posts').delete().eq('id', id);
    if (editingId === id) { setEditingId(null); setPost(emptyPost()); }
    await loadAdmin();
    emitBlogChange();
  };

  const uploadCover = async (file: File) => {
    try { updatePost({ cover_path: await upload(file) }); } catch (e) { alert(e instanceof Error ? e.message : 'Cover upload failed'); }
  };

  return (
    <div className="cms-admin">
      <header className="cms-admin-top"><div className="cms-admin-brand"><img src={assetUrl('resources/logo.png" alt="" /><span>CONTENT STUDIO</span></div><div className="cms-admin-actions"><button onClick={() => setPreview(!preview)}><Eye size={16} /> {preview ? 'EDITOR' : 'PREVIEW'}</button><button onClick={() => save('draft')} disabled={saving}><Save size={16} /> SAVE DRAFT</button><button className="cms-publish" onClick={() => save(post.status === 'scheduled' ? 'scheduled' : 'published')} disabled={saving}><Check size={16} /> {saving ? 'SAVING...' : post.status === 'scheduled' ? 'SCHEDULE' : 'PUBLISH'}</button><button onClick={onExit}><LogOut size={16} /></button></div></header>
      <main className="cms-admin-layout">
        <aside className="cms-post-list"><button className="cms-new-post" onClick={() => { setPost(emptyPost()); setEditingId(null); setPreview(false); }}>+ NEW STORY</button><div className="cms-list-title">ALL POSTS</div>{loading ? <p className="cms-muted">Loading...</p> : posts.map((p) => <button key={p.id} className={editingId === p.id ? 'selected' : ''} onClick={() => loadEditor(p.id!)}><span>{p.title}</span><small>{p.status.toUpperCase()}</small></button>)}</aside>
        <section className="cms-editor-shell">
          {preview ? <div className="cms-editor-preview"><ArticleView post={{ ...post, published_at: post.published_at || new Date().toISOString() }} /><button className="cms-back-editor" onClick={() => setPreview(false)}>← BACK TO EDITOR</button></div> : <div className="cms-editor">
            <div className="cms-editor-kicker">BLOG CMS / {editingId ? 'EDIT STORY' : 'NEW STORY'}</div>
            <input className="cms-title-input" value={post.title} onChange={(e) => updatePost({ title: e.target.value, slug: editingId ? post.slug : slugify(e.target.value) })} placeholder="Story title..." />
            <div className="cms-editor-grid">
              <div className="cms-main-column">
                <textarea className="cms-excerpt-input" value={post.excerpt} onChange={(e) => updatePost({ excerpt: e.target.value })} placeholder="Write a short excerpt for the blog listing and SEO..." />
                <div className="cms-cover-editor">{post.cover_path ? <img src={publicMediaUrl(post.cover_path)} alt="" /> : <label className="cms-cover-upload"><ImageIcon size={26} /><strong>ADD COVER IMAGE</strong><span>Recommended: landscape image</span><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])} /></label>}</div>
                <div className="cms-story-label">ARTICLE CONTENT</div>
                {(post.blocks || []).map((block, index) => <BlockEditor key={block.id || index} block={block} index={index} update={(patch) => updateBlock(index, patch)} remove={() => removeBlock(index)} move={(dir) => moveBlock(index, dir)} upload={upload} />)}
                <div className="cms-add-block-wrap"><button className="cms-add-block" onClick={() => setShowMenu(!showMenu)}><Plus size={18} /> ADD CONTENT</button>{showMenu && <BlockToolbar addBlock={addBlock} />}</div>
              </div>
              <aside className="cms-settings">
                <div className="cms-setting-card"><label>CATEGORY<select value={post.category} onChange={(e) => updatePost({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label><label>SLUG<input value={post.slug} onChange={(e) => updatePost({ slug: slugify(e.target.value) })} /></label><label>AUTHOR<input value={post.author} onChange={(e) => updatePost({ author: e.target.value })} /></label><label>STATUS<select value={post.status} onChange={(e) => updatePost({ status: e.target.value as Post['status'] })}><option value="draft">Draft</option><option value="published">Published</option><option value="scheduled">Scheduled</option><option value="archived">Archived</option></select></label>{post.status === 'scheduled' && <label>PUBLISH AT<input type="datetime-local" value={post.scheduled_for ? post.scheduled_for.slice(0, 16) : ''} onChange={(e) => updatePost({ scheduled_for: e.target.value ? new Date(e.target.value).toISOString() : null })} /></label>}</div>
                <div className="cms-setting-card"><label>TAGS</label><div className="cms-tag-input"><input value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} placeholder="Add a tag..." /><button onClick={addTag}>ADD</button></div><div className="cms-tags">{post.tags.map((tag) => <span key={tag}>#{tag}<button onClick={() => updatePost({ tags: post.tags.filter((x) => x !== tag) })}><X size={11} /></button></span>)}</div></div>
                <div className="cms-setting-card"><div className="cms-settings-title">PUBLISHING</div><p className="cms-muted">Drafts stay off the public blog. Scheduled posts appear automatically when their publish time arrives.</p><button className="cms-danger" onClick={() => editingId && deletePost(editingId)} disabled={!editingId}><Trash2 size={15} /> DELETE STORY</button></div>
              </aside>
            </div>
          </div>}
        </section>
      </main>
    </div>
  );
}

export function BlogCMS({ mode, slug, onExit }: { mode: 'list' | 'detail' | 'admin'; slug?: string; onExit?: () => void }) {
  const [logged, setLogged] = useState(localStorage.getItem('omr_admin') === '1');
  if (mode === 'admin') {
    if (!logged) return <AdminLogin onSuccess={() => setLogged(true)} />;
    return <AdminDashboard onExit={() => { localStorage.removeItem('omr_admin'); setLogged(false); onExit?.(); }} />;
  }
  if (mode === 'detail' && slug) return <PublicBlogDetail slug={slug} />;
  return <PublicBlogList />;
}
