/**
 * Whether this browser can open a WebGL context at all (phase 8, `00` C35
 * point 8). Without one the 2.5D board cannot mount: three throws from inside
 * the canvas, nothing catches it, and the match screen is a black page. Seen
 * on 2026-10-17 in a Chromium started with `--disable-3d-apis`, which is what
 * a locked-down work laptop looks like. The match screen asks once and opens
 * on the flat board instead, with the 3D switch explaining itself.
 *
 * Asked once per page: a context is a real resource, and the answer does not
 * change while the page lives.
 */

let answer: boolean | null = null;

export function webglAvailable(): boolean {
  if (answer !== null) return answer;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    answer = gl !== null;
    // Give the context back straight away; the board makes its own.
    const lose = gl?.getExtension('WEBGL_lose_context');
    lose?.loseContext();
  } catch {
    answer = false;
  }
  return answer;
}
