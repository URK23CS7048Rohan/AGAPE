/* =========================================================
   AGAPE — the opening story, painted in 3D (three.js)
   A sacred-art palette: lapis, gold leaf, cream, vermilion.
   I   Night: the heavens — Milky Way, shooting stars, the moon,
       Jerusalem asleep with lamps in its windows.
   II  Dawn: the three crosses on Golgotha, pilgrims on the path,
       the shepherd and his flock, olive trees in the wind.
   III Risen: the sun breaks through, the stone rolls away and
       light pours from the empty tomb, doves rise into the gold.
   Scroll drives the story; the pointer moves the camera.
   ========================================================= */
(function () {
  "use strict";
  const THREE = window.THREE;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
  const mix = (a, b, t) => a + (b - a) * t;
  const C = (h) => new THREE.Color(h);

  function webglOK() {
    try { const c = document.createElement("canvas"); return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl"))); } catch (e) { return false; }
  }

  function create(host) {
    if (!THREE || !webglOK()) return null;
    const mobile = innerWidth < 760;
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const rr = (a, b) => a + rnd() * (b - a);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    host.appendChild(renderer.domElement);
    renderer.domElement.className = "st__gl";

    const scene = new THREE.Scene();
    const fog = new THREE.Fog(0x15244a, 40, 800);
    scene.fog = fog;
    const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 2600);
    const camBase = new THREE.Vector3(0, 7, 44);
    const look = new THREE.Vector3(0, 16, -240);
    const add = (o) => (scene.add(o), o);

    /* ---------------- textures ---------------- */
    const canvasTex = (w, h, draw) => { const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const radial = (stops) => canvasTex(256, 256, (g) => { const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); });
    const glowTex = radial([[0, "rgba(255,248,226,1)"], [0.14, "rgba(255,222,150,.95)"], [0.4, "rgba(240,170,80,.32)"], [1, "rgba(230,140,60,0)"]]);
    const softTex = radial([[0, "rgba(255,255,255,1)"], [0.35, "rgba(255,240,210,.55)"], [1, "rgba(255,230,190,0)"]]);
    const moonTex = canvasTex(256, 256, (g) => {
      const gr = g.createRadialGradient(128, 128, 30, 128, 128, 128); gr.addColorStop(0, "rgba(255,244,214,.35)"); gr.addColorStop(1, "rgba(255,244,214,0)");
      g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
      const m = document.createElement("canvas"); m.width = m.height = 256; const mg2 = m.getContext("2d");
      mg2.fillStyle = "#FFF3D6"; mg2.beginPath(); mg2.arc(128, 128, 40, 0, Math.PI * 2); mg2.fill();
      mg2.globalCompositeOperation = "destination-out"; mg2.beginPath(); mg2.arc(148, 114, 37, 0, Math.PI * 2); mg2.fill();
      g.drawImage(m, 0, 0);
    });
    const mistTex = canvasTex(512, 128, (g, w, h) => { g.scale(1, h / w); const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, "rgba(255,255,255,.9)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    const cloudTex = (sd) => canvasTex(512, 256, (g, w, h) => {
      let q = sd; const r = () => (q = (q * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 26; i++) {
        const t = i / 25, x = w * (0.16 + 0.68 * t) + (r() - 0.5) * 30, y = h * 0.66 - Math.sin(t * Math.PI) * h * (0.12 + r() * 0.12), R = h * (0.12 + r() * 0.1) * (0.6 + Math.sin(t * Math.PI) * 0.55);
        const gr = g.createRadialGradient(x, y - R * 0.35, R * 0.1, x, y, R);
        gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.55, "rgba(236,232,240,.9)"); gr.addColorStop(1, "rgba(200,205,225,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
      }
      const fade = g.createLinearGradient(0, h * 0.55, 0, h); fade.addColorStop(0, "rgba(0,0,0,0)"); fade.addColorStop(1, "rgba(0,0,0,1)");
      g.globalCompositeOperation = "destination-out"; g.fillStyle = fade; g.fillRect(0, h * 0.55, w, h * 0.45);
    });
    const streakTex = canvasTex(256, 8, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, "rgba(255,240,200,0)"); gr.addColorStop(0.85, "rgba(255,240,200,.9)"); gr.addColorStop(1, "rgba(255,255,255,1)"); g.fillStyle = gr; g.fillRect(0, 0, w, h); });

    /* ---------------- sky: lapis heavens → gold dawn ---------------- */
    const SUN_Z = -700;
    const sunPos = new THREE.Vector3(0, -60, SUN_Z);
    const skyU = { uDawn: { value: 0 }, uGold: { value: 0 }, uTime: { value: 0 }, uSun: { value: new THREE.Vector3(0, -0.1, -1) }, uStars: { value: 0 } };
    add(new THREE.Mesh(new THREE.SphereGeometry(1800, 48, 24), new THREE.ShaderMaterial({
      uniforms: skyU, side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: `
        uniform float uDawn, uGold, uTime, uStars; uniform vec3 uSun; varying vec3 vDir;
        float hash(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
        float noise(vec3 p){ vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
          return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                     mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
        void main(){
          vec3 d = normalize(vDir); float h = d.y;
          vec3 nTop=vec3(.016,.030,.085), nMid=vec3(.040,.075,.180), nHor=vec3(.085,.140,.280);
          vec3 dTop=vec3(.080,.190,.420), dMid=vec3(.420,.520,.600), dHor=vec3(1.00,.800,.470);
          vec3 top=mix(nTop,dTop,uDawn), midc=mix(nMid,dMid,uDawn), hor=mix(nHor,dHor,uDawn);
          vec3 col = mix(hor, midc, smoothstep(.0,.16,h));
          col = mix(col, top, smoothstep(.12,.6,h));
          col = mix(col, vec3(.86,.40,.20), uDawn * .5 * exp(-pow((h-.035)*22.,2.)));
          float s = max(dot(d, normalize(uSun)), 0.);
          col += vec3(1.,.72,.36)*pow(s,5.)*.5*uDawn + vec3(1.,.86,.6)*pow(s,70.)*1.1*uDawn + vec3(1.,.97,.88)*pow(s,1200.)*5.*uDawn;
          vec3 ax = normalize(vec3(.55,.62,-.56));
          float band = exp(-pow(dot(d,ax)*5.0,2.0));
          float dust = noise(d*9.)*.6 + noise(d*23.)*.4;
          col += vec3(.55,.62,.85) * band * dust * .24 * uStars * (1.-uDawn) * smoothstep(.0,.2,h);
          vec3 p = d*420.; vec3 c=floor(p); vec3 f=fract(p)-.5; float r=hash(c);
          float tw = .55+.45*sin(uTime*(.8+r*3.)+r*50.);
          float star = step(.9958 - band*.003, r) * smoothstep(.24,.0,length(f)) * tw;
          vec3 sc = mix(vec3(1.,.86,.62), vec3(.85,.9,1.), fract(r*91.));
          col += sc * star * uStars * (1.-uDawn*.92) * smoothstep(.0,.18,h) * 1.4;
          col = mix(col, vec3(1.,.84,.52), uGold);
          gl_FragColor = vec4(col,1.);
        }`,
    })));

    /* ---------------- moon, sun, rays, shooting stars ---------------- */
    const sprite = (map, o = {}) => add(new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false, blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending, color: o.color || 0xffffff, opacity: o.opacity ?? 1 })));
    const moon = sprite(moonTex); moon.scale.set(120, 120, 1); moon.position.set(-330, 300, -900);
    const sun = sprite(glowTex, { add: 1, opacity: 0 }); sun.scale.set(260, 260, 1);
    const halo = sprite(glowTex, { add: 1, opacity: 0, color: 0xffb060 }); halo.scale.set(1000, 1000, 1);
    const rayU = { uTime: { value: 0 }, uStrength: { value: 0 } };
    const rays = add(new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600), new THREE.ShaderMaterial({
      uniforms: rayU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float uTime,uStrength; varying vec2 vUv;
        void main(){ vec2 p=vUv-.5; float r=length(p), a=atan(p.y,p.x);
          float k=pow(abs(sin(a*8.+uTime*.025)),18.)*.8 + pow(abs(sin(a*21.-uTime*.04+1.3)),36.)*.5;
          float fall=smoothstep(.5,.03,r)*smoothstep(.0,.04,r);
          gl_FragColor=vec4(vec3(1.,.82,.5)*k*fall*uStrength,1.); }`,
    })));
    const shooters = [0, 1].map(() => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(90, 1.4), new THREE.MeshBasicMaterial({ map: streakTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0 }))); m.userData = { t: rr(0, 6), x: 0, y: 0, a: -0.4 }; return m; });

    /* ---------------- helpers for painted silhouettes ---------------- */
    const flat = (color) => new THREE.MeshBasicMaterial({ color, fog: true });
    const poly = (pts, mat, z) => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); const m = new THREE.Mesh(new THREE.ShapeGeometry(s), mat); m.position.z = z; return m; };
    const profile = (x, sd, amp, freq, jag) => { let y = 0; for (let i = 1; i <= 4; i++) { const w = Math.sin(x * freq * i * 1.7 + sd * i * 2.3) / i; y += jag ? Math.abs(w) * 1.6 - 0.4 : w; } return y * amp; };
    const layers = {};
    const hill = (name, z, base, amp, freq, color, sd, o = {}) => {
      const d = camBase.z - z, W = d * 3.4, N = Math.max(90, Math.round(W / 3.5)), pts = [[-W / 2, -260]];
      const at = (x) => base + profile(x, sd, amp, freq, o.jag) + (o.hump ? o.hump.h * Math.exp(-Math.pow(x / o.hump.w, 2)) : 0) + (o.dip ? -o.dip.h * Math.exp(-Math.pow((x - o.dip.x) / o.dip.w, 2)) : 0);
      for (let i = 0; i <= N; i++) { const x = -W / 2 + (i / N) * W; pts.push([x, at(x)]); }
      pts.push([W / 2, -260]);
      const mat = flat(color);
      return (layers[name] = { mesh: add(poly(pts, mat, z)), mat, at, z });
    };

    /* ---------------- the land, far to near ---------------- */
    hill("far", -620, 2, 40, 0.0072, 0x2a3f6e, 1.3, { jag: true });
    hill("far2", -500, -2, 22, 0.010, 0x22355f, 4.6, { jag: true });

    const mists = [];
    const mist = (x, y, z, w, o) => { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.22), new THREE.MeshBasicMaterial({ map: mistTex, transparent: true, depthWrite: false, opacity: o, color: 0xc9d6f0, fog: true }))); m.position.set(x, y, z); m.userData = { x, v: rr(0.5, 1.4), o }; mists.push(m); };
    mist(-160, 6, -470, 520, 0.35); mist(220, 2, -450, 460, 0.3); mist(0, -2, -380, 700, 0.26);

    // Jerusalem in the valley
    const city = new THREE.Group(), cityZ = -360, cityMat = flat(0x18294f);
    const box = (x, y, w, h) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cityMat); m.position.set(x + w / 2, y + h / 2, 0); city.add(m); };
    const dome = (x, y, r) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 28, 0, Math.PI), cityMat); m.position.set(x, y, 0); city.add(m); const f = new THREE.Mesh(new THREE.PlaneGeometry(0.7, r * 0.5), cityMat); f.position.set(x, y + r * 1.2, 0); city.add(f); };
    const winPos = [];
    box(-170, -6, 340, 10);
    for (let i = -170; i < 170; i += 7) box(i, 4, 3.4, 2.2);
    for (let cx = -150; cx < 150;) {
      const w = rr(6, 16), H = rr(6, 18) + (rnd() < 0.18 ? rr(10, 18) : 0);
      box(cx, 0, w, H);
      if (rnd() < 0.3) dome(cx + w / 2, H, w * 0.42);
      for (let k = 0; k < Math.floor(H / 3.5); k++) if (rnd() < 0.55) winPos.push(cx + rr(1.5, w - 1.5), rr(2, H - 2) - 4, cityZ + 0.5);
      cx += w + rr(0.5, 3);
    }
    box(-18, 0, 20, 16); dome(-8, 16, 15);
    [-120, -96, -60, 70, 104, 132].forEach((x) => { const cy = new THREE.Mesh(new THREE.CircleGeometry(1, 20), cityMat); cy.scale.set(2.2, 9, 1); cy.position.set(x, 12, 0.2); city.add(cy); });
    city.position.set(0, -4, cityZ); add(city);
    const winGeo = new THREE.BufferGeometry(); winGeo.setAttribute("position", new THREE.Float32BufferAttribute(winPos, 3));
    const winMat = new THREE.PointsMaterial({ map: softTex, size: 2.8, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffc46a, fog: false, opacity: 0 });
    add(new THREE.Points(winGeo, winMat));

    hill("mid", -300, -14, 7, 0.013, 0x15244a, 2.2, { dip: { x: 0, w: 120, h: 6 } });

    // Golgotha and the three crosses
    const gol = hill("gol", -240, -12, 5, 0.016, 0x101c3a, 7.7, { hump: { h: 32, w: 44 } });
    const crossMat = flat(0x0c1530);
    const crossTopY = gol.at(0) - 1.2 + 26 * 0.72;
    const cross = (x, h, s) => { const g = new THREE.Group(); const post = new THREE.Mesh(new THREE.BoxGeometry(1.7 * s, h, 1.6 * s), crossMat); post.position.y = h / 2; const beam = new THREE.Mesh(new THREE.BoxGeometry(h * 0.6, 1.6 * s, 1.5 * s), crossMat); beam.position.y = h * 0.72; g.add(post, beam); g.position.set(x, gol.at(x) - 1.2, -240); add(g); };
    cross(0, 26, 1.3); cross(-20, 16, 0.95); cross(20, 16, 0.95);
    const sunEnd = camBase.y + (crossTopY - camBase.y) * ((camBase.z - SUN_Z) / (camBase.z + 240));
    const crossGlow = sprite(glowTex, { add: 1, opacity: 0, color: 0xffd38a }); crossGlow.scale.set(110, 110, 1); crossGlow.position.set(0, crossTopY, -250);

    // the path up the hill, and pilgrims climbing it
    const path = []; for (let i = 0; i <= 40; i++) { const t = i / 40, x = mix(-120, -4, t) + Math.sin(t * 9) * 8 * (1 - t); path.push([x, gol.at(x) + 0.3]); }
    add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path.map(([x, y]) => new THREE.Vector3(x, y, -238))), 80, 0.45, 4), flat(0x2b3b64)));
    const walkerMat = flat(0x0a1228);
    const person = (s, mat) => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.CircleGeometry(1, 3), mat); b.scale.set(1.9 * s, 0.9 * s, 1); b.rotation.z = Math.PI / 2; b.position.y = 1.2 * s; const h = new THREE.Mesh(new THREE.CircleGeometry(0.42 * s, 10), mat); h.position.y = 2.6 * s; g.add(b, h); return g; };
    const pilgrims = [0, 0.18, 0.31, 0.52, 0.7].map((o) => { const p = person(1.1, walkerMat); p.userData.o = o; p.position.z = -237; return add(p); });
    const pathAt = (t) => { const f = clamp(t) * 40, i = Math.min(39, Math.floor(f)), k = f - i; return [mix(path[i][0], path[i + 1][0], k), mix(path[i][1], path[i + 1][1], k)]; };

    hill("near", -140, -6, 6, 0.02, 0x0b1430, 2.9);

    // olive trees bending in the wind
    const oliveMat = flat(0x1a2c3a), trunkMat = flat(0x0a1022);
    const olives = [];
    [-150, -118, -74, 64, 96, 138, 176].forEach((x) => {
      const s = rr(1.6, 2.4), g = new THREE.Group();
      const tr = new THREE.Mesh(new THREE.PlaneGeometry(1.2 * s, 6 * s), trunkMat); tr.position.y = 3 * s; g.add(tr);
      const crown = new THREE.Group(); crown.position.y = 6 * s; g.add(crown);
      for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.CircleGeometry(rr(2.2, 3.4) * s, 14), oliveMat); c.position.set(rr(-4, 4) * s, rr(-0.5, 3.4) * s, 0.01 * i); c.scale.y = 0.72; crown.add(c); }
      g.position.set(x, layers.near.at(x) - 0.5, -139); g.userData = { crown, ph: rr(0, 6) }; olives.push(add(g));
    });

    hill("meadow", -78, -4.2, 2.6, 0.035, 0x08102a, 5.2);

    // the shepherd and his flock
    const sheepMat = new THREE.MeshBasicMaterial({ color: 0xe9e0cf, fog: true }), sheepDark = flat(0x0c1224);
    const flock = [];
    for (let n = 0; n < (mobile ? 7 : 11); n++) {
      const s = rr(1.3, 1.7), g = new THREE.Group(), body = new THREE.Group(); g.add(body);
      for (let i = 0; i < 5; i++) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.9 * s, 12), sheepMat); w.position.set((i - 2) * 0.55 * s, Math.sin(i) * 0.25 * s + 1.6 * s, 0); body.add(w); }
      const head = new THREE.Mesh(new THREE.CircleGeometry(0.5 * s, 10), sheepDark); head.scale.x = 1.3; head.position.set(1.7 * s, 1.9 * s, 0.02); body.add(head);
      [-0.8, -0.3, 0.4, 0.9].forEach((lx) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.22 * s, 1 * s), sheepDark); l.position.set(lx * s, 0.5 * s, -0.01); g.add(l); });
      g.userData = { x: rr(-80, 70), v: rr(0.6, 1.4), ph: rr(0, 6), body, head, s, dir: rnd() < 0.5 ? 1 : -1 };
      g.position.z = -76; flock.push(add(g));
    }
    const shepherd = person(2.4, sheepDark); shepherd.position.set(-96, layers.meadow.at(-96), -75.5); add(shepherd);
    const staff = add(new THREE.Mesh(new THREE.PlaneGeometry(0.3, 8), sheepDark)); staff.position.set(-94.2, layers.meadow.at(-96) + 4, -75.4); staff.rotation.z = -0.1;

    // the empty tomb in the garden
    const tombZ = -60, tombX = mobile ? -20 : -46;
    const rock = []; for (let i = 0; i <= 24; i++) { const a = Math.PI * (i / 24); rock.push([tombX + Math.cos(a) * 18 + Math.sin(i * 1.7) * 1.0, -5 + Math.sin(a) * 11 + Math.sin(i * 2.3) * 0.9]); }
    const rockMat = flat(0x0d1530);
    add(poly([[tombX - 22, -30], ...rock, [tombX + 22, -30]], rockMat, tombZ));
    const openMat = new THREE.MeshBasicMaterial({ color: 0x03050c, fog: true });
    const opening = add(new THREE.Mesh(new THREE.CircleGeometry(5.6, 32, 0, Math.PI), openMat)); opening.position.set(tombX + 2, -4, tombZ + 0.2); opening.scale.set(0.8, 1.1, 1);
    const openFill = add(new THREE.Mesh(new THREE.PlaneGeometry(11.2, 3), openMat)); openFill.position.set(tombX + 2, -5.4, tombZ + 0.2); openFill.scale.x = 0.8;
    const stoneMat = flat(0x1c2b52);
    const stone = add(new THREE.Mesh(new THREE.CircleGeometry(5, 36), stoneMat)); stone.position.set(tombX + 2, -1.6, tombZ + 0.4);
    const stoneRim = add(new THREE.Mesh(new THREE.CircleGeometry(3.2, 36), rockMat)); stoneRim.material = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, fog: true }); stoneRim.position.set(tombX + 2, -1.6, tombZ + 0.45);
    const tombGlow = sprite(glowTex, { add: 1, opacity: 0, color: 0xffe2a0 }); tombGlow.position.set(tombX + 2, -3, tombZ + 0.6); tombGlow.scale.set(26, 26, 1);

    // foreground: grass in the wind
    hill("fore", -36, -8.5, 1.0, 0.07, 0x0a1430, 9.1);
    const gp = [], gh = [];
    for (let i = 0; i < (mobile ? 700 : 1600); i++) {
      const x = rr(-70, 70), z = rr(-36, -33), h = rr(1.0, 2.8), w = rr(0.1, 0.22), lean = rr(-0.4, 0.4), y0 = layers.fore.at(x) - 0.5;
      gp.push(x - w, y0, z, x + w, y0, z, x + lean, y0 + h, z); gh.push(0, 0, 1);
    }
    const grassGeo = new THREE.BufferGeometry();
    grassGeo.setAttribute("position", new THREE.Float32BufferAttribute(gp, 3));
    grassGeo.setAttribute("tip", new THREE.Float32BufferAttribute(gh, 1));
    const grassU = { uTime: { value: 0 }, uCol: { value: C(0x0a1430) } };
    add(new THREE.Mesh(grassGeo, new THREE.ShaderMaterial({ uniforms: grassU, side: THREE.DoubleSide,
      vertexShader: `attribute float tip; uniform float uTime; void main(){ vec3 p=position; p.x += tip * (sin(uTime*1.3 + p.x*.25 + p.z*.4)*.55 + sin(uTime*2.7 + p.x*.9)*.18); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform vec3 uCol; void main(){ gl_FragColor=vec4(uCol,1.); }` })));

    /* ---------------- clouds ---------------- */
    const cloudTexes = [11, 29, 47, 83].map(cloudTex);
    const clouds = [];
    [[-200, 96, -520, 230], [170, 116, -580, 280], [-40, 160, -690, 340], [320, 72, -480, 190], [-360, 130, -620, 260], [80, 210, -800, 420], [-260, 58, -430, 150], [250, 170, -700, 300], [450, 140, -650, 240], [-120, 40, -400, 140]].forEach(([x, y, z, w], i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 0.5), new THREE.MeshBasicMaterial({ map: cloudTexes[i % 4], transparent: true, depthWrite: false, fog: true, color: 0x3a4f80 }));
      m.position.set(x, y, z); m.userData = { x, v: 0.5 + rnd() }; clouds.push(add(m));
    });
    const hemi = new THREE.HemisphereLight(0x6f86c0, 0x0a1022, 0.9), sunLight = new THREE.DirectionalLight(0xffc27a, 0);
    scene.add(hemi, sunLight);

    /* ---------------- doves ---------------- */
    const doveMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, fog: false, transparent: true, opacity: 0 });
    const wingGeo = new THREE.BufferGeometry(); wingGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1.6, 0, 0, -1.4, 0, 6.5, 0, 0, 0, -1.4, 0, 6.5, -2.6, 0, 3.4], 3));
    const doves = Array.from({ length: mobile ? 6 : 9 }, () => {
      const d = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), doveMat); b.scale.set(2.6, 0.9, 0.9);
      const h = new THREE.Mesh(new THREE.SphereGeometry(0.62, 8, 6), doveMat); h.position.set(2.4, 0.5, 0);
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.6, 4), doveMat); t.rotation.z = Math.PI / 2; t.position.set(-3, 0.1, 0); t.scale.z = 0.3;
      const wl = new THREE.Group(), wr = new THREE.Group(), L = new THREE.Mesh(wingGeo, doveMat), R = new THREE.Mesh(wingGeo, doveMat); R.scale.z = -1;
      wl.add(L); wr.add(R); wl.position.set(0.3, 0.4, 0.3); wr.position.set(0.3, 0.4, -0.3);
      d.add(b, h, t, wl, wr); d.userData = { wl, wr, ph: rr(0, 6), ox: rr(-30, 30), oy: rr(-12, 12), oz: rr(-20, 20) };
      d.scale.setScalar(rr(0.7, 1.15)); return add(d);
    });

    /* ---------------- motes of light ---------------- */
    const MN = mobile ? 260 : 600, mpos = new Float32Array(MN * 3), mseed = new Float32Array(MN);
    for (let i = 0; i < MN; i++) { mpos[i * 3] = (Math.random() - 0.5) * 260; mpos[i * 3 + 1] = Math.random() * 100 - 8; mpos[i * 3 + 2] = -14 - Math.random() * 280; mseed[i] = Math.random(); }
    const mg = new THREE.BufferGeometry(); mg.setAttribute("position", new THREE.BufferAttribute(mpos, 3));
    const motes = add(new THREE.Points(mg, new THREE.PointsMaterial({ map: softTex, size: mobile ? 2.2 : 1.6, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffd9a0, fog: false })));

    /* ---------------- story state + loop ---------------- */
    const S = { intro: 0, p: 0 };
    const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
    if (!mobile) host.addEventListener("pointermove", (e) => { ptr.tx = e.clientX / innerWidth - 0.5; ptr.ty = e.clientY / innerHeight - 0.5; });
    const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w / h < 0.8 ? 64 : 42; camera.updateProjectionMatrix(); };
    resize(); addEventListener("resize", resize);

    const P = {
      fog: [C(0x172850), C(0xe2b06a), C(0xf6d48c)],
      far: [C(0x243866), C(0x6d7fa8)], far2: [C(0x1d305c), C(0x51628c)], mid: [C(0x14244a), C(0x34446c)],
      gol: [C(0x0f1b3a), C(0x1c2648)], near: [C(0x0a1430), C(0x141d3a)], meadow: [C(0x0c1838), C(0x1e2846)], fore: [C(0x0a1430), C(0x161c34)],
      city: [C(0x17284e), C(0x3a4a74)], olive: [C(0x172838), C(0x334a3e)], sheep: [C(0x8a90a6), C(0xf6ead2)], stone: [C(0x1c2440), C(0x5a5a68)],
      cloud: [C(0x33477a), C(0xffd9a6), C(0xfff4dc)],
    };
    const crossNight = C(0x0c1530), crossDawn = C(0x170f1c), openDark = C(0x03050c), openLit = C(0xffe2a0), mistA = C(0xc9d6f0), mistB = C(0xffe2b0), moteA = C(0xbfd0ff), moteB = C(0xffd9a0);

    let frames = 0, t0 = performance.now(), last = t0;
    function frame(now) {
      requestAnimationFrame(frame);
      frames++;
      const rb = host.getBoundingClientRect();                       // works inside the smooth-scroll wrapper
      if (rb.bottom <= 0 || rb.top >= innerHeight || document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const t = (now - t0) / 1000, I = S.intro, Pp = S.p;

      const dawn = mix(0, 0.1, I) + 0.9 * smooth(0.04, 0.52, Pp);
      const sunY = mix(-80, -30, I) + (sunEnd + 30) * smooth(0.06, 0.52, Pp);
      const burst = smooth(0.34, 0.62, Pp), risen = smooth(0.46, 0.7, Pp), gold = smooth(0.84, 1, Pp), push = smooth(0.66, 1, Pp);
      const descend = smooth(0, 1, I);

      ptr.x += (ptr.tx - ptr.x) * Math.min(1, dt * 2.5); ptr.y += (ptr.ty - ptr.y) * Math.min(1, dt * 2.5);
      const sway = Math.sin(t * 0.21) * 0.06;
      camera.position.set((ptr.x + sway) * 10, mix(95, camBase.y, descend) - ptr.y * 4 + push * 12, camBase.z - push * 230);
      look.set(ptr.x * 34, mix(130, 18, descend) + push * 24, -240);
      camera.lookAt(look);

      // the heavens
      skyU.uDawn.value = dawn; skyU.uGold.value = gold * 0.9; skyU.uTime.value = t; skyU.uStars.value = smooth(0.05, 0.7, I);
      sunPos.y = sunY; skyU.uSun.value.copy(sunPos).sub(camera.position).normalize();
      sun.position.copy(sunPos); halo.position.copy(sunPos); rays.position.set(0, sunY, SUN_Z + 10); rays.lookAt(camera.position);
      sun.material.opacity = smooth(-30, 20, sunY) * (0.85 + burst * 0.5); sun.scale.setScalar(240 + burst * 240);
      halo.material.opacity = clamp(dawn * 0.3 + burst * 0.4); rayU.uStrength.value = burst * 0.8 + gold * 0.5; rayU.uTime.value = t;
      crossGlow.material.opacity = burst * 0.75 * (1 - gold);
      moon.material.opacity = (1 - smooth(0.05, 0.35, Pp)) * smooth(0.2, 0.8, I);
      shooters.forEach((m, i) => {
        const u = m.userData; u.t += dt;
        const period = 5.5 + i * 3.1, k = u.t % period;
        if (k < dt) { u.x = rr(-320, 200); u.y = rr(170, 320); u.a = rr(-0.5, -0.25); }
        const life = k / 1.1;
        m.material.opacity = life < 1 ? Math.sin(life * Math.PI) * (1 - dawn) * smooth(0.3, 1, I) : 0;
        m.position.set(u.x + life * 170, u.y + life * 170 * Math.tan(u.a), -820);
        m.lookAt(camera.position); m.rotateZ(u.a);
      });

      // air and land
      fog.color.copy(P.fog[0]).lerp(P.fog[1], dawn).lerp(P.fog[2], gold);
      fog.far = mix(300, 900, descend) * (1 - gold * 0.45);
      ["far", "far2", "mid", "gol", "near", "meadow", "fore"].forEach((n) => layers[n].mat.color.copy(P[n][0]).lerp(P[n][1], dawn));
      cityMat.color.copy(P.city[0]).lerp(P.city[1], dawn);
      winMat.opacity = smooth(0.2, 0.9, I) * (1 - smooth(0.1, 0.45, Pp)) * (0.8 + 0.2 * Math.sin(t * 3));
      oliveMat.color.copy(P.olive[0]).lerp(P.olive[1], dawn);
      crossMat.color.copy(crossNight).lerp(crossDawn, dawn);
      sheepMat.color.copy(P.sheep[0]).lerp(P.sheep[1], dawn);
      stoneMat.color.copy(P.stone[0]).lerp(P.stone[1], dawn);
      const ccol = new THREE.Color().copy(P.cloud[0]).lerp(P.cloud[1], smooth(0.25, 0.9, dawn)).lerp(P.cloud[2], gold);
      clouds.forEach((c) => { c.material.color.copy(ccol); c.lookAt(camera.position); });
      sunLight.intensity = dawn * 1.5; sunLight.position.set(0, 0.3 + dawn * 0.5, -1); hemi.intensity = 0.7 + dawn * 0.5;
      clouds.forEach((c, i) => (c.position.x = c.userData.x + Math.sin(t * 0.03 * c.userData.v + i) * 26));
      mists.forEach((m, i) => { m.position.x = m.userData.x + Math.sin(t * 0.05 * m.userData.v + i * 2) * 40; m.material.opacity = m.userData.o * (1 - gold); m.material.color.copy(mistA).lerp(mistB, dawn); });

      // life on the hills
      pilgrims.forEach((p) => { const [x, y] = pathAt((p.userData.o + t * 0.012) % 1); p.position.x = x; p.position.y = y + Math.abs(Math.sin(t * 4 + p.userData.o * 20)) * 0.15; });
      olives.forEach((o) => { const w = Math.sin(t * 0.9 + o.userData.ph) * 0.05 + Math.sin(t * 2.3 + o.userData.ph) * 0.015; o.userData.crown.rotation.z = w; o.userData.crown.position.x = w * 6; });
      flock.forEach((s) => {
        const u = s.userData;
        u.x += u.dir * u.v * dt * 1.6;
        if (u.x > 90 || u.x < -88) u.dir *= -1;
        s.scale.x = u.dir; s.position.x = u.x; s.position.y = layers.meadow.at(u.x) - 0.3;
        const graze = Math.max(0, Math.sin(t * 0.6 + u.ph));
        u.head.position.y = (1.9 - graze * 1.1) * u.s;
        u.body.position.y = Math.abs(Math.sin(t * 5 * u.v + u.ph)) * 0.12;
      });
      shepherd.position.x = -96 + Math.sin(t * 0.08) * 6; staff.position.x = shepherd.position.x + 1.8;
      grassU.uTime.value = t;

      // the empty tomb: the stone rolls away, light pours out
      const roll = smooth(0.4, 0.58, Pp);
      stone.position.x = stoneRim.position.x = tombX + 2 + roll * 11;
      stone.position.y = stoneRim.position.y = -1.6 + roll * 0.4;
      stone.rotation.z = -roll * 2.2;
      tombGlow.material.opacity = risen * (0.85 + 0.15 * Math.sin(t * 2)); tombGlow.scale.setScalar(20 + risen * 30);
      openMat.color.copy(openDark).lerp(openLit, risen * 0.9);

      // doves: circling in the dawn, then rising into the light
      doveMat.opacity = smooth(0.36, 0.48, Pp) * (1 - smooth(0.95, 1, Pp));
      const rise = smooth(0.5, 0.95, Pp);
      doves.forEach((d, i) => {
        const u = d.userData, k = t * 0.35 + u.ph;
        d.position.set(Math.cos(k) * 60 + u.ox + rise * 20, 40 + u.oy + Math.sin(k * 2) * 6 + rise * 60, -150 + Math.sin(k) * 30 + u.oz - rise * 200);
        d.rotation.set(0, -k + Math.PI / 2, Math.sin(t * 1.3 + i) * 0.1);
        const flap = Math.sin(t * 10 + u.ph * 3) * 0.95;
        u.wl.rotation.x = -0.25 + flap; u.wr.rotation.x = 0.25 - flap;
      });

      // motes drifting upward
      const pa = mg.attributes.position.array;
      for (let i = 0; i < MN; i++) { pa[i * 3 + 1] += (0.5 + mseed[i]) * dt * 1.2; pa[i * 3] += Math.sin(t * 0.4 + mseed[i] * 20) * dt * 0.6; if (pa[i * 3 + 1] > 100) pa[i * 3 + 1] = -8; }
      mg.attributes.position.needsUpdate = true;
      motes.material.opacity = 0.18 + dawn * 0.5; motes.material.color.copy(moteA).lerp(moteB, dawn);

      renderer.toneMappingExposure = 1.0 + burst * 0.12 + gold * 0.25;
      renderer.render(scene, camera);
    }
    requestAnimationFrame(frame);
    const api = { S, resize, debug: () => ({ frames, intro: S.intro, p: S.p, cam: camera.position.toArray().map((v) => +v.toFixed(1)) }) };
    return api;
  }

  window.Story3D = { create };
})();
