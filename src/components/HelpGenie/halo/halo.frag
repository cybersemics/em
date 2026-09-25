// Help genie halo: fragment shader.
//
// Works out the color of each pixel of the glow. SAMPLES is defined by GenieHalo from HALO_SAMPLES.
//
// The glow is an ellipse bent along the path. It is described by points laid along the path either side of the
// glow's center (see haloShape). Each point has `along`: how far it is from the center along the glow, squared, from
// 0 at the center to 1 at either end.
//
// For each point, a pixel's "glow distance" combines how far the point is from the center (along) with how far the
// pixel is from the point (in half-widths). The pixel takes its smallest glow distance over all the points: 0 at the
// center, 1 at the glow's edge. That picks its color from the glow's colors, from center to edge.
//
// On a straight path this is exactly an ellipse: the points reach far enough along the path (see haloShape) that the
// outline comes out as long as the ellipse. On a turn, the points follow the path, and so does the glow. Because each
// pixel is worked out on its own, the glow cannot fold over itself however tight the turn.

in vec2 vPosition;
out vec4 finalColor;

// The glow's points, and those of the cool light on its underside: x, y, along, unused. Only the first uCount are
// used: one at rest, where the glow is a circle, and up to SAMPLES in flight.
uniform vec4 uPoints[SAMPLES];
uniform vec4 uCoolPoints[SAMPLES];
uniform int uCount;
// Half the glow's width, in CSS pixels.
uniform float uAcross;
// Brightness of the glow, and strength of the cool light.
uniform float uIntensity;
uniform float uCool;
// The cool light's color, 0 to 1.
uniform vec3 uCoolColor;
// The glow's colors from its center (left) to its edge (right), premultiplied by Pixi.
uniform sampler2D uColors;

void main() {
  float glow = 1e6;
  float cool = 1e6;
  for (int i = 0; i < SAMPLES; i++) {
    if (i >= uCount) break;
    vec2 d = (vPosition - uPoints[i].xy) / uAcross;
    glow = min(glow, uPoints[i].z + dot(d, d));
    // The cool light is half the size, so its distances are measured in half as many pixels.
    vec2 c = (vPosition - uCoolPoints[i].xy) / (uAcross * 0.5);
    cool = min(cool, uCoolPoints[i].z + dot(c, c));
  }
  float distance = sqrt(glow);
  if (distance >= 1.0) discard;
  vec4 color = texture(uColors, vec2(distance, 0.5));
  // The cool light fades from full at its center to nothing at its edge, and is added on top of the glow.
  float coolStrength = max(0.0, 1.0 - sqrt(cool));
  finalColor = vec4(color.rgb * uIntensity + uCool * uCoolColor * coolStrength, color.a);
}
