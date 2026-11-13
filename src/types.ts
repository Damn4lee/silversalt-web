export type SubjectCategory = 'humanities' | 'nature';

export type ColorFamily =
  | 'red-orange'
  | 'amber-yellow'
  | 'emerald-green'
  | 'cyan-blue'
  | 'purple-magenta'
  | 'monochrome';

export interface ExifData {
  camera?: string;
  focalLength?: string;
  aperture?: string;
  shutter?: string;
  iso?: string;
}

export interface PhotoItem {
  id: string;
  title: string;
  subject: SubjectCategory;
  compositionTags: string[];
  lightingTags: string[];
  toneTags: string[];
  note: string;
  sourceAuthor?: string;
  width: number;
  height: number;
  aspectRatio: number;
  sizeKB: number;
  originalSizeKB?: number;
  palette: string[];
  colorFamilies: ColorFamily[];
  exif?: ExifData;
  imageUrl: string;
  githubPath?: string;
  githubSha?: string;
  createdAt: string;
  isSample?: boolean;
}

export interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
  useJsDelivr: boolean;
}

export interface PublicArchiveConfig {
  owner: string;
  repo: string;
  branch: string;
  useJsDelivr: boolean;
  siteTitle?: string;
}

export interface UiAestheticConfig {
  columns: 'auto' | 2 | 3 | 4;
  density: 'gallery' | 'compact';
  radius: 'sharp' | 'soft';
  captionMode: 'editorial' | 'pure';
}

export type SortMode = 'newest' | 'portrait' | 'landscape';

export type CompositionGuide = 'none' | 'thirds' | 'phi' | 'diagonals';

export const PRESET_TAXONOMY = {
  subjects: [
    { id: 'humanities' as SubjectCategory, label: '人文', en: 'Humanities', desc: '街头纪实 · 情绪人像 · 建筑空间' },
    { id: 'nature' as SubjectCategory, label: '自然', en: 'Nature', desc: '山海风光 · 植物生态 · 天象光景' },
  ],
  composition: [
    '三分法',
    '大面积留白',
    '引导线',
    '框架式构图',
    '中心对称',
    '前景遮挡层次',
    '几何秩序',
    '对角线张力',
    '局部特写',
  ],
  lighting: [
    '逆光轮廓',
    '硬光高反差',
    '丁达尔体积光',
    '柔光漫射',
    '剪影叙事',
    '侧光质感',
    '斑驳光影',
    '蓝调/夜景氛围',
  ],
  tone: [
    '冷暖撞色',
    '低饱和莫兰迪',
    '青橙电影感',
    '复古胶片暖调',
    '黑白影调',
    '清透高调',
    '浓郁暗调',
    '自然森系',
  ],
  colorFamilies: [
    { id: 'red-orange' as ColorFamily, label: '绯红暖橙', swatch: '#c95b48' },
    { id: 'amber-yellow' as ColorFamily, label: '琥珀流金', swatch: '#c9933b' },
    { id: 'emerald-green' as ColorFamily, label: '森绿青苔', swatch: '#3f7d63' },
    { id: 'cyan-blue' as ColorFamily, label: '冷青静蓝', swatch: '#3b7191' },
    { id: 'purple-magenta' as ColorFamily, label: '暮紫洋红', swatch: '#7c5fa8' },
    { id: 'monochrome' as ColorFamily, label: '银盐黑白', swatch: '#73716c' },
  ],
};
