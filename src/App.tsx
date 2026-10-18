// App.tsx
import React, { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from './store/canvasStore';
import { MindMapCanvas } from './components/Canvas/MindMapCanvas';
import { Toolbar } from './components/Canvas/Toolbar';
import { ReadingDrawer } from './components/Drawer/ReadingDrawer';
import { SettingsModal } from './components/Modals/SettingsModal';
import { PromptInspectorModal } from './components/Modals/PromptInspectorModal';
import { SessionManagerModal } from './components/Modals/SessionManagerModal';
import { DeleteNodeModal } from './components/Modals/DeleteNodeModal';
import { CreateNodeModal } from './components/Modals/CreateNodeModal';

export const App: React.FC = () => {
  const init = useCanvasStore((s) => s.init);
  const closeDrawer = useCanvasStore((s) => s.closeDrawer);
  const setIsSettingsOpen = useCanvasStore((s) => s.setIsSettingsOpen);
  const setIsInspectorOpen = useCanvasStore((s) => s.setIsInspectorOpen);
  const setIsSessionManagerOpen = useCanvasStore((s) => s.setIsSessionManagerOpen);
  const setNodeToDeleteId = useCanvasStore((s) => s.setNodeToDeleteId);
  const closeCreateNodeModal = useCanvasStore((s) => s.closeCreateNodeModal);
  const deleteNode = useCanvasStore((s) => s.deleteNode);

  const navigateFnRef = useRef<((nodeId: string) => void) | null>(null);

  useEffect(() => {
    init();
  }, [init]);

  // 全局快捷键处理 (Esc 关闭弹窗/抽屉, Delete/Backspace 删除选中节点)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在输入框或文本编辑时误删节点
      const target = e.target as HTMLElement;
      const tag = target?.tagName?.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || target?.isContentEditable;

      if (e.key === 'Escape') {
        closeDrawer();
        setIsSettingsOpen(false);
        setIsInspectorOpen(false);
        setIsSessionManagerOpen(false);
        closeCreateNodeModal();
        setNodeToDeleteId(null);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        const activeNodeId = useCanvasStore.getState().activeNodeId;
        if (activeNodeId) {
          deleteNode(activeNodeId);
        }
      }
      // 快捷键: Ctrl/Cmd + L 自动整理布局, Ctrl/Cmd + Shift + X 触发/关闭 X-Ray
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'l' && !isInput) {
        e.preventDefault();
        useCanvasStore.getState().autoLayout();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'x' && !isInput) {
        e.preventDefault();
        const { isXrayActive, clearXrayPreview, triggerXrayPreview } = useCanvasStore.getState();
        if (isXrayActive) {
          clearXrayPreview();
        } else {
          triggerXrayPreview();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeDrawer, setIsSettingsOpen, setIsInspectorOpen, setIsSessionManagerOpen, setNodeToDeleteId, closeCreateNodeModal, deleteNode]);

  const handleRegisterNavigate = useCallback((fn: (nodeId: string) => void) => {
    navigateFnRef.current = fn;
  }, []);

  const handleNavigateToNode = useCallback((nodeId: string) => {
    if (navigateFnRef.current) {
      navigateFnRef.current(nodeId);
    }
  }, []);

  return (
    <div className="relative w-screen h-[100dvh] overflow-hidden bg-[var(--bg-canvas)] text-[var(--text-1)] font-sans selection:bg-[var(--accent-focus)] selection:text-white">
      {/* 顶部工具栏 */}
      <Toolbar />

      {/* React Flow 无限画布 */}
      <MindMapCanvas onRegisterNavigate={handleRegisterNavigate} />

      {/* 侧边滑出聊天侧边栏 (AI 回答与推演) */}
      <ReadingDrawer onNavigateToNode={handleNavigateToNode} />

      {/* 新建节点模态框 */}
      <CreateNodeModal />

      {/* 节点删除确认模态框 */}
      <DeleteNodeModal />

      {/* 多会话管理器模态框 */}
      <SessionManagerModal />

      {/* 全局模型配置模态框 */}
      <SettingsModal />

      {/* 认知证据阶梯案卷检查器 */}
      <PromptInspectorModal />
    </div>
  );
};

export default App;
