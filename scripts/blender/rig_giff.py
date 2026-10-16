"""
Rig and animate Jérôme's Giff in Blender, headless.

    blender -b -P scripts/blender/rig_giff.py -- <out.glb> [<out.blend>]

The source is `assets/source/models/giff-boomball.glb`: one TRELLIS mesh,
welded, the bat fused into both hands. So the skeleton is built around what
the mesh allows: legs that run, hips, spine, chest and head, and one `arms`
bone that carries both forearms, both hands and the bat as a block (a two
handed grip reads right as a block). Weights are painted by geometry, not by
bone heat, then smoothed over the welded surface so the UV seams never crack.

Blender space: Z up, the Giff faces -Y, its left is +X, feet at z = -0.5,
head at z = +0.5. The glTF exporter turns that into Y up, facing +Z, which is
what `Tokens.tsx` already expects. Every clip plays in place: the board moves
the token, the clip moves the body.
"""

import math
import sys

import bpy
from mathutils import Matrix, Quaternion, Vector

ARGS = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT_GLB = ARGS[0] if ARGS else None
OUT_BLEND = ARGS[1] if len(ARGS) > 1 else None
SOURCE = __file__.replace('\\', '/').rsplit('/scripts/', 1)[0] + '/assets/source/models/giff-boomball.glb'
FPS = 30

# --- Geometry read off the mesh (renders with a 0.1 grid, and slices) -------

BAT_KNOB = Vector((-0.363, 0.069, -0.175))
BAT_TIP = Vector((0.353, -0.398, 0.215))
LEG_SPLIT_X = 0.02            # the gap between the legs, measured at z < -0.25
LEG_X = {'L': 0.16, 'R': -0.14}
LEG_Y = 0.09

BONES = {
    # name: (head, tail, parent)
    'root':   ((0, 0.05, -0.5), (0, 0.05, -0.4), None),
    'hips':   ((0, 0.05, -0.12), (0, 0.05, 0.0), 'root'),
    'spine':  ((0, 0.05, 0.0), (0, 0.05, 0.15), 'hips'),
    'chest':  ((0, 0.05, 0.15), (0, 0.05, 0.31), 'spine'),
    'head':   ((0, 0.02, 0.31), (0, -0.01, 0.48), 'chest'),
    'arms':   ((0, 0.0, 0.16), (0, -0.2, 0.16), 'chest'),
}
for side, x in LEG_X.items():
    BONES[f'thigh.{side}'] = ((x, LEG_Y, -0.12), (x, LEG_Y + 0.01, -0.3), 'hips')
    BONES[f'shin.{side}'] = ((x, LEG_Y + 0.01, -0.3), (x, LEG_Y + 0.02, -0.44), f'thigh.{side}')
    BONES[f'foot.{side}'] = ((x, LEG_Y + 0.02, -0.44), (x, LEG_Y - 0.12, -0.48), f'shin.{side}')


def smoothstep(e0, e1, v):
    t = max(0.0, min(1.0, (v - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


def seg_dist(p, a, b):
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


def raw_weights(p):
    """Weights for one point, before smoothing. Returns {bone: w}."""
    x, y, z = p
    w = {}
    # The block: bat, hands, forearms. Bat first, it passes beside the thigh.
    bat = 1 - smoothstep(0.05, 0.075, seg_dist(p, BAT_KNOB, BAT_TIP))
    # Forearms and hands: outside the torso's width, below the shoulder pads,
    # or anything well in front of the chest.
    torso_half = 0.235
    outside = smoothstep(torso_half - 0.02, torso_half + 0.03, abs(x - 0.0)) * (1 - smoothstep(0.1, 0.22, z)) * smoothstep(-0.24, -0.16, z)
    front = smoothstep(-0.115, -0.16, y) * smoothstep(-0.12, -0.04, z) * (1 - smoothstep(0.26, 0.31, z))
    arms = max(bat, outside, front)

    if z < -0.06:
        # Legs, split left and right, then thigh, shin, foot down the leg.
        leg = smoothstep(-0.06, -0.2, z)
        side = 'L' if x > LEG_SPLIT_X else 'R'
        thigh = 1 - smoothstep(-0.26, -0.34, z)
        shin = smoothstep(-0.26, -0.34, z) * (1 - smoothstep(-0.405, -0.445, z))
        foot = smoothstep(-0.405, -0.445, z)
        body = {f'thigh.{side}': thigh * leg, f'shin.{side}': shin * leg, f'foot.{side}': foot * leg, 'hips': 1 - leg}
    else:
        # Up the trunk. The jetpack and the helmet ring stay with the chest.
        hips = 1 - smoothstep(-0.04, 0.05, z)
        spine = smoothstep(-0.04, 0.05, z) * (1 - smoothstep(0.12, 0.2, z))
        chest = smoothstep(0.12, 0.2, z)
        head = smoothstep(0.33, 0.37, z) * (1 - smoothstep(0.17, 0.24, y))
        body = {'hips': hips, 'spine': spine, 'chest': chest * (1 - head), 'head': chest * head}
    for k, v in body.items():
        w[k] = v * (1 - arms)
    w['arms'] = arms
    return w


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.fps = FPS
    bpy.ops.import_scene.gltf(filepath=SOURCE)
    mesh = next(o for o in scn.objects if o.type == 'MESH')
    mesh.name = 'Giff'
    for o in list(scn.objects):
        if o.type == 'EMPTY':
            mesh.parent = None
            bpy.data.objects.remove(o)
    mesh.matrix_world = Matrix.Identity(4)
    # Smooth, like the game drew it: flat faces make the exporter split every
    # corner, four times the vertices for the same look.
    mesh.data.polygons.foreach_set('use_smooth', [True] * len(mesh.data.polygons))

    # --- Armature ---
    arm_data = bpy.data.armatures.new('GiffRig')
    rig = bpy.data.objects.new('GiffRig', arm_data)
    scn.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.object.mode_set(mode='EDIT')
    for name, (h, t, parent) in BONES.items():
        b = arm_data.edit_bones.new(name)
        b.head, b.tail = Vector(h), Vector(t)
        b.roll = 0
        if parent:
            b.parent = arm_data.edit_bones[parent]
            b.use_connect = False
    bpy.ops.object.mode_set(mode='OBJECT')

    # --- Weights, by geometry, smoothed over the welded surface ---
    me = mesh.data
    names = list(BONES)
    co = [v.co.copy() for v in me.vertices]
    key = {}
    weld = []
    for i, p in enumerate(co):
        k = (round(p.x, 4), round(p.y, 4), round(p.z, 4))
        weld.append(key.setdefault(k, len(key)))
    n = len(key)
    pos = [None] * n
    for i, u in enumerate(weld):
        pos[u] = co[i]
    nbr = [set() for _ in range(n)]
    for e in me.edges:
        a, b = weld[e.vertices[0]], weld[e.vertices[1]]
        if a != b:
            nbr[a].add(b)
            nbr[b].add(a)
    W = [[0.0] * len(names) for _ in range(n)]
    for u in range(n):
        for k, v in raw_weights(pos[u]).items():
            W[u][names.index(k)] += v
    for _ in range(6):
        nxt = []
        for u in range(n):
            if not nbr[u]:
                nxt.append(W[u])
                continue
            acc = [0.5 * v for v in W[u]]
            share = 0.5 / len(nbr[u])
            for m in nbr[u]:
                for j, v in enumerate(W[m]):
                    acc[j] += share * v
            nxt.append(acc)
        W = nxt
    groups = {name: mesh.vertex_groups.new(name=name) for name in names if name != 'root'}
    for i, u in enumerate(weld):
        row = W[u]
        total = sum(row) or 1.0
        for j, name in enumerate(names):
            v = row[j] / total
            if v > 0.01 and name in groups:
                groups[name].add([i], v, 'REPLACE')

    mod = mesh.modifiers.new('Rig', 'ARMATURE')
    mod.object = rig
    mesh.parent = rig

    return rig, mesh, W, weld, names


# --- Posing: rotations given about armature (world) axes --------------------

def world_q(rx=0.0, ry=0.0, rz=0.0):
    """A rotation in armature space, angles in degrees, applied X then Y then Z."""
    q = Quaternion((1, 0, 0), math.radians(rx))
    q = Quaternion((0, 1, 0), math.radians(ry)) @ q
    return Quaternion((0, 0, 1), math.radians(rz)) @ q


def to_local(rig, bone, q):
    rest = rig.data.bones[bone].matrix_local.to_quaternion()
    return rest.inverted() @ q @ rest


# A negative X turn swings a leg forward. For the trunk, which points up, the
# same sign would lean it back, so its X is flipped: negative leans forward
# everywhere, legs and trunk alike.
TRUNK = {'hips', 'spine', 'chest', 'head'}


def key_pose(rig, frame, pose):
    """pose: {bone: (rx, ry, rz) or (rx, ry, rz, (dx, dy, dz))}. Unlisted bones rest."""
    for pb in rig.pose.bones:
        spec = pose.get(pb.name, (0, 0, 0))
        rx, ry, rz = spec[:3]
        if pb.name in TRUNK:
            rx = -rx
        pb.rotation_mode = 'QUATERNION'
        pb.rotation_quaternion = to_local(rig, pb.name, world_q(rx, ry, rz))
        off = Vector(spec[3]) if len(spec) > 3 else Vector()
        rest = rig.data.bones[pb.name].matrix_local.to_3x3()
        pb.location = rest.inverted() @ off
        pb.keyframe_insert('rotation_quaternion', frame=frame)
        pb.keyframe_insert('location', frame=frame)


def run_pose(phase):
    """The heavy jog, phase 0..1 over two steps. Right leg forward at 0."""
    s = math.sin(phase * 2 * math.pi)
    c = math.cos(phase * 2 * math.pi)
    bob = 0.025 * abs(math.cos(phase * 2 * math.pi))       # high at mid-stride, two bumps a cycle
    lift_r = max(0.0, -c)                                   # each foot lifts while it swings forward
    lift_l = max(0.0, c)
    return {
        'root': (0, 0, 0, (0, 0, bob - 0.012)),
        'hips': (-10, 0, 7 * s),
        'spine': (-4, 0, -4 * s),
        'chest': (-3, 3 * s, -6 * s),
        'head': (6, 0, 4 * s),
        'arms': (4 * c, 0, -8 * s),
        'thigh.R': (-38 * s - 10 * lift_r, 0, 0),
        'shin.R': (55 * lift_r + 8, 0, 0),
        'foot.R': (-20 * lift_r + 10 * s, 0, 0),
        'thigh.L': (38 * s - 10 * lift_l, 0, 0),
        'shin.L': (55 * lift_l + 8, 0, 0),
        'foot.L': (-20 * lift_l - 10 * s, 0, 0),
    }


STANCE = {
    'hips': (0, 0, 0, (0, 0, -0.015)),
    'thigh.L': (-8, 0, 0),
    'thigh.R': (-8, 0, 0),
    'shin.L': (14, 0, 0),
    'shin.R': (14, 0, 0),
    'foot.L': (-6, 0, 0),
    'foot.R': (-6, 0, 0),
}


def stance(**over):
    p = dict(STANCE)
    p.update(over)
    return p


def make_clip(rig, name, keys, loop=False):
    """keys: [(seconds, pose)]. One action per clip, stashed on the NLA."""
    rig.animation_data_create()
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    rig.animation_data.action = action
    for t, pose in keys:
        key_pose(rig, round(t * FPS) + 1, pose)
    end = round(keys[-1][0] * FPS) + 1
    action.frame_range = (1, end)
    action.use_frame_range = True
    if loop:
        action.use_cyclic = True
    track = rig.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 1, action)
    track.mute = True
    rig.animation_data.action = None
    return action


def clips(rig):
    # Idle: breathing, the bat bobbing a little. Loops over 2 s.
    make_clip(rig, 'Idle', [
        (0.0, stance()),
        (1.0, stance(chest=(-3, 0, 0), arms=(-3, 0, 2), head=(2, 0, 0), spine=(-1, 0, 0))),
        (2.0, stance()),
    ], loop=True)

    # Run: one stride pair in 0.6 s, sampled every 0.05 s so the arcs stay round.
    make_clip(rig, 'Run', [(i * 0.05, run_pose(i / 12)) for i in range(13)], loop=True)

    # Swing: wind up (tip back over the left shoulder), drive through, recover. 0.8 s.
    make_clip(rig, 'Swing', [
        (0.00, stance()),
        (0.22, stance(hips=(0, 0, 16, (0, 0.02, -0.03)), spine=(0, 0, 12), chest=(4, -4, 16), arms=(-8, -12, 22), head=(0, 0, -24),
                      **{'thigh.L': (-16, 0, 0), 'thigh.R': (2, 0, 0), 'shin.L': (24, 0, 0)})),
        (0.32, stance(hips=(-4, 0, -8, (0, -0.02, -0.04)), spine=(-4, 0, -7), chest=(-4, 3, -10), arms=(-4, 0, -16), head=(0, 0, 10),
                      **{'thigh.R': (-20, 0, 0), 'thigh.L': (10, 0, 0), 'shin.R': (26, 0, 0)})),
        (0.42, stance(hips=(-6, 0, -18, (0, -0.02, -0.04)), spine=(-6, 0, -14), chest=(-6, 5, -20), arms=(-10, 0, -30), head=(0, 0, 18),
                      **{'thigh.R': (-22, 0, 0), 'thigh.L': (14, 0, 0), 'shin.R': (28, 0, 0)})),
        (0.52, stance(hips=(-5, 0, -18, (0, -0.02, -0.04)), spine=(-5, 0, -14), chest=(-5, 5, -20), arms=(-8, 0, -32), head=(0, 0, 18),
                      **{'thigh.R': (-20, 0, 0), 'thigh.L': (12, 0, 0), 'shin.R': (26, 0, 0)})),
        (0.80, stance()),
    ])

    # Shove: drop the shoulder, drive forward with the bat as a bar, come back. 0.6 s.
    make_clip(rig, 'Shove', [
        (0.00, stance()),
        (0.16, stance(root=(0, 0, 0, (0, 0.03, -0.03)), hips=(-10, 0, 8), chest=(-6, 0, 10), arms=(-8, 0, 0, (0, 0.03, 0)),
                      **{'thigh.L': (-24, 0, 0), 'shin.L': (30, 0, 0), 'thigh.R': (10, 0, 0), 'shin.R': (20, 0, 0)})),
        (0.28, stance(root=(0, 0, 0, (0, -0.12, -0.02)), hips=(-14, 0, -6), spine=(-6, 0, 0), chest=(-8, 0, -8), arms=(8, 0, 0, (0, -0.07, 0.01)),
                      head=(10, 0, 0), **{'thigh.R': (-34, 0, 0), 'shin.R': (22, 0, 0), 'thigh.L': (24, 0, 0), 'shin.L': (10, 0, 0)})),
        (0.38, stance(root=(0, 0, 0, (0, -0.1, -0.02)), hips=(-12, 0, -4), spine=(-5, 0, 0), chest=(-7, 0, -6), arms=(6, 0, 0, (0, -0.06, 0.01)),
                      **{'thigh.R': (-30, 0, 0), 'shin.R': (22, 0, 0), 'thigh.L': (20, 0, 0), 'shin.L': (12, 0, 0)})),
        (0.60, stance()),
    ])

    # Throw / Shoot: the bat comes up and back, then the whole block heaves forward. 0.7 s.
    make_clip(rig, 'Throw', [
        (0.00, stance()),
        (0.24, stance(hips=(4, 0, 14), spine=(8, 0, 10), chest=(14, 0, 18), arms=(30, 0, 25, (0, 0.04, 0.05)), head=(-6, 0, -10),
                      **{'thigh.L': (-18, 0, 0), 'shin.L': (22, 0, 0)})),
        (0.36, stance(hips=(-8, 0, -10), spine=(-6, 0, -10), chest=(-10, 0, -14), arms=(-30, 0, -20, (0, -0.06, -0.02)), head=(10, 0, 8),
                      **{'thigh.R': (-22, 0, 0), 'shin.R': (24, 0, 0), 'thigh.L': (10, 0, 0)})),
        (0.70, stance()),
    ])

    # Hit: knocked back, head snaps, a half step back, recover. 0.5 s.
    make_clip(rig, 'Hit', [
        (0.00, stance()),
        (0.08, stance(root=(0, 0, 0, (0, 0.05, 0)), hips=(8, 0, 4), spine=(10, 0, 0), chest=(14, -6, 6), head=(-20, 0, 8), arms=(10, 0, -6, (0, 0.02, 0.02)),
                      **{'thigh.L': (10, 0, 0), 'thigh.R': (-14, 0, 0)})),
        (0.22, stance(root=(0, 0, 0, (0, 0.06, -0.02)), hips=(4, 0, 2), spine=(4, 0, 0), chest=(6, -3, 3), head=(-6, 0, 3), arms=(4, 0, -3),
                      **{'thigh.L': (14, 0, 0), 'shin.L': (20, 0, 0)})),
        (0.50, stance()),
    ])

    # Dash: crouch, the jetpack lifts him, a hunched glide, the landing. 0.9 s.
    tuck = {'thigh.L': (-40, 0, 0), 'shin.L': (60, 0, 0), 'foot.L': (20, 0, 0),
            'thigh.R': (-20, 0, 0), 'shin.R': (50, 0, 0), 'foot.R': (25, 0, 0)}
    make_clip(rig, 'Dash', [
        (0.00, stance()),
        (0.12, stance(root=(0, 0, 0, (0, 0, -0.05)), hips=(-14, 0, 0), chest=(-8, 0, 0), arms=(-6, 0, 0),
                      **{'thigh.L': (-36, 0, 0), 'shin.L': (60, 0, 0), 'thigh.R': (-36, 0, 0), 'shin.R': (60, 0, 0), 'foot.L': (-20, 0, 0), 'foot.R': (-20, 0, 0)})),
        (0.26, {'root': (0, 0, 0, (0, 0, 0.16)), 'hips': (-22, 0, 0), 'spine': (-6, 0, 0), 'chest': (-6, 0, 0), 'head': (16, 0, 0), 'arms': (-10, 0, 0), **tuck}),
        (0.60, {'root': (0, 0, 0, (0, 0, 0.18)), 'hips': (-24, 0, 0), 'spine': (-6, 0, 0), 'chest': (-6, 0, 0), 'head': (18, 0, 0), 'arms': (-12, 0, 0), **tuck}),
        (0.76, stance(root=(0, 0, 0, (0, 0, -0.05)), hips=(-10, 0, 0), chest=(-4, 0, 0),
                      **{'thigh.L': (-34, 0, 0), 'shin.L': (56, 0, 0), 'thigh.R': (-30, 0, 0), 'shin.R': (54, 0, 0), 'foot.L': (-20, 0, 0), 'foot.R': (-20, 0, 0)})),
        (0.90, stance()),
    ])


def export(rig, mesh, path):
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = rig
    for t in rig.animation_data.nla_tracks:
        t.mute = False
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_force_sampling=True,
        export_frame_range=False,
        export_skins=True,
        export_morph=False,
        export_yup=True,
        export_apply=False,
    )


if __name__ == '__main__':
    rig, mesh, *_ = build()
    clips(rig)
    if OUT_BLEND:
        bpy.ops.wm.save_as_mainfile(filepath=OUT_BLEND)
    if OUT_GLB:
        export(rig, mesh, OUT_GLB)
