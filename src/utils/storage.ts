import { GitHubConfig, PhotoItem, PublicArchiveConfig, UiAestheticConfig } from '../types';

const DB_NAME = 'aesthetic_vault_db';
const DB_VERSION = 1;
const STORE_NAME = 'photos';
const GITHUB_CONFIG_KEY = 'aesthetic_vault_github_config';
const UI_CONFIG_KEY = 'aesthetic_vault_ui_config_v2';
const SEEDED_KEY = 'aesthetic_vault_seeded_v2';
const INSTANT_UPLOAD_KEY = 'aesthetic_vault_instant_upload';

type StudyVariant =
  | 'chiaroscuro-window'
  | 'sugimoto-horizon'
  | 'rain-nocturne'
  | 'forest-shafts'
  | 'brutalist-light'
  | 'twilight-tide';

/**
 * Generates fine-art photographic tonal & grain studies (with silver-halide SVG turbulence
 * and optical vignetting) so initial gallery cards look like darkroom contact prints offline.
 */
function createFineArtStudy(
  width: number,
  height: number,
  stops: [string, string, string],
  variant: StudyVariant
): string {
  let compositionLayer = '';

  if (variant === 'chiaroscuro-window') {
    compositionLayer = `
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <polygon points="0,0 ${width * 0.56},0 ${width * 0.14},${height} 0,${height}" fill="#050404" opacity="0.88"/>
      <polygon points="${width * 0.62},${height * 0.14} ${width * 0.92},${height * 0.28} ${width * 0.68},${height * 0.92} ${width * 0.34},${height * 0.72}" fill="${stops[2]}" opacity="0.34" filter="url(#soft)"/>
      <ellipse cx="${width * 0.58}" cy="${height * 0.52}" rx="${width * 0.04}" ry="${height * 0.055}" fill="#0a0807" opacity="0.92"/>
      <path d="M${width * 0.54},${height * 0.59} Q${width * 0.58},${height * 0.57} ${width * 0.62},${height * 0.59} L${width * 0.64},${height * 0.79} L${width * 0.52},${height * 0.79} Z" fill="#0a0807" opacity="0.92"/>
      <polygon points="${width * 0.52},${height * 0.79} ${width * 0.64},${height * 0.79} ${width * 0.25},${height} ${width * 0.12},${height}" fill="#050404" opacity="0.62" filter="url(#micro)"/>
    `;
  } else if (variant === 'sugimoto-horizon') {
    compositionLayer = `
      <rect width="${width}" height="${height * 0.54}" fill="url(#skyGrad)"/>
      <rect y="${height * 0.54}" width="${width}" height="${height * 0.46}" fill="url(#seaGrad)"/>
      <line x1="0" y1="${height * 0.54}" x2="${width}" y2="${height * 0.54}" stroke="${stops[2]}" stroke-opacity="0.24" stroke-width="1.5" filter="url(#micro)"/>
      <ellipse cx="${width * 0.5}" cy="${height * 0.54}" rx="${width * 0.55}" ry="${height * 0.09}" fill="${stops[2]}" opacity="0.18" filter="url(#soft)"/>
      <path d="M0,${height * 0.57} Q${width * 0.3},${height * 0.54} ${width * 0.62},${height * 0.58} T${width},${height * 0.56} L${width},${height * 0.68} L0,${height * 0.68} Z" fill="#cbd5e1" opacity="0.09" filter="url(#soft)"/>
    `;
  } else if (variant === 'rain-nocturne') {
    compositionLayer = `
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <circle cx="${width * 0.72}" cy="${height * 0.32}" r="${width * 0.13}" fill="#e67e45" opacity="0.48" filter="url(#soft)"/>
      <circle cx="${width * 0.72}" cy="${height * 0.32}" r="${width * 0.04}" fill="#fbd3a8" opacity="0.72" filter="url(#micro)"/>
      <circle cx="${width * 0.26}" cy="${height * 0.38}" r="${width * 0.11}" fill="#3888a8" opacity="0.38" filter="url(#soft)"/>
      <rect y="${height * 0.62}" width="${width}" height="${height * 0.38}" fill="#06090e" opacity="0.86"/>
      <ellipse cx="${width * 0.72}" cy="${height * 0.76}" rx="${width * 0.06}" ry="${height * 0.16}" fill="#e67e45" opacity="0.28" filter="url(#soft)"/>
      <ellipse cx="${width * 0.26}" cy="${height * 0.79}" rx="${width * 0.05}" ry="${height * 0.13}" fill="#3888a8" opacity="0.24" filter="url(#soft)"/>
    `;
  } else if (variant === 'forest-shafts') {
    compositionLayer = `
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <polygon points="${width * 0.18},0 ${width * 0.36},0 ${width * 0.88},${height} ${width * 0.48},${height}" fill="${stops[2]}" opacity="0.22" filter="url(#soft)"/>
      <polygon points="${width * 0.44},0 ${width * 0.55},0 ${width},${height * 0.86} ${width * 0.78},${height}" fill="${stops[2]}" opacity="0.16" filter="url(#soft)"/>
      <rect x="${width * 0.11}" width="${width * 0.032}" height="${height}" fill="#060d09" opacity="0.92"/>
      <rect x="${width * 0.33}" width="${width * 0.046}" height="${height}" fill="#040906" opacity="0.95"/>
      <rect x="${width * 0.68}" width="${width * 0.036}" height="${height}" fill="#060d09" opacity="0.9"/>
      <rect x="${width * 0.86}" width="${width * 0.022}" height="${height}" fill="#08120c" opacity="0.82"/>
    `;
  } else if (variant === 'brutalist-light') {
    compositionLayer = `
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <polygon points="${width * 0.58},0 ${width},0 ${width},${height} ${width * 0.58},${height}" fill="${stops[2]}" opacity="0.58"/>
      <polygon points="${width * 0.22},${height * 0.28} ${width * 0.58},${height * 0.08} ${width * 0.58},${height} ${width * 0.22},${height}" fill="#57534e" opacity="0.46"/>
      <circle cx="${width * 0.41}" cy="${height * 0.78}" r="${width * 0.015}" fill="#141312"/>
      <rect x="${width * 0.402}" y="${height * 0.798}" width="${width * 0.016}" height="${height * 0.06}" rx="4" fill="#141312"/>
      <polygon points="${width * 0.402},${height * 0.858} ${width * 0.418},${height * 0.858} ${width * 0.32},${height * 0.91} ${width * 0.29},${height * 0.91}" fill="#141312" opacity="0.45" filter="url(#micro)"/>
    `;
  } else {
    compositionLayer = `
      <rect width="${width}" height="${height}" fill="url(#bg)"/>
      <rect y="${height * 0.6}" width="${width}" height="${height * 0.4}" fill="#08131d" opacity="0.85"/>
      <ellipse cx="${width * 0.74}" cy="${height * 0.58}" rx="${width * 0.22}" ry="${height * 0.04}" fill="${stops[2]}" opacity="0.42" filter="url(#soft)"/>
      <path d="M${width * 0.16},${height * 0.68} Q${width * 0.32},${height * 0.61} ${width * 0.48},${height * 0.69} Q${width * 0.31},${height * 0.72} ${width * 0.16},${height * 0.68} Z" fill="#050a0f" opacity="0.92"/>
    `;
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${stops[0]}"/>
        <stop offset="55%" stop-color="${stops[1]}"/>
        <stop offset="100%" stop-color="${stops[0]}"/>
      </linearGradient>
      <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${stops[0]}"/>
        <stop offset="100%" stop-color="${stops[2]}"/>
      </linearGradient>
      <linearGradient id="seaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${stops[1]}"/>
        <stop offset="100%" stop-color="#080c12"/>
      </linearGradient>
      <radialGradient id="vignette" cx="50%" cy="50%" r="72%">
        <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
        <stop offset="100%" stop-color="#000000" stop-opacity="0.52"/>
      </radialGradient>
      <filter id="soft"><feGaussianBlur stdDeviation="36"/></filter>
      <filter id="micro"><feGaussianBlur stdDeviation="4"/></filter>
      <filter id="grain" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.72" numOctaves="3" seed="11" result="noise"/>
        <feColorMatrix type="saturate" values="0" in="noise" result="monoNoise"/>
        <feComponentTransfer in="monoNoise" result="softNoise">
          <feFuncA type="linear" slope="0.065"/>
        </feComponentTransfer>
      </filter>
    </defs>
    ${compositionLayer}
    <rect width="${width}" height="${height}" fill="url(#vignette)"/>
    <rect width="${width}" height="${height}" filter="url(#grain)"/>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const SAMPLE_PHOTOS: PhotoItem[] = [
  {
    id: 'sample-humanities-1',
    title: '黄昏走廊的剪影与几何切分',
    subject: 'humanities',
    compositionTags: ['框架式构图', '对角线张力', '大面积留白'],
    lightingTags: ['逆光轮廓', '硬光高反差', '剪影叙事'],
    toneTags: ['复古胶片暖调', '浓郁暗调'],
    note: '建筑投下的斜角阴影切分画面，人物恰好停在受光区的黄金分割点，暗部保留胶片质感而不过度提亮。',
    sourceAuthor: '暗房内置示例',
    width: 800,
    height: 1000,
    aspectRatio: 0.8,
    sizeKB: 186,
    originalSizeKB: 1420,
    palette: ['#0c0908', '#2a1c15', '#6b3e26', '#c27b3c', '#efd0a5'],
    colorFamilies: ['amber-yellow', 'red-orange', 'monochrome'],
    exif: {
      camera: 'Leica Q3',
      focalLength: '28mm',
      aperture: 'f/5.6',
      shutter: '1/1000s',
      iso: 'ISO 100',
    },
    imageUrl: createFineArtStudy(800, 1000, ['#14100e', '#3a2214', '#e5a95e'], 'chiaroscuro-window'),
    createdAt: '2026-10-13T10:00:00.000Z',
    isSample: true,
  },
  {
    id: 'sample-nature-1',
    title: '海天灰调的极简呼吸',
    subject: 'nature',
    compositionTags: ['大面积留白', '中心对称'],
    lightingTags: ['柔光漫射'],
    toneTags: ['低饱和莫兰迪', '黑白影调'],
    note: '参考杉本博司海景系列的静谧切分：长曝光把浪涌抚平为纯度极高的中灰层次，天海交界几乎消失。',
    sourceAuthor: '暗房内置示例',
    width: 900,
    height: 640,
    aspectRatio: 1.406,
    sizeKB: 164,
    originalSizeKB: 1280,
    palette: ['#0d131a', '#24303c', '#4b5a68', '#8996a3', '#d4dce3'],
    colorFamilies: ['cyan-blue', 'monochrome'],
    exif: {
      camera: 'Fujifilm GFX 100S',
      focalLength: '80mm',
      aperture: 'f/8',
      shutter: '30s',
      iso: 'ISO 100',
    },
    imageUrl: createFineArtStudy(900, 640, ['#1e293b', '#334155', '#94a3b8'], 'sugimoto-horizon'),
    createdAt: '2026-10-13T10:05:00.000Z',
    isSample: true,
  },
  {
    id: 'sample-humanities-2',
    title: '雨夜街头的青橙色温对峙',
    subject: 'humanities',
    compositionTags: ['三分法', '引导线', '前景遮挡层次'],
    lightingTags: ['蓝调/夜景氛围', '逆光轮廓'],
    toneTags: ['冷暖撞色', '青橙电影感', '浓郁暗调'],
    note: '积水路面延伸出纵向灯影，冷青环境光把暗部压稳，右上方暖橙橱窗成为唯一情绪落点。',
    sourceAuthor: '暗房内置示例',
    width: 800,
    height: 600,
    aspectRatio: 1.333,
    sizeKB: 192,
    originalSizeKB: 1650,
    palette: ['#070b12', '#142c42', '#2f7291', '#c7613e', '#f0af75'],
    colorFamilies: ['cyan-blue', 'red-orange'],
    exif: {
      camera: 'Sony A7M4',
      focalLength: '50mm',
      aperture: 'f/1.4',
      shutter: '1/160s',
      iso: 'ISO 800',
    },
    imageUrl: createFineArtStudy(800, 600, ['#0a1624', '#162436', '#e67e45'], 'rain-nocturne'),
    createdAt: '2026-10-13T10:10:00.000Z',
    isSample: true,
  },
  {
    id: 'sample-nature-2',
    title: '深林晨雾里的丁达尔光柱',
    subject: 'nature',
    compositionTags: ['引导线', '几何秩序', '对角线张力'],
    lightingTags: ['丁达尔体积光', '逆光轮廓', '斑驳光影'],
    toneTags: ['自然森系', '复古胶片暖调'],
    note: '垂直树干建立秩序感，斜切穿林的晨光束制造出纵深与时间感，墨绿阴影把高光衬托得克制通透。',
    sourceAuthor: '暗房内置示例',
    width: 800,
    height: 1040,
    aspectRatio: 0.769,
    sizeKB: 210,
    originalSizeKB: 1890,
    palette: ['#07120c', '#142b20', '#2b543f', '#89793d', '#dec478'],
    colorFamilies: ['emerald-green', 'amber-yellow'],
    exif: {
      camera: 'Nikon Z8',
      focalLength: '70mm',
      aperture: 'f/4',
      shutter: '1/320s',
      iso: 'ISO 200',
    },
    imageUrl: createFineArtStudy(800, 1040, ['#091a12', '#173827', '#dfc26b'], 'forest-shafts'),
    createdAt: '2026-10-13T10:15:00.000Z',
    isSample: true,
  },
  {
    id: 'sample-humanities-3',
    title: '美术馆混凝土墙面的尺度反差',
    subject: 'humanities',
    compositionTags: ['大面积留白', '几何秩序', '中心对称'],
    lightingTags: ['侧光质感', '柔光漫射'],
    toneTags: ['低饱和莫兰迪', '黑白影调'],
    note: '建筑明暗交界线直接担任构图骨架，人物体量压缩在画面 3% 以内，反衬出空间的静默张力。',
    sourceAuthor: '暗房内置示例',
    width: 800,
    height: 960,
    aspectRatio: 0.833,
    sizeKB: 145,
    originalSizeKB: 980,
    palette: ['#181715', '#3f3c38', '#757069', '#a6a098', '#e5e2dc'],
    colorFamilies: ['monochrome'],
    exif: {
      camera: 'Ricoh GR IIIx',
      focalLength: '40mm',
      aperture: 'f/4',
      shutter: '1/500s',
      iso: 'ISO 100',
    },
    imageUrl: createFineArtStudy(800, 960, ['#292623', '#524e48', '#d6d2ca'], 'brutalist-light'),
    createdAt: '2026-10-13T10:20:00.000Z',
    isSample: true,
  },
  {
    id: 'sample-nature-3',
    title: '蓝调时刻海岸礁石与远霞',
    subject: 'nature',
    compositionTags: ['三分法', '大面积留白'],
    lightingTags: ['蓝调/夜景氛围', '柔光漫射'],
    toneTags: ['冷暖撞色', '清透高调'],
    note: '日落二十分钟后的冷蓝海面经长曝光雾化后极度干净，天际那一抹暖杏色为冷色调注入温度。',
    sourceAuthor: '暗房内置示例',
    width: 900,
    height: 680,
    aspectRatio: 1.324,
    sizeKB: 158,
    originalSizeKB: 1340,
    palette: ['#08121b', '#132d45', '#29567c', '#6b8fae', '#df9f7c'],
    colorFamilies: ['cyan-blue', 'red-orange'],
    exif: {
      camera: 'Sony A7R5',
      focalLength: '35mm',
      aperture: 'f/11',
      shutter: '15s',
      iso: 'ISO 64',
    },
    imageUrl: createFineArtStudy(900, 680, ['#0d2438', '#1d4463', '#e59a73'], 'twilight-tide'),
    createdAt: '2026-10-13T10:25:00.000Z',
    isSample: true,
  },
];

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function loadAllPhotos(): Promise<PhotoItem[]> {
  const db = await openDb();
  const items = await new Promise<PhotoItem[]>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });

  if (items.length === 0 && !localStorage.getItem(SEEDED_KEY)) {
    localStorage.setItem(SEEDED_KEY, 'true');
    for (const sample of SAMPLE_PHOTOS) {
      await savePhotoLocal(sample);
    }
    return [...SAMPLE_PHOTOS].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function savePhotoLocal(item: PhotoItem): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePhotoLocal(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function loadGitHubConfig(): GitHubConfig {
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {
    owner: '',
    repo: '',
    branch: 'main',
    token: '',
    useJsDelivr: true,
  };
}

export function saveGitHubConfig(config: GitHubConfig): void {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
}

export function loadUiConfig(): UiAestheticConfig {
  try {
    const raw = localStorage.getItem(UI_CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // ignore
  }
  return {
    columns: 'auto',
    density: 'gallery',
    radius: 'sharp',
    captionMode: 'editorial',
  };
}

export function saveUiConfig(config: UiAestheticConfig): void {
  localStorage.setItem(UI_CONFIG_KEY, JSON.stringify(config));
}

export function loadInstantUploadPref(): boolean {
  try {
    return localStorage.getItem(INSTANT_UPLOAD_KEY) === 'true';
  } catch {
    return false;
  }
}

export function saveInstantUploadPref(enabled: boolean): void {
  try {
    localStorage.setItem(INSTANT_UPLOAD_KEY, String(enabled));
  } catch {
    // ignore
  }
}

function formatGitHubApiError(status: number, detail: string, action: string): string {
  if (status === 401) {
    return `${action}失败 (401)：GitHub Token 无效或已过期，请重新生成并保存。`;
  }
  if (status === 403) {
    return `${action}失败 (403)：Token 权限不足，请确认 Fine-grained Token 已选中目标仓库并将 Contents 设为 Read and write。`;
  }
  if (status === 404) {
    return `${action}失败 (404)：找不到仓库或分支，请检查 Owner、仓库名与分支名是否正确。`;
  }
  if (status === 409) {
    return `${action}失败 (409)：云端文件版本冲突，请重试。`;
  }
  return `${action}失败 (${status}): ${detail.slice(0, 140)}`;
}

export async function testGitHubConnection(config: GitHubConfig): Promise<{ ok: boolean; message: string }> {
  if (!config.owner.trim() || !config.repo.trim() || !config.token.trim()) {
    return { ok: false, message: '请先填写 Owner、仓库名和 Token' };
  }
  try {
    const res = await fetch(`https://api.github.com/repos/${config.owner.trim()}/${config.repo.trim()}`, {
      headers: {
        Authorization: `Bearer ${config.token.trim()}`,
        Accept: 'application/vnd.github+json',
      },
      cache: 'no-store',
    });
    if (!res.ok) {
      const txt = await res.text();
      return { ok: false, message: formatGitHubApiError(res.status, txt, '连接测试') };
    }
    const repoInfo = await res.json();
    const canPush = Boolean(repoInfo?.permissions?.push);
    if (!canPush) {
      return {
        ok: false,
        message: '已连上仓库，但该 Token 没有写入权限（请检查 Contents 是否设为 Read and write）。',
      };
    }
    return {
      ok: true,
      message: `连接成功！已获得 ${repoInfo.full_name} 写入权限，可随时一键上传。`,
    };
  } catch (err) {
    return {
      ok: false,
      message: `网络无法连接 api.github.com：${err instanceof Error ? err.message : '请检查网络或代理'}`,
    };
  }
}

function encodeUtf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decodeBase64ToUtf8(base64: string): string {
  const clean = base64.replace(/\s+/g, '');
  const binary = atob(clean);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

async function getGitHubFileSha(config: GitHubConfig, path: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${encodeURIComponent(
    config.branch || 'main'
  )}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`查询 GitHub 文件失败 (${res.status})`);
  }
  const data = await res.json();
  return data.sha || null;
}

export async function uploadImageToGitHub(
  config: GitHubConfig,
  photoId: string,
  base64Content: string
): Promise<{ githubPath: string; githubSha: string; remoteUrl: string }> {
  const now = new Date();
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const githubPath = `photos/${ym}/${photoId}.webp`;
  const branch = config.branch || 'main';

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${githubPath}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `feat(aesthetic): upload ${photoId}.webp`,
      content: base64Content,
      branch,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(formatGitHubApiError(res.status, errText, '上传图片至 GitHub'));
  }

  const data = await res.json();
  const githubSha = data.content?.sha || '';
  const remoteUrl = config.useJsDelivr
    ? `https://cdn.jsdelivr.net/gh/${config.owner}/${config.repo}@${branch}/${githubPath}`
    : `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${branch}/${githubPath}`;

  return { githubPath, githubSha, remoteUrl };
}

export async function deleteImageFromGitHub(
  config: GitHubConfig,
  githubPath: string,
  knownSha?: string
): Promise<void> {
  const branch = config.branch || 'main';
  const sha = knownSha || (await getGitHubFileSha(config, githubPath));
  if (!sha) {
    return;
  }

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${githubPath}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `chore(aesthetic): remove outdated photo ${githubPath}`,
      sha,
      branch,
    }),
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`删除云端图片失败 (${res.status}): ${errText}`);
  }
}

export async function syncGalleryIndexToGitHub(config: GitHubConfig, photos: PhotoItem[]): Promise<void> {
  if (!config.owner || !config.repo || !config.token) return;
  const branch = config.branch || 'main';
  const indexPath = 'gallery-index.json';

  const cleanIndex = photos
    .filter((p) => !p.isSample)
    .map((p) => ({
      ...p,
      imageUrl:
        p.imageUrl.startsWith('data:') && p.githubPath
          ? config.useJsDelivr
            ? `https://cdn.jsdelivr.net/gh/${config.owner}/${config.repo}@${branch}/${p.githubPath}`
            : `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${branch}/${p.githubPath}`
          : p.imageUrl,
    }));

  const jsonString = JSON.stringify(
    {
      updatedAt: new Date().toISOString(),
      totalCount: cleanIndex.length,
      items: cleanIndex,
    },
    null,
    2
  );

  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${indexPath}`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const existingSha = await getGitHubFileSha(config, indexPath);
    const bodyPayload: Record<string, string> = {
      message: `chore(index): sync gallery-index.json (${cleanIndex.length} items)`,
      content: encodeUtf8ToBase64(jsonString),
      branch,
    };
    if (existingSha) {
      bodyPayload.sha = existingSha;
    }

    const res = await fetch(url, {
      method: 'PUT',
      priority: 'low',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    } as RequestInit);

    if (res.ok) return;
    if (res.status === 409 && attempt === 0) {
      continue; // retry once with refreshed SHA
    }
    const errText = await res.text();
    throw new Error(formatGitHubApiError(res.status, errText, '同步索引 gallery-index.json'));
  }
}

export async function loadPublicArchiveConfig(): Promise<PublicArchiveConfig | null> {
  const envOwner = (import.meta.env.VITE_ARCHIVE_OWNER as string | undefined)?.trim();
  const envRepo = (import.meta.env.VITE_ARCHIVE_REPO as string | undefined)?.trim();
  const envBranch = (import.meta.env.VITE_ARCHIVE_BRANCH as string | undefined)?.trim() || 'main';
  const envTitle = (import.meta.env.VITE_ARCHIVE_TITLE as string | undefined)?.trim();

  if (envOwner && envRepo) {
    return {
      owner: envOwner,
      repo: envRepo,
      branch: envBranch,
      useJsDelivr: true,
      siteTitle: envTitle || '暗房志',
    };
  }

  try {
    const res = await fetch('./site.config.json', { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && typeof json.owner === 'string' && typeof json.repo === 'string' && json.owner.trim() && json.repo.trim()) {
      return {
        owner: json.owner.trim(),
        repo: json.repo.trim(),
        branch: (json.branch || 'main').trim(),
        useJsDelivr: json.useJsDelivr !== false,
        siteTitle: json.siteTitle || '暗房志',
      };
    }
  } catch {
    // ignore missing or malformed site.config.json
  }
  return null;
}

export async function fetchPublicGalleryIndex(
  cfg: PublicArchiveConfig,
  token?: string
): Promise<PhotoItem[]> {
  const branch = cfg.branch || 'main';
  const cacheBust = Math.floor(Date.now() / 60000);

  // 1. Prefer real-time GitHub API (never stale CDN cache!)
  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.raw+json',
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const apiRes = await fetch(
      `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/gallery-index.json?ref=${encodeURIComponent(
        branch
      )}`,
      {
        headers,
        cache: 'no-store',
        signal: AbortSignal.timeout?.(5500),
      }
    );
    if (apiRes.ok) {
      const parsed = await apiRes.json();
      if (Array.isArray(parsed.items)) {
        return (parsed.items as PhotoItem[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }
    }
  } catch {
    // fall through to mirrors
  }

  // 2. Fallback mirrors (raw.githubusercontent.com with short timeout -> jsDelivr)
  const candidates = [
    `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/gallery-index.json?t=${cacheBust}`,
    `https://cdn.jsdelivr.net/gh/${cfg.owner}/${cfg.repo}@${branch}/gallery-index.json`,
  ];

  for (const url of candidates) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout?.(4500) });
      if (!res.ok) continue;
      const parsed = await res.json();
      if (Array.isArray(parsed.items)) {
        return (parsed.items as PhotoItem[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      }
    } catch {
      // try next mirror
    }
  }
  return [];
}

export async function pullGalleryIndexFromGitHub(config: GitHubConfig): Promise<PhotoItem[]> {
  if (!config.owner || !config.repo || !config.token) {
    throw new Error('请先完整填写 GitHub 仓库与 Token');
  }
  const branch = config.branch || 'main';
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/gallery-index.json?ref=${encodeURIComponent(
    branch
  )}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (res.status === 404) {
    throw new Error('云端尚无 gallery-index.json，上传第一张作品后将自动生成');
  }
  if (!res.ok) {
    throw new Error(`拉取云端索引失败 (${res.status})`);
  }
  const data = await res.json();
  const decoded = decodeBase64ToUtf8(data.content || '');
  const parsed = JSON.parse(decoded);
  const remoteItems: PhotoItem[] = Array.isArray(parsed.items) ? parsed.items : [];
  for (const item of remoteItems) {
    await savePhotoLocal(item);
  }
  return remoteItems;
}
