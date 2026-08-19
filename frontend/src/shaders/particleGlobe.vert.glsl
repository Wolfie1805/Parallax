// particleGlobe.vert.glsl
// Camera-relative view-space normal calculation (Fixes dark hemisphere bug per Spec v6)

attribute vec3 color;
attribute float aDensity;

varying vec3 vColor;
varying vec3 vNormalView;
varying float vDensity;

uniform float uPixelRatio;
uniform float uSize;

void main() {
  vColor = color;
  vDensity = aDensity;

  // View-space position (camera is at 0,0,0 facing -Z)
  vec4 modelPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * modelPosition;
  vec4 projectedPosition = projectionMatrix * viewPosition;

  // Camera-relative view-space normal
  vNormalView = normalize(normalMatrix * position);

  gl_Position = projectedPosition;

  // Camera-relative depth scaling: particles facing camera (vNormalView.z > 0) are full size
  float facing = clamp(vNormalView.z, 0.25, 1.0);
  float baseSize = mix(0.008, 0.016, aDensity);

  gl_PointSize = uSize * uPixelRatio * baseSize * (0.4 + 0.6 * facing) * (1.0 / -viewPosition.z);
}
