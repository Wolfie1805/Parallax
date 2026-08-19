// particleGlobe.frag.glsl
// Fragment Shader: Soft circular sprite, Camera-Relative Lighting, Fresnel Rim Glow (No Sun Vector / No Terminator)

varying vec3 vColor;
varying vec3 vNormalView;
varying float vDensity;

uniform float uGlowIntensity; // Modulated by breathing pulse in Spec v6

void main() {
  // Soft circular point sprite
  float dist = length(gl_PointCoord - vec2(0.5));
  float spriteAlpha = 1.0 - smoothstep(0.28, 0.50, dist);
  if (spriteAlpha < 0.01) discard;

  // 1. Camera-Relative Facing Factor (1.0 = facing camera, 0.35 = facing away)
  float facing = clamp(vNormalView.z, 0.35, 1.0);
  vec3 finalColor = vColor * mix(0.55, 1.35, facing);

  // 2. Fresnel Limb Glow (view-angle dependent around sphere silhouette)
  float fresnel = pow(1.0 - abs(vNormalView.z), 2.2);
  vec3 fresnelColor = vec3(0.0, 0.95, 1.0) * fresnel * (0.45 + uGlowIntensity * 0.3);
  finalColor += fresnelColor;

  // 3. Depth Alpha: Far-side particles fade out smoothly
  float depthAlpha = smoothstep(-0.25, 0.35, vNormalView.z);

  // Coastlines denser/brighter (vDensity = 1.0), interior fill softer (vDensity = 0.45)
  float alpha = spriteAlpha * depthAlpha * mix(0.55, 0.95, vDensity);

  gl_FragColor = vec4(finalColor, alpha);
}
