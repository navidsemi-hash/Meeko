/* Soft iridescent aura behind the "creative agency" project preview.
   One full-screen quad + fragment shader rendering drifting colour fields.
   - renders at reduced resolution (the look is a blur anyway)
   - pauses when off-screen or when the tab is hidden
   - renders a single still frame with prefers-reduced-motion
   - throws if WebGL is unavailable so the caller keeps the CSS fallback */
import {
  WebGLRenderer,
  Scene,
  OrthographicCamera,
  PlaneGeometry,
  ShaderMaterial,
  Mesh,
  Vector2,
  Vector3,
  NoBlending,
} from 'https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js';

// Colours go to the shader as raw sRGB triplets: the quad writes straight to
// the canvas, so no linear-space conversion should happen on the way.
const srgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec2 uPointer;
  uniform vec3 uC1;
  uniform vec3 uC2;
  uniform vec3 uC3;
  uniform vec3 uC4;
  uniform vec3 uC5;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float field(vec2 p, vec2 c, float r) {
    vec2 d = p - c;
    return exp(-dot(d, d) / (r * r));
  }

  void main() {
    float aspect = uRes.x / uRes.y;
    vec2 p = vec2((vUv.x - 0.5) * aspect, vUv.y - 0.5);
    float t = uTime * 0.18;
    vec2 m = uPointer * 0.06;

    // gentle domain warp so the fields feel liquid rather than circular
    p += 0.035 * vec2(sin(p.y * 6.0 + t * 2.0), cos(p.x * 5.0 - t * 1.7));

    vec2 c1 = vec2(-0.22 + 0.06 * sin(t * 1.1), 0.10 + 0.05 * cos(t * 0.9)) + m;
    vec2 c2 = vec2( 0.20 + 0.05 * cos(t * 0.8), 0.14 + 0.05 * sin(t * 1.3)) + m * 0.6;
    vec2 c3 = vec2( 0.02 + 0.07 * sin(t * 0.7 + 1.0), -0.16 + 0.04 * cos(t * 1.2)) - m * 0.5;
    vec2 c4 = vec2( 0.30 + 0.04 * sin(t * 1.4 + 2.0), -0.10 + 0.05 * sin(t * 0.6)) - m;
    vec2 c5 = vec2(-0.30 + 0.05 * cos(t * 0.9 + 3.0), -0.12 + 0.04 * sin(t * 1.0)) + m * 0.3;

    float w1 = field(p, c1, 0.17);
    float w2 = field(p, c2, 0.16);
    float w3 = field(p, c3, 0.17);
    float w4 = field(p, c4, 0.12);
    float w5 = field(p, c5, 0.11);
    float sum = w1 + w2 + w3 + w4 + w5;

    vec3 col = (uC1 * w1 + uC2 * w2 + uC3 * w3 + uC4 * w4 + uC5 * w5) / max(sum, 1e-4);
    float a = smoothstep(0.0, 1.2, sum) * 0.82;

    // faint grain keeps the gradient from banding
    a *= 0.97 + 0.06 * hash(gl_FragCoord.xy + fract(uTime));

    gl_FragColor = vec4(col * a, a);
  }
`;

export function createAura(host, { reducedMotion = false } = {}) {
  const canvas = host.querySelector('canvas');
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: false, powerPreference: 'low-power', premultipliedAlpha: true });
  renderer.setClearColor(0x000000, 0);

  const isSmall = window.matchMedia('(max-width: 809px)').matches;
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2) * (isSmall ? 0.35 : 0.5);
  renderer.setPixelRatio(pixelRatio);

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const uniforms = {
    uTime: { value: 7.0 },
    uRes: { value: new Vector2(1, 1) },
    uPointer: { value: new Vector2(0, 0) },
    uC1: { value: srgb('#ffb48a') },
    uC2: { value: srgb('#c297ff') },
    uC3: { value: srgb('#82eabf') },
    uC4: { value: srgb('#8cc2ff') },
    uC5: { value: srgb('#ffe07a') },
  };
  const material = new ShaderMaterial({ vertexShader, fragmentShader, uniforms, blending: NoBlending, depthTest: false, depthWrite: false });
  scene.add(new Mesh(new PlaneGeometry(2, 2), material));

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    uniforms.uRes.value.set(width, height);
    renderer.render(scene, camera);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();
  host.classList.add('is-live');

  if (reducedMotion) {
    renderer.render(scene, camera);
    return;
  }

  // Pointer drift, relative to the project card the aura lives in.
  const card = host.closest('.project') || host;
  const target = new Vector2();
  card.addEventListener('pointermove', (e) => {
    const r = card.getBoundingClientRect();
    target.set(((e.clientX - r.left) / r.width - 0.5) * 2, -((e.clientY - r.top) / r.height - 0.5) * 2);
  });
  card.addEventListener('pointerleave', () => target.set(0, 0));

  let visible = false;
  let raf = 0;
  let last = performance.now();
  const loop = (now) => {
    raf = requestAnimationFrame(loop);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    uniforms.uTime.value += dt;
    uniforms.uPointer.value.lerp(target, 0.05);
    renderer.render(scene, camera);
  };
  const start = () => {
    if (raf || !visible || document.hidden) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  };
  const stop = () => {
    cancelAnimationFrame(raf);
    raf = 0;
  };

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    visible ? start() : stop();
  }).observe(host);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    stop();
    host.classList.remove('is-live');
  });
}
