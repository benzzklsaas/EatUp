"""Phase 2 — plateaux de prise de vue de la scène A validée, et passes d'ombre par produit.

Usage : <python bpy> scene_card.py <config.json>
config : {"cls": "HIGH|MID|LOW", "fork": bool, "proxy": null | {"type": "bowl|cyl|box|ell",
          "w_px": .., "h_px": .., "depth": .., "rotz": ..}, "scale": 1.0|0.5, "samples": n,
          "out": "x.png", "json": "x.json", "cache": "dossier"}

- Plateau (proxy = null) : table en noyer, serviette en lin sauge (simulation de tissu mise en cache pour que
  toutes les passes voient exactement le même tissu), fourchette si demandée, fenêtre à gauche, mur au fond.
  Caméra fixe par classe : tous les produits d'une même classe partagent exactement le même décor.
- Passe d'ombre (proxy fourni) : un objet fantôme aux dimensions du produit (ajustées pour que sa silhouette
  projetée ait la taille du produit en pixels) projette ses ombres ; il reste invisible à la caméra.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import scene_lib as L  # noqa: E402  (importe bpy)
import bpy  # noqa: E402
from bpy_extras.object_utils import world_to_camera_view  # noqa: E402
from mathutils import Vector  # noqa: E402

cfg = json.load(open(sys.argv[1]))
W, PH = 1350, 1500                       # plateau plus haut que l'image finale : recadrage centré par produit
WALL_Y = 1.05
CLASSES = {
    # inclinaison caméra (°), distance (m), point visé (hauteur m), ligne de pose du produit (px du plateau)
    'HIGH': dict(elev=42.6, dist=0.651, aim_z=0.03, base_y=930),   # bols, salades, frites, tacos, dessert
    'MID': dict(elev=25.0, dist=0.755, aim_z=0.03, base_y=930),    # sandwichs, tenders
    'LOW': dict(elev=10.0, dist=0.470, aim_z=0.05, base_y=930),    # burgers, boissons
}
C = CLASSES[cfg['cls']]

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = cfg.get('samples', 128)
sc.cycles.use_denoising = True
sc.cycles.denoiser = 'OPENIMAGEDENOISE'
sc.cycles.max_bounces = 8
sc.cycles.caustics_reflective = sc.cycles.caustics_refractive = False
sc.render.resolution_x, sc.render.resolution_y = W, PH
sc.render.resolution_percentage = int(cfg.get('scale', 1.0) * 100)
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_depth = '16'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'

# ---------------------------------------------------------------- décor (identique pour toute la classe)
L.table(None, planks=True)
if cfg['cls'] != 'HIGH':                 # en plongée le mur est hors champ (et se refléterait dans l'inox)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, WALL_Y, 0.9))
    wall = bpy.context.object
    wall.scale = (4.0, 1.8, 1)
    wall.rotation_euler = (math.radians(90), 0, 0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    wall.data.materials.append(L.mat_concrete('#B3A796', '#A0937F'))     # enduit grège, très flou au final

cache = os.path.join(cfg['cache'], f"serviette_{cfg['cls']}.json")
lin = L.mat_linen('#66734F', sheen=0.3)
if cfg['cls'] == 'HIGH':
    nap = L.cloth_napkin((0.26, 0.24), (-0.20, 0.13), 18, lin, seed=1, cache=cache)
    if cfg.get('fork'):
        L.fork((-0.255, 0.175), -32, metal=True, z=L.rest_height(nap, (-0.255, 0.175), -32, 0.19))
elif cfg['cls'] == 'MID':
    nap = L.cloth_napkin((0.26, 0.24), (-0.25, 0.20), 16, lin, seed=1, cache=cache)
else:
    nap = L.cloth_napkin((0.24, 0.22), (-0.17, 0.25), 14, lin, seed=1, cache=cache)
L.lights(100.0)

cam = L.camera(5.6)
cam.data.dof.use_dof = False
target = Vector((0, 0, C['aim_z']))
e = math.radians(C['elev'])
cam.location = target + C['dist'] * Vector((0, -math.cos(e), math.sin(e)))
cam.rotation_euler = (target - cam.location).to_track_quat('-Z', 'Y').to_euler()


def to_px(co):
    p = world_to_camera_view(sc, cam, co)
    return p.x * W, (1 - p.y) * PH


# décentrement vertical : la ligne de pose (origine) tombe sur base_y du plateau
cam.data.shift_y = 0.0
for _ in range(4):
    bpy.context.view_layer.update()
    _, py = to_px(Vector((0, 0, 0)))
    cam.data.shift_y += (C['base_y'] - py) / W

# ---------------------------------------------------------------- objet fantôme du produit
info = {'cls': cfg['cls'], 'wall_y': WALL_Y, 'dist': C['dist'],
        'cam': {'loc': list(cam.location), 'rot': [list(r) for r in cam.matrix_world.to_3x3()],
                'lens': cam.data.lens, 'sensor': cam.data.sensor_width,
                'shift_x': cam.data.shift_x, 'shift_y': cam.data.shift_y}}
px = cfg.get('proxy')
if px and px['type'] == 'foot':
    # fantôme « empreinte » : silhouette du produit projetée sur la table puis extrudée à sa hauteur réelle.
    # La zone sous l'objet se projette exactement dans la silhouette : elle reste cachée par la photo.
    import bmesh
    R = cam.matrix_world.to_3x3()
    sw, sh_ = cam.data.sensor_width, cam.data.sensor_width * PH / W
    pts = []
    for u, v in px['contour']:
        x = ((u + 0.5) / W - 0.5 + cam.data.shift_x) * sw
        y = (0.5 - (v + 0.5) / PH) * sh_ + cam.data.shift_y * sw
        d = R @ Vector((x, y, -cam.data.lens))
        t = -cam.location.z / d.z
        hit = cam.location + t * d
        pts.append((hit.x, hit.y))
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, 0.0)) for x, y in pts]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    bmesh.ops.translate(bm, vec=(0, 0, px['height']), verts=[e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = L.mesh_obj('empreinte', bm)
    o.visible_camera = False
    o.data.materials.append(L.mat_simple('fantome', '#B08A60', 0.5))
    xs_ = [q[0] for q in pts]
    ys_ = [q[1] for q in pts]
    info.update({'bbox': None, 'placement': px['placement'],
                 'size_m': [max(xs_) - min(xs_), max(ys_) - min(ys_), px['height']]})
elif px:
    t = px['type']
    if t == 'bowl':
        bpy.ops.mesh.primitive_cone_add(vertices=96, radius1=0.31, radius2=0.5, depth=1.0)
    elif t == 'cyl':
        bpy.ops.mesh.primitive_cylinder_add(vertices=96, radius=0.5, depth=1.0)
    elif t == 'box':
        bpy.ops.mesh.primitive_cube_add(size=1.0)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=32, radius=0.5)
    o = bpy.context.object
    o.visible_camera = False
    o.rotation_euler = (0, 0, math.radians(px.get('rotz', 0.0)))
    o.data.materials.append(L.mat_simple('fantome', '#B08A60', 0.5))
    depth = px.get('depth', 1.0)
    w, h = 0.10, 0.06

    def place(w, h):
        o.scale = (w, w * depth, h)
        o.location = (0, 0, h / 2 * (0.92 if t == 'ell' else 1.0))
        bpy.context.view_layer.update()
        pts = [to_px(o.matrix_world @ v.co) for v in o.data.vertices]
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        return min(xs), min(ys), max(xs), max(ys)

    # fantôme plus étroit que le produit : son pied reste caché par la photo (canettes : fond plus étroit que le corps)
    tw, th = px['w_px'] * px.get('inset', 0.96), px['h_px'] * 0.97
    for _ in range(10):                 # ajuste largeur puis hauteur sur la silhouette du produit (px)
        x0, y0, x1, y1 = place(w, h)
        w *= tw / (x1 - x0)
        x0, y0, x1, y1 = place(w, h)
        h *= 1 + 0.9 * (th - (y1 - y0)) / th
    bb = place(w, h)
    info.update({'bbox': bb, 'size_m': [w, w * depth, h]})
else:
    info['bbox'] = None

sc.render.filepath = cfg['out']
bpy.ops.render.render(write_still=True)
json.dump(info, open(cfg['json'], 'w'))
print('ok', cfg['cls'], 'bbox', None if not info.get('bbox') else [round(v) for v in info['bbox']],
      'taille (cm)', None if not px else [round(v * 100, 1) for v in info['size_m']])
