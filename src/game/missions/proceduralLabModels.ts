import * as THREE from 'three';

// Shared texture caching to avoid redundant canvas allocations
const _textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates or retrieves a graduated measurement scale texture for cylinders, rulers, and gauges.
 */
export function getGraduatedScaleTexture(
  maxVal: number,
  subdivisions: number,
  unitStr: string,
  textColor = '#ffffff',
  bgColor = 'rgba(0, 0, 0, 0)'
): THREE.CanvasTexture {
  const cacheKey = `grad_${maxVal}_${subdivisions}_${unitStr}_${textColor}_${bgColor}`;
  const cached = _textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 256, 1024);

  ctx.strokeStyle = textColor;
  ctx.fillStyle = textColor;
  ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const marginY = 64;
  const usableH = 1024 - marginY * 2;
  const stepH = usableH / subdivisions;

  for (let i = 0; i <= subdivisions; i++) {
    const y = 1024 - (marginY + i * stepH);
    const isMajor = i % 5 === 0;
    const isTen = i % 10 === 0;

    ctx.lineWidth = isTen ? 5 : isMajor ? 3 : 1.5;
    const tickLen = isTen ? 70 : isMajor ? 48 : 26;

    ctx.beginPath();
    ctx.moveTo(250, y);
    ctx.lineTo(250 - tickLen, y);
    ctx.stroke();

    if (isMajor) {
      const val = Math.round((i / subdivisions) * maxVal);
      ctx.fillText(`${val}`, 250 - tickLen - 12, y);
    }
  }

  // Draw Unit Header
  ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(unitStr, 128, marginY / 2);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  _textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Creates a realistic circular dial gauge texture (Bourdon gauge, Ammeter, Voltmeter).
 */
export function getDialScaleTexture(
  title: string,
  symbol: string,
  minVal: number,
  maxVal: number,
  unitStr: string,
  isDualScale = false
): THREE.CanvasTexture {
  const cacheKey = `dial_${title}_${symbol}_${minVal}_${maxVal}_${unitStr}_${isDualScale}`;
  const cached = _textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Dial face background (creamy instrument parchment)
  const bgGrad = ctx.createRadialGradient(256, 256, 120, 256, 256, 250);
  bgGrad.addColorStop(0, '#f8fafc');
  bgGrad.addColorStop(0.85, '#e2e8f0');
  bgGrad.addColorStop(1, '#94a3b8');
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.arc(256, 256, 250, 0, Math.PI * 2);
  ctx.fill();

  // Subtle instrument mirror strip (anti-parallax)
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 14;
  ctx.beginPath();
  ctx.arc(256, 256, 165, Math.PI * 0.78, Math.PI * 2.22);
  ctx.stroke();

  // Outer scale arc
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 256, 195, Math.PI * 0.78, Math.PI * 2.22);
  ctx.stroke();

  const totalTicks = 30;
  const startAng = Math.PI * 0.78;
  const endAng = Math.PI * 2.22;
  const angRange = endAng - startAng;

  ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i <= totalTicks; i++) {
    const ang = startAng + (i / totalTicks) * angRange;
    const isMajor = i % 5 === 0;
    const tickLen = isMajor ? 26 : 14;
    ctx.lineWidth = isMajor ? 3.5 : 1.5;

    const cosA = Math.cos(ang);
    const sinA = Math.sin(ang);

    const x1 = 256 + cosA * 195;
    const y1 = 256 + sinA * 195;
    const x2 = 256 + cosA * (195 - tickLen);
    const y2 = 256 + sinA * (195 - tickLen);

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();

    if (isMajor) {
      const val = minVal + (i / totalTicks) * (maxVal - minVal);
      const textX = 256 + cosA * 145;
      const textY = 256 + sinA * 145;
      ctx.fillText(Number.isInteger(val) ? `${val}` : val.toFixed(1), textX, textY);
    }
  }

  // Symbol letter (big bold 'A', 'V', or 'p')
  ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = symbol === 'A' ? '#b91c1c' : symbol === 'V' ? '#1d4ed8' : '#047857';
  ctx.fillText(symbol, 256, 256);

  // Unit and Title
  ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(unitStr, 256, 305);
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText(title, 256, 335);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  _textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Creates brushed metal directional bump texture.
 */
export function getBrushedMetalBumpTexture(): THREE.CanvasTexture {
  const cacheKey = 'brushed_metal_bump';
  const cached = _textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 4000; i++) {
    const y = Math.random() * 256;
    const h = 1;
    const len = 30 + Math.random() * 100;
    const x = Math.random() * 256;
    const shade = Math.floor(110 + Math.random() * 35);
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
    ctx.fillRect(x, y, len, h);
    ctx.fillRect(x - 256, y, len, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  _textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * Creates diagonal yellow/black hazard warning stripes.
 */
export function getHazardStripeTexture(): THREE.CanvasTexture {
  const cacheKey = 'hazard_stripes';
  const cached = _textureCache.get(cacheKey);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#eab308'; // Amber yellow
  ctx.fillRect(0, 0, 256, 256);

  ctx.fillStyle = '#18181b'; // Dark zinc
  const stripeWidth = 32;
  for (let x = -256; x < 512; x += stripeWidth * 2) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + stripeWidth, 0);
    ctx.lineTo(x + stripeWidth + 256, 256);
    ctx.lineTo(x + 256, 256);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  _textureCache.set(cacheKey, tex);
  return tex;
}

/* =========================================================================
 * 1. BOROSILICATE GRADUATED CYLINDER (Ống đong chia độ có mỏ rót & đế chống lăn)
 * ========================================================================= */
export interface GraduatedCylinderOptions {
  radius?: number;
  height?: number;
  liquidFraction?: number; // 0 to 1
  liquidColor?: number;
  liquidEmissive?: number;
  maxVolumeMl?: number;
  includeStone?: boolean;
  stoneRadius?: number;
}

export function createGraduatedCylinder(
  options: GraduatedCylinderOptions = {}
): {
  group: THREE.Group;
  liquidMesh: THREE.Mesh;
  meniscusMesh: THREE.Mesh;
  stoneMesh?: THREE.Mesh;
} {
  const {
    radius = 0.42,
    height = 2.2,
    liquidFraction = 0.55,
    liquidColor = 0x0284c7,
    liquidEmissive = 0x0369a1,
    maxVolumeMl = 500,
    includeStone = false,
    stoneRadius = 0.18,
  } = options;

  const group = new THREE.Group();

  // Heavy hexagonal glass base (chống lăn / chống đổ)
  const baseGeo = new THREE.CylinderGeometry(radius * 1.6, radius * 1.8, 0.18, 6);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.2,
    roughness: 0.15,
    transparent: true,
    opacity: 0.75,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = 0.09;
  group.add(baseMesh);

  // Outer Borosilicate Glass Cylinder
  const glassGeo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.1,
    roughness: 0.05,
    transparent: true,
    opacity: 0.38,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.y = 0.18 + height / 2;
  group.add(glassMesh);

  // Printed Graduation Scale on Glass Surface
  const scaleTex = getGraduatedScaleTexture(maxVolumeMl, 25, 'mL', '#ffffff');
  const scaleMeshGeo = new THREE.CylinderGeometry(
    radius + 0.002,
    radius + 0.002,
    height * 0.9,
    32,
    1,
    true,
    -Math.PI * 0.35,
    Math.PI * 0.7
  );
  const scaleMat = new THREE.MeshBasicMaterial({
    map: scaleTex,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const scaleMesh = new THREE.Mesh(scaleMeshGeo, scaleMat);
  scaleMesh.position.y = 0.18 + height / 2;
  group.add(scaleMesh);

  // Top lip rim and pouring spout (mỏ rót)
  const rimGeo = new THREE.TorusGeometry(radius, 0.025, 12, 32);
  const rimMesh = new THREE.Mesh(rimGeo, baseMat);
  rimMesh.rotation.x = Math.PI / 2;
  rimMesh.position.y = 0.18 + height;
  group.add(rimMesh);

  const spoutGeo = new THREE.ConeGeometry(0.12, 0.16, 3);
  const spoutMesh = new THREE.Mesh(spoutGeo, baseMat);
  spoutMesh.rotation.z = -Math.PI / 4;
  spoutMesh.position.set(radius + 0.03, 0.18 + height + 0.02, 0);
  group.add(spoutMesh);

  // Liquid Column
  const clampedFrac = Math.max(0.05, Math.min(0.96, liquidFraction));
  const liquidHeight = height * clampedFrac;
  const liquidGeo = new THREE.CylinderGeometry(
    radius * 0.95,
    radius * 0.95,
    liquidHeight,
    24
  );
  const liquidMat = new THREE.MeshStandardMaterial({
    color: liquidColor,
    emissive: liquidEmissive,
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0.78,
    roughness: 0.1,
  });
  const liquidMesh = new THREE.Mesh(liquidGeo, liquidMat);
  liquidMesh.position.y = 0.18 + liquidHeight / 2;
  group.add(liquidMesh);

  // Concave Meniscus Ring (Mặt khum chất lỏng dính ướt thành bình)
  const meniscusGeo = new THREE.TorusGeometry(radius * 0.92, 0.02, 10, 24);
  const meniscusMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.65,
  });
  const meniscusMesh = new THREE.Mesh(meniscusGeo, meniscusMat);
  meniscusMesh.rotation.x = Math.PI / 2;
  meniscusMesh.position.y = 0.18 + liquidHeight;
  group.add(meniscusMesh);

  let stoneMesh: THREE.Mesh | undefined;
  if (includeStone) {
    // Irregular Submerged Rock suspended on wire
    const stoneGeo = new THREE.DodecahedronGeometry(stoneRadius, 1);
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      metalness: 0.3,
      roughness: 0.85,
    });
    stoneMesh = new THREE.Mesh(stoneGeo, stoneMat);
    stoneMesh.scale.set(1.2, 0.85, 1.1);
    stoneMesh.position.set(0, 0.18 + liquidHeight * 0.45, 0);
    group.add(stoneMesh);

    // Suspension wire
    const wireGeo = new THREE.CylinderGeometry(0.006, 0.006, height * 1.2, 6);
    const wireMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
    const wireMesh = new THREE.Mesh(wireGeo, wireMat);
    wireMesh.position.set(0, 0.18 + height * 0.6, 0);
    group.add(wireMesh);
  }

  return { group, liquidMesh, meniscusMesh, stoneMesh };
}

/* =========================================================================
 * 2. LABORATORY ELECTRONIC PRECISION BALANCE (Cân điện tử chuẩn phòng thí nghiệm)
 * ========================================================================= */
export interface ElectronicScaleOptions {
  width?: number;
  depth?: number;
  height?: number;
  panRadius?: number;
  initialReadingKg?: number;
}

export function createLabElectronicScale(
  options: ElectronicScaleOptions = {}
): {
  group: THREE.Group;
  panMesh: THREE.Mesh;
  displayCanvas: HTMLCanvasElement;
  displayTexture: THREE.CanvasTexture;
  updateReading: (valStr: string, unitStr?: string) => void;
} {
  const {
    width = 1.8,
    depth = 2.0,
    height = 0.5,
    panRadius = 0.68,
    initialReadingKg = 0.0,
  } = options;

  const group = new THREE.Group();

  // Main chamfered chassis (khung cân vát góc công thái học)
  const chassisGeo = new THREE.BoxGeometry(width, height, depth);
  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.6,
    roughness: 0.35,
  });
  const chassis = new THREE.Mesh(chassisGeo, chassisMat);
  chassis.position.y = height / 2;
  group.add(chassis);

  // 4 Anti-vibration rubber foot pads
  const footMat = new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 });
  const footOffsets = [
    [-width * 0.42, -depth * 0.42],
    [width * 0.42, -depth * 0.42],
    [-width * 0.42, depth * 0.42],
    [width * 0.42, depth * 0.42],
  ];
  footOffsets.forEach(([fx, fz]) => {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.08, 12), footMat);
    foot.position.set(fx, 0.04, fz);
    group.add(foot);
  });

  // Stainless Steel Circular Weighing Pan (Đĩa cân thép không gỉ dập viền)
  const panGeo = new THREE.CylinderGeometry(panRadius, panRadius * 0.96, 0.06, 32);
  const panMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.95,
    roughness: 0.15,
  });
  const panMesh = new THREE.Mesh(panGeo, panMat);
  panMesh.position.set(0, height + 0.03, -depth * 0.1);
  group.add(panMesh);

  // Pan center spud
  const spud = new THREE.Mesh(
    new THREE.CylinderGeometry(panRadius * 0.3, panRadius * 0.3, 0.05, 24),
    chassisMat
  );
  spud.position.set(0, height + 0.01, -depth * 0.1);
  group.add(spud);

  // Digital LED Display Screen Canvas
  const displayCanvas = document.createElement('canvas');
  displayCanvas.width = 512;
  displayCanvas.height = 160;
  const ctx = displayCanvas.getContext('2d')!;

  const displayTexture = new THREE.CanvasTexture(displayCanvas);
  displayTexture.colorSpace = THREE.SRGBColorSpace;

  const updateReading = (valStr: string, unitStr = 'kg') => {
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, 0, 512, 160);

    // Glowing cyan/green LED background bezel
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 6;
    ctx.strokeRect(6, 6, 500, 148);

    // Brand tag
    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
    ctx.fillText('NOVA-8 PRECISION BALANCE', 24, 38);

    // Digital readout
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 74px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(valStr, 400, 115);

    // Unit
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 36px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(unitStr, 415, 115);

    displayTexture.needsUpdate = true;
  };

  updateReading(initialReadingKg.toFixed(2));

  // Angled Display Bezel on front of chassis
  const displayMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.72, height * 0.55),
    new THREE.MeshBasicMaterial({ map: displayTexture })
  );
  displayMesh.rotation.x = -Math.PI / 4;
  displayMesh.position.set(0, height * 0.65, depth * 0.46);
  group.add(displayMesh);

  // Spirit Level Bubble
  const bubbleMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 0.02, 16),
    new THREE.MeshBasicMaterial({ color: 0x22c55e })
  );
  bubbleMesh.position.set(-width * 0.36, height + 0.01, depth * 0.3);
  group.add(bubbleMesh);

  return { group, panMesh, displayCanvas, displayTexture, updateReading };
}

/* =========================================================================
 * 3. REALISTIC SPECIMEN INGOTS / BLOCKS (Khối vật liệu Nhôm, Sắt, Đồng...)
 * ========================================================================= */
export interface SpecimenBlockOptions {
  materialType: 'ALUMINIUM' | 'IRON' | 'COPPER' | 'WOOD' | 'GLASS';
  size?: THREE.Vector3;
  label?: string;
  densityValue?: number;
}

export function createSpecimenBlock(
  options: SpecimenBlockOptions
): THREE.Group {
  const {
    materialType,
    size = new THREE.Vector3(0.9, 0.7, 0.9),
    label = materialType,
    densityValue = 2700,
  } = options;

  const group = new THREE.Group();
  let blockMat: THREE.Material;

  const bumpTex = getBrushedMetalBumpTexture();

  switch (materialType) {
    case 'ALUMINIUM':
      blockMat = new THREE.MeshStandardMaterial({
        color: 0xd1d5db,
        metalness: 0.92,
        roughness: 0.22,
        bumpMap: bumpTex,
        bumpScale: 0.02,
      });
      break;
    case 'IRON':
      blockMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.85,
        roughness: 0.55,
        bumpMap: bumpTex,
        bumpScale: 0.04,
      });
      break;
    case 'COPPER':
      blockMat = new THREE.MeshStandardMaterial({
        color: 0xd97706,
        metalness: 0.95,
        roughness: 0.26,
        bumpMap: bumpTex,
        bumpScale: 0.015,
      });
      break;
    case 'GLASS':
      blockMat = new THREE.MeshStandardMaterial({
        color: 0xe0f2fe,
        metalness: 0.05,
        roughness: 0.08,
        transparent: true,
        opacity: 0.55,
      });
      break;
    case 'WOOD':
    default:
      blockMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.8,
        metalness: 0.05,
      });
      break;
  }

  const blockGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
  const blockMesh = new THREE.Mesh(blockGeo, blockMat);
  blockMesh.position.y = size.y / 2;
  group.add(blockMesh);

  // Stencilled Stamped Label Plate on top face
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 256;
  labelCanvas.height = 128;
  const lctx = labelCanvas.getContext('2d')!;

  lctx.fillStyle = '#0f172a';
  lctx.fillRect(0, 0, 256, 128);
  lctx.strokeStyle = '#38bdf8';
  lctx.lineWidth = 4;
  lctx.strokeRect(4, 4, 248, 120);

  lctx.fillStyle = '#f8fafc';
  lctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
  lctx.textAlign = 'center';
  lctx.fillText(label, 128, 48);

  lctx.fillStyle = '#38bdf8';
  lctx.font = 'bold 22px "Courier New", monospace';
  lctx.fillText(`D=${densityValue} kg/m³`, 128, 92);

  const labelTex = new THREE.CanvasTexture(labelCanvas);
  labelTex.colorSpace = THREE.SRGBColorSpace;

  const labelPlate = new THREE.Mesh(
    new THREE.PlaneGeometry(size.x * 0.8, size.z * 0.55),
    new THREE.MeshBasicMaterial({ map: labelTex })
  );
  labelPlate.rotation.x = -Math.PI / 2;
  labelPlate.position.set(0, size.y + 0.002, 0);
  group.add(labelPlate);

  return group;
}

/* =========================================================================
 * 4. HYDRAULIC SURFACE PRESSURE COMPRESSION RIG (Mô hình Áp suất mặt bị ép & Biến dạng)
 * ========================================================================= */
export interface HydraulicPressOptions {
  footType: 'WIDE_PLATE' | 'NARROW_BLADE' | 'STANDARD_TREAD';
  surfaceDeformation?: number; // 0 (none) to 0.4 (deep depression)
}

export function createHydraulicPressRig(
  options: HydraulicPressOptions
): {
  group: THREE.Group;
  ramGroup: THREE.Group;
  bedMesh: THREE.Mesh;
  indentMesh: THREE.Mesh;
  gaugeNeedle: THREE.Mesh;
} {
  const { footType, surfaceDeformation = 0.25 } = options;
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.25,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    metalness: 0.95,
    roughness: 0.1,
  });

  // Base plinth
  const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.4, 2.6), steelMat);
  basePlinth.position.y = 0.2;
  group.add(basePlinth);

  // 4 Chromed Heavy Guide Columns
  const colPositions = [
    [-1.2, -0.9],
    [1.2, -0.9],
    [-1.2, 0.9],
    [1.2, 0.9],
  ];
  colPositions.forEach(([cx, cz]) => {
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.4, 16), chromeMat);
    col.position.set(cx, 2.4, cz);
    group.add(col);
  });

  // Top Crosshead Header Beam
  const headerBeam = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 2.6), steelMat);
  headerBeam.position.y = 4.3;
  group.add(headerBeam);

  // Hydraulic Ram Group (slides vertically)
  const ramGroup = new THREE.Group();
  ramGroup.position.set(0, 3.2, 0);

  const ramCylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 1.8, 20), steelMat);
  ramCylinder.position.y = 0.4;
  ramGroup.add(ramCylinder);

  const ramPiston = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1.6, 20), chromeMat);
  ramPiston.position.y = -0.5;
  ramGroup.add(ramPiston);

  // Interchangeable Pressure Foot
  let footGeo: THREE.BufferGeometry;
  if (footType === 'WIDE_PLATE') {
    // Large surface area (p = F/S is small, minimal sinkage)
    footGeo = new THREE.BoxGeometry(1.8, 0.16, 1.4);
  } else if (footType === 'NARROW_BLADE') {
    // Tiny sharp chisel surface (p = F/S is huge, deep sinkage)
    footGeo = new THREE.ConeGeometry(0.12, 0.6, 4);
  } else {
    // Standard footprint
    footGeo = new THREE.BoxGeometry(0.85, 0.2, 0.85);
  }
  const footMesh = new THREE.Mesh(footGeo, chromeMat);
  footMesh.position.y = -1.35;
  if (footType === 'NARROW_BLADE') footMesh.rotation.y = Math.PI / 4;
  ramGroup.add(footMesh);

  group.add(ramGroup);

  // Compressible Sand / Foam Substrate Bed
  const bedGeo = new THREE.BoxGeometry(2.4, 0.6, 1.8);
  const bedMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.95,
  });
  const bedMesh = new THREE.Mesh(bedGeo, bedMat);
  bedMesh.position.set(0, 0.6, 0);
  group.add(bedMesh);

  // Depression Indent Mesh inside bed
  const indentDepth = surfaceDeformation * 0.45;
  const indentGeo = new THREE.BoxGeometry(
    footType === 'WIDE_PLATE' ? 1.85 : footType === 'NARROW_BLADE' ? 0.35 : 0.9,
    indentDepth,
    footType === 'WIDE_PLATE' ? 1.45 : footType === 'NARROW_BLADE' ? 0.35 : 0.9
  );
  const indentMat = new THREE.MeshStandardMaterial({
    color: 0x92400e,
    roughness: 0.98,
  });
  const indentMesh = new THREE.Mesh(indentGeo, indentMat);
  indentMesh.position.set(0, 0.9 - indentDepth / 2, 0);
  group.add(indentMesh);

  // Bourdon Pressure Gauge mounted on top header
  const dialTex = getDialScaleTexture('ÁP SUẤT P', 'p', 0, 100, 'kPa');
  const gaugeHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.42, 0.16, 24),
    steelMat
  );
  gaugeHousing.rotation.x = Math.PI / 2;
  gaugeHousing.position.set(1.1, 4.4, 1.35);

  const gaugeFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.74, 0.74),
    new THREE.MeshBasicMaterial({ map: dialTex })
  );
  gaugeFace.position.set(0, 0, 0.085);
  gaugeHousing.add(gaugeFace);

  // Rotating Gauge Needle
  const needleGeo = new THREE.BoxGeometry(0.02, 0.28, 0.01);
  const needleMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const gaugeNeedle = new THREE.Mesh(needleGeo, needleMat);
  gaugeNeedle.geometry.translate(0, 0.14, 0);
  gaugeNeedle.position.set(0, 0, 0.09);
  gaugeHousing.add(gaugeNeedle);

  group.add(gaugeHousing);

  return { group, ramGroup, bedMesh, indentMesh, gaugeNeedle };
}

/* =========================================================================
 * 5. HYDROSTATIC FLUID PRESSURE & U-TUBE MANOMETER (Áp suất chất lỏng & Áp kế U)
 * ========================================================================= */
export function createHydrostaticColumnRig(options: {
  depthFraction?: number;
}): {
  group: THREE.Group;
  uTubeFluidLeft: THREE.Mesh;
  uTubeFluidRight: THREE.Mesh;
  sensorProbe: THREE.Group;
} {
  const { depthFraction = 0.5 } = options;
  const group = new THREE.Group();

  // Clear acrylic hydrostatic tank column
  const columnHeight = 5.2;
  const colRadius = 0.75;
  const tankGeo = new THREE.CylinderGeometry(colRadius, colRadius, columnHeight, 24, 1, true);
  const tankMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.35,
    roughness: 0.1,
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const tank = new THREE.Mesh(tankGeo, tankMat);
  tank.position.y = columnHeight / 2;
  group.add(tank);

  // Water volume inside
  const waterGeo = new THREE.CylinderGeometry(colRadius * 0.96, colRadius * 0.96, columnHeight * 0.9, 24);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0369a1,
    emissiveIntensity: 0.3,
    transparent: true,
    opacity: 0.65,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.position.y = (columnHeight * 0.9) / 2;
  group.add(water);

  // Depth Graduation Scale Rings (2m, 5m, 8m markings)
  [1.5, 3.0, 4.5].forEach((yPos) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(colRadius + 0.01, 0.02, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfacc15 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = yPos;
    group.add(ring);
  });

  // Submerged Pressure Membrane Sensor Probe (Hộp áp suất màng cao su)
  const sensorProbe = new THREE.Group();
  sensorProbe.position.set(0, columnHeight * (1 - depthFraction), 0);

  const probeBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.12, 16),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 })
  );
  const membrane = new THREE.Mesh(
    new THREE.CircleGeometry(0.22, 16),
    new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.7 })
  );
  membrane.rotation.x = -Math.PI / 2;
  membrane.position.y = -0.065;
  sensorProbe.add(probeBody, membrane);
  group.add(sensorProbe);

  // Flexible tubing to U-Tube
  const tubeGeo = new THREE.CylinderGeometry(0.03, 0.03, 2.5, 8);
  const tubeMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  const tube = new THREE.Mesh(tubeGeo, tubeMat);
  tube.position.set(0.9, 2.5, 0);
  tube.rotation.z = -0.4;
  group.add(tube);

  // U-Tube Manometer Stand (Áp kế hình chữ U)
  const uStand = new THREE.Group();
  uStand.position.set(1.9, 1.2, 0);

  const uBackplate = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 2.2, 0.1),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 })
  );
  uStand.add(uBackplate);

  // Left & Right liquid columns in U-tube (delta h increases with depth)
  const deltaH = depthFraction * 0.8;
  const uTubeMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xb45309,
    emissiveIntensity: 0.4,
  });

  const uTubeFluidLeft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.0 - deltaH / 2, 12),
    uTubeMat
  );
  uTubeFluidLeft.position.set(-0.18, -deltaH / 4, 0.06);

  const uTubeFluidRight = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.0 + deltaH / 2, 12),
    uTubeMat
  );
  uTubeFluidRight.position.set(0.18, deltaH / 4, 0.06);

  uStand.add(uTubeFluidLeft, uTubeFluidRight);
  group.add(uStand);

  return { group, uTubeFluidLeft, uTubeFluidRight, sensorProbe };
}

/* =========================================================================
 * 6. TORRICELLI MERCURY BAROMETER (Ống Tô-ri-xen-li đo áp suất khí quyển)
 * ========================================================================= */
export function createTorricelliBarometer(): {
  group: THREE.Group;
  mercuryColumnMesh: THREE.Mesh;
  vacuumChamberMesh: THREE.Mesh;
} {
  const group = new THREE.Group();

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    transparent: true,
    opacity: 0.4,
    roughness: 0.05,
    metalness: 0.1,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const mercuryMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.98,
    roughness: 0.1,
  });

  // Cistern mercury dish at bottom (chậu thủy ngân)
  const dishGeo = new THREE.CylinderGeometry(0.65, 0.55, 0.35, 24);
  const dish = new THREE.Mesh(dishGeo, glassMat);
  dish.position.y = 0.18;
  group.add(dish);

  const dishMercury = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.52, 0.28, 24),
    mercuryMat
  );
  dishMercury.position.y = 0.16;
  group.add(dishMercury);

  // 1-meter vertical glass barometer tube
  const tubeTotalH = 3.8;
  const tubeRadius = 0.08;
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(tubeRadius, tubeRadius, tubeTotalH, 16, 1, true),
    glassMat
  );
  tube.position.y = tubeTotalH / 2 + 0.1;
  group.add(tube);

  // Mercury Column standing at 760 mmHg ratio (~ 76% height)
  const mercuryH = tubeTotalH * 0.76;
  const mercuryColumnMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(tubeRadius * 0.9, tubeRadius * 0.9, mercuryH, 16),
    mercuryMat
  );
  mercuryColumnMesh.position.y = mercuryH / 2 + 0.1;
  group.add(mercuryColumnMesh);

  // Torricellian Vacuum Space at the top (khoảng chân không Tô-ri-xen-li)
  const vacuumH = tubeTotalH - mercuryH;
  const vacuumChamberMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(tubeRadius * 0.85, tubeRadius * 0.85, vacuumH, 16),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.15,
    })
  );
  vacuumChamberMesh.position.y = tubeTotalH - vacuumH / 2 + 0.1;
  group.add(vacuumChamberMesh);

  // Millimeter Graduation Scale alongside tube
  const scaleTex = getGraduatedScaleTexture(1000, 20, 'mmHg', '#0f172a', '#f8fafc');
  const scaleRuler = new THREE.Mesh(
    new THREE.PlaneGeometry(0.35, tubeTotalH),
    new THREE.MeshBasicMaterial({ map: scaleTex })
  );
  scaleRuler.position.set(0.24, tubeTotalH / 2 + 0.1, 0);
  group.add(scaleRuler);

  return { group, mercuryColumnMesh, vacuumChamberMesh };
}

/* =========================================================================
 * 7. ARCHIMEDES' PRINCIPLE (Lực đẩy Ác-si-mét: Bình tràn & Lực kế lò xo)
 * ========================================================================= */
export function createArchimedesApparatus(): {
  group: THREE.Group;
  dynamometer: THREE.Group;
  pointerMesh: THREE.Mesh;
  overflowCan: THREE.Group;
  catchBeaker: THREE.Group;
  submergedCylinder: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Heavy laboratory stand with vertical rod and clamp
  const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.15, 1.2), standMat);
  standBase.position.y = 0.08;
  group.add(standBase);

  const standRod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 4.2, 12), standMat);
  standRod.position.set(-0.6, 2.1, 0);
  group.add(standRod);

  const clampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), standMat);
  clampArm.rotation.z = Math.PI / 2;
  clampArm.position.set(-0.25, 3.8, 0);
  group.add(clampArm);

  // Precision Spring Dynamometer (Lực kế lò xo chuyên dụng KHTN 8)
  const dynamometer = new THREE.Group();
  dynamometer.position.set(0.1, 3.2, 0);

  const dynHousing = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 1.4, 16),
    new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.4,
      roughness: 0.2,
      transparent: true,
      opacity: 0.8,
    })
  );
  dynamometer.add(dynHousing);

  // Calibrated Newton Scale plate inside slotted housing
  const dynScaleTex = getGraduatedScaleTexture(5, 10, 'Newton (N)', '#dc2626', '#f8fafc');
  const dynScale = new THREE.Mesh(
    new THREE.PlaneGeometry(0.18, 1.1),
    new THREE.MeshBasicMaterial({ map: dynScaleTex })
  );
  dynScale.position.set(0, 0, 0.07);
  dynamometer.add(dynScale);

  // Red sliding pointer ring
  const pointerMesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.13, 0.02, 8, 16),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  pointerMesh.rotation.x = Math.PI / 2;
  pointerMesh.position.y = 0.2;
  dynamometer.add(pointerMesh);

  // Submerged Solid Metal Cylinder suspended on hook
  const hookMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
  const hookWire = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 1.2, 6), hookMat);
  hookWire.position.y = -1.0;
  dynamometer.add(hookWire);

  const submergedCylinder = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.6, 20),
    new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.25 })
  );
  submergedCylinder.position.set(0.1, 1.5, 0);
  group.add(submergedCylinder);

  group.add(dynamometer);

  // Eureka Overflow Can (Bình tràn có vòi rót nghiêng)
  const overflowCan = new THREE.Group();
  overflowCan.position.set(0.1, 0.2, 0);

  const canGeo = new THREE.CylinderGeometry(0.48, 0.48, 1.5, 20);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
    roughness: 0.1,
  });
  const can = new THREE.Mesh(canGeo, glassMat);
  can.position.y = 0.75;
  overflowCan.add(can);

  // Angled Spout (Vòi rót nghiêng)
  const spoutGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.45, 12);
  const spout = new THREE.Mesh(spoutGeo, glassMat);
  spout.position.set(0.55, 1.25, 0);
  spout.rotation.z = -Math.PI / 4;
  overflowCan.add(spout);

  group.add(overflowCan);

  // Catch Beaker for displaced volume (Cốc hứng nước tràn)
  const catchBeaker = new THREE.Group();
  catchBeaker.position.set(0.95, 0.2, 0);

  const beaker = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.7, 16),
    glassMat
  );
  beaker.position.y = 0.35;
  catchBeaker.add(beaker);
  group.add(catchBeaker);

  return {
    group,
    dynamometer,
    pointerMesh,
    overflowCan,
    catchBeaker,
    submergedCylinder,
  };
}

/* =========================================================================
 * 8. ANALOGUE AMMETER / VOLTMETER (Ampe kế / Vôn kế kim chỉ thị KHTN 8)
 * ========================================================================= */
export function createAnalogueLabMeter(type: 'ammeter' | 'voltmeter'): {
  group: THREE.Group;
  needle: THREE.Mesh;
  setReadingValue: (val: number, maxVal: number) => void;
} {
  const group = new THREE.Group();

  const isA = type === 'ammeter';
  const symbol = isA ? 'A' : 'V';
  const title = isA ? 'AMPE KẾ MỘT CHIỀU' : 'VÔN KẾ MỘT CHIỀU';
  const unitStr = isA ? 'Ampe (A)' : 'Vôn (V)';

  // Classic Bakelite slanted housing
  const housingGeo = new THREE.BoxGeometry(1.6, 1.2, 1.4);
  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x09090b,
    metalness: 0.2,
    roughness: 0.4,
  });
  const housing = new THREE.Mesh(housingGeo, housingMat);
  housing.position.y = 0.6;
  group.add(housing);

  // Slanted Face Dial
  const dialTex = getDialScaleTexture(title, symbol, 0, isA ? 3 : 15, unitStr, true);
  const dialFace = new THREE.Mesh(
    new THREE.PlaneGeometry(1.3, 0.9),
    new THREE.MeshBasicMaterial({ map: dialTex })
  );
  dialFace.rotation.x = -Math.PI / 3;
  dialFace.position.set(0, 0.85, 0.35);
  group.add(dialFace);

  // Pivoted Red Knife-Edge Needle
  const needleGeo = new THREE.BoxGeometry(0.018, 0.42, 0.008);
  const needleMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const needle = new THREE.Mesh(needleGeo, needleMat);
  needle.geometry.translate(0, 0.21, 0); // Pivot at base
  needle.rotation.x = -Math.PI / 3;
  needle.position.set(0, 0.72, 0.42);
  group.add(needle);

  // Dual knurled binding posts: Red (+) and Black (-)
  const redPostMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.6 });
  const blackPostMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.6 });

  const redPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12), redPostMat);
  redPost.position.set(0.45, 1.25, -0.2);
  const blackPost = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.2, 12), blackPostMat);
  blackPost.position.set(-0.45, 1.25, -0.2);
  group.add(redPost, blackPost);

  // Connecting Test Wire Lead Stubs
  const wireMatRed = new THREE.MeshBasicMaterial({ color: 0xef4444 });
  const wireRed = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), wireMatRed);
  wireRed.rotation.z = -0.5;
  wireRed.position.set(0.9, 1.3, -0.2);
  group.add(wireRed);

  const wireMatBlack = new THREE.MeshBasicMaterial({ color: 0x18181b });
  const wireBlack = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 8), wireMatBlack);
  wireBlack.rotation.z = 0.5;
  wireBlack.position.set(-0.9, 1.3, -0.2);
  group.add(wireBlack);

  const setReadingValue = (val: number, maxVal: number) => {
    const frac = Math.max(0, Math.min(1, val / maxVal));
    const startAngle = Math.PI * 0.42;
    const endAngle = -Math.PI * 0.42;
    needle.rotation.z = startAngle + frac * (endAngle - startAngle);
  };

  setReadingValue(0, isA ? 3 : 15);

  return { group, needle, setReadingValue };
}

/* =========================================================================
 * 9. LEVER & MOMENT APPARATUS (Đòn bẩy điểm tựa O & Mômen lực KHTN 8)
 * ========================================================================= */
export function createFulcrumLeverApparatus(): {
  group: THREE.Group;
  leverBeam: THREE.Group;
  fulcrumPrism: THREE.Mesh;
  loadRock: THREE.Mesh;
  effortHandle: THREE.Mesh;
} {
  const group = new THREE.Group();

  // Base Board
  const baseBoard = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 0.2, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.6 })
  );
  baseBoard.position.y = 0.1;
  group.add(baseBoard);

  // Hardened steel triangular prism fulcrum (Điểm tựa O sắc nhọn)
  const fulcrumGeo = new THREE.CylinderGeometry(0.02, 0.35, 0.8, 3);
  const fulcrumMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });
  const fulcrumPrism = new THREE.Mesh(fulcrumGeo, fulcrumMat);
  fulcrumPrism.rotation.z = Math.PI / 2;
  fulcrumPrism.position.set(-0.3, 0.5, 0);
  group.add(fulcrumPrism);

  // Lever Beam (Thanh đòn có khắc vạch chia khoảng cách O1, O2)
  const leverBeam = new THREE.Group();
  leverBeam.position.set(-0.3, 0.9, 0);

  const beamGeo = new THREE.BoxGeometry(4.0, 0.16, 0.25);
  const beamMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.85,
    roughness: 0.3,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  leverBeam.add(beamMesh);

  // Distance Graduation Notches along beam
  for (let x = -1.8; x <= 1.8; x += 0.3) {
    const notch = new THREE.Mesh(
      new THREE.BoxGeometry(0.02, 0.18, 0.27),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    notch.position.x = x;
    leverBeam.add(notch);
  }

  // Heavy Rock Load on shorter side (O2)
  const rockGeo = new THREE.DodecahedronGeometry(0.5, 1);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x52525b,
    roughness: 0.9,
  });
  const loadRock = new THREE.Mesh(rockGeo, rockMat);
  loadRock.scale.set(1.4, 0.9, 1.1);
  loadRock.position.set(-1.4, 0.45, 0);
  leverBeam.add(loadRock);

  // Effort Handle / Grip on longer side (O1)
  const handleGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 12);
  const handleMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.4 });
  const effortHandle = new THREE.Mesh(handleGeo, handleMat);
  effortHandle.position.set(1.6, 0.35, 0);
  leverBeam.add(effortHandle);

  group.add(leverBeam);

  return { group, leverBeam, fulcrumPrism, loadRock, effortHandle };
}

/* =========================================================================
 * 10. CALORIMETER & DIGITAL JOULEMETER (Nhiệt lượng kế & Hộp Joulemeter)
 * ========================================================================= */
export function createCalorimeterSetup(): {
  group: THREE.Group;
  stirrerMesh: THREE.Mesh;
  thermometerCapillary: THREE.Mesh;
  joulemeterDisplay: HTMLCanvasElement;
  updateJoules: (j: number) => void;
} {
  const group = new THREE.Group();

  // Double-Walled Insulated Vessel (Bình nhiệt lượng kế cách nhiệt)
  const outerCan = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 1.6, 24),
    new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.2 })
  );
  outerCan.position.y = 0.8;
  group.add(outerCan);

  // Cork Stopper Lid with ports
  const lid = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.68, 0.16, 24),
    new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.8 })
  );
  lid.position.y = 1.68;
  group.add(lid);

  // Thermometer with red capillary mercury thread
  const thermoGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 2.0, 12),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
  );
  thermoGlass.position.set(-0.25, 2.0, 0);
  group.add(thermoGlass);

  const thermometerCapillary = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 1.2, 8),
    new THREE.MeshBasicMaterial({ color: 0xef4444 })
  );
  thermometerCapillary.position.set(-0.25, 1.6, 0);
  group.add(thermometerCapillary);

  // Coiled Immersion Heating Element (Dây nung xoắn ruột gà)
  const coilGeo = new THREE.TorusGeometry(0.25, 0.03, 8, 24);
  const coilMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    emissive: 0xb45309,
    emissiveIntensity: 0.6,
  });
  const coil = new THREE.Mesh(coilGeo, coilMat);
  coil.rotation.x = Math.PI / 2;
  coil.position.set(0.1, 0.6, 0);
  group.add(coil);

  // Stainless Steel Stirrer with loop
  const stirrerMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 2.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 })
  );
  stirrerMesh.position.set(0.25, 1.8, 0);
  group.add(stirrerMesh);

  // Digital Joulemeter Unit Box (Hộp Joulemeter hiển thị LED)
  const jBox = new THREE.Mesh(
    new THREE.BoxGeometry(1.4, 0.8, 1.1),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7 })
  );
  jBox.position.set(1.6, 0.4, 0);
  group.add(jBox);

  const joulemeterDisplay = document.createElement('canvas');
  joulemeterDisplay.width = 256;
  joulemeterDisplay.height = 128;
  const jctx = joulemeterDisplay.getContext('2d')!;

  const jTex = new THREE.CanvasTexture(joulemeterDisplay);
  const jScreen = new THREE.Mesh(
    new THREE.PlaneGeometry(1.0, 0.5),
    new THREE.MeshBasicMaterial({ map: jTex })
  );
  jScreen.rotation.x = -Math.PI / 4;
  jScreen.position.set(1.6, 0.65, 0.45);
  group.add(jScreen);

  const updateJoules = (j: number) => {
    jctx.fillStyle = '#020617';
    jctx.fillRect(0, 0, 256, 128);
    jctx.fillStyle = '#38bdf8';
    jctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
    jctx.fillText('JOULEMETER Q=Pt', 16, 28);
    jctx.fillStyle = '#22c55e';
    jctx.font = 'bold 44px "Courier New", monospace';
    jctx.textAlign = 'right';
    jctx.fillText(`${Math.round(j)} J`, 235, 85);
    jTex.needsUpdate = true;
  };

  updateJoules(0);

  return { group, stirrerMesh, thermometerCapillary, joulemeterDisplay, updateJoules };
}

/* =========================================================================
 * 11. THERMAL EXPANSION: GRAVESANDE RING & BIMETALLIC STRIP (KHTN 8)
 * ========================================================================= */
export function createThermalExpansionRig(type: 'GRAVESANDE' | 'BIMETALLIC'): {
  group: THREE.Group;
  animatedPart: THREE.Mesh;
} {
  const group = new THREE.Group();

  const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });
  const standBase = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.12, 1.0), standMat);
  standBase.position.y = 0.06;
  group.add(standBase);

  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.8, 12), standMat);
  rod.position.set(-0.4, 1.4, 0);
  group.add(rod);

  let animatedPart: THREE.Mesh;

  if (type === 'GRAVESANDE') {
    // Gravesande Ring & Ball (Quả cầu và vòng kim loại)
    const ringArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 8), standMat);
    ringArm.rotation.z = Math.PI / 2;
    ringArm.position.set(-0.1, 2.2, 0);
    group.add(ringArm);

    // Brass Aperture Ring
    const ringGeo = new THREE.TorusGeometry(0.28, 0.04, 12, 32);
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      metalness: 0.9,
      roughness: 0.2,
    });
    const ringMesh = new THREE.Mesh(ringGeo, brassMat);
    ringMesh.rotation.x = Math.PI / 2;
    ringMesh.position.set(0.2, 2.2, 0);
    group.add(ringMesh);

    // Ball suspended on chain (Quả cầu kim loại)
    const ballGeo = new THREE.SphereGeometry(0.26, 24, 24);
    animatedPart = new THREE.Mesh(ballGeo, brassMat);
    animatedPart.position.set(0.2, 2.3, 0);
    group.add(animatedPart);

    // Chain
    const chain = new THREE.Mesh(
      new THREE.CylinderGeometry(0.008, 0.008, 0.6, 6),
      standMat
    );
    chain.position.set(0.2, 2.6, 0);
    group.add(chain);
  } else {
    // Bimetallic Strip (Băng kép Đồng - Thép)
    const stripArm = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 8), standMat);
    stripArm.rotation.z = Math.PI / 2;
    stripArm.position.set(-0.15, 2.0, 0);
    group.add(stripArm);

    // Dual-layer curved bimetallic strip
    const stripGeo = new THREE.BoxGeometry(1.8, 0.06, 0.2);
    const dualMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.3,
    });
    animatedPart = new THREE.Mesh(stripGeo, dualMat);
    animatedPart.position.set(0.7, 2.0, 0);
    group.add(animatedPart);

    // Spirit Burner underneath (Đèn cồn)
    const burner = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.28, 0.45, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.7 })
    );
    burner.position.set(0.7, 0.35, 0);
    group.add(burner);

    // Flame
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.3, 12),
      new THREE.MeshBasicMaterial({ color: 0xf97316 })
    );
    flame.position.set(0.7, 0.75, 0);
    group.add(flame);
  }

  return { group, animatedPart };
}

/* =========================================================================
 * 12. HEAT CONDUCTION: COPPER BAR WITH WAX TACKS (Thí nghiệm dẫn nhiệt)
 * ========================================================================= */
export function createHeatConductionApparatus(): {
  group: THREE.Group;
  copperBar: THREE.Mesh;
  pins: THREE.Mesh[];
} {
  const group = new THREE.Group();

  const standMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8 });

  // Two support stands
  [-1.2, 1.2].forEach((xPos) => {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 12), standMat);
    s.position.set(xPos, 0.8, 0);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.35, 0.1, 16), standMat);
    foot.position.set(xPos, 0.05, 0);
    group.add(s, foot);
  });

  // Solid Copper Conduction Bar (Thanh đồng dài)
  const copperGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.2, 20);
  const copperMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.95,
    roughness: 0.2,
  });
  const copperBar = new THREE.Mesh(copperGeo, copperMat);
  copperBar.rotation.z = Math.PI / 2;
  copperBar.position.y = 1.6;
  group.add(copperBar);

  // Wax drops holding metal tacks/pins (Các đinh gắn sáp rơi tuần tự)
  const pins: THREE.Mesh[] = [];
  const waxMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.7 });
  const pinMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9 });

  [-0.8, -0.3, 0.2, 0.7, 1.2].forEach((xPos) => {
    const waxDrop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), waxMat);
    waxDrop.position.set(xPos, 1.52, 0);
    const pin = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.18, 6), pinMat);
    pin.rotation.x = Math.PI;
    pin.position.set(xPos, 1.4, 0);
    group.add(waxDrop, pin);
    pins.push(pin);
  });

  // Heating Spirit Burner at left end
  const burner = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.32, 0.6, 16),
    new THREE.MeshStandardMaterial({ color: 0x334155 })
  );
  burner.position.set(-1.6, 0.3, 0);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.45, 12),
    new THREE.MeshBasicMaterial({ color: 0xf97316 })
  );
  flame.position.set(-1.6, 0.85, 0);
  group.add(burner, flame);

  return { group, copperBar, pins };
}

/* =========================================================================
 * 13. HEAVY INDUSTRIAL GANTRY CRANE (Cần cẩu giàn công nghiệp)
 * ========================================================================= */
export function createGantryCraneAssembly(): {
  group: THREE.Group;
  trolleyGroup: THREE.Group;
  containerMesh: THREE.Mesh;
} {
  const group = new THREE.Group();

  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.85,
    roughness: 0.3,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    map: getHazardStripeTexture(),
    metalness: 0.3,
  });

  // Twin A-frame Gantry Legs
  [-5.5, 5.5].forEach((gx) => {
    const legLeft = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9.5, 0.4), hazardMat);
    legLeft.position.set(gx, 4.75, -2.2);
    legLeft.rotation.x = 0.2;

    const legRight = new THREE.Mesh(new THREE.BoxGeometry(0.4, 9.5, 0.4), hazardMat);
    legRight.position.set(gx, 4.75, 2.2);
    legRight.rotation.x = -0.2;

    group.add(legLeft, legRight);
  });

  // Overhead Heavy Twin Girders
  const girder1 = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.8, 0.5), steelMat);
  girder1.position.set(0, 9.2, -0.6);
  const girder2 = new THREE.Mesh(new THREE.BoxGeometry(13.0, 0.8, 0.5), steelMat);
  girder2.position.set(0, 9.2, 0.6);
  group.add(girder1, girder2);

  // Motorized Trolley Carriage
  const trolleyGroup = new THREE.Group();
  trolleyGroup.position.set(0, 8.6, 0);

  const carriage = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.4, 2.0), steelMat);
  trolleyGroup.add(carriage);

  // Twin Wire Rope Cables
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8 });
  const cable1 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.0, 6), cableMat);
  cable1.position.set(-0.7, -2.0, 0);
  const cable2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 4.0, 6), cableMat);
  cable2.position.set(0.7, -2.0, 0);
  trolleyGroup.add(cable1, cable2);

  // Spreader Bar
  const spreader = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.2, 1.2), hazardMat);
  spreader.position.set(0, -4.0, 0);
  trolleyGroup.add(spreader);

  // Heavy ISO Shipping Container (Thùng hàng công nghiệp chuẩn)
  const containerMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    metalness: 0.6,
    roughness: 0.35,
  });
  const containerMesh = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.4, 2.0), containerMat);
  containerMesh.position.set(0, -5.3, 0);
  trolleyGroup.add(containerMesh);

  group.add(trolleyGroup);

  return { group, trolleyGroup, containerMesh };
}

/* =========================================================================
 * 14. NOVA-8 TOKAMAK FUSION CORE (Lò phản ứng nhiệt hạch Meltdown B03)
 * ========================================================================= */
export function createTokamakMeltdownCore(): {
  group: THREE.Group;
  plasmaCore: THREE.Mesh;
  containmentRings: THREE.Mesh[];
  coolantPipes: THREE.Mesh[];
} {
  const group = new THREE.Group();

  // Central Superheated Plasma Core
  const plasmaGeo = new THREE.TorusGeometry(2.8, 0.7, 24, 48);
  const plasmaMat = new THREE.MeshBasicMaterial({
    color: 0x06b6d4,
  });
  const plasmaCore = new THREE.Mesh(plasmaGeo, plasmaMat);
  plasmaCore.rotation.x = Math.PI / 2;
  plasmaCore.position.y = 4.2;
  group.add(plasmaCore);

  // Concentric Magnetic Toroidal Containment Rings
  const containmentRings: THREE.Mesh[] = [];
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.9,
    roughness: 0.2,
  });

  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.18, 12, 32), steelMat);
    ring.position.set(Math.cos(ang) * 2.8, 4.2, Math.sin(ang) * 2.8);
    ring.rotation.y = -ang;
    group.add(ring);
    containmentRings.push(ring);
  }

  // Cryogenic Coolant Distribution Manifolds with Frost
  const coolantPipes: THREE.Mesh[] = [];
  const cryoMat = new THREE.MeshStandardMaterial({
    color: 0xe0f2fe,
    metalness: 0.8,
    roughness: 0.1,
  });
  [-3.8, 3.8].forEach((px) => {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 8.5, 16), cryoMat);
    pipe.position.set(px, 4.25, 0);
    group.add(pipe);
    coolantPipes.push(pipe);
  });

  return { group, plasmaCore, containmentRings, coolantPipes };
}
