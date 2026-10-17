// db/database.ts
import Dexie, { type Table } from 'dexie';
import type { CanvasGraph, LLMSettings } from '../types/canvas';

export interface SettingsRecord {
  id: string;
  settings?: LLMSettings;
  value?: string;
}

export interface SessionMeta {
  graphId: string;
  title: string;
  updatedAt: number;
  createdAt: number;
  nodeCount: number;
  rootNodeId: string;
}

export class CanvasDatabase extends Dexie {
  graphs!: Table<CanvasGraph, string>;
  settings!: Table<SettingsRecord, string>;

  constructor() {
    super('GraphLearnLocalDB');
    this.version(1).stores({
      graphs: 'graphId, title, updatedAt',
      settings: 'id',
    });
  }
}

export const db = new CanvasDatabase();

/**
 * 保存整张图谱到 IndexedDB
 */
export async function saveGraphToDB(graph: CanvasGraph): Promise<void> {
  if (pendingDebounceTimer) {
    clearTimeout(pendingDebounceTimer);
    pendingDebounceTimer = null;
    pendingGraphToSave = null;
  }
  try {
    await db.graphs.put(graph);
  } catch (err) {
    console.error('[DB] Failed to save graph:', err);
  }
}

let pendingDebounceTimer: ReturnType<typeof setTimeout> | null = null;
let pendingGraphToSave: CanvasGraph | null = null;

/**
 * 防抖保存图谱（用于节点拖拽、文本输入等高频事件，默认 400ms 防抖）
 */
export function saveGraphToDBDebounced(graph: CanvasGraph, delayMs: number = 400): void {
  pendingGraphToSave = graph;
  if (pendingDebounceTimer) {
    clearTimeout(pendingDebounceTimer);
  }
  pendingDebounceTimer = setTimeout(async () => {
    if (pendingGraphToSave) {
      const g = pendingGraphToSave;
      pendingGraphToSave = null;
      pendingDebounceTimer = null;
      try {
        await db.graphs.put(g);
      } catch (err) {
        console.error('[DB] Failed to debounced save graph:', err);
      }
    }
  }, delayMs);
}

/**
 * 强制立即刷新未落库的防抖保存队列
 */
export async function flushSaveGraphToDB(): Promise<void> {
  if (pendingDebounceTimer) {
    clearTimeout(pendingDebounceTimer);
    pendingDebounceTimer = null;
  }
  if (pendingGraphToSave) {
    const g = pendingGraphToSave;
    pendingGraphToSave = null;
    try {
      await db.graphs.put(g);
    } catch (err) {
      console.error('[DB] Failed to flush save graph:', err);
    }
  }
}


/**
 * 从 IndexedDB 加载图谱
 */
export async function loadGraphFromDB(graphId: string): Promise<CanvasGraph | undefined> {
  try {
    return await db.graphs.get(graphId);
  } catch (err) {
    console.error('[DB] Failed to load graph:', err);
    return undefined;
  }
}

/**
 * 获取所有会话元信息列表，按更新时间倒序排序
 */
export async function listAllSessions(): Promise<SessionMeta[]> {
  try {
    const all = await db.graphs.orderBy('updatedAt').reverse().toArray();
    return all.map((g) => ({
      graphId: g.graphId,
      title: g.title,
      updatedAt: g.updatedAt,
      createdAt: g.createdAt,
      nodeCount: Object.keys(g.nodes || {}).length,
      rootNodeId: g.rootNodeId,
    }));
  } catch (err) {
    console.error('[DB] Failed to list sessions:', err);
    return [];
  }
}

/**
 * 删除指定会话
 */
export async function deleteGraphFromDB(graphId: string): Promise<void> {
  try {
    await db.graphs.delete(graphId);
  } catch (err) {
    console.error('[DB] Failed to delete graph:', err);
  }
}

/**
 * 获取最新保存的图谱
 */
export async function loadLatestGraph(): Promise<CanvasGraph | undefined> {
  try {
    const list = await db.graphs.orderBy('updatedAt').reverse().limit(1).toArray();
    return list[0];
  } catch (err) {
    console.error('[DB] Failed to load latest graph:', err);
    return undefined;
  }
}

/**
 * 记录最后活跃的会话 ID
 */
export async function saveLastActiveSessionId(graphId: string): Promise<void> {
  try {
    await db.settings.put({ id: 'active_session_id', value: graphId });
  } catch (err) {
    console.error('[DB] Failed to save active session ID:', err);
  }
}

/**
 * 读取最后活跃的会话 ID
 */
export async function loadLastActiveSessionId(): Promise<string | null> {
  try {
    const record = await db.settings.get('active_session_id');
    return record?.value || null;
  } catch (err) {
    console.error('[DB] Failed to load active session ID:', err);
    return null;
  }
}

/**
 * 保存全局配置
 */
export async function saveSettingsToDB(settings: LLMSettings): Promise<void> {
  try {
    await db.settings.put({ id: 'app_settings', settings });
  } catch (err) {
    console.error('[DB] Failed to save settings:', err);
  }
}

/**
 * 加载全局配置
 */
export async function loadSettingsFromDB(): Promise<LLMSettings | null> {
  try {
    const record = await db.settings.get('app_settings');
    return record?.settings || null;
  } catch (err) {
    console.error('[DB] Failed to load settings:', err);
    return null;
  }
}
