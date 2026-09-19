import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, Instagram, LogOut, MapPin, Menu, Phone, Plus, Trash2, X } from 'lucide-react';
import { supabase } from './lib/supabase';
import { BlogCMS } from './BlogCMS';

const joinUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSf6W0aS1mhk2dgp-yCwJksjjo8yz7scC1BigZd6HT0GNSxysg/viewform?usp=publish-editor';

const programs = [
  ['Strength Training', '/resources/strength-training.png'],
  ['Group Sessions', '/resources/yoga-classes.png'],
  ['Weight Loss Program', '/resources/weight-loss.png'],
  ['Rehabilitation Program', '/resources/rehab-program.png'],
];

const seedBlogs: any[] = [];

const BLOG_DB = 'omr_blog_db';
const BLOG_STORE = 'blogs';

function openBlogDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BLOG_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BLOG_STORE)) {
        db.createObjectStore(BLOG_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function readStoredBlogs(): Promise<any[] | null> {
  const db = await openBlogDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(BLOG_STORE, 'readonly').objectStore(BLOG_STORE).getAll();
    request.onsuccess = () => resolve(request.result.length ? request.result : null);
    request.onerror = () => reject(request.error);
  });
}

async function writeStoredBlogs(blogs: any[]) {
  const db = await openBlogDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(BLOG_STORE, 'readwrite');
    const store = tx.objectStore(BLOG_STORE);
    store.clear();
    blogs.forEach((blog) => store.put(blog));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function useBlogs() {
  const [blogs, setBlogs] = useState<any[]>([]);

  const refresh = () => {
    supabase.from('blog_posts').select('*').eq('status', 'published').order('published_at', { ascending: false, nullsFirst: false }).limit(3)
      .then(({ data, error }) => {
        if (!error) setBlogs((data || []).filter((p: any) => !p.scheduled_for || new Date(p.scheduled_for).getTime() <= Date.now()));
      });
  };

  useEffect(() => {
    refresh();
    const handler = () => refresh();
    window.addEventListener('omr-blog-changed', handler);
    return () => window.removeEventListener('omr-blog-changed', handler);
  }, []);

  return [blogs, setBlogs] as const;
}

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function PublicSite({ blogs }: { blogs: any[] }) {
  const [menu, setMenu] = useState(false);

  const nav = (id: string) => {
    setMenu(false);
    scrollToId(id);
  };

  return (
    <div className="site">
      <div className="site-bg" />
      <header className="nav">
        <button className="brand" onClick={() => nav('home')}>
          <img src="/resources/logo.png" alt="One More Rep Logo" />
          <span>ONE MORE <b>REP</b></span>
        </button>

        <nav className={menu ? 'nav-links open' : 'nav-links'}>
          <button onClick={() => nav('home')}>Home</button>
          <button onClick={() => nav('about')}>About Us</button>
          <button onClick={() => nav('programs')}>Programs</button>
          <button onClick={() => nav('recovery')}>Recovery</button>
          <button onClick={() => nav('contact')}>Contact Us</button>
          <button onClick={() => { setMenu(false); window.location.hash = '#/blog'; }}>Blog</button>
        </nav>

        <a className="nav-join" href={joinUrl} target="_blank" rel="noreferrer">JOIN US <ArrowRight size={15} /></a>
        <button className="menu" onClick={() => setMenu(!menu)} aria-label="Toggle navigation">
          {menu ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <main>
        <section id="home" className="hero">
          <div className="hero-overlay" />
          <div className="hero-copy">
            <h1>YOUR FITNESS<br />JOURNEY <em>STARTS</em><br /><em>WITH US</em></h1>
            <p>From state-of-the-art training plans to premium recovery suites, everything here is built for results — yours.</p>
            <a className="primary" href={joinUrl} target="_blank" rel="noreferrer">LET'S GO FIT <ArrowRight size={18} /></a>
          </div>
        </section>

        <section id="about" className="why section">
          <div className="section-tag">WHY WE'RE NOT JUST ANOTHER GYM</div>
          <div className="two-col">
            <h2>WHY WE'RE NOT<br /><span>JUST ANOTHER</span><br />GYM.</h2>
            <p className="large">From science-backed training plans to premium recovery suites and next-gen equipment, everything here is built for results — yours.</p>
          </div>
          <div className="feature-grid">
            {[
              ['01', 'BEST EQUIPMENT', 'Premium-grade strength and cardio equipment built for serious athletes and heavy lifters.'],
              ['02', 'TOP PERFORMANCE', 'Science-backed programs designed to push your limits and deliver elite-level results.'],
              ['03', 'RELIABLE SUPPORT', 'Certified personal trainers with customized periodization for fat loss, hypertrophy, and sport performance.'],
              ['04', 'INNOVATIVE TECHNOLOGY', 'AI-powered body composition analysis to scientifically track your progress with clinical precision.'],
            ].map(([n, title, text]) => (
              <article className="feature" key={n}>
                <span>{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="programs" className="programs section">
          <div className="section-tag">OUR PROGRAMS</div>
          <div className="two-col">
            <h2>PLANS THAT FIT YOU — NOT<br /><span>THE OTHER WAY AROUND</span></h2>
            <p className="large">Whether you're just getting started or leveling up, we've got a plan that meets your goals and your schedule.</p>
          </div>
          <div className="program-grid">
            {programs.map(([title, image]) => (
              <article className="program-card" key={title}>
                <img src={image} alt={title} />
                <div className="card-shade" />
                <h3>{title}</h3>
              </article>
            ))}
          </div>
        </section>

        <section id="recovery" className="recovery section">
          <div className="section-tag">SIGNATURE RECOVERY SUITE</div>
          <h2>PREMIUM <span>STEAM</span> &amp; ICE BATH</h2>
          <p className="center-copy">Recover. Rejuvenate. Perform. Our thermal recovery suite accelerates muscle repair and revitalizes your body after every session.</p>
          <div className="recovery-grid">
            <article className="recovery-card">
              <img src="/resources/steam-room.png" alt="Steam Recovery Suite" />
              <div><small>THERMAL RECOVERY</small><h3>STEAM RECOVERY</h3><p>Heated thermal sauna engineered to dilate blood vessels, accelerate muscle relaxation, and flush metabolic waste.</p><a href="tel:+917338887968">+91 7338887968</a></div>
            </article>
            <article className="recovery-card">
              <img src="/resources/ice-bath.png" alt="Ice Bath Therapy" />
              <div><small>CRYOTHERAPY PLUNGE</small><h3>ICE BATH THERAPY</h3><p>Cold plunge therapy to suppress inflammation, relieve soreness, and supercharge central nervous system recovery.</p><a href="tel:+917338887968">+91 7338887968</a></div>
            </article>
          </div>
        </section>

        <section className="ai section">
          <div className="ai-image"><img src="/resources/hero-bg.png" alt="AI Body Composition Scanner" /></div>
          <div className="ai-copy">
            <div className="section-tag">ADVANCED TECHNOLOGY</div>
            <h2>AI BODY COMPOSITION <span>ANALYSIS</span></h2>
            <p>Experience next-generation body diagnostics. Our AI-powered scanner maps segmental lean mass, visceral fat levels, extracellular water ratio, and true metabolic age with clinical precision.</p>
            <div className="metrics"><div><strong>99.2%</strong><small>SCAN PRECISION</small></div><div><strong>60s</strong><small>COMPLETE REPORT</small></div></div>
            <a className="primary" href={joinUrl} target="_blank" rel="noreferrer">SCHEDULE AI SCAN <ArrowRight size={18} /></a>
          </div>
        </section>

        <section className="philosophy section">
          <div className="philosophy-copy">
            <div className="section-tag">OUR PHILOSOPHY</div>
            <h2>THIS ISN'T JUST ABOUT LOOKING GOOD — IT'S ABOUT FEELING <span>UNSTOPPABLE</span></h2>
            <p>Whether you're easing into fitness or pushing for peak performance, we've got a membership that fits your goals, time, and lifestyle.</p>
            <div className="philosophy-points"><span>✓ Boosted Energy</span><span>✓ Mental Clarity</span><span>✓ Daily Discipline</span><span>✓ Reduced Stress</span></div>
            <a className="primary" href={joinUrl} target="_blank" rel="noreferrer">START YOUR JOURNEY <ArrowRight size={18} /></a>
          </div>
          <img src="/resources/about-section.png" alt="Confident Athlete at One More Rep" />
        </section>

        <section className="about-story section">
          <div className="section-tag">THE PHILOSOPHY OF "ONE MORE REP"</div>
          <h2>THE PHILOSOPHY OF <span>"ONE MORE REP"</span></h2>
          <blockquote>"Most people stop when they get tired. We stop when we are done."</blockquote>
          <p>The truth is, fitness isn't just about the mirror. It’s about the grit you develop when you're staring at the clock, sweat dripping, lungs burning, and you choose to push for one more.</p>
          <p>One More Rep isn't just a studio; it is a movement. It is a sanctuary for those who understand that health is the ultimate currency—and there is no room for compromise. We aren't here to build bodies that look good; we are here to build characters that stand tall.</p>
          <h3>More Than a Workout</h3>
          <ul>
            <li><b>Discipline:</b> Learning that your goals don't care about your mood or your excuses.</li>
            <li><b>Commitment:</b> Proving that when you say you’ll do something, you see it through.</li>
            <li><b>Hard Work:</b> Understanding that there are no shortcuts to greatness.</li>
            <li><b>Self-Love:</b> Making the radical decision to invest in the only body you will ever have.</li>
          </ul>
          <h3>The Turning Point</h3>
          <p><strong>We are opening our doors on July 19th.</strong></p>
          <p>Stop waiting for the "perfect time" to start. The perfect time is the day you decide to walk through our doors and refuse to quit.</p>
          <p className="red-copy">One More Rep. One more day. One better version of you.</p>
        </section>

        <section id="blog-preview" className="blog-preview section">
          <div className="section-tag">FROM THE STUDIO</div>
          <div className="blog-preview-head">
            <div>
              <h2>THIS WEEK AT <span>ONE MORE REP</span></h2>
              <p>Training updates, weekly events, challenges and moments from the studio.</p>
            </div>
            <a className="primary" href="#/blog">VIEW ALL UPDATES <ArrowRight size={18} /></a>
          </div>
          {blogs.length > 0 && <div className="blog-preview-grid">
            {blogs.slice(0, 3).map((b) => {
              const mediaItems = getMediaItems(b);
              return <a className="blog-preview-card" href={`#/blog/${b.id}`} key={b.id}>
                {mediaItems[0]?.type === 'video' ? <video src={mediaItems[0].src} muted /> : <img src={mediaItems[0]?.src} alt={b.title} />}
                <div><small>{b.date}</small><h3>{b.title}</h3><p>{b.excerpt}</p><span className="read-more">VIEW UPDATE <ArrowRight size={14} /></span></div>
              </a>;
            })}
          </div>}
        </section>

        <section id="contact" className="location section">
          <div className="section-tag">STUDIO ADDRESS</div>
          <h2>WHERE TO <span>FIND US</span></h2>
          <div className="location-grid">
            <div>
              <h3>ONE MORE REP FITNESS STUDIO</h3>
              <p>No.5, Green House,<br />Opp. of A Ground,<br />Matha Complex,<br />Kovaipudur, Coimbatore – 641 042</p>
              <a href="tel:+917338887968" className="location-link"><Phone size={17} /> +91 7338887968</a>
              <p>Studio Hours (5:30 AM – 10:00 PM)<br />Morning: 5:30 AM – 9:30 AM<br />Mid-Day: 9:30 AM – 12:30 PM (Ladies Only)<br />Evening: 5:00 PM – 10:00 PM</p>
              <a href="https://www.google.com/maps?cid=3095383306853649920&hl=en-US" target="_blank" rel="noreferrer" className="location-link"><MapPin size={17} /> GET DIRECTIONS</a>
            </div>
            <iframe title="One More Rep Fitness Studio location" src="https://www.google.com/maps?output=embed&q=One%20More%20Rep%20Fitness%20Studio%20Kovaipudur%20Coimbatore" loading="lazy" />
          </div>
        </section>

        <section className="hiring section">
          <div className="hiring-card">
            <div className="section-tag">JOIN OUR TEAM</div>
            <h2>GROW WITH <span>US</span></h2>
            <p>Passionate about fitness? We're always looking for motivated trainers and specialists to join ONE MORE REP FITNESS STUDIO.</p>
            <a className="primary" href="https://docs.google.com/forms/d/e/1FAIpQLScGwknMedAKkPSsX9ZAd7gar5pyupYWwEGw76EIlY5QCrl15Q/viewform?usp=dialog" target="_blank" rel="noreferrer">JOIN OUR TEAM <ArrowRight size={18} /></a>
          </div>
        </section>

        <footer className="footer">
          <div className="footer-brand"><img src="/resources/logo.png" alt="One More Rep Logo" /><strong>ONE MORE <span>REP</span></strong><p>Train More. Push More. Be More.</p></div>
          <div><h4>Navigation</h4><button onClick={() => nav('home')}>Home</button><button onClick={() => nav('about')}>About Us</button><button onClick={() => nav('programs')}>Programs</button><button onClick={() => nav('recovery')}>Recovery</button><a href="#/blog">Blog</a></div>
          <div><h4>Contact</h4><a href="tel:+917338887968">+91 7338887968</a><a href="https://wa.me/917338887968" target="_blank" rel="noreferrer">WhatsApp Studio</a><p>No.5, Green House, Opp. of A Ground,<br />Matha Complex, Kovaipudur – 641 042</p></div>
          <div><h4>Follow Us</h4><a href="https://www.instagram.com/onemorerepofficial2026" target="_blank" rel="noreferrer"><Instagram size={18} /> Instagram</a></div>
          <small>© 2026 One More Rep Fitness Studio. All rights reserved.</small>
        </footer>
      </main>

      <button className="back-top" onClick={() => scrollToId('home')} aria-label="Back to top"><ArrowDown size={18} /></button>
      <a className="wa" href="https://wa.me/917338887968?text=Hi%2C%20I%20want%20to%20know%20more%20about%20ONE%20MORE%20REP%20Fitness%20Studio." target="_blank" rel="noreferrer">◔</a>
    </div>
  );
}

function getMediaItems(blog: any) {
  if (Array.isArray(blog.mediaItems) && blog.mediaItems.length) return blog.mediaItems;
  if (blog.media) return [{ id: `legacy-${blog.id}`, type: blog.mediaType === 'video' ? 'video' : 'image', src: blog.media, name: blog.title }];
  return [];
}

function BlogPage({ blogs }: { blogs: any[] }) {
  return (
    <div className="blog-page">
      <header className="blog-top"><a href="#" className="blog-logo"><img src="/resources/logo.png" alt="" /> ONE MORE <span>REP</span></a><a href="#" className="blog-back"><ArrowLeft size={16} /> BACK TO WEBSITE</a></header>
      <main className="blog-main">
        <p className="section-tag">THIS WEEK AT ONE MORE REP</p>
        <h1>WEEKLY <span>UPDATES.</span></h1>
        <p className="blog-intro">Weekly events, announcements, challenges and community moments from the studio.</p>
        {blogs.length === 0 ? (
          <div className="blog-empty"><h2>NO UPDATES YET.</h2><p>Weekly events and workout highlights will appear here when the studio publishes them.</p></div>
        ) : (
          <div className="blog-grid">{blogs.map((b) => {
            const mediaItems = getMediaItems(b);
            return (
              <a className="public-blog-card blog-link-card" href={`#/blog/${b.id}`} key={b.id}>
                <div className="blog-card-cover">
                  {mediaItems[0]?.type === 'video' ? <video src={mediaItems[0].src} muted /> : <img src={mediaItems[0]?.src} alt={b.title} />}
                  {mediaItems.length > 1 && <span className="media-count">{mediaItems.length} MEDIA</span>}
                </div>
                <div><small>{b.date}</small><h2>{b.title}</h2><p>{b.excerpt}</p><span className="read-more">VIEW UPDATE <ArrowRight size={15} /></span></div>
              </a>
            );
          })}</div>
        )}
      </main>
    </div>
  );
}

function BlogDetailPage({ blog }: { blog: any }) {
  const mediaItems = getMediaItems(blog);
  return (
    <div className="blog-page blog-detail-page">
      <header className="blog-top"><a href="#/blog" className="blog-logo"><img src="/resources/logo.png" alt="" /> ONE MORE <span>REP</span></a><a href="#/blog" className="blog-back"><ArrowLeft size={16} /> ALL UPDATES</a></header>
      <main className="blog-detail-main">
        <p className="section-tag">ONE MORE REP • WEEKLY UPDATE</p>
        <small className="blog-detail-date">{blog.date}</small>
        <h1>{blog.title}</h1>
        <p className="blog-detail-excerpt">{blog.excerpt}</p>
        <div className="blog-detail-media">
          {mediaItems.map((media: any) => (
            <figure key={media.id}>
              {media.type === 'video' ? <video src={media.src} controls playsInline /> : <img src={media.src} alt={blog.title} />}
              <figcaption>{media.type === 'video' ? 'WORKOUT VIDEO' : 'STUDIO IMAGE'}</figcaption>
            </figure>
          ))}
        </div>
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: () => void }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [error, setError] = useState('');

  return <div className="login-page"><div className="login-card"><a href="#" className="back"><ArrowLeft size={17} /> BACK TO WEBSITE</a><img src="/resources/logo.png" alt="One More Rep" /><p className="red">ADMIN ACCESS</p><h1>WELCOME <em>BACK.</em></h1><form onSubmit={(e) => { e.preventDefault(); if (u === 'admin' && p === 'admin123') { localStorage.setItem('omr_admin', '1'); onLogin(); } else setError('Invalid credentials'); }}><label>USERNAME<input value={u} onChange={(e) => setU(e.target.value)} /></label><label>PASSWORD<input type="password" value={p} onChange={(e) => setP(e.target.value)} /></label>{error && <div className="login-error">{error}</div>}<button className="admin-add">LOGIN <ArrowRight size={17} /></button></form><small className="dummy">Dummy credentials: <b>admin</b> / <b>admin123</b></small></div></div>;
}

function Admin({ blogs, setBlogs, onExit }: { blogs: any[]; setBlogs: (v: any[]) => void; onExit: () => void }) {
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [mediaItems, setMediaItems] = useState<{ id: string; type: 'image' | 'video'; src: string; name: string }[]>([]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !excerpt || mediaItems.length === 0) return;
    const first = mediaItems[0];
    setBlogs([{
      id: Date.now().toString(),
      title,
      excerpt,
      date: new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      mediaType: first.type,
      media: first.src,
      mediaItems,
    }, ...blogs]);
    setTitle('');
    setExcerpt('');
    setMediaItems([]);
  };

  const files = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    Promise.all(selected.map((f) => new Promise<{ id: string; type: 'image' | 'video'; src: string; name: string }>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        type: f.type.startsWith('video') ? 'video' : 'image',
        src: String(reader.result),
        name: f.name,
      });
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(f);
    }))).then((items) => {
      setMediaItems((current) => [...current, ...items]);
      e.target.value = '';
    });
  };

  return <div className="admin"><header className="admin-top"><div className="admin-brand"><img src="/resources/logo.png" alt="" /><span>ONE MORE REP</span><small>CONTENT ADMIN</small></div><button onClick={onExit}><LogOut size={16} /> LOG OUT</button></header><main className="admin-wrap"><p className="section-tag red">ADMIN DASHBOARD</p><h1>WEEKLY <em>UPDATES.</em></h1><div className="admin-grid"><form className="admin-form" onSubmit={submit}><div className="section-tag red">CREATE BLOG</div><label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Saturday Strength Challenge" /></label><label>Update<textarea value={excerpt} onChange={(e) => setExcerpt(e.target.value)} placeholder="Tell members what is happening this week..." /></label><label>Media<input type="file" accept="image/*,video/*" multiple onChange={files} /></label><p className="upload-help">Select any combination of images and videos. You can choose multiple files at once.</p>{mediaItems.length > 0 && <div className="upload-grid">{mediaItems.map((m) => <div className="upload-preview" key={m.id}>{m.type === 'video' ? <video src={m.src} controls /> : <img src={m.src} alt={m.name} />}<button type="button" onClick={() => setMediaItems((items) => items.filter((x) => x.id !== m.id))}><X size={14} /></button><small>{m.type.toUpperCase()}</small></div>)}</div>}<button className="admin-add" type="submit" disabled={!title || !excerpt || mediaItems.length === 0}><Plus size={17} /> PUBLISH UPDATE{mediaItems.length ? ` (${mediaItems.length})` : ''}</button></form><div className="admin-list"><div className="section-tag red">PUBLISHED UPDATES</div>{blogs.map((b) => <article className="admin-item" key={b.id}><div>{b.mediaType === 'video' ? <video src={b.media} muted /> : <img src={b.media} alt={b.title} />}</div><section><small>{b.date}</small><h3>{b.title}</h3><p>{b.excerpt}</p><button onClick={() => setBlogs(blogs.filter((x) => x.id !== b.id))}><Trash2 size={15} /> DELETE</button></section></article>)}</div></div></main></div>;
}

export default function App() {
  const [blogs, setBlogs] = useBlogs();
  const [route, setRoute] = useState(window.location.hash);
  const [logged, setLogged] = useState(localStorage.getItem('omr_admin') === '1');

  useEffect(() => {
    const h = () => setRoute(window.location.hash);
    addEventListener('hashchange', h);
    return () => removeEventListener('hashchange', h);
  }, []);

  if (route === '#/admin/login') return <BlogCMS mode="admin" onExit={() => { localStorage.removeItem('omr_admin'); setLogged(false); window.location.hash = ''; }} />;
  if (route === '#/blog') return <BlogCMS mode="list" />;
  if (route.startsWith('#/blog/')) return <BlogCMS mode="detail" slug={decodeURIComponent(route.slice('#/blog/'.length))} />;
  return <PublicSite blogs={blogs} />;
}
