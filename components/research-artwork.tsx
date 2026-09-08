"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

export type ResearchDiscipline = "research" | "trading" | "macro" | "equity";
type Coordinate = number[];
type Land = {
  features: {
    geometry: { type: string; coordinates: Coordinate[][] | Coordinate[][][] };
  }[];
};
let landRequest: Promise<Coordinate[][]> | undefined;
function getLand() {
  return (landRequest ??= fetch("/data/land.geojson")
    .then((response) => {
      if (!response.ok) throw new Error("Geography unavailable");
      return response.json() as Promise<Land>;
    })
    .then((data) =>
      data.features.flatMap((feature) =>
        feature.geometry.type === "Polygon"
          ? (feature.geometry.coordinates as Coordinate[][])
          : (feature.geometry.coordinates as Coordinate[][][]).flat(),
      ),
    ));
}

/** Abstract, non-data-driven artwork. Each discipline has its own visual language. */
export function ResearchArtwork({
  discipline,
}: {
  discipline: ResearchDiscipline;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const elapsed = useRef(0);
  const cursor = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = canvas.current,
      container = host.current;
    const context = element?.getContext("2d");
    if (!element || !container || !context) return;
    const ctx = context;
    let width = 800,
      height = 620,
      time = elapsed.current,
      frame = 0,
      previous = 0;
    let visible = false,
      disposed = false;
    let geography: Coordinate[][] = [];
    const pointer = cursor.current;
    const still = paused || reduced;
    function stroke(points: number[][], color: string, thickness = 1) {
      ctx.beginPath();
      points.forEach(([x, y], index) =>
        index ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = thickness;
      ctx.stroke();
    }
    function dot(x: number, y: number, radius: number, color: string) {
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    function project(x: number, y: number, z: number) {
      const angle = -0.48 + pointer.x * 0.12;
      const xx = x * Math.cos(angle) - z * Math.sin(angle);
      const zz = x * Math.sin(angle) + z * Math.cos(angle);
      return [
        width * 0.52 + xx,
        height * 0.53 + y * 0.79 + zz * 0.38 + pointer.y * 14,
      ];
    }
    function research() {
      // Observations resolve into a continuous response surface, then disperse.
      const scale = Math.min(width / 760, height / 550);
      const cycle = (Math.sin(time * 0.4) + 1) / 2;
      for (let row = 0; row < 38; row++) {
        const points: number[][] = [];
        for (let col = 0; col < 62; col++) {
          const x = (col - 30.5) * 10 * scale,
            z = (row - 18.5) * 13 * scale;
          const ridge =
            Math.sin(col * 0.115 + time * 0.35) *
            Math.cos(row * 0.12 - time * 0.15) *
            75;
          const peak =
            -115 * Math.exp(-((col - 35) ** 2 + (row - 19) ** 2) / 180);
          const y = (ridge + peak) * scale;
          const p = project(x, y, z);
          points.push(p);
          if (col % 2 === 0) {
            const scatter =
              (1 - cycle) * Math.sin(col * 7.31 + row * 3.9) * 25 * scale;
            dot(
              p[0],
              p[1] + scatter,
              (row % 3 === 0 ? 1.5 : 1) * scale,
              `rgba(164,207,255,${0.16 + cycle * 0.5})`,
            );
          }
        }
        stroke(points, `rgba(91,156,246,${0.08 + cycle * 0.32})`, 0.8);
      }
      // A traveling cross-section makes the geometry readable.
      const cross = (time * 3) % 60;
      const line: number[][] = [];
      for (let row = 0; row < 38; row++) {
        const y =
          (Math.sin(cross * 0.115 + time * 0.35) *
            Math.cos(row * 0.12 - time * 0.15) *
            75 -
            115 * Math.exp(-((cross - 35) ** 2 + (row - 19) ** 2) / 180)) *
          scale;
        line.push(
          project((cross - 30.5) * 10 * scale, y, (row - 18.5) * 13 * scale),
        );
      }
      stroke(line, "rgba(214,234,255,.85)", 1.4);
    }
    function trading() {
      // A rotating lattice of discrete orders: restrained, architectural motion.
      const scale = Math.min(width / 780, height / 600);
      const angle = -0.55 + time * 0.045 + pointer.x * 0.16;
      const centerX = width * 0.53,
        centerY = height * 0.49;
      const point = (x: number, y: number, z: number) => [
        centerX + (x * Math.cos(angle) - z * Math.sin(angle)) * scale,
        centerY +
          (y + (x * Math.sin(angle) + z * Math.cos(angle)) * 0.36) * scale,
      ];
      for (let layer = 0; layer < 6; layer++) {
        const z = (layer - 2.5) * 58;
        stroke([point(-205, 105, z), point(205, 105, z)], "#629ee32a", 0.8);
        for (let column = 0; column < 12; column++) {
          const x = (column - 5.5) * 34;
          const phase = column * 0.48 + layer * 0.65 - time * 0.8;
          const heightBar = 30 + (Math.sin(phase) + 1) * 50;
          const base = point(x, 100, z),
            top = point(x, 100 - heightBar, z);
          const alpha = 0.18 + layer * 0.1;
          stroke([base, top], `rgba(127,179,245,${alpha})`, 5 * scale);
          const cap = point(x + 7, 100 - heightBar, z + 7);
          stroke([top, cap], "#c7e3ff88", 1.4);
          if ((column + layer) % 5 === 0)
            dot(top[0], top[1], 1.8 * scale, "#e1efff");
        }
      }
      const progress = (time * 0.13) % 1;
      const scanX = -210 + progress * 420;
      stroke(
        [
          point(scanX, 110, -170),
          point(scanX, -70, -170),
          point(scanX, -70, 175),
          point(scanX, 110, 175),
        ],
        "#bedfff60",
        1,
      );
    }
    function macro() {
      const radius = Math.min(width * 0.36, height * 0.4);
      const angle = 0.78 + time * 0.075 + pointer.x * 0.3;
      function sphere(lon: number, lat: number, lift = 1) {
        const a = (lon * Math.PI) / 180 + angle,
          b = (lat * Math.PI) / 180;
        const x = Math.cos(b) * Math.sin(a),
          z = Math.cos(b) * Math.cos(a),
          y = Math.sin(b);
        return {
          x: width * 0.53 + x * radius * lift,
          y: height * 0.49 - (y * 0.966 - z * 0.259) * radius * lift,
          z: y * 0.259 + z * 0.966,
        };
      }
      const glow = ctx.createRadialGradient(
        width * 0.49,
        height * 0.43,
        0,
        width * 0.53,
        height * 0.49,
        radius * 1.2,
      );
      glow.addColorStop(0, "#1e3a8a40");
      glow.addColorStop(1, "#1e3a8a00");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);
      ctx.beginPath();
      ctx.arc(width * 0.53, height * 0.49, radius, 0, Math.PI * 2);
      ctx.strokeStyle = "#78afff50";
      ctx.stroke();
      const drawCoords = (coords: Coordinate[], color: string) => {
        ctx.beginPath();
        let pen = false;
        coords.forEach(([lon, lat]) => {
          const p = sphere(lon, lat);
          if (p.z > 0) {
            if (pen) ctx.lineTo(p.x, p.y);
            else ctx.moveTo(p.x, p.y);
            pen = true;
          } else pen = false;
        });
        ctx.strokeStyle = color;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      };
      for (let lat = -60; lat <= 60; lat += 30)
        drawCoords(
          Array.from({ length: 121 }, (_, i) => [i * 3 - 180, lat]),
          "#91baff18",
        );
      for (let lon = -180; lon < 180; lon += 30)
        drawCoords(
          Array.from({ length: 61 }, (_, i) => [lon, i * 3 - 90]),
          "#91baff18",
        );
      geography.forEach((coords) => drawCoords(coords, "#a9ceff80"));
      const cities = [
        [-79, 44],
        [-74, 41],
        [-0.1, 51.5],
        [103, 1],
        [139, 36],
        [151, -34],
        [55, 25],
        [-46, -23],
      ];
      cities.forEach(([lon, lat], index) => {
        const from = sphere(lon, lat),
          next = cities[(index + 2) % cities.length],
          to = sphere(next[0], next[1]);
        if (from.z > 0) {
          dot(from.x, from.y, 2.3, "#d3eaff");
          ctx.beginPath();
          ctx.arc(
            from.x,
            from.y,
            6 + Math.sin(time * 2 + index) * 2,
            0,
            Math.PI * 2,
          );
          ctx.strokeStyle = "#80b5ff60";
          ctx.stroke();
        }
        if (from.z > 0 && to.z > 0) {
          const mx = (from.x + to.x) / 2,
            my = Math.min(from.y, to.y) - radius * 0.4;
          ctx.beginPath();
          ctx.moveTo(from.x, from.y);
          ctx.quadraticCurveTo(mx, my, to.x, to.y);
          ctx.strokeStyle = "#85baff55";
          ctx.stroke();
          const t = (time * 0.2 + index * 0.16) % 1;
          dot(
            (1 - t) ** 2 * from.x + 2 * (1 - t) * t * mx + t * t * to.x,
            (1 - t) ** 2 * from.y + 2 * (1 - t) * t * my + t * t * to.y,
            2,
            "#e2f1ff",
          );
        }
      });
      // Orbital paths carry information beyond the globe into the surrounding composition.
      ctx.save();
      ctx.translate(width * 0.53, height * 0.49);
      ctx.rotate(-0.35);
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.32, radius * 0.37, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "#80b5ff30";
      ctx.stroke();
      const a = time * 0.3;
      dot(
        Math.cos(a) * radius * 1.32,
        Math.sin(a) * radius * 0.37,
        3,
        "#cce4ff",
      );
      ctx.restore();
    }
    function equity() {
      const scale = Math.min(width / 720, height / 560);
      const cx = width * 0.52,
        cy = height * 0.5;
      // Layered company analysis converges into a single focused thesis.
      for (let layer = 0; layer < 5; layer++) {
        const phase = time * 0.35 + layer * 0.7;
        const depth = (layer - 2) * 37 * scale;
        const lift = Math.sin(phase) * 8 * scale;
        const corners = [
          [-160, -95],
          [125, -95],
          [160, 95],
          [-125, 95],
        ].map(([x, y]) => [
          cx + x * scale + depth * 0.55 + pointer.x * layer * 4,
          cy + y * scale + depth + lift,
        ]);
        ctx.beginPath();
        corners.forEach(([x, y], i) =>
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y),
        );
        ctx.closePath();
        ctx.fillStyle = `rgba(12,24,55,${0.5 + layer * 0.065})`;
        ctx.fill();
        ctx.strokeStyle = layer === 4 ? "#9dc6ffbb" : "#5b91d15c";
        ctx.lineWidth = 1;
        ctx.stroke();
        for (let bar = 0; bar < 9; bar++) {
          const x =
            cx +
            (-100 + bar * 23) * scale +
            depth * 0.55 +
            pointer.x * layer * 4;
          const base = cy + 50 * scale + depth + lift;
          const magnitude =
            (20 + Math.sin(bar * 0.65 + layer) * 18 + bar * 5) * scale;
          stroke(
            [
              [x, base],
              [x - 8 * scale, base - magnitude],
            ],
            layer === 4 ? "#a9cdff90" : "#689de53d",
            5 * scale,
          );
        }
        const highlight = (time * 0.16 + layer * 0.2) % 1;
        const start = corners[0],
          end = corners[1];
        dot(start[0] + (end[0] - start[0]) * highlight, start[1], 2, "#daecff");
      }
      const lensX =
        cx + (110 + Math.sin(time * 0.3) * 45) * scale + pointer.x * 25;
      const lensY =
        cy + (-65 + Math.cos(time * 0.3) * 40) * scale + pointer.y * 15;
      const lensRadius = 59 * scale;
      ctx.save();
      ctx.beginPath();
      ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.fillStyle = "#08162e";
      ctx.fillRect(
        lensX - lensRadius,
        lensY - lensRadius,
        lensRadius * 2,
        lensRadius * 2,
      );
      for (let i = 0; i < 6; i++) {
        const x = lensX + (-42 + i * 17) * scale;
        const y = lensY + 35 * scale;
        stroke(
          [
            [x, y],
            [x, y - (30 + i * 8 + Math.sin(i * 0.8) * 12) * scale],
          ],
          "#a4cdff",
          4 * scale,
        );
      }
      stroke(
        [
          [lensX - 60 * scale, lensY + 36 * scale],
          [lensX + 60 * scale, lensY + 36 * scale],
        ],
        "#7da9e455",
        0.7,
      );
      ctx.restore();
      ctx.beginPath();
      ctx.arc(lensX, lensY, lensRadius, 0, Math.PI * 2);
      ctx.strokeStyle = "#b7d6ff";
      ctx.lineWidth = 1.2;
      ctx.stroke();
      stroke(
        [
          [lensX + 42 * scale, lensY + 42 * scale],
          [lensX + 80 * scale, lensY + 80 * scale],
        ],
        "#779cd277",
        1.5,
      );
    }
    function draw() {
      ctx.clearRect(0, 0, width, height);
      if (!still) {
        pointer.x += (pointer.targetX - pointer.x) * 0.045;
        pointer.y += (pointer.targetY - pointer.y) * 0.045;
      }
      if (discipline === "research") research();
      else if (discipline === "trading") trading();
      else if (discipline === "macro") macro();
      else equity();
    }
    function tick(now: number) {
      frame = 0;
      if (disposed || !visible || document.hidden) return;
      if (now - previous > 30) {
        time += Math.min((now - previous) / 1000, 0.06);
        elapsed.current = time;
        previous = now;
        draw();
      }
      if (!still) frame = requestAnimationFrame(tick);
    }
    function start() {
      if (visible && !document.hidden && !disposed && !frame) {
        previous = performance.now();
        draw();
        if (!still) frame = requestAnimationFrame(tick);
      }
    }
    const resize = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width;
      height = entry.contentRect.height;
      const dpr = Math.min(devicePixelRatio, 2);
      element.width = width * dpr;
      element.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    });
    resize.observe(container);
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
    observer.observe(container);
    const move = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      pointer.targetX = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.targetY = (event.clientY - rect.top) / rect.height - 0.5;
    };
    const leave = () => {
      pointer.targetX = 0;
      pointer.targetY = 0;
    };
    container.addEventListener("pointermove", move);
    container.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", start);
    if (discipline === "macro")
      getLand()
        .then((data) => {
          geography = data;
          if (!disposed) draw();
        })
        .catch(() => {
          landRequest = undefined;
        });
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      observer.disconnect();
      container.removeEventListener("pointermove", move);
      container.removeEventListener("pointerleave", leave);
      document.removeEventListener("visibilitychange", start);
    };
  }, [discipline, paused, reduced]);

  return (
    <div ref={host} className={`research-artwork artwork-${discipline}`}>
      <canvas ref={canvas} aria-hidden="true" />
      {!reduced && (
        <button
          className="artwork-control"
          type="button"
          aria-label={paused ? "Play animation" : "Pause animation"}
          onClick={() => setPaused(!paused)}
        >
          {paused ? <Play size={13} /> : <Pause size={13} />}
        </button>
      )}
    </div>
  );
}
