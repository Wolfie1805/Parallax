// reweave.frag.glsl
// Color morph between old and new universe palettes, keyed to progress.

varying vec3 vColor;

void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  float alpha = 1.0 - smoothstep(0.35, 0.5, dist);
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(vColor, alpha);
}
