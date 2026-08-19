// reweave.vert.glsl
// Handles the three-phase universe transition:
//   Phase 1 (0.0–0.6): curl-noise displacement outward
//   Phase 2 (0.6–0.9): continued drift at reduced velocity
//   Phase 3 (0.9–1.0): helical convergence to target positions

attribute vec3 aTargetPosition;
attribute vec3 aColor;
attribute vec3 aTargetColor;

uniform float uProgress;       // 0→1 driving all three phases
uniform float uPixelRatio;
uniform float uSize;

varying vec3 vColor;

// ── Curl noise helpers ────────────────────────────────────────────────────────
// Hash function (Dave Hoskins)
vec3 hash33(vec3 p) {
  p = fract(p * vec3(443.8975, 397.2973, 491.1871));
  p += dot(p.zxy, p.yxz + 19.19);
  return fract(vec3(p.x * p.y, p.y * p.z, p.z * p.x));
}

// Smooth noise
float noise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(mix(dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0)),
            dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0)), f.x),
        mix(dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0)),
            dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0)), f.x), f.y),
    mix(mix(dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1)),
            dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1)), f.x),
        mix(dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1)),
            dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1)), f.x), f.y),
    f.z);
}

// Curl noise = curl of a noise-derived vector field (divergence-free)
vec3 curlNoise(vec3 p) {
  float eps = 0.01;
  float dx = noise(p + vec3(eps, 0.0, 0.0)) - noise(p - vec3(eps, 0.0, 0.0));
  float dy = noise(p + vec3(0.0, eps, 0.0)) - noise(p - vec3(0.0, eps, 0.0));
  float dz = noise(p + vec3(0.0, 0.0, eps)) - noise(p - vec3(0.0, 0.0, eps));
  // Curl: (dFz/dy - dFy/dz, dFx/dz - dFz/dx, dFy/dx - dFx/dy)
  // Simplified for a scalar field repeated across channels:
  return normalize(vec3(dy - dz, dz - dx, dx - dy));
}

// ── Easing functions ──────────────────────────────────────────────────────────
float easeOut(float t) { return 1.0 - (1.0 - t) * (1.0 - t); }
float easeInOut(float t) { return t < 0.5 ? 2.0 * t * t : 1.0 - pow(-2.0 * t + 2.0, 2.0) / 2.0; }

void main() {
  float p = uProgress;

  vec3 curl = curlNoise(position * 1.5) * 2.0;

  vec3 pos;
  vec3 col;

  if (p < 0.6) {
    // Phase 1: shatter — ease-out push along curl field
    float t = easeOut(p / 0.6);
    pos = position + curl * t * 1.5;
    col = aColor;
  } else if (p < 0.9) {
    // Phase 2: void drift — linear, reduced speed
    float t = (p - 0.6) / 0.3;
    vec3 shatteredPos = position + curl * 1.5;
    pos = shatteredPos + curl * t * 0.3;
    col = mix(aColor, aTargetColor, t);
  } else {
    // Phase 3: reweave — helical convergence (ease-in-out)
    float t = easeInOut((p - 0.9) / 0.1);
    vec3 shatteredPos = position + curl * 1.8;
    // Helical path: spiral around the axis between shattered and target
    vec3 axis = normalize(aTargetPosition - shatteredPos + vec3(0.001));
    float angle = (1.0 - t) * 3.14159 * 2.0;
    vec3 perp = normalize(cross(axis, vec3(0.0, 1.0, 0.0) + axis * 0.01));
    vec3 spiral = cos(angle) * perp + sin(angle) * cross(axis, perp);
    float radius = length(aTargetPosition - shatteredPos) * (1.0 - t) * 0.3;
    pos = mix(shatteredPos, aTargetPosition, t) + spiral * radius;
    col = mix(aColor, aTargetColor, t);
  }

  vColor = col;

  vec4 viewPosition = viewMatrix * modelMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * viewPosition;
  gl_PointSize = uSize * uPixelRatio * (1.0 / -viewPosition.z);
}
