// Help genie halo: vertex shader.
//
// Positions the rectangle the glow is drawn in, and passes each corner's position in CSS pixels on to halo.frag,
// which measures distances in that space. The rectangle's UVs carry those positions (see GenieHalo).

in vec2 aPosition;
in vec2 aUV;
out vec2 vPosition;

// Supplied by Pixi: they map the rectangle from CSS pixels onto the canvas.
uniform mat3 uProjectionMatrix;
uniform mat3 uWorldTransformMatrix;
uniform mat3 uTransformMatrix;

void main() {
  mat3 mvp = uProjectionMatrix * uWorldTransformMatrix * uTransformMatrix;
  gl_Position = vec4((mvp * vec3(aPosition, 1.0)).xy, 0.0, 1.0);
  vPosition = aUV;
}
