#!/usr/bin/env python3
"""Mide el angulo real de las 38 casillas de la rueda americana directo sobre la imagen estatica
(local-media/Lobby/Rotor_American.png), sin depender del video (a diferencia de
measure-wheel-video-angles.py). Pensado para dar una fuente de verdad propia para modo imagen
(WHEEL_GEOMETRY.american en wheelGeometry.constants.ts), en vez de heredar la medicion del video.

Mismo metodo que measure-wheel-video-angles.py (sin OCR): barrido angular de color a radio fijo
alrededor del centro real de la rueda (ajuste de circulo por minimos cuadrados, acá sobre el canal
alfa en vez del brillo -- el PNG tiene transparencia real), clasificando cada muestra por vecino-
mas-cercano en BGR y haciendo phase-lock contra la secuencia de colores conocida del paño
americano (AMERICAN_WHEEL_ORDER) para identificar cada casilla sin ambiguedad.

A diferencia del video (433 frames, rotacion rigida), acá es una sola imagen estatica -- no hace
falta ajuste de minimos cuadrados sobre varias muestras ni formula cerrada, alcanza con medir una
vez. El radio de muestreo no es un dato conocido de antemano (el que declara actualmente
WHEEL_GEOMETRY.american se midio con otro metodo), asi que este script barre un rango de radios
candidatos y se queda con los que logran phase-lock 38/38, promediando el resultado entre todos
los que calzan (si difieren mas que un par de decimas de grado entre si, es señal de que algo anda
mal y lo reporta).

Requisitos: `pip install opencv-python numpy` (no necesita ffmpeg, no hay video de por medio).

Uso:
  python scripts/measure-wheel-image-angles.py [--image PATH] [--radius R]
"""
import argparse
import math
from pathlib import Path

import cv2
import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_IMAGE = REPO_ROOT / 'local-media' / 'Lobby' / 'Rotor_American.png'

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


def fit_precise_circle_alpha(alpha):
    """Ajuste de circulo (minimos cuadrados) sobre el contorno del canal alfa -- el PNG tiene
    transparencia real (confirmado: alpha va de 0 a 255 con un blob solido en el medio), asi que
    es una fuente mas directa que un umbral de brillo (usado en el script del video, donde el
    fondo del frame es negro opaco en vez de transparente)."""
    mask = cv2.threshold(alpha, 10, 255, cv2.THRESH_BINARY)[1].astype(np.uint8)
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


def sample_ring_raw(bgr, cx, cy, radius, n, centroids, max_dist):
    h, w = bgr.shape[:2]
    raw = []
    for i in range(n):
        theta = 360.0 * i / n
        rad = math.radians(theta)
        x = cx + radius * math.sin(rad)
        y = cy - radius * math.cos(rad)
        xi, yi = int(round(x)), int(round(y))
        if 0 <= yi < h and 0 <= xi < w:
            b, g, r = bgr[yi, xi]
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


def bootstrap_centroids(bgr, cx, cy, radius, n=7200):
    """Misma idea que en measure-wheel-video-angles.py: primera pasada con umbrales genericos
    para clasificar, sacar centroides BGR reales de esa clasificacion, y re-clasificar despues por
    vecino-mas-cercano (mas robusto frente a tinte/iluminacion que un umbral fijo)."""
    def generic_classify(b, g, r):
        if min(b, g, r) > 90 and (max(b, g, r) - min(b, g, r)) < 50:
            return 'W'
        if g > r and g > b and g > 60:
            return 'G'
        if r > g + 20 and r > b + 10:
            return 'R'
        return 'B'

    h, w = bgr.shape[:2]
    raw = []
    for i in range(n):
        theta = 360.0 * i / n
        rad = math.radians(theta)
        x, y = cx + radius * math.sin(rad), cy - radius * math.cos(rad)
        xi, yi = int(round(x)), int(round(y))
        b, g, r = bgr[yi, xi] if 0 <= yi < h and 0 <= xi < w else (0, 0, 0)
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
            b, g, r = bgr[yi, xi]
            samples[color].append([int(b), int(g), int(r)])

    return {k: np.mean(v, axis=0) for k, v in samples.items() if v}


def measure_at_radius(bgr, cx, cy, radius, n=7200, smooth_window=15, max_dist=70.0):
    centroids = bootstrap_centroids(bgr, cx, cy, radius, n)
    if len(centroids) < 3:
        return None, 0, None
    raw = sample_ring_raw(bgr, cx, cy, radius, n, centroids, max_dist)
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
    min_run_len = min(len(r[1]) for r in real_runs)
    midpoints = [circular_midpoint(r[1], n) for r in real_runs]
    result = [None] * N_POCKETS
    for i in range(N_POCKETS):
        result[(i + off) % N_POCKETS] = midpoints[i]
    return result, min_run_len, score


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--image', type=Path, default=DEFAULT_IMAGE)
    parser.add_argument('--radius', type=float, default=None, help='Radio de muestreo unico a probar (default: barrido automatico)')
    parser.add_argument('--radius-min-frac', type=float, default=0.35)
    parser.add_argument('--radius-max-frac', type=float, default=0.88)
    parser.add_argument('--radius-steps', type=int, default=55)
    args = parser.parse_args()

    img = cv2.imread(str(args.image), cv2.IMREAD_UNCHANGED)
    if img is None:
        raise RuntimeError(f'No se pudo leer {args.image}')
    if img.shape[2] != 4:
        raise RuntimeError(f'{args.image} no tiene canal alfa (shape={img.shape})')
    bgr = img[:, :, :3]
    alpha = img[:, :, 3]

    cx, cy, outer_r = fit_precise_circle_alpha(alpha)
    print(f'centro=({cx:.3f}, {cy:.3f})  radio_exterior={outer_r:.2f}')

    if args.radius is not None:
        candidates = [args.radius]
    else:
        candidates = [
            outer_r * (args.radius_min_frac + (args.radius_max_frac - args.radius_min_frac) * i / (args.radius_steps - 1))
            for i in range(args.radius_steps)
        ]

    hits = []
    for radius in candidates:
        result, min_run_len, score = measure_at_radius(bgr, cx, cy, radius)
        if result is not None:
            hits.append((radius, result, min_run_len))
            print(f'  radio {radius:7.2f}: OK score={score}/{N_POCKETS}  min_run_len={min_run_len}')

    if not hits:
        print('\nERROR: ningun radio candidato logro phase-lock 38/38. Probar --radius a mano o ajustar el rango de busqueda.')
        return

    print(f'\n{len(hits)} radios candidatos lograron 38/38 de {len(candidates)} probados.')

    # Promedia el angulo de cada casilla entre todos los radios que calzaron 38/38 -- si el
    # resultado es consistente entre radios (deberia serlo: el color de una casilla no cambia
    # dentro de su propio anillo), el desvio entre ellos sirve de chequeo de sanidad.
    all_results = np.array([h[1] for h in hits])  # (n_hits, N_POCKETS)
    # Unwrap circular por columna antes de promediar/desviar (algunas casillas pueden caer cerca
    # de la costura 360/0 y promediar crudo ahi daria un resultado erroneo).
    ref = all_results[0]
    unwrapped = np.empty_like(all_results)
    unwrapped[0] = ref
    for row_i in range(1, all_results.shape[0]):
        row = all_results[row_i].copy()
        for pocket_i in range(N_POCKETS):
            while row[pocket_i] < ref[pocket_i] - 180:
                row[pocket_i] += 360
            while row[pocket_i] > ref[pocket_i] + 180:
                row[pocket_i] -= 360
        unwrapped[row_i] = row

    mean_angles = unwrapped.mean(axis=0) % 360
    std_angles = unwrapped.std(axis=0)
    print(f'desvio estandar entre radios candidatos por casilla: max={std_angles.max():.4f} grados, promedio={std_angles.mean():.4f} grados')

    best_radius = hits[len(hits) // 2][0]
    print(f'\ncenter: {{ x: {cx:.3f}, y: {cy:.3f} }},')
    print(f'radius: {best_radius:.2f},')
    print('pocketAngleDeg: [')
    row_str = ', '.join(f'{v:.2f}' for v in mean_angles)
    print(f'  {row_str}')
    print('],')


if __name__ == '__main__':
    main()
