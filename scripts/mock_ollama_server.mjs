import http from 'node:http';

const port = Number(process.env.MOCK_OLLAMA_PORT ?? 11434);
let lastRequest = null;

function send(response, status, payload) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(payload));
}

const northlineHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Northline architecture studio — spatial ideas shaped with clarity and care.">
  <title>Northline — Architecture Studio</title>
  <link rel="stylesheet" href="assets/styles.css">
  <script src="assets/site.js" defer></script>
</head>
<body>
  <header class="site-header">
    <a class="wordmark" href="#top" aria-label="Northline home">Northline<span>.</span></a>
    <nav aria-label="Primary navigation"><a href="#work">Work</a><a href="#services">Services</a><a href="#process">Process</a></nav>
    <a class="header-link" href="#contact">Start a conversation <span aria-hidden="true">↗</span></a>
  </header>
  <main id="top">
    <section class="hero" aria-labelledby="hero-title">
      <p class="eyebrow">Architecture & spatial design</p>
      <h1 id="hero-title">Places with a clear point of view.</h1>
      <div class="hero-bottom"><p>Northline explores purposeful spaces through material, light, rhythm, and restraint.</p><a class="round-link" href="#work" aria-label="Explore selected work">↓</a></div>
    </section>
    <section class="feature-grid" aria-label="Studio focus areas">
      <article class="feature feature-tall"><span>01</span><div><p class="feature-type">Built form</p><h2>Architecture framed by how people move, gather, and pause.</h2></div></article>
      <article class="feature feature-copper"><span>02</span><div><p class="feature-type">Atmosphere</p><h2>Interiors where material and daylight do the talking.</h2></div></article>
      <article class="feature feature-line"><span>03</span><div><p class="feature-type">Context</p><h2>Careful interventions that belong to their surroundings.</h2></div></article>
    </section>
    <section class="work section" id="work" aria-labelledby="work-title">
      <div class="section-heading"><p class="eyebrow">Selected work</p><h2 id="work-title">Ideas in progress.</h2><p>Each study begins with a question about place, use, and what should remain.</p></div>
      <div class="work-list">
        <article class="work-item"><div class="work-image image-one" aria-hidden="true"></div><div class="work-meta"><span>Residential</span><h3>Courtyard study</h3><span>01</span></div></article>
        <article class="work-item"><div class="work-image image-two" aria-hidden="true"></div><div class="work-meta"><span>Cultural</span><h3>Lightwell study</h3><span>02</span></div></article>
        <article class="work-item"><div class="work-image image-three" aria-hidden="true"></div><div class="work-meta"><span>Workplace</span><h3>Threshold study</h3><span>03</span></div></article>
      </div>
    </section>
    <section class="services section" id="services" aria-labelledby="services-title">
      <div class="section-heading"><p class="eyebrow">Services</p><h2 id="services-title">From first line to final detail.</h2></div>
      <div class="service-list"><article><span>01</span><h3>Architecture</h3><p>Brief development, concept design, planning, and coordinated documentation.</p></article><article><span>02</span><h3>Interior design</h3><p>Spatial planning, material palettes, lighting direction, and custom elements.</p></article><article><span>03</span><h3>Design advisory</h3><p>Early-stage clarity for teams shaping the next move in a place or project.</p></article></div>
    </section>
    <section class="process section" id="process" aria-labelledby="process-title">
      <div class="section-heading"><p class="eyebrow">Process</p><h2 id="process-title">A measured way forward.</h2></div>
      <ol><li><span>01</span><div><h3>Listen closely</h3><p>We define the decision that matters, the constraints around it, and the potential within it.</p></div></li><li><span>02</span><div><h3>Test possibilities</h3><p>We use drawings, models, and material studies to turn a direction into something you can assess.</p></div></li><li><span>03</span><div><h3>Refine with care</h3><p>We develop the chosen idea into a coherent, buildable response with attention to every scale.</p></div></li></ol>
    </section>
    <section class="contact" id="contact" aria-labelledby="contact-title"><p class="eyebrow">New enquiries</p><h2 id="contact-title">Bring us to the table early.</h2><p>Tell us about the place, the question, and the moment you are working toward.</p><a href="mailto:hello@example.com">Begin a conversation <span aria-hidden="true">↗</span></a></section>
  </main>
  <footer><a class="wordmark" href="#top">Northline<span>.</span></a><p>Independent architecture studio.</p><a href="#top">Back to top ↑</a></footer>
</body>
</html>`;

const northlineCss = `@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Manrope:wght@400;500;600;700;800&display=swap');
:root{--ink:#161718;--warm:#e9e3d8;--paper:#f4f0e9;--copper:#c7794a;--line:rgba(244,240,233,.22)}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--ink);color:var(--warm);font-family:Manrope,Arial,sans-serif}.site-header{height:82px;display:flex;align-items:center;justify-content:space-between;padding:0 5.5vw;border-bottom:1px solid var(--line);position:relative;z-index:2}.wordmark{font-size:25px;font-weight:800;letter-spacing:-1.6px;color:inherit;text-decoration:none}.wordmark span{color:var(--copper)}nav{display:flex;gap:30px}a{color:inherit}nav a,.header-link{font-size:12px;font-weight:700;text-decoration:none}.header-link{border-bottom:1px solid var(--copper);padding-bottom:4px}.hero{min-height:calc(100vh - 82px);display:flex;flex-direction:column;justify-content:space-between;padding:8vw 5.5vw 4vw;background:radial-gradient(circle at 76% 38%,#3d332c 0,transparent 29%),linear-gradient(125deg,#1b1b1b 0%,#151617 57%,#28211e 100%)}.eyebrow{margin:0;color:var(--copper);font:500 10px/1.3 'DM Mono',monospace;letter-spacing:1.5px;text-transform:uppercase}.hero h1{max-width:980px;margin:5vw 0;font-size:clamp(56px,9.4vw,146px);letter-spacing:-.075em;line-height:.88;font-weight:700}.hero-bottom{display:flex;align-items:end;justify-content:space-between;gap:24px}.hero-bottom p{max-width:320px;margin:0;font-size:15px;line-height:1.65;color:#d2ccc3}.round-link{display:grid;place-items:center;width:55px;height:55px;border:1px solid var(--copper);border-radius:50%;text-decoration:none;font-size:25px}.feature-grid{display:grid;grid-template-columns:1.2fr .8fr 1fr;gap:1px;background:var(--line)}.feature{min-height:440px;padding:34px;background:var(--ink);display:flex;flex-direction:column;justify-content:space-between}.feature>span,.service-list>article>span,.process li>span{font:500 10px 'DM Mono',monospace;color:var(--copper)}.feature h2{max-width:370px;margin:8px 0 0;font-size:clamp(24px,2.5vw,39px);line-height:1.06;letter-spacing:-.055em}.feature-type{margin:0;color:#a9a39a;font-size:12px}.feature-copper{background:var(--copper);color:#211917}.feature-copper>span{color:#211917}.feature-line{background:linear-gradient(140deg,#202123 0%,#202123 48%,#b66e44 48.1%,#b66e44 49%,#202123 49.1%)}.section{padding:11vw 5.5vw}.section-heading{display:grid;grid-template-columns:1fr 2fr 1fr;gap:30px;align-items:start;margin-bottom:65px}.section-heading h2{margin:0;font-size:clamp(42px,5.3vw,78px);line-height:.94;letter-spacing:-.07em}.section-heading>p:last-child{margin:0;color:#aaa49a;line-height:1.65;font-size:14px}.work{background:var(--paper);color:var(--ink)}.work .eyebrow{color:#a0542d}.work-list{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.work-image{height:34vw;min-height:340px;background:#b7afa5}.image-one{background:linear-gradient(136deg,#c6beb2 0 46%,#807b75 46% 49%,#dbd5cb 49% 70%,#6d6862 70%)}.image-two{background:radial-gradient(ellipse at 55% 34%,#dfd8cd 0 15%,transparent 15.5%),linear-gradient(115deg,#888782 0 48%,#c4bdb3 48% 51%,#777671 51%)}.image-three{background:linear-gradient(90deg,#6c665e 0 10%,#d9d0c1 10% 37%,#897f71 37% 41%,#beb4a6 41% 75%,#6a655e 75%)}.work-meta{display:grid;grid-template-columns:1fr auto;gap:5px;margin-top:14px;font-size:11px;color:#6b645e}.work-meta h3{grid-column:1/2;margin:0;font-size:19px;color:var(--ink);letter-spacing:-.04em}.services{border-top:1px solid var(--line)}.service-list{display:grid;grid-template-columns:repeat(3,1fr);border-top:1px solid var(--line)}.service-list article{padding:28px 28px 14px 0;border-right:1px solid var(--line);min-height:240px}.service-list article+article{padding-left:28px}.service-list article:last-child{border:0}.service-list h3,.process h3{font-size:25px;letter-spacing:-.045em;margin:54px 0 10px}.service-list p,.process p{max-width:290px;margin:0;color:#aaa49a;font-size:14px;line-height:1.65}.process{background:#222322}.process ol{list-style:none;padding:0;margin:0;border-top:1px solid var(--line)}.process li{display:grid;grid-template-columns:1fr 2fr;padding:28px 0;border-bottom:1px solid var(--line)}.process h3{margin:0 0 9px}.contact{padding:13vw 5.5vw;background:var(--copper);color:#201816}.contact .eyebrow{color:#332117}.contact h2{max-width:1000px;margin:28px 0 20px;font-size:clamp(52px,8vw,118px);letter-spacing:-.075em;line-height:.9}.contact p:not(.eyebrow){max-width:410px;line-height:1.65}.contact a{display:inline-block;margin-top:44px;padding-bottom:5px;border-bottom:1px solid currentColor;font-size:15px;font-weight:800;text-decoration:none}footer{display:flex;align-items:center;justify-content:space-between;padding:34px 5.5vw;background:#101111;color:#99938b;font-size:11px}footer .wordmark{color:var(--warm)}footer a:last-child{color:var(--warm)}@media(max-width:760px){.site-header{padding:0 24px;height:68px}.site-header nav{display:none}.header-link{font-size:10px}.hero{min-height:610px;padding:70px 24px 28px}.hero h1{font-size:clamp(54px,16vw,90px)}.feature-grid,.work-list,.service-list{grid-template-columns:1fr}.feature{min-height:330px}.section{padding:86px 24px}.section-heading{display:block;margin-bottom:42px}.section-heading h2{margin:18px 0}.section-heading>p:last-child{max-width:330px}.work-image{height:90vw;min-height:0}.service-list article,.service-list article+article{border-right:0;border-bottom:1px solid var(--line);padding:26px 0;min-height:0}.service-list h3{margin:35px 0 9px}.process li{grid-template-columns:70px 1fr}.contact{padding:100px 24px}footer{padding:26px 24px;gap:18px}.hero-bottom{align-items:end}}`;

const northlineScript = `document.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', (event) => { const target = document.querySelector(link.getAttribute('href')); if (target) { event.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); } }));`;
const northlineData = JSON.stringify({ project: 'Northline architecture studio', sections: ['hero', 'work', 'services', 'process', 'contact'], responsive: true }, null, 2);
const northlineReadme = `# Northline Architecture Studio\n\nA static multi-file website project. Open index.html in a modern browser. Styles, behaviour, and site data are organised in the assets folder.`;

const orbitPackage = JSON.stringify({ name: 'orbit-studio', private: true, type: 'module', scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' }, dependencies: { react: '^19.2.0', 'react-dom': '^19.2.0' }, devDependencies: { '@vitejs/plugin-react': '^5.0.0', vite: '^8.2.0' } }, null, 2);
const orbitViteConfig = `import { defineConfig } from 'vite';\nimport react from '@vitejs/plugin-react';\n\nexport default defineConfig({ plugins: [react()] });\n`;
const orbitIndex = `<!doctype html><html lang="en"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><meta name="description" content="Orbit Studio digital product design." /><title>Orbit Studio</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>`;
const orbitMain = `import { StrictMode } from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\nimport './styles.css';\n\ncreateRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>);\n`;
const orbitApp = `import { useState } from 'react';\nimport { StudioCard } from './components/StudioCard';\nimport { studioProjects } from './data/studio';\n\nexport default function App() {\n  const [contrast, setContrast] = useState(false);\n  return <main className={contrast ? 'app app-high-contrast' : 'app'}>\n    <header className="site-header"><a className="brand" href="#top">Orbit<span>Studio</span></a><nav aria-label="Primary navigation"><a href="#work">Work</a><a href="#approach">Approach</a></nav><button className="contrast-button" type="button" onClick={() => setContrast((value) => !value)}>{contrast ? 'Soft contrast' : 'High contrast'}</button></header>\n    <section className="hero" id="top"><p className="kicker">Independent product design</p><h1>Digital systems with a human orbit.</h1><p className="hero-copy">Orbit Studio helps teams turn ambitious ideas into useful, memorable product experiences.</p><a className="hero-link" href="#work">Explore selected work <span aria-hidden="true">↓</span></a></section>\n    <section className="projects" id="work" aria-labelledby="work-title"><div className="section-intro"><p className="kicker">Selected work</p><h2 id="work-title">Clear outcomes, carefully shaped.</h2></div><div className="project-grid">{studioProjects.map((project) => <StudioCard key={project.title} project={project} />)}</div></section>\n    <section className="approach" id="approach"><p className="kicker">Approach</p><h2>Observe, frame, make, refine.</h2><p>We create shared understanding before moving to the smallest useful interface detail.</p></section>\n    <footer><span>Orbit Studio</span><a href="#top">Back to top ↑</a></footer>\n  </main>;\n}\n`;
const orbitCard = `type Project = { title: string; type: string; summary: string; tone: string };\n\nexport function StudioCard({ project }: { project: Project }) {\n  return <article className="project-card"><div className={\`project-visual \${project.tone}\`} aria-hidden="true"><span>{project.type}</span></div><h3>{project.title}</h3><p>{project.summary}</p></article>;\n}\n`;
const orbitData = `export const studioProjects = [\n  { title: 'Signal map', type: 'Service design', summary: 'A shared way to understand journeys, decisions, and service moments.', tone: 'tone-sun' },\n  { title: 'Common ground', type: 'Product direction', summary: 'A focused workspace for teams building clarity together.', tone: 'tone-sky' },\n  { title: 'Field notes', type: 'Editorial system', summary: 'A lightweight publication experience with room to think.', tone: 'tone-leaf' }\n];\n`;
const orbitStyles = `:root{font-family:Inter,ui-sans-serif,system-ui,sans-serif;color:#18222d;background:#f4f1ea}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0}.app{min-height:100vh;background:#f4f1ea;color:#18222d;transition:.2s}.app-high-contrast{background:#fff;color:#07131f}.site-header,footer{display:flex;align-items:center;justify-content:space-between;padding:24px 6vw;border-bottom:1px solid #cfd3d0}.brand{color:inherit;text-decoration:none;font-size:23px;font-weight:800;letter-spacing:-.08em}.brand span{color:#4b65d6;margin-left:4px}nav{display:flex;gap:24px}nav a,footer a{color:inherit;font-size:13px;text-decoration:none}.contrast-button{border:1px solid #18222d;border-radius:999px;background:transparent;color:inherit;padding:8px 12px;font:inherit;font-size:12px;cursor:pointer}.hero{min-height:72vh;padding:12vw 6vw 8vw;background:radial-gradient(circle at 78% 28%,#b7c7ff 0,transparent 26%),linear-gradient(135deg,#f4f1ea,#e8e2d8)}.kicker{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#4b65d6}.hero h1,.section-intro h2,.approach h2{max-width:900px;margin:26px 0;font-size:clamp(52px,8vw,118px);line-height:.88;letter-spacing:-.075em}.hero-copy{max-width:430px;font-size:18px;line-height:1.6}.hero-link{display:inline-flex;gap:12px;margin-top:32px;color:inherit;font-weight:700;text-decoration:none;border-bottom:1px solid currentColor;padding-bottom:5px}.projects,.approach{padding:9vw 6vw}.section-intro{display:flex;align-items:end;justify-content:space-between;gap:30px}.section-intro h2{font-size:clamp(40px,5vw,74px)}.project-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.project-card h3{margin:15px 0 6px;font-size:25px;letter-spacing:-.05em}.project-card p{margin:0;line-height:1.6;color:#53616d}.project-visual{display:flex;align-items:end;min-height:330px;padding:20px;color:#17202a;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.tone-sun{background:linear-gradient(135deg,#f4c66e,#f7e6bf)}.tone-sky{background:linear-gradient(135deg,#90a8e8,#d9e5ff)}.tone-leaf{background:linear-gradient(135deg,#7eac98,#dce5cb)}.approach{background:#18222d;color:#f4f1ea}.approach h2{font-size:clamp(40px,5vw,74px)}.approach>p:last-child{max-width:480px;line-height:1.7;color:#d4dce1}footer{border-top:1px solid #cfd3d0;border-bottom:0;font-size:12px}@media(max-width:760px){.site-header{padding:20px 24px}nav{display:none}.hero,.projects,.approach{padding:90px 24px}.project-grid{grid-template-columns:1fr}.project-visual{min-height:240px}.hero h1{font-size:clamp(54px,16vw,84px)}}\n`;
const orbitReadme = `# Orbit Studio\n\n## Run locally\n\n1. Run \`pnpm install\`.\n2. Run \`pnpm dev\` for local development.\n3. Run \`pnpm build\` to create a production bundle.\n\nThe project uses React and Vite with source files organised by entry point, component, data, and styles.\n`;
function orbitProject(isRevision) {
  const app = isRevision ? orbitApp.replace('Digital systems with a human orbit.', 'Digital systems with a clearer orbit.') : orbitApp;
  return {
    project_name: 'orbit-studio',
    framework: 'react',
    files: [
      { path: 'package.json', content: orbitPackage },
      { path: 'vite.config.ts', content: orbitViteConfig },
      { path: 'index.html', content: orbitIndex },
      { path: 'README.md', content: orbitReadme },
      { path: 'src/main.tsx', content: orbitMain },
      { path: 'src/App.tsx', content: app },
      { path: 'src/components/StudioCard.tsx', content: orbitCard },
      { path: 'src/data/studio.ts', content: orbitData },
      { path: 'src/styles.css', content: orbitStyles }
    ],
    dependencies: ['react', 'react-dom'],
    instructions: 'Run pnpm install, then pnpm dev. Use pnpm build to create a production bundle.'
  };
}

const server = http.createServer((request, response) => {
  if (request.method === 'GET' && request.url === '/api/tags') return send(response, 200, { models: [{ name: 'nuvora-test-model:latest' }] });
  if (request.method === 'GET' && request.url === '/__last_request') return send(response, 200, lastRequest ?? {});
  if (request.method !== 'POST' || request.url !== '/api/chat') return send(response, 404, { error: 'Not found' });

  let raw = '';
  request.on('data', (chunk) => { raw += chunk; });
  request.on('end', () => {
    try {
      const payload = JSON.parse(raw);
      lastRequest = payload;
      const prompt = String(payload.messages?.find((message) => message.role === 'user')?.content ?? '');
      const isRevision = prompt.includes('PROJECT CHANGE REQUEST:');
      const wantsReact = JSON.stringify(payload.messages ?? []).includes('React + Vite');
      if (payload.model === 'bad-output') return send(response, 200, { message: { content: JSON.stringify({ project_name: 'bad-output', framework: 'html', files: [{ path: 'index.html', content: '<html><body>Lorem ipsum</body></html>' }], dependencies: [], instructions: 'bad' }) } });
      const editedCss = northlineCss.replaceAll('#c7794a', '#4c8dff').replaceAll('#b66e44', '#4c8dff').replaceAll('#a0542d', '#2f6fd8');
      const editedHtml = northlineHtml.replace('Architecture & spatial design', 'Architecture & digital experience design').replace('Places with a clear point of view.', 'Places with a sharper point of view.');
      const project = wantsReact ? orbitProject(isRevision) : { project_name: 'northline-architecture', framework: 'html', files: [{ path: 'index.html', content: isRevision ? editedHtml : northlineHtml }, { path: 'README.md', content: northlineReadme }, { path: 'assets/styles.css', content: isRevision ? editedCss : northlineCss }, { path: 'assets/site.js', content: northlineScript }, { path: 'assets/content.json', content: northlineData }], dependencies: [], instructions: 'Open index.html in a modern browser.' };
      return send(response, 200, { message: { content: JSON.stringify(project) } });
    } catch (error) { return send(response, 400, { error: error instanceof Error ? error.message : 'Invalid JSON' }); }
  });
});

server.listen(port, '127.0.0.1', () => console.log(`MOCK_OLLAMA_READY ${port}`));
