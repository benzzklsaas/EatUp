"""Scènes de photographie culinaire (Blender / Cycles) autour de la vraie photo du plat.

Usage : <python bpy> scene.py <A|B|C> <sortie.png> <échantillons> <échelle> [--json fichier]

- La scène (table, accessoires, lumière, profondeur de champ) est rendue physiquement.
- Le plat n'est PAS modélisé : un bol « fantôme » invisible à la caméra, aux dimensions du vrai bol
  (déduites de la photo : Ø 17 cm, vue à ~43°), projette ses ombres et reçoit la lumière ; la vraie photo
  détourée est ensuite posée exactement à l'emplacement projeté du bol fantôme (compose_scene.py).
"""
import json
import math
import sys

import bpy  # doit précéder bmesh quand Blender est utilisé comme module Python
import bmesh
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Euler, Vector

SCENE, OUT, SAMPLES, SCALE = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4])
JSON_OUT = sys.argv[sys.argv.index('--json') + 1] if '--json' in sys.argv else None

W, H = 1350, 1080
CUT_W, CUT_H = 868, 686          # silhouette du bol dans la photo (px) — le bol reste à cette échelle
ELEV = math.radians(42.6)        # inclinaison caméra mesurée sur l'ellipse du rebord (0,677 = sin e)
D, DB = 0.170, 0.106             # Ø rebord, Ø pied (m)

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.render.engine = 'CYCLES'
sc.cycles.device = 'CPU'
sc.cycles.samples = SAMPLES
sc.cycles.use_denoising = True
sc.cycles.denoiser = 'OPENIMAGEDENOISE'
sc.cycles.max_bounces = 8
sc.cycles.caustics_reflective = False
sc.cycles.caustics_refractive = False
sc.render.resolution_x, sc.render.resolution_y = W, H
sc.render.resolution_percentage = int(SCALE * 100)
sc.render.image_settings.file_format = 'PNG'
sc.render.image_settings.color_depth = '16'
sc.view_settings.view_transform = 'Standard'
sc.view_settings.look = 'None'


# ------------------------------------------------------------------ utilitaires

def link(obj):
    sc.collection.objects.link(obj)
    return obj


def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    return m, nt, bsdf


def node(nt, kind, **props):
    n = nt.nodes.new(kind)
    for k, v in props.items():
        if k.startswith('in_'):
            n.inputs[k[3:].replace('_', ' ')].default_value = v
        else:
            setattr(n, k, v)
    return n


def ramp(nt, stops):
    r = nt.nodes.new('ShaderNodeValToRGB')
    el = r.color_ramp.elements
    el[0].position, el[0].color = stops[0][0], (*stops[0][1], 1)
    el[1].position, el[1].color = stops[-1][0], (*stops[-1][1], 1)
    for p, c in stops[1:-1]:
        e = el.new(p)
        e.color = (*c, 1)
    return r


def srgb(h):
    def c(v):
        v /= 255
        return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
    return tuple(c(int(h[i:i + 2], 16)) for i in (1, 3, 5))


def mesh_obj(name, bm):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    return link(bpy.data.objects.new(name, me))


def outline_obj(name, pts, thick, z=0.0):
    """Objet plat extrudé à partir d'un contour 2D (fourchette, plateau…)."""
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, z)) for x, y in pts]
    f = bm.faces.new(vs)
    tri = bmesh.ops.triangulate(bm, faces=[f], quad_method='BEAUTY', ngon_method='EAR_CLIP')
    r = bmesh.ops.extrude_face_region(bm, geom=tri['faces'])
    bmesh.ops.translate(bm, vec=(0, 0, thick), verts=[e for e in r['geom'] if isinstance(e, bmesh.types.BMVert)])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return mesh_obj(name, bm)


def rounded_rect(w, h, r, n=10):
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def bevel(obj, width, segs=3):
    m = obj.modifiers.new('bevel', 'BEVEL')
    m.width, m.segments, m.limit_method = width, segs, 'ANGLE'
    return m


def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True


# ------------------------------------------------------------------ matières

def mat_oak(seed=0.0, tone=1.0, palette=('#B98D5E', '#C9A172', '#7A5232')):
    m, nt, b = new_mat('chene')
    tc = node(nt, 'ShaderNodeTexCoord')
    mp = node(nt, 'ShaderNodeMapping')
    mp.inputs['Location'].default_value = (seed * 3.1, 0.35 + seed * 0.21, 0.28 + seed * 0.13)
    mp.inputs['Rotation'].default_value = (0.0, math.radians(2.0 + seed * 2), math.radians(seed * 1.2))
    mp.inputs['Scale'].default_value = (0.10, 1.0, 1.0)        # fibres étirées le long de la planche (X)
    nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])

    def grain(scale, distortion, width_pow):
        w = node(nt, 'ShaderNodeTexWave', wave_type='RINGS', rings_direction='X', in_Scale=scale,
                 in_Distortion=distortion, in_Detail=4.0, in_Detail_Scale=1.1, in_Detail_Roughness=0.6)
        nt.links.new(mp.outputs['Vector'], w.inputs['Vector'])
        pw = node(nt, 'ShaderNodeMath', operation='POWER')
        pw.inputs[1].default_value = width_pow                  # pic étroit → veine fine
        nt.links.new(w.outputs['Fac'], pw.inputs[0])
        return pw.outputs[0]

    g1 = grain(34.0, 6.0, 9.0)
    g2 = grain(91.0, 9.0, 14.0)
    lines = node(nt, 'ShaderNodeMath', operation='MULTIPLY_ADD')
    nt.links.new(g2, lines.inputs[0])
    lines.inputs[1].default_value = 0.55
    nt.links.new(g1, lines.inputs[2])
    big = node(nt, 'ShaderNodeTexNoise', in_Scale=6.0, in_Detail=3.0)
    nt.links.new(mp.outputs['Vector'], big.inputs['Vector'])
    base = ramp(nt, [(0.35, tuple(c * tone for c in srgb(palette[0]))), (0.65, tuple(c * tone for c in srgb(palette[1])))])
    nt.links.new(big.outputs['Fac'], base.inputs['Fac'])
    vein = node(nt, 'ShaderNodeMix', data_type='RGBA', in_Factor=0.0)
    lf = node(nt, 'ShaderNodeMath', operation='MULTIPLY', use_clamp=True)
    lf.inputs[1].default_value = 0.55
    nt.links.new(lines.outputs[0], lf.inputs[0])
    nt.links.new(lf.outputs[0], vein.inputs[0])
    nt.links.new(base.outputs['Color'], vein.inputs[6])
    vein.inputs[7].default_value = (*(c * tone for c in srgb(palette[2])), 1)
    # fibres (≈0,7 mm × 1-2 cm) et pores en tirets : la micro-texture qui rend le bois réel
    mp2 = node(nt, 'ShaderNodeMapping')
    mp2.inputs['Scale'].default_value = (0.05, 1.0, 1.0)
    mp2.inputs['Location'].default_value = (seed * 7.0, seed * 3.0, 0)
    nt.links.new(tc.outputs['Object'], mp2.inputs['Vector'])
    fib = node(nt, 'ShaderNodeTexNoise', in_Scale=1400.0, in_Detail=2.0, in_Roughness=0.5)
    nt.links.new(mp2.outputs['Vector'], fib.inputs['Vector'])
    fr = node(nt, 'ShaderNodeMapRange', in_From_Min=0.3, in_From_Max=0.7, in_To_Min=0.76, in_To_Max=1.14)
    nt.links.new(fib.outputs['Fac'], fr.inputs['Value'])
    pores = node(nt, 'ShaderNodeTexNoise', in_Scale=650.0, in_Detail=1.0)
    nt.links.new(mp2.outputs['Vector'], pores.inputs['Vector'])
    pr = node(nt, 'ShaderNodeMapRange', in_From_Min=0.60, in_From_Max=0.68, in_To_Min=1.0, in_To_Max=0.55)
    nt.links.new(pores.outputs['Fac'], pr.inputs['Value'])
    micro = node(nt, 'ShaderNodeMath', operation='MULTIPLY')
    nt.links.new(fr.outputs['Result'], micro.inputs[0])
    nt.links.new(pr.outputs['Result'], micro.inputs[1])
    col = node(nt, 'ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY', in_Factor=1.0)
    nt.links.new(vein.outputs[2], col.inputs[6])
    nt.links.new(micro.outputs[0], col.inputs[7])
    nt.links.new(col.outputs[2], b.inputs['Base Color'])
    rough = node(nt, 'ShaderNodeMapRange', in_From_Min=0.76, in_From_Max=1.14, in_To_Min=0.64, in_To_Max=0.42)
    nt.links.new(fr.outputs['Result'], rough.inputs['Value'])
    nt.links.new(rough.outputs['Result'], b.inputs['Roughness'])
    bump = node(nt, 'ShaderNodeBump', in_Strength=0.25, in_Distance=0.0003)
    hb = node(nt, 'ShaderNodeMath', operation='SUBTRACT')
    nt.links.new(micro.outputs[0], hb.inputs[0])
    nt.links.new(lf.outputs[0], hb.inputs[1])
    nt.links.new(hb.outputs[0], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    b.inputs['Specular IOR Level'].default_value = 0.4
    return m


def mat_concrete(base='#B9B1A6', dark='#9C9387'):
    m, nt, b = new_mat('beton')
    tc = node(nt, 'ShaderNodeTexCoord')
    n1 = node(nt, 'ShaderNodeTexNoise', in_Scale=3.0, in_Detail=10.0, in_Roughness=0.62)
    n2 = node(nt, 'ShaderNodeTexNoise', in_Scale=38.0, in_Detail=4.0, in_Roughness=0.5)
    vor = node(nt, 'ShaderNodeTexVoronoi', in_Scale=900.0)
    for n in (n1, n2, vor):
        nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    mix = node(nt, 'ShaderNodeMix', data_type='FLOAT', in_Factor=0.3)
    nt.links.new(n1.outputs['Fac'], mix.inputs[2])
    nt.links.new(n2.outputs['Fac'], mix.inputs[3])
    r = ramp(nt, [(0.30, srgb(dark)), (0.55, srgb(base)), (0.75, tuple(min(1, c * 1.08) for c in srgb(base)))])
    nt.links.new(mix.outputs[0], r.inputs['Fac'])
    pores = node(nt, 'ShaderNodeMapRange', in_From_Min=0.0, in_From_Max=0.08, in_To_Min=0.55, in_To_Max=1.0)
    nt.links.new(vor.outputs['Distance'], pores.inputs['Value'])
    col = node(nt, 'ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY', in_Factor=1.0)
    nt.links.new(r.outputs['Color'], col.inputs[6])
    nt.links.new(pores.outputs['Result'], col.inputs[7])
    nt.links.new(col.outputs[2], b.inputs['Base Color'])
    rr = node(nt, 'ShaderNodeMapRange', in_To_Min=0.42, in_To_Max=0.68)
    nt.links.new(n1.outputs['Fac'], rr.inputs['Value'])
    nt.links.new(rr.outputs['Result'], b.inputs['Roughness'])
    bump = node(nt, 'ShaderNodeBump', in_Strength=0.08, in_Distance=0.0008)
    nt.links.new(n2.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def mat_terrazzo():
    m, nt, b = new_mat('terrazzo')
    tc = node(nt, 'ShaderNodeTexCoord')
    base = node(nt, 'ShaderNodeTexNoise', in_Scale=6.0, in_Detail=6.0)
    nt.links.new(tc.outputs['Object'], base.inputs['Vector'])
    br = ramp(nt, [(0.35, srgb('#E4DDD2')), (0.65, srgb('#EFE9DF'))])
    nt.links.new(base.outputs['Fac'], br.inputs['Fac'])
    color = br.outputs['Color']
    # deux couches d'éclats : distance au bord de cellule de Voronoï + couleur aléatoire de cellule
    for scale, thr, palette in ((55.0, 0.22, ['#A8775E', '#8A918C', '#3A3836', '#C2B8A8', '#B7AFA4']),
                                (170.0, 0.17, ['#A39B91', '#B08A74', '#4A4846', '#CFC6B8'])):
        dist = node(nt, 'ShaderNodeTexNoise', in_Scale=40.0, in_Detail=2.0)
        nt.links.new(tc.outputs['Object'], dist.inputs['Vector'])
        warp = node(nt, 'ShaderNodeMix', data_type='VECTOR', in_Factor=0.006)
        nt.links.new(tc.outputs['Object'], warp.inputs[4])
        nt.links.new(dist.outputs['Color'], warp.inputs[5])
        v = node(nt, 'ShaderNodeTexVoronoi', feature='DISTANCE_TO_EDGE', in_Scale=scale)
        nt.links.new(warp.outputs[1], v.inputs['Vector'])
        v2 = node(nt, 'ShaderNodeTexVoronoi', in_Scale=scale)
        nt.links.new(warp.outputs[1], v2.inputs['Vector'])
        sel = node(nt, 'ShaderNodeSeparateColor')
        nt.links.new(v2.outputs['Color'], sel.inputs['Color'])
        keep = node(nt, 'ShaderNodeMath', operation='GREATER_THAN', in_Value=0.0)
        keep.inputs[1].default_value = 0.72                    # ~28 % des cellules portent un éclat
        nt.links.new(sel.outputs[0], keep.inputs[0])
        inside = node(nt, 'ShaderNodeMath', operation='GREATER_THAN')
        inside.inputs[1].default_value = thr
        nt.links.new(v.outputs['Distance'], inside.inputs[0])
        mask = node(nt, 'ShaderNodeMath', operation='MULTIPLY')
        nt.links.new(keep.outputs[0], mask.inputs[0])
        nt.links.new(inside.outputs[0], mask.inputs[1])
        pal = nt.nodes.new('ShaderNodeValToRGB')
        pal.color_ramp.interpolation = 'CONSTANT'
        el = pal.color_ramp.elements
        el[0].color = (*srgb(palette[0]), 1)
        el[1].position = 0.999
        el[1].color = (*srgb(palette[-1]), 1)
        for i, c in enumerate(palette[1:-1], 1):
            e = el.new(i / len(palette))
            e.color = (*srgb(c), 1)
        nt.links.new(sel.outputs[1], pal.inputs['Fac'])
        mx = node(nt, 'ShaderNodeMix', data_type='RGBA')
        nt.links.new(mask.outputs[0], mx.inputs[0])
        nt.links.new(color, mx.inputs[6])
        nt.links.new(pal.outputs['Color'], mx.inputs[7])
        color = mx.outputs[2]
    nt.links.new(color, b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.32
    fine = node(nt, 'ShaderNodeTexNoise', in_Scale=300.0)
    nt.links.new(tc.outputs['Object'], fine.inputs['Vector'])
    bump = node(nt, 'ShaderNodeBump', in_Strength=0.03, in_Distance=0.0003)
    nt.links.new(fine.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def mat_linen(hexcol, sheen=0.3):
    m, nt, b = new_mat('lin')
    tc = node(nt, 'ShaderNodeTexCoord')
    w1 = node(nt, 'ShaderNodeTexWave', bands_direction='X', in_Scale=430.0, in_Distortion=0.8, in_Detail=1.0)
    w2 = node(nt, 'ShaderNodeTexWave', bands_direction='Y', in_Scale=430.0, in_Distortion=0.8, in_Detail=1.0)
    for n in (w1, w2):
        nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    weave = node(nt, 'ShaderNodeMath', operation='MULTIPLY')
    nt.links.new(w1.outputs['Fac'], weave.inputs[0])
    nt.links.new(w2.outputs['Fac'], weave.inputs[1])
    # fils irréguliers (« flammes » du lin) : bruit très étiré dans les deux sens du tissage
    slubs = []
    for sx, sy in ((0.04, 1.0), (1.0, 0.04)):
        mp = node(nt, 'ShaderNodeMapping')
        mp.inputs['Scale'].default_value = (sx, sy, 1.0)
        nt.links.new(tc.outputs['Object'], mp.inputs['Vector'])
        n = node(nt, 'ShaderNodeTexNoise', in_Scale=260.0, in_Detail=2.0)
        nt.links.new(mp.outputs['Vector'], n.inputs['Vector'])
        slubs.append(n.outputs['Fac'])
    sl = node(nt, 'ShaderNodeMath', operation='ADD')
    nt.links.new(slubs[0], sl.inputs[0])
    nt.links.new(slubs[1], sl.inputs[1])
    c = srgb(hexcol)
    rr = node(nt, 'ShaderNodeMapRange', in_From_Min=0.6, in_From_Max=1.4)
    nt.links.new(sl.outputs[0], rr.inputs['Value'])
    r = ramp(nt, [(0.0, tuple(v * 0.80 for v in c)), (0.5, c), (1.0, tuple(min(1, v * 1.12) for v in c))])
    nt.links.new(rr.outputs['Result'], r.inputs['Fac'])
    wv = node(nt, 'ShaderNodeMapRange', in_To_Min=0.88, in_To_Max=1.0)
    nt.links.new(weave.outputs[0], wv.inputs['Value'])
    col = node(nt, 'ShaderNodeMix', data_type='RGBA', blend_type='MULTIPLY', in_Factor=1.0)
    nt.links.new(r.outputs['Color'], col.inputs[6])
    nt.links.new(wv.outputs['Result'], col.inputs[7])
    nt.links.new(col.outputs[2], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.95
    b.inputs['Specular IOR Level'].default_value = 0.18
    b.inputs['Sheen Weight'].default_value = sheen
    b.inputs['Sheen Roughness'].default_value = 0.6
    bump = node(nt, 'ShaderNodeBump', in_Strength=0.9, in_Distance=0.0005)
    hh = node(nt, 'ShaderNodeMath', operation='MULTIPLY_ADD')
    nt.links.new(sl.outputs[0], hh.inputs[0])
    hh.inputs[1].default_value = 0.3
    nt.links.new(weave.outputs[0], hh.inputs[2])
    nt.links.new(hh.outputs[0], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def mat_paper(hexcol='#F3EEE4', kraft=False):
    m, nt, b = new_mat('papier')
    tc = node(nt, 'ShaderNodeTexCoord')
    fib = node(nt, 'ShaderNodeTexNoise', in_Scale=400.0, in_Detail=6.0, in_Roughness=0.7)
    blot = node(nt, 'ShaderNodeTexNoise', in_Scale=12.0, in_Detail=4.0)
    for n in (fib, blot):
        nt.links.new(tc.outputs['Object'], n.inputs['Vector'])
    c = srgb(hexcol)
    r = ramp(nt, [(0.35, tuple(v * (0.88 if kraft else 0.96) for v in c)), (0.65, c)])
    nt.links.new(blot.outputs['Fac'], r.inputs['Fac'])
    nt.links.new(r.outputs['Color'], b.inputs['Base Color'])
    b.inputs['Roughness'].default_value = 0.55 if kraft else 0.42
    b.inputs['Subsurface Weight'].default_value = 0.0 if kraft else 0.15
    b.inputs['Subsurface Radius'].default_value = (0.002, 0.002, 0.002)
    bump = node(nt, 'ShaderNodeBump', in_Strength=0.06, in_Distance=0.0002)
    nt.links.new(fib.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], b.inputs['Normal'])
    return m


def mat_simple(name, hexcol, rough, metal=0.0, coat=0.0):
    m, nt, b = new_mat(name)
    b.inputs['Base Color'].default_value = (*srgb(hexcol), 1)
    b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal
    b.inputs['Coat Weight'].default_value = coat
    return m


def mat_birch():
    m = mat_oak(seed=4.2, tone=1.25)
    m.name = 'bouleau'
    return m


# ------------------------------------------------------------------ objets

WALNUT = ('#5E3F2B', '#6E4B33', '#2E1D12')


def table(mat_fn, planks=False, palette=WALNUT):
    if not planks:
        bpy.ops.mesh.primitive_plane_add(size=3.0)
        t = bpy.context.object
        t.data.materials.append(mat_fn())
        return
    pw = 0.155                                                   # largeur de planche
    for i in range(-6, 7):
        bpy.ops.mesh.primitive_cube_add(size=1)
        p = bpy.context.object
        p.scale = (3.0, pw - 0.0025, 0.03)
        p.location = (0, i * pw + 0.035, -0.015)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)   # texture en mètres
        bevel(p, 0.0012, 2)
        p.data.materials.append(mat_oak(seed=i * 0.37 + 0.11, tone=1.0 + 0.07 * ((i * 7) % 3 - 1), palette=palette))


def bowl_proxy():
    """Bol fantôme (invisible à la caméra) : ombres, occlusion et lumière renvoyée cohérentes."""
    hb = sc['bowl_h']
    bpy.ops.mesh.primitive_cone_add(vertices=96, radius1=DB / 2, radius2=D / 2, depth=hb, location=(0, 0, sc['bowl_z'] + hb / 2))
    o = bpy.context.object
    bevel(o, 0.004, 3)
    o.data.materials.append(mat_simple('bambou_proxy', '#C9A06E', 0.5))
    o.visible_camera = False
    o.name = 'bol_fantome'
    return o


def napkin(loc, rot_deg, size, mat, layers=2):
    w, h = size
    for k in range(layers):
        bpy.ops.mesh.primitive_cube_add(size=1)
        n = bpy.context.object
        sx = w - k * 0.012
        n.scale = (sx, h - k * 0.004, 0.0028)
        n.location = (loc[0] + k * 0.006, loc[1], 0.0014 + k * 0.0028)
        n.rotation_euler = (0, 0, math.radians(rot_deg))
        bevel(n, 0.0013, 3)
        sub = n.modifiers.new('sub', 'SUBSURF')
        sub.levels = sub.render_levels = 2
        tex = bpy.data.textures.new('plis', 'CLOUDS')
        tex.noise_scale = 0.035
        d = n.modifiers.new('plis', 'DISPLACE')
        d.texture, d.strength, d.mid_level = tex, 0.0012, 0.5
        smooth(n)
        n.data.materials.append(mat)


def cloth_napkin(size, loc, rot_deg, mat, seed=1, frames=70, floor_z=0.0):
    """Carré de lin lâché sur la table : la simulation de tissu crée des plis naturels."""
    bpy.ops.mesh.primitive_plane_add(size=3.0, location=(0, 0, floor_z))
    floor = bpy.context.object
    floor.modifiers.new('collision', 'COLLISION')
    floor.collision.thickness_outer = 0.0008
    floor.hide_render = True
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=70, y_subdivisions=50, size=1, location=(loc[0], loc[1], 0.035))
    o = bpy.context.object
    o.scale = (size[0], size[1], 1)
    o.rotation_euler = (0, 0, math.radians(rot_deg))
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    tex = bpy.data.textures.new(f'froisse{seed}', 'CLOUDS')
    tex.noise_scale = 0.09
    tex.noise_depth = 0
    d = o.modifiers.new('pre', 'DISPLACE')
    d.texture, d.strength = tex, 0.07
    d.texture_coords = 'GLOBAL'
    bpy.ops.object.modifier_apply(modifier='pre')
    cl = o.modifiers.new('tissu', 'CLOTH')
    st = cl.settings
    st.quality, st.mass = 8, 0.12
    st.tension_stiffness = st.compression_stiffness = 8.0
    st.bending_stiffness = 0.35
    st.air_damping = 2.0
    cl.collision_settings.distance_min = 0.0006
    cl.collision_settings.use_self_collision = True
    cl.collision_settings.self_distance_min = 0.0006
    sc.frame_start, sc.frame_end = 1, frames
    cl.point_cache.frame_end = frames
    for f in range(1, frames + 1):
        sc.frame_set(f)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    o.modifiers.clear()
    o.data = me
    sc.frame_set(1)
    bpy.data.objects.remove(floor)
    sol = o.modifiers.new('epaisseur', 'SOLIDIFY')
    sol.thickness = 0.0009
    sub = o.modifiers.new('lisse', 'SUBSURF')
    sub.levels = sub.render_levels = 1
    smooth(o)
    o.data.materials.append(mat)
    return o


def rest_height(cloth, loc, rot_deg, length, radius=0.007):
    """Hauteur des crêtes du tissu sous l'axe de la fourchette (elle repose sur les plis)."""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = cloth.evaluated_get(dg)
    co = [ev.matrix_world @ v.co for v in ev.data.vertices]
    a = math.radians(rot_deg)
    pts = [(loc[0] + t * length * math.cos(a), loc[1] + t * length * math.sin(a)) for t in [i / 20 for i in range(21)]]
    zs = [v.z for v in co if any((v.x - x) ** 2 + (v.y - y) ** 2 < radius ** 2 for x, y in pts)]
    return (max(zs) if zs else 0.0) + 0.0006


def fork(loc, rot_deg, metal=True, length=0.19, z=0.0):
    L = length
    pts = []
    # contour : manche arrondi → col → tête à 4 dents (repère : axe X, origine au bout du manche)
    hw = [(0.0, 0.0105), (0.012, 0.0122), (0.05, 0.010), (0.10, 0.0068), (0.125, 0.0045), (0.135, 0.0055), (0.145, 0.0105), (0.152, 0.0125)]
    top = [(x * L / 0.19, y) for x, y in hw]
    tine_x0, tine_x1 = 0.152 * L / 0.19, L
    n_t = 4 if metal else 3
    head_w = 0.0125
    gap = 0.0022
    tw = (2 * head_w - (n_t - 1) * gap) / n_t
    # côté +Y du manche vers la tête
    pts += [(x, y) for x, y in top]
    # dents, de +Y vers -Y
    y = head_w
    for i in range(n_t):
        y0, y1 = y, y - tw
        pts += [(tine_x1 - 0.002, y0), (tine_x1, (y0 + y1) / 2 + 0.0002), (tine_x1 - 0.002, y1)]
        if i < n_t - 1:
            pts += [(tine_x0 + 0.004, y1), (tine_x0 + 0.004, y1 - gap)]
        y = y1 - gap
    pts += [(x, -y_) for x, y_ in reversed(top)]
    pts += [(-0.002, 0.0)]
    pts = [(x, y_) for x, y_ in pts]
    f = outline_obj('fourchette', pts, 0.0022 if metal else 0.0024)
    bevel(f, 0.0006, 2)
    f.location = (loc[0], loc[1], z)
    f.rotation_euler = (0, 0, math.radians(rot_deg))
    f.data.materials.append(mat_simple('inox', '#E2E0DC', 0.11, metal=1.0) if metal else mat_birch())
    return f


def crinkled_sheet(size, loc, rot_deg, mat, z=0.0006, amp=0.0022, cell=0.03):
    bpy.ops.mesh.primitive_plane_add(size=1, location=(loc[0], loc[1], z))
    s = bpy.context.object
    s.scale = (size[0], size[1], 1)
    s.rotation_euler = (0, 0, math.radians(rot_deg))
    bpy.ops.object.transform_apply(scale=True)
    sub = s.modifiers.new('sub', 'SUBSURF')
    sub.subdivision_type = 'SIMPLE'
    sub.levels = sub.render_levels = 7
    tex = bpy.data.textures.new('froisse', 'VORONOI')
    tex.noise_scale = cell
    tex.distance_metric = 'DISTANCE'
    d = s.modifiers.new('froisse', 'DISPLACE')
    d.texture, d.strength, d.mid_level = tex, amp, 0.0
    tex2 = bpy.data.textures.new('ondule', 'CLOUDS')
    tex2.noise_scale = 0.08
    d2 = s.modifiers.new('ondule', 'DISPLACE')
    d2.texture, d2.strength = tex2, amp * 0.8
    sol = s.modifiers.new('epaisseur', 'SOLIDIFY')
    sol.thickness = 0.0003
    s.data.materials.append(mat)
    return s


def tray(size, loc, rot_deg, mat, lip=0.016, r=0.028):
    w, h = size
    bm = bmesh.new()
    base = rounded_rect(w, h, r)
    top = rounded_rect(w + 0.016, h + 0.016, r + 0.008)
    vb = [bm.verts.new((x, y, 0.0)) for x, y in base]
    vt = [bm.verts.new((x, y, lip)) for x, y in top]
    bm.faces.new(vb)
    n = len(vb)
    for i in range(n):
        bm.faces.new((vb[i], vb[(i + 1) % n], vt[(i + 1) % n], vt[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    t = mesh_obj('plateau', bm)
    sol = t.modifiers.new('epaisseur', 'SOLIDIFY')
    sol.thickness, sol.offset = 0.0022, 1.0
    bevel(t, 0.0012, 3)
    t.location = (loc[0], loc[1], 0.0023)
    t.rotation_euler = (0, 0, math.radians(rot_deg))
    smooth(t)
    t.data.materials.append(mat)
    return t


# ------------------------------------------------------------------ lumière, caméra

def lights(key_energy=380.0, warm=(1.0, 0.94, 0.86)):
    k = bpy.data.lights.new('fenetre', 'AREA')
    k.shape, k.size, k.size_y = 'RECTANGLE', 0.9, 1.3
    k.energy, k.color = key_energy, warm
    ko = link(bpy.data.objects.new('fenetre', k))
    ko.location = (-1.10, 0.30, 0.70)
    ko.rotation_euler = (Vector((0, 0, 0.03)) - ko.location).to_track_quat('-Z', 'Y').to_euler()
    f = bpy.data.lights.new('reflecteur', 'AREA')
    f.size = 1.0
    f.energy, f.color = key_energy * 0.07, (1.0, 0.97, 0.93)
    fo = link(bpy.data.objects.new('reflecteur', f))
    fo.location = (0.9, -0.75, 0.55)
    fo.rotation_euler = (Vector((0, 0, 0.03)) - fo.location).to_track_quat('-Z', 'Y').to_euler()
    w = bpy.data.worlds.new('monde')
    sc.world = w
    w.use_nodes = True
    wn = w.node_tree
    tc = node(wn, 'ShaderNodeTexCoord')
    sep = node(wn, 'ShaderNodeSeparateXYZ')
    wn.links.new(tc.outputs['Generated'], sep.inputs['Vector'])
    r = ramp(wn, [(0.0, (0.10, 0.09, 0.08)), (0.5, (0.45, 0.42, 0.38)), (1.0, (1.0, 0.96, 0.9))])
    mr = node(wn, 'ShaderNodeMapRange', in_From_Min=-1.0, in_From_Max=1.0)
    wn.links.new(sep.outputs['Z'], mr.inputs['Value'])
    wn.links.new(mr.outputs['Result'], r.inputs['Fac'])
    wn.links.new(r.outputs['Color'], wn.nodes['Background'].inputs['Color'])
    wn.nodes['Background'].inputs['Strength'].default_value = 0.14


def camera(fstop):
    cam = bpy.data.cameras.new('cam')
    cam.lens, cam.sensor_width, cam.sensor_fit = 85.0, 36.0, 'HORIZONTAL'
    co = link(bpy.data.objects.new('cam', cam))
    sc.camera = co
    cam.dof.use_dof = False                                    # netteté totale ; flou d'arrière-plan en post (compose_scene.py)
    cam.shift_y = 0.035                                         # décentrement : le bol descend un peu dans le cadre
    cam.dof.aperture_fstop = fstop
    return co


def aim(co, dist):
    target = Vector((0, 0, sc['bowl_z'] + sc['bowl_h'] * 0.45))
    co.location = target + dist * Vector((0, -math.cos(ELEV), math.sin(ELEV)))
    co.rotation_euler = (target - co.location).to_track_quat('-Z', 'Y').to_euler()
    co.data.dof.focus_distance = dist


def proxy_bbox(co, hb):
    """Boîte englobante projetée (px) du bol fantôme : rebord (ellipse haute) + pied (ellipse basse)."""
    bpy.context.view_layer.update()
    xs, ys = [], []
    for i in range(360):
        a = math.radians(i)
        for r, z in ((D / 2, sc['bowl_z'] + hb), (DB / 2, sc['bowl_z'])):
            p = world_to_camera_view(sc, co, Vector((r * math.cos(a), r * math.sin(a), z)))
            xs.append(p.x * W)
            ys.append((1 - p.y) * H)
    return min(xs), min(ys), max(xs), max(ys)


# ------------------------------------------------------------------ scènes

sc['bowl_h'] = 0.053
sc['bowl_z'] = 0.0048 if SCENE == 'C' else 0.0012      # posé sur plateau + papier (C) ou sur papier/table
co = camera({'A': 5.6, 'B': 5.6, 'C': 6.3}[SCENE])
# calage : distance pour que le bol fasse 868 px de large, hauteur du bol pour retrouver 686 px
dist = 0.62
for _ in range(6):
    aim(co, dist)
    x0, y0, x1, y1 = proxy_bbox(co, sc['bowl_h'])
    dist *= (x1 - x0) / CUT_W
    sc['bowl_h'] = sc['bowl_h'] * (1 + 0.9 * (CUT_H - (y1 - y0) * CUT_W / (x1 - x0)) / CUT_H)
aim(co, dist)
bb = proxy_bbox(co, sc['bowl_h'])
bowl_proxy()

if SCENE == 'A':
    # Table en chêne huilé, serviette en lin sauge, fourchette inox — lumière de fenêtre à gauche
    table(None, planks=True)
    lin = mat_linen('#66734F', sheen=0.3)
    nap = cloth_napkin((0.26, 0.24), (-0.20, 0.13), 18, lin, seed=1)
    fork((-0.255, 0.175), -32, metal=True, z=rest_height(nap, (-0.255, 0.175), -32, 0.19))
    lights(100.0)
elif SCENE == 'B':
    # Béton ciré chaud, papier sulfurisé froissé sous le bol, serviette lin anthracite, fourchette bois
    table(lambda: mat_concrete('#7A746C', '#625C55'), planks=False)
    crinkled_sheet((0.27, 0.27), (-0.005, 0.0), 24, mat_paper('#E9E3D8'), amp=0.0035, cell=0.022)
    lin = mat_linen('#CDBFA6', sheen=0.3)
    cloth_napkin((0.24, 0.22), (0.255, 0.20), -14, lin, seed=2)
    lights(72.0)
elif SCENE == 'C':
    # Plateau noir mat de fast-food premium sur table terrazzo, papier ingraissable, serviette papier
    table(mat_terrazzo, planks=False)
    tray((0.31, 0.23), (0.035, 0.035), 6, mat_simple('plateau_noir', '#1E1E1E', 0.42, coat=0.15))
    crinkled_sheet((0.25, 0.19), (0.035, 0.035), 3, mat_paper('#ECE6DB'), z=0.0030, amp=0.0024, cell=0.03)
    paper_nap = mat_paper('#FBFAF7')
    napkin((0.165, 0.10), 82, (0.11, 0.075), paper_nap, layers=1)
    fork((0.15, -0.02), 98, metal=False, length=0.16, z=0.0062)
    lights(90.0)

if '--border' in sys.argv:                                    # rendu partiel pour contrôler une zone à 100 %
    i = sys.argv.index('--border')
    bx0, by0, bx1, by1 = (float(v) for v in sys.argv[i + 1:i + 5])
    sc.render.use_border, sc.render.use_crop_to_border = True, True
    sc.render.border_min_x, sc.render.border_max_x = bx0, bx1
    sc.render.border_min_y, sc.render.border_max_y = 1 - by1, 1 - by0
sc.render.filepath = OUT
bpy.ops.render.render(write_still=True)
if JSON_OUT:
    cd = co.data
    json.dump({'bbox': bb, 'bowl_h': sc['bowl_h'], 'dist': dist, 'scale': SCALE,
               'cam': {'loc': list(co.location), 'rot': [list(r) for r in co.matrix_world.to_3x3()],
                       'lens': cd.lens, 'sensor': cd.sensor_width, 'shift_x': cd.shift_x, 'shift_y': cd.shift_y}},
              open(JSON_OUT, 'w'))
print('bbox', [round(v, 1) for v in bb], 'h', round(sc['bowl_h'], 4), 'dist', round(dist, 3))
