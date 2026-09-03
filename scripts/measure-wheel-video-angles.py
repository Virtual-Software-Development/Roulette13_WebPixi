#!/usr/bin/env python3
"""Mide el angulo real de las 38 casillas de la rueda americana en un video de loop
(local-media/Lobby/lobby_loop_american.webm) y regenera
src/layout/wheelVideoGeometry.american.frames.ts (AMERICAN_POCKET_ANGLE_DEG_BY_FRAME).

No usa OCR: clasifica el color de cada casilla (rojo/negro/verde) muestreando un anillo a un
radio fijo alrededor del centro de la rueda, y hace phase-lock contra la secuencia de colores
conocida del paño americano (AMERICAN_WHEEL_ORDER) para identificar cada casilla sin ambiguedad.

Requiere unos pocos frames de muestra repartidos a lo largo del loop (no los 433 completos):
si el render es rigido y sin distorsion de perspectiva relevante (confirmado empiricamente para
el video actual -- ver el comentario de cabecera que este script escribe en el archivo generado),
un ajuste conjunto de minimos cuadrados sobre esos frames alcanza para derivar la forma base
(angulo de cada casilla en frame 0) y la tasa de rotacion por frame, y de ahi se genera la tabla
completa por formula cerrada -- mucho mas rapido y sin el ruido de clasificar cuadro a cuadro.

Requisitos: ffmpeg en PATH, y `pip install opencv-python numpy`.

Uso:
  python scripts/measure-wheel-video-angles.py [--video PATH] [--out PATH] [--sample-frames N]

Antes de confiar en el resultado, revisar el output: reporta si algun frame de muestra no logro
phase-lock 38/38, y el desvio estandar de la tasa de rotacion entre las 38 casillas (si es grande,
la rotacion no es rigida y este metodo de formula cerrada NO es apropiado -- hay que medir cada
uno de los frames reales por separado en cambio, ver el comentario grande mas abajo).
"""
import argparse
import math
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_VIDEO = REPO_ROOT / 'local-media' / 'Lobby' / 'lobby_loop_american.webm'
DEFAULT_OUT = REPO_ROOT / 'src' / 'layout' / 'wheelVideoGeometry.american.frames.ts'

AMERICAN_WHEEL_ORDER = [
    0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, '00',
    27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21, 33, 16, 4, 23, 35, 14, 2,
]
RED = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}


def pocket_color(p):
    if p in (0, '00'):
        return 'G'
    return 'R' if p in RED else 'B'


EXPECTED_COLORS = [pocket_color(p) for p in AMERICAN_WHEEL_ORDER]
N_POCKETS = len(AMERICAN_WHEEL_ORDER)


def find_ffmpeg():
    exe = shutil.which('ffmpeg') or shutil.which('ffmpeg.exe')
    if exe:
        return exe
    import os
    wingetRoot = os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'WinGet', 'Packages')
    if os.path.isdir(wingetRoot):
        for pkg in os.listdir(wingetRoot):
            if pkg.startswith('Gyan.FFmpeg'):
                pkgDir = os.path.join(wingetRoot, pkg)
                for build in os.listdir(pkgDir):
                    if build.startswith('ffmpeg-'):
                        cand = os.path.join(pkgDir, build, 'bin', 'ffmpeg.exe')
                        if os.path.isfile(cand):
                            return cand
    raise RuntimeError('No se encontro ffmpeg en PATH ni en la ruta de winget. Instalarlo o pasar --ffmpeg.')


def probe_frame_count(ffmpeg, ffprobe, video):
    result = subprocess.run(
        [ffprobe, '-v', 'error', '-select_streams', 'v:0', '-count_frames',
         '-show_entries', 'stream=nb_read_frames', '-of', 'default=noprint_wrappers=1:nokey=1', str(video)],
        capture_output=True, text=True,
    )
    return int(result.stdout.strip())


def extract_frame(ffmpeg, video, frame_index, out_path):
    subprocess.run(
        [ffmpeg, '-y', '-i', str(video), '-vf', f'select=eq(n\\,{frame_index})',
         '-vframes', '1', '-pix_fmt', 'rgba', str(out_path), '-loglevel', 'error'],
        check=True,
    )


def fit_precise_circle(img):
    """Ajuste de circulo (minimos cuadrados) sobre el contorno del borde exterior de la rueda --
    mucho mas preciso que Hough para el centro (confirmado: un error de ~2.5px en el centro ya
    genera un sesgo angular sinusoidal de ~2 grados al muestrear el anillo de numeros)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    _, mask = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    largest = max(contours, key=cv2.contourArea)
    pts = largest.reshape(-1, 2).astype(np.float64)
    x, y = pts[:, 0], pts[:, 1]
    A = np.column_stack([2 * x, 2 * y, np.ones_like(x)])
    b = x ** 2 + y ** 2
    cx, cy, c = np.linalg.lstsq(A, b, rcond=None)[0]
    r = math.sqrt(c + cx ** 2 + cy ** 2)
    return cx, cy, r


def sample_ring_raw(img, cx, cy, radius, n, centroids, max_dist):
    h, w = img.shape[:2]
    raw = []
    for i in range(n):
        theta = 360.0 * i / n
        rad = math.radians(theta)
        x = cx + radius * math.sin(rad)
        y = cy - radius * math.cos(rad)
        xi, yi = int(round(x)), int(round(y))
        if 0 <= yi < h and 0 <= xi < w:
            b, g, r = img[yi, xi]
            px = np.array([int(b), int(g), int(r)], dtype=float)
            best_c, best_d = None, 1e9
            for c, ref in centroids.items():
                d = np.linalg.norm(px - ref)
                if d < best_d:
                    best_d, best_c = d, c
            raw.append(best_c if best_d <= max_dist else 'W')
        else:
            raw.append('?')
    return raw


def majority_smooth(raw, window):
    n = len(raw)
    out = list(raw)
    half = window // 2
    for i in range(n):
        counts = {'R': 0, 'G': 0, 'B': 0}
        for k in range(-half, half + 1):
            c = raw[(i + k) % n]
            if c in counts:
                counts[c] += 1
        best = max(counts, key=lambda k: counts[k])
        if counts[best] > 0:
            out[i] = best
    return out


def build_runs(colors, n):
    start = 0
    for i in range(n):
        if colors[i] != colors[i - 1]:
            start = i
            break
    runs = []
    cur_color = colors[start]
    cur_idx = [start]
    for k in range(1, n):
        idx = (start + k) % n
        c = colors[idx]
        if c == cur_color:
            cur_idx.append(idx)
        else:
            runs.append((cur_color, cur_idx))
            cur_color, cur_idx = c, [idx]
    runs.append((cur_color, cur_idx))
    return runs


def circular_midpoint(idxs, n):
    thetas = [360.0 * i / n for i in idxs]
    unwrapped = [thetas[0]]
    for t in thetas[1:]:
        prev = unwrapped[-1]
        cand = t
        while cand < prev - 180:
            cand += 360
        unwrapped.append(cand)
    return (sum(unwrapped) / len(unwrapped)) % 360


def find_best_rotation(run_colors):
    if len(run_colors) != N_POCKETS:
        return None, -1
    best_off, best_score = 0, -1
    for off in range(N_POCKETS):
        rotated = [EXPECTED_COLORS[(i + off) % N_POCKETS] for i in range(N_POCKETS)]
        score = sum(1 for a, b in zip(rotated, run_colors) if a == b)
        if score > best_score:
            best_score, best_off = score, off
    return best_off, best_score


def measure_frame(img, cx, cy, radius, centroids, n=7200, smooth_window=15, max_dist=70.0):
    raw = sample_ring_raw(img, cx, cy, radius, n, centroids, max_dist)
    smoothed = majority_smooth(raw, smooth_window)
    runs = build_runs(smoothed, n)
    min_len = (n / N_POCKETS) * 0.3
    real_runs = [r for r in runs if len(r[1]) >= min_len]
    if len(real_runs) != N_POCKETS:
        return None, len(real_runs), None
    run_colors = [r[0] for r in real_runs]
    off, score = find_best_rotation(run_colors)
    if score != N_POCKETS:
        return None, N_POCKETS, score
    midpoints = [circular_midpoint(r[1], n) for r in real_runs]
    result = [None] * N_POCKETS
    for i in range(N_POCKETS):
        result[(i + off) % N_POCKETS] = midpoints[i]
    return result, N_POCKETS, score


def bootstrap_centroids(img, cx, cy, radius, n=7200):
    """Primera pasada con umbrales genericos (no calibrados) para clasificar frame 0, sacar
    centroides BGR reales de esa clasificacion, y asi poder re-clasificar con vecino-mas-cercano
    (mucho mas robusto frente a tinte/iluminacion que un umbral fijo -- confirmado empiricamente:
    pixeles de casillas negras con reflejo calido se confundian con rojo bajo un umbral simple)."""
    def generic_classify(b, g, r):
        if min(b, g, r) > 90 and (max(b, g, r) - min(b, g, r)) < 50:
            return 'W'
        if g > r and g > b and g > 60:
            return 'G'
        if r > g + 20 and r > b + 10:
            return 'R'
        return 'B'

    h, w = img.shape[:2]
    raw = []
    for i in range(n):
        theta = 360.0 * i / n
        rad = math.radians(theta)
        x, y = cx + radius * math.sin(rad), cy - radius * math.cos(rad)
        xi, yi = int(round(x)), int(round(y))
        b, g, r = img[yi, xi] if 0 <= yi < h and 0 <= xi < w else (0, 0, 0)
        raw.append(generic_classify(int(b), int(g), int(r)))

    runs = build_runs(raw, n)
    min_len = (n / N_POCKETS) * 0.3
    real_runs = [r for r in runs if len(r[1]) >= min_len and r[0] in ('R', 'G', 'B')]

    samples = {'R': [], 'B': [], 'G': []}
    for color, idxs in real_runs:
        mid = idxs[len(idxs) // 4: 3 * len(idxs) // 4]
        for i in mid:
            theta = 360.0 * i / n
            rad = math.radians(theta)
            x, y = cx + radius * math.sin(rad), cy - radius * math.cos(rad)
            xi, yi = int(round(x)), int(round(y))
            b, g, r = img[yi, xi]
            samples[color].append([int(b), int(g), int(r)])

    return {k: np.mean(v, axis=0) for k, v in samples.items() if v}


def generate_ts(base_shape, rate, frame_count, out_path, cx, cy, radius, r2_info):
    duration = frame_count / 60
    header = f"""// Generado por scripts/measure-wheel-video-angles.py -- NO editar a mano.
// {frame_count} filas (una por frame real del video, 0..{frame_count - 1} a 60fps =
// {duration:.3f}s), cada una con los 38 angulos (grados) de cada casilla en ESE frame exacto,
// mismo orden que getWheelOrder('american'). Medido sin OCR: barrido de color (rojo/negro/verde)
// a radio fijo alrededor del centro real (ajuste de circulo por minimos cuadrados sobre el borde
// exterior de la rueda), con phase-lock contra la secuencia de colores conocida del paño
// americano para identificar cada casilla.
//
// Generado por formula cerrada (forma medida en frame 0 + rotacion uniforme), NO midiendo cada
// frame por separado -- valido porque el ajuste conjunto sobre varios frames de muestra confirmo
// rotacion practicamente rigida: {r2_info}. Si se reemplaza el video por uno con perspectiva de
// camara real (deriva angular relevante entre casillas a lo largo del loop), este metodo deja de
// ser valido y hay que volver a medir cuadro por cuadro (ver el script para el detalle).
export const AMERICAN_POCKET_ANGLE_DEG_BY_FRAME: number[][] = [
"""
    lines = [header]
    for f in range(frame_count):
        row = [(base_shape[i] + f * rate) % 360 for i in range(N_POCKETS)]
        lines.append('  [' + ', '.join(f'{v:.2f}' for v in row) + '],\n')
    lines.append(']\n')
    out_path.write_text(''.join(lines), encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--video', type=Path, default=DEFAULT_VIDEO)
    parser.add_argument('--out', type=Path, default=DEFAULT_OUT)
    parser.add_argument('--sample-frames', type=int, default=15)
    parser.add_argument('--radius', type=float, default=None, help='Radio de muestreo del anillo de numeros (default: auto, ~52%% del radio exterior)')
    parser.add_argument('--force', action='store_true', help='Generar la tabla igual aunque la rotacion no parezca rigida (ver RATE_STD_THRESHOLD)')
    args = parser.parse_args()

    ffmpeg = find_ffmpeg()
    ffmpeg_path = Path(ffmpeg)
    ffprobe = str(ffmpeg_path.with_name(ffmpeg_path.name.replace('ffmpeg', 'ffprobe')))

    frame_count = probe_frame_count(ffmpeg, ffprobe, args.video)
    print(f'video: {args.video}  frames={frame_count}')

    sample_indices = sorted(set(
        min(frame_count - 1, round(i * (frame_count - 1) / (args.sample_frames - 1)))
        for i in range(args.sample_frames)
    ))

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        frame0_path = tmp / 'frame_0.png'
        extract_frame(ffmpeg, args.video, 0, frame0_path)
        img0 = cv2.imread(str(frame0_path), cv2.IMREAD_COLOR)

        cx, cy, outer_r = fit_precise_circle(img0)
        radius = args.radius or outer_r * 0.52
        print(f'center=({cx:.3f}, {cy:.3f})  outer_r={outer_r:.2f}  sample_radius={radius:.2f}')

        centroids = bootstrap_centroids(img0, cx, cy, radius)
        for k, v in centroids.items():
            print(f'  centroid {k}: BGR {v}')

        measurements = {}
        for idx in sample_indices:
            path = tmp / f'frame_{idx}.png'
            extract_frame(ffmpeg, args.video, idx, path)
            img = cv2.imread(str(path), cv2.IMREAD_COLOR)
            result, nruns, score = measure_frame(img, cx, cy, radius, centroids)
            if result is None:
                print(f'  FRAME {idx}: FALLO (runs={nruns} score={score}) -- descartado')
                continue
            measurements[idx] = result
            print(f'  frame {idx}: OK score={score}/{N_POCKETS}')

        frames = sorted(measurements.keys())
        if len(frames) < 4:
            print('ERROR: muy pocos frames de muestra midieron bien, no se puede ajustar el modelo.')
            sys.exit(1)

        slopes, intercepts = [], []
        for i in range(N_POCKETS):
            unwrapped = [measurements[frames[0]][i]]
            for f in frames[1:]:
                prev = unwrapped[-1]
                cand = measurements[f][i]
                while cand < prev - 180:
                    cand += 360
                unwrapped.append(cand)
            fs = np.array(frames, dtype=float)
            angs = np.array(unwrapped)
            A = np.vstack([fs, np.ones_like(fs)]).T
            slope, intercept = np.linalg.lstsq(A, angs, rcond=None)[0]
            slopes.append(slope)
            intercepts.append(intercept % 360)

        slopes = np.array(slopes)
        print(f'\nrotation rate: mean={slopes.mean():.6f} deg/frame  std={slopes.std():.6f}')

        # Umbral empirico: la rotacion rigida validada en este video dio std ~0.0007-0.0008
        # grados/frame entre las 38 casillas. Un valor un orden de magnitud mayor indicaria
        # deriva de perspectiva real entre casillas (como el video viejo) -- ahi el modelo de
        # formula cerrada ya NO es valido, hay que medir cada frame por separado en cambio.
        RATE_STD_THRESHOLD = 0.01
        if slopes.std() > RATE_STD_THRESHOLD and not args.force:
            print(
                f'\nERROR: desvio estandar de la tasa de rotacion ({slopes.std():.4f}) supera el '
                f'umbral ({RATE_STD_THRESHOLD}) -- la rotacion no parece rigida (probable '
                'perspectiva de camara real, como el video viejo). Generar la tabla por formula '
                'cerrada en este caso daria resultados incorrectos. Pasar --force para generarla '
                'igual bajo tu propio riesgo, o medir cada frame por separado en su lugar.'
            )
            sys.exit(1)

        r2_info = f'desvio estandar de la tasa de rotacion entre las {N_POCKETS} casillas = {slopes.std():.4f} grados/frame'
        generate_ts(intercepts, slopes.mean(), frame_count, args.out, cx, cy, radius, r2_info)
        print(f'\nEscrito {args.out} ({frame_count} filas).')
        print(f'Actualizar tambien wheelVideoGeometry.constants.ts (entrada american): center=({cx:.3f}, {cy:.3f}) radius={radius:.2f}')


if __name__ == '__main__':
    main()
