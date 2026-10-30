import * as THREE from 'three';
import { SceneZoneId, StationRecord } from '../../types/game';

export function createRadialShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.25)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createRoadSurfaceTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Asphalt base
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle asphalt grain
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, 2, 2);
  }

  // Outer solid lane boundary lines (bright white/cyan)
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(22, 0, 14, 512);
  ctx.fillRect(512 - 36, 0, 14, 512);

  // Safety hazard shoulder ticks
  ctx.fillStyle = '#0ea5e9';
  for (let y = 0; y < 512; y += 64) {
    ctx.fillRect(6, y, 10, 32);
    ctx.fillRect(512 - 16, y, 10, 32);
  }

  // Center dashed yellow/amber lane divider
  ctx.fillStyle = '#fbbf24';
  for (let y = 16; y < 512; y += 64) {
    ctx.fillRect(250, y, 12, 36);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSignLabelTexture(
  topBadge: string,
  title: string,
  subtitle: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  // Dark slate board background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 192);

  // Border frame
  ctx.strokeStyle = accentHex;
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 180);

  // Top badge text
  ctx.fillStyle = accentHex;
  ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(topBadge.toUpperCase(), 24, 42);

  // Primary station title
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 30px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title.slice(0, 30), 24, 96);

  // Lesson & objective line
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 22px "JetBrains Mono", monospace';
  ctx.fillText(subtitle.slice(0, 38), 24, 148);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export interface JetBotRig {
  group: THREE.Group;
  wheels: THREE.Object3D[];
  frontSteerPivots: THREE.Object3D[];
  lidarTurret: THREE.Object3D;
  chassisMesh: THREE.Mesh;
  sensorCone: THREE.Mesh;
}

/**
 * Composite 10-part procedural 3D JetBot AI Survey Rover
 * Pivot at bottom-center (y = 0 sits flush on road surface).
 */
export function createJetBotRover(
  chassisColorHex: string,
  isSoftwareGl: boolean,
  shadowTex: THREE.CanvasTexture
): JetBotRig {
  const group = new THREE.Group();

  // 1. Contact shadow plane (flush at y = 0.02)
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  const shadowPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.2), shadowMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = 0.02;
  group.add(shadowPlane);

  // 2. Primary beveled aluminum chassis hull (ExtrudeGeometry)
  const hullShape = new THREE.Shape();
  const hw = 0.68;
  const hl = 1.05;
  hullShape.moveTo(-hw, -hl);
  hullShape.lineTo(hw, -hl);
  hullShape.lineTo(hw * 0.88, hl);
  hullShape.lineTo(-hw * 0.88, hl);
  hullShape.closePath();

  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.05,
    bevelSegments: 3,
  });
  hullGeo.rotateX(Math.PI / 2);

  const chassisMat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(chassisColorHex),
    metalness: 0.65,
    roughness: 0.25,
    clearcoat: 0.8,
    clearcoatRoughness: 0.15,
  });
  const chassisMesh = new THREE.Mesh(hullGeo, chassisMat);
  chassisMesh.position.y = 0.62;
  chassisMesh.castShadow = !isSoftwareGl;
  chassisMesh.receiveShadow = !isSoftwareGl;
  group.add(chassisMesh);

  // 3. Secondary PCB top deck plate (contrasting matte dark slate, roughness >= 0.25 diff)
  const deckGeo = new THREE.BoxGeometry(1.18, 0.08, 1.72);
  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.2,
    roughness: 0.75,
  });
  const deckMesh = new THREE.Mesh(deckGeo, deckMat);
  deckMesh.position.set(0, 0.67, -0.05);
  deckMesh.castShadow = !isSoftwareGl;
  group.add(deckMesh);

  // 4. Rear green/cyan Li-Ion battery pack module
  const batteryGeo = new THREE.BoxGeometry(0.84, 0.28, 0.56);
  const batteryMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    metalness: 0.35,
    roughness: 0.4,
  });
  const batteryMesh = new THREE.Mesh(batteryGeo, batteryMat);
  batteryMesh.position.set(0, 0.84, -0.52);
  batteryMesh.castShadow = !isSoftwareGl;
  group.add(batteryMesh);

  // 5. Front CSI Camera Mast & Gimbal Housing
  const mastGroup = new THREE.Group();
  mastGroup.position.set(0, 0.7, 0.56);

  const neckMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.11, 0.38, 16),
    new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.3 })
  );
  neckMesh.position.y = 0.19;
  mastGroup.add(neckMesh);

  const camHead = new THREE.Mesh(
    new THREE.BoxGeometry(0.46, 0.24, 0.28),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.3, roughness: 0.35 })
  );
  camHead.position.set(0, 0.42, 0.04);
  mastGroup.add(camHead);

  // 6. Optical Glass Camera Lens
  const lensMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    metalness: 0.1,
    roughness: 0.08,
    transmission: isSoftwareGl ? 0 : 0.9,
    transparent: true,
    opacity: isSoftwareGl ? 0.75 : 1,
    ior: 1.55,
  });
  const lensMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 20), lensMat);
  lensMesh.rotation.x = Math.PI / 2;
  lensMesh.position.set(0, 0.42, 0.19);
  mastGroup.add(lensMesh);
  group.add(mastGroup);

  // 7. Spinning LiDAR Turret Puck on center-top
  const lidarTurret = new THREE.Group();
  lidarTurret.position.set(0, 0.86, 0.05);
  const lidarBase = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.26, 0.18, 24),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 })
  );
  const lidarBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.245, 0.245, 0.05, 24),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.2,
    })
  );
  lidarTurret.add(lidarBase, lidarBand);
  group.add(lidarTurret);

  // 8. Dual Rear Telemetry Antennas
  const antGeo = new THREE.CylinderGeometry(0.018, 0.025, 0.65, 8);
  const antMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
  const tipGeo = new THREE.SphereGeometry(0.045, 12, 12);
  const tipMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 0.6,
  });
  [-0.38, 0.38].forEach((xPos) => {
    const ant = new THREE.Mesh(antGeo, antMat);
    ant.position.set(xPos, 1.05, -0.82);
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(xPos, 1.38, -0.82);
    group.add(ant, tip);
  });

  // 9. 4 Composite Treaded Wheels (Tire + Metallic Rim)
  const wheels: THREE.Object3D[] = [];
  const frontSteerPivots: THREE.Object3D[] = [];

  const tireGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 24);
  tireGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.1,
    roughness: 0.88,
  });

  const rimGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.25, 16);
  rimGeo.rotateZ(Math.PI / 2);
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    metalness: 0.85,
    roughness: 0.22,
  });

  const wheelPositions: [number, number, number, boolean][] = [
    [-0.78, 0.34, 0.68, true],
    [0.78, 0.34, 0.68, true],
    [-0.78, 0.34, -0.68, false],
    [0.78, 0.34, -0.68, false],
  ];

  wheelPositions.forEach(([wx, wy, wz, isFront]) => {
    const steerPivot = new THREE.Group();
    steerPivot.position.set(wx, wy, wz);

    const spinGroup = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = !isSoftwareGl;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    spinGroup.add(tire, rim);

    steerPivot.add(spinGroup);
    group.add(steerPivot);

    wheels.push(spinGroup);
    if (isFront) {
      frontSteerPivots.push(steerPivot);
    }
  });

  // 10. AI Lane-Sensor Projection Cone on Ground
  const coneGeo = new THREE.ConeGeometry(1.4, 3.8, 24, 1, true);
  coneGeo.rotateX(-Math.PI / 2);
  coneGeo.translate(0, 0.12, 2.5);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.18,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const sensorCone = new THREE.Mesh(coneGeo, coneMat);
  group.add(sensorCone);

  return {
    group,
    wheels,
    frontSteerPivots,
    lidarTurret,
    chassisMesh,
    sensorCone,
  };
}

/**
 * Builds a composite 5–9 part 3D Station Laboratory Diorama for each station along the track.
 */
export function createStationStructure(
  station: StationRecord,
  maxAnisotropy: number,
  isSoftwareGl: boolean
): {
  group: THREE.Group;
  ringMesh: THREE.Mesh;
  beaconMesh: THREE.Mesh;
} {
  const group = new THREE.Group();
  const accentColor = new THREE.Color(station.accent_color || '#38bdf8');

  // 1. Overhead Station Portal Archway (Left & Right Pillars + Crossbar + Signboard)
  const pillarGeo = new THREE.CylinderGeometry(0.28, 0.34, 5.4, 16);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.7,
    roughness: 0.3,
  });

  const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
  leftPillar.position.set(-5.2, 2.7, 0);
  leftPillar.castShadow = !isSoftwareGl;

  const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
  rightPillar.position.set(5.2, 2.7, 0);
  rightPillar.castShadow = !isSoftwareGl;

  const crossbar = new THREE.Mesh(
    new THREE.BoxGeometry(11.4, 0.45, 0.45),
    new THREE.MeshStandardMaterial({ color: accentColor, metalness: 0.5, roughness: 0.35 })
  );
  crossbar.position.set(0, 5.3, 0);
  group.add(leftPillar, rightPillar, crossbar);

  // Signboard with station title & KHTN 8 lesson ref
  const signTex = createSignLabelTexture(
    `${station.type_label_vi} · ${station.lesson_refs.join(', ')}`,
    station.title,
    `Mục tiêu: ${station.target_quantity_id.replace('PHY_', '')}`,
    station.accent_color,
    maxAnisotropy
  );
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(7.6, 2.4, 0.22),
    new THREE.MeshBasicMaterial({ map: signTex })
  );
  signBoard.position.set(0, 6.2, 0);
  group.add(signBoard);

  // 2. Ground Trigger Ring (offset Y = 0.04 to prevent Z-fighting)
  const radius = station.track_config.station_trigger_radius;
  const ringGeo = new THREE.RingGeometry(radius - 0.35, radius, 48);
  ringGeo.rotateX(-Math.PI / 2);
  const ringMat = new THREE.MeshBasicMaterial({
    color: accentColor,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.8,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.position.y = 0.04;
  group.add(ringMesh);

  // 3. Rotating Beacon Crystal above archway
  const beaconMesh = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.65, 0),
    new THREE.MeshStandardMaterial({
      color: accentColor,
      emissive: accentColor,
      emissiveIntensity: 0.45,
      metalness: 0.6,
      roughness: 0.2,
    })
  );
  beaconMesh.position.set(0, 8.1, 0);
  group.add(beaconMesh);

  // 4. Thematic Science Lab Props on the right flank (x = +7.8)
  const labPad = new THREE.Group();
  labPad.position.set(7.8, 0, 0);

  // Concrete lab base platform
  const baseSlab = new THREE.Mesh(
    new THREE.CylinderGeometry(2.8, 3.0, 0.25, 24),
    new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.1 })
  );
  baseSlab.position.y = 0.125;
  labPad.add(baseSlab);

  buildZoneSpecificProps(station.scene_id, labPad, accentColor, isSoftwareGl);
  group.add(labPad);

  return { group, ringMesh, beaconMesh };
}

function buildZoneSpecificProps(
  sceneId: SceneZoneId,
  container: THREE.Group,
  accent: THREE.Color,
  isSoftwareGl: boolean
) {
  switch (sceneId) {
    case 'mass_warehouse': {
      // Electronic balance + 2 crates (2 kg & 5 kg)
      const scaleBase = new THREE.Mesh(
        new THREE.BoxGeometry(2.2, 0.35, 1.8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7, roughness: 0.3 })
      );
      scaleBase.position.y = 0.42;
      const crateSmall = new THREE.Mesh(
        new THREE.BoxGeometry(0.75, 0.75, 0.75),
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.5 })
      );
      crateSmall.position.set(-0.45, 0.97, 0);
      const crateLarge = new THREE.Mesh(
        new THREE.BoxGeometry(1.05, 1.05, 1.05),
        new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 })
      );
      crateLarge.position.set(0.55, 1.12, 0);
      container.add(scaleBase, crateSmall, crateLarge);
      break;
    }
    case 'volume_lab':
    case 'materials_lab': {
      // Giant Graduated Cylinder + liquid column
      const outerGlass = new THREE.Mesh(
        new THREE.CylinderGeometry(1.1, 1.1, 3.4, 24),
        new THREE.MeshPhysicalMaterial({
          color: 0xe0f2fe,
          transparent: true,
          opacity: isSoftwareGl ? 0.38 : 0.85,
          transmission: isSoftwareGl ? 0 : 0.85,
          roughness: 0.1,
          depthWrite: false,
        })
      );
      outerGlass.position.y = 1.95;
      outerGlass.renderOrder = 2;

      const waterCol = new THREE.Mesh(
        new THREE.CylinderGeometry(0.98, 0.98, 2.1, 20),
        new THREE.MeshStandardMaterial({
          color: 0x0ea5e9,
          transparent: true,
          opacity: 0.75,
          roughness: 0.2,
        })
      );
      waterCol.position.y = 1.3;
      container.add(waterCol, outerGlass);
      break;
    }
    case 'pressure_track':
    case 'fluid_channel':
    case 'archimedes_dock': {
      // Water tank + floating orange buoy + crane arm
      const basin = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 1.8, 2.6),
        new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          transparent: true,
          opacity: 0.65,
          roughness: 0.25,
        })
      );
      basin.position.y = 1.15;
      const buoy = new THREE.Mesh(
        new THREE.SphereGeometry(0.65, 20, 20),
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 })
      );
      buoy.position.set(0, 1.95, 0);
      container.add(basin, buoy);
      break;
    }
    case 'mechanics_workshop':
    case 'lever_yard': {
      // Fulcrum triangle O + balanced lever beam + 2 weights
      const fulcrum = new THREE.Mesh(
        new THREE.ConeGeometry(0.75, 1.3, 4),
        new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.6, roughness: 0.4 })
      );
      fulcrum.position.y = 0.9;
      const beam = new THREE.Mesh(
        new THREE.BoxGeometry(4.2, 0.22, 0.55),
        new THREE.MeshStandardMaterial({ color: accent, metalness: 0.5, roughness: 0.3 })
      );
      beam.position.y = 1.65;
      beam.rotation.z = 0.12;
      container.add(fulcrum, beam);
      break;
    }
    case 'electric_lab':
    case 'voltage_station': {
      // Battery pillar + glowing lamp sphere + meter dial stand
      const battery = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 0.7, 2.2, 20),
        new THREE.MeshStandardMaterial({ color: 0x9333ea, metalness: 0.5, roughness: 0.3 })
      );
      battery.position.set(-0.8, 1.35, 0);
      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.68, 20, 20),
        new THREE.MeshStandardMaterial({
          color: 0xfef08a,
          emissive: 0xfacc15,
          emissiveIntensity: 0.9,
        })
      );
      bulb.position.set(0.85, 1.8, 0);
      container.add(battery, bulb);
      break;
    }
    default: {
      // Thermal / Command Plaza: Calorimeter / Expansion tower
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 1.05, 2.8, 20),
        new THREE.MeshStandardMaterial({ color: accent, metalness: 0.6, roughness: 0.28 })
      );
      tower.position.y = 1.65;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.25, 0.12, 12, 32),
        new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.8, roughness: 0.2 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2.2;
      container.add(tower, ring);
      break;
    }
  }
}
