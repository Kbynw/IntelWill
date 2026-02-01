
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Category, LibraryItem, ModalState } from './types';
import { 
  PlusIcon, UpIcon, DownIcon, FolderIcon, FileIcon, TrashIcon, 
  PrintIcon, MoveIcon, EditIcon, ChevronRightIcon, ChevronDownIcon,
  ExportIcon, ImportIcon
} from './components/Icons';
import { CustomModal } from './components/CustomModal';

const App: React.FC = () => {
  // --- States ---
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});
  
  // Content Editing States
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [editTitleBuffer, setEditTitleBuffer] = useState('');
  const [editContentBuffer, setEditContentBuffer] = useState('');
  
  // Resizing states
  const [leftWidth, setLeftWidth] = useState(320);
  const [rightWidth, setRightWidth] = useState(360);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  // Input states
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<ModalState>({
    isOpen: false,
    type: 'alert',
    title: '',
  });

  // --- Initial Loading (Persistence) ---
  useEffect(() => {
    const savedCats = localStorage.getItem('lib_categories');
    const savedItems = localStorage.getItem('lib_items');
    if (savedCats) setCategories(JSON.parse(savedCats));
    else {
      const defaultCat = { id: 'root-1', name: '기본 서재', parentId: null, order: 0 };
      setCategories([defaultCat]);
      setSelectedCategoryId('root-1');
      setExpandedCats({ 'root-1': true });
    }
    if (savedItems) setItems(JSON.parse(savedItems));
  }, []);

  // --- Auto Save (Local Persistence) ---
  useEffect(() => {
    try {
      localStorage.setItem('lib_categories', JSON.stringify(categories));
      localStorage.setItem('lib_items', JSON.stringify(items));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        setModal({ 
          isOpen: true, 
          type: 'alert', 
          title: '저장 용량 초과', 
          message: '브라우저 저장 공간이 가득 찼습니다. 내보내기 기능을 사용하여 데이터를 백업하세요.' 
        });
      }
    }
  }, [categories, items]);

  // --- Export / Import (Hard Drive Persistence) ---
  const exportData = () => {
    const data = {
      categories,
      items,
      exportDate: new Date().toISOString(),
      version: "1.2"
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `library_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.categories && json.items) {
          setCategories(json.categories);
          setItems(json.items);
          setModal({ isOpen: true, type: 'alert', title: '복구 완료', message: '데이터가 성공적으로 복구되었습니다.' });
        } else {
          throw new Error('Invalid Format');
        }
      } catch (err) {
        setModal({ isOpen: true, type: 'alert', title: '오류', message: '유효하지 않은 데이터 파일입니다.' });
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // --- Resizer Handlers ---
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isResizingLeft.current) {
      setLeftWidth(Math.max(250, Math.min(600, e.clientX)));
    } else if (isResizingRight.current) {
      setRightWidth(Math.max(280, Math.min(600, window.innerWidth - e.clientX)));
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isResizingLeft.current = false;
    isResizingRight.current = false;
    document.body.style.cursor = 'default';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // --- Category Logic ---
  const toggleExpand = (id: string) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const addCategory = (parentId: string | null, name: string) => {
    if (!name.trim()) return;
    const sameLevel = categories.filter(c => c.parentId === parentId);
    const maxOrder = sameLevel.reduce((max, c) => Math.max(max, c.order), -1);
    
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
      parentId,
      order: maxOrder + 1,
    };
    setCategories(prev => [...prev, newCat]);
    if (parentId) setExpandedCats(prev => ({ ...prev, [parentId]: true }));
    setModal({ ...modal, isOpen: false });
  };

  const updateCategory = (id: string, newName: string) => {
    if (!newName.trim()) return;
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: newName } : c));
    setModal({ ...modal, isOpen: false });
  };

  const deleteCategoryRecursive = (catId: string) => {
    let toDelete = [catId];
    const findChildren = (id: string) => {
      const childs = categories.filter(c => c.parentId === id);
      childs.forEach(c => {
        toDelete.push(c.id);
        findChildren(c.id);
      });
    };
    findChildren(catId);

    setCategories(prev => prev.filter(c => !toDelete.includes(c.id)));
    setItems(prev => prev.filter(i => !toDelete.includes(i.categoryId)));
    
    if (selectedCategoryId && toDelete.includes(selectedCategoryId)) {
      setSelectedCategoryId(null);
      setSelectedItemId(null);
    }
    setModal({ ...modal, isOpen: false });
  };

  const reorderCategory = (catId: string, direction: 'up' | 'down') => {
    const target = categories.find(c => c.id === catId);
    if (!target) return;

    const peers = categories
      .filter(c => c.parentId === target.parentId)
      .sort((a, b) => a.order - b.order);
    
    const idx = peers.findIndex(p => p.id === catId);
    
    if (direction === 'up' && idx > 0) {
      const prev = peers[idx - 1];
      const targetOrder = target.order;
      const prevOrder = prev.order;
      
      setCategories(prevCats => prevCats.map(c => {
        if (c.id === target.id) return { ...c, order: prevOrder };
        if (c.id === prev.id) return { ...c, order: targetOrder };
        return c;
      }));
    } else if (direction === 'down' && idx < peers.length - 1) {
      const next = peers[idx + 1];
      const targetOrder = target.order;
      const nextOrder = next.order;
      
      setCategories(prevCats => prevCats.map(c => {
        if (c.id === target.id) return { ...c, order: nextOrder };
        if (c.id === next.id) return { ...c, order: targetOrder };
        return c;
      }));
    }
  };

  // --- Item Logic ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setNewTitle(file.name.replace(/\.[^/.]+$/, ""));
      
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = (re) => {
          setFileBase64(re.target?.result as string);
          setNewContent(`PDF 파일: ${file.name}`);
        };
        reader.readAsDataURL(file);
      } else if (file.type.includes('text') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (re) => {
          setNewContent(re.target?.result as string || '');
          setFileBase64(null);
        };
        reader.readAsText(file);
      } else {
        setNewContent(`[미리보기 불가 파일]\n이름: ${file.name}\n크기: ${(file.size / 1024).toFixed(2)} KB\n유형: ${file.type}`);
        setFileBase64(null);
      }
    }
  };

  const saveItem = () => {
    if (!selectedCategoryId) {
      setModal({ isOpen: true, type: 'alert', title: '알림', message: '카테고리를 먼저 선택해주세요.' });
      return;
    }
    if (!newTitle.trim()) {
      setModal({ isOpen: true, type: 'alert', title: '알림', message: '제목을 입력해주세요.' });
      return;
    }

    const newItem: LibraryItem = {
      id: `item-${Date.now()}`,
      categoryId: selectedCategoryId,
      title: newTitle,
      content: newContent,
      createdAt: Date.now(),
      fileName: uploadedFile?.name,
      mimeType: uploadedFile?.type,
      fileData: fileBase64 || undefined
    };

    setItems(prev => [newItem, ...prev]);
    setSelectedItemId(newItem.id);
    setNewTitle('');
    setNewContent('');
    setUploadedFile(null);
    setFileBase64(null);
    setExpandedCats(prev => ({ ...prev, [selectedCategoryId]: true }));
  };

  const startEditing = () => {
    const item = items.find(i => i.id === selectedItemId);
    if (item) {
      setEditTitleBuffer(item.title);
      setEditContentBuffer(item.content);
      setIsEditingContent(true);
    }
  };

  const saveEditedContent = () => {
    if (!selectedItemId) return;
    setItems(prev => prev.map(i => i.id === selectedItemId ? { 
      ...i, 
      title: editTitleBuffer, 
      content: editContentBuffer 
    } : i));
    setIsEditingContent(false);
  };

  const moveItem = (itemId: string, targetCatId: string) => {
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, categoryId: targetCatId } : i));
    setModal({ ...modal, isOpen: false });
  };

  const deleteItem = (itemId: string) => {
    setItems(prev => prev.filter(i => i.id !== itemId));
    if (selectedItemId === itemId) setSelectedItemId(null);
    setModal({ ...modal, isOpen: false });
  };

  const getItemCount = (catId: string) => {
    let count = items.filter(i => i.categoryId === catId).length;
    const addChildrenItems = (id: string) => {
      const children = categories.filter(c => c.parentId === id);
      children.forEach(c => {
        count += items.filter(i => i.categoryId === c.id).length;
        addChildrenItems(c.id);
      });
    };
    addChildrenItems(catId);
    return count;
  };

  // --- Tree Components ---
  const CategoryNode: React.FC<{ category: Category; depth: number }> = ({ category, depth }) => {
    const children = categories
      .filter(c => c.parentId === category.id)
      .sort((a, b) => a.order - b.order);
    const categoryItems = items.filter(i => i.categoryId === category.id);
    const count = getItemCount(category.id);
    const isSelected = selectedCategoryId === category.id;
    const isExpanded = expandedCats[category.id];

    return (
      <div className="select-none">
        <div 
          className={`flex items-center group py-2 px-2 rounded-lg cursor-pointer transition-all ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-100 text-gray-700'}`}
          onClick={() => {
            setSelectedCategoryId(category.id);
            toggleExpand(category.id);
          }}
        >
          <div style={{ width: `${depth * 16}px` }} />
          <button 
            className={`p-1 mr-1 transition-colors ${isSelected ? 'text-blue-100' : 'text-gray-400'}`}
            onClick={(e) => { e.stopPropagation(); toggleExpand(category.id); }}
          >
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </button>
          <span className={`mr-2 ${isSelected ? 'text-white' : 'text-blue-500'}`}><FolderIcon /></span>
          <span className="flex-1 truncate font-semibold text-sm">
            {category.name} <span className={`text-[10px] ml-1 px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-500'}`}>{count}</span>
          </span>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'edit_category', title: '명칭 수정', data: { id: category.id, currentName: category.name } }); }} className={`p-1 rounded ${isSelected ? 'hover:bg-blue-500' : 'hover:bg-white'}`}><EditIcon /></button>
            <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'add_category', title: '하부 추가', data: { parentId: category.id } }); }} className={`p-1 rounded ${isSelected ? 'hover:bg-blue-500' : 'hover:bg-white'}`}><PlusIcon /></button>
            <button onClick={(e) => { e.stopPropagation(); reorderCategory(category.id, 'up'); }} className={`p-1 rounded ${isSelected ? 'hover:bg-blue-500' : 'hover:bg-white'}`}><UpIcon /></button>
            <button onClick={(e) => { e.stopPropagation(); reorderCategory(category.id, 'down'); }} className={`p-1 rounded ${isSelected ? 'hover:bg-blue-500' : 'hover:bg-white'}`}><DownIcon /></button>
            <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'delete_category', title: '카테고리 삭제', message: `'${category.name}' 및 모든 하부 자료가 삭제됩니다.`, data: { id: category.id } }); }} className={`p-1 rounded ${isSelected ? 'hover:bg-red-500' : 'hover:bg-red-50 text-red-500'}`}><TrashIcon /></button>
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-1 border-l border-gray-100 ml-4 pl-1">
            {children.map(child => (
              <CategoryNode key={child.id} category={child} depth={depth + 1} />
            ))}
            {categoryItems.map(item => (
              <div 
                key={item.id}
                onClick={(e) => { e.stopPropagation(); setSelectedItemId(item.id); setSelectedCategoryId(category.id); setIsEditingContent(false); }}
                className={`flex items-center py-1.5 px-2 rounded-lg cursor-pointer transition-all ${selectedItemId === item.id ? 'bg-gray-800 text-white shadow-lg' : 'hover:bg-blue-50 text-gray-600'}`}
              >
                <div style={{ width: `${(depth + 1) * 8}px` }} />
                <span className={`mr-2 ${selectedItemId === item.id ? 'text-blue-400' : 'text-gray-400'}`}>
                  <FileIcon />
                </span>
                <span className="flex-1 truncate text-xs font-medium">
                  {item.title}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const currentItem = items.find(i => i.id === selectedItemId);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Tool Sidebar (Left) */}
      <div style={{ width: `${leftWidth}px` }} className="flex-shrink-0 flex flex-col border-r border-gray-200 bg-white no-print">
        <header className="p-5 border-b border-gray-100 bg-white flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-blue-700 tracking-tight">지능형 서재</h1>
            <div className="flex gap-1">
              <button onClick={exportData} title="백업 내보내기" className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><ExportIcon /></button>
              <label className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all cursor-pointer">
                <ImportIcon /><input type="file" className="hidden" accept=".json" onChange={importData} />
              </label>
            </div>
          </div>
          {selectedCategoryId && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 rounded-full">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-[11px] text-blue-700 font-bold truncate">현재 위치: {categories.find(c => c.id === selectedCategoryId)?.name}</span>
            </div>
          )}
        </header>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          <section className="bg-gray-50/50 p-4 rounded-xl border border-gray-100 space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">파일 업로드</label>
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group">
                <PlusIcon />
                <span className="text-[10px] text-gray-400 mt-2 font-medium">PDF 또는 텍스트 파일</span>
                <input type="file" className="hidden" onChange={handleFileUpload} accept=".txt,.md,.pdf" />
              </label>
              {uploadedFile && <p className="text-[10px] text-blue-600 font-bold text-center mt-1">✓ {uploadedFile.name}</p>}
            </div>

            <div className="space-y-1">
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="자료 제목 입력" className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow" />
            </div>

            <div className="space-y-1">
              <textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="요약 또는 주요 내용..." rows={6} className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow resize-none" />
            </div>

            <button onClick={saveItem} className="w-full py-2.5 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-95 transition-all">서재에 보관</button>
          </section>

          <section className="space-y-3">
            <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-1">현재 폴더 자료</h2>
            <div className="space-y-2">
              {items.filter(i => i.categoryId === selectedCategoryId).length === 0 ? (
                <div className="text-center py-8 border border-dashed border-gray-100 rounded-xl">
                  <span className="text-[11px] text-gray-300">자료가 비어있습니다.</span>
                </div>
              ) : (
                items.filter(i => i.categoryId === selectedCategoryId).map(item => (
                  <div key={item.id} onClick={() => { setSelectedItemId(item.id); setIsEditingContent(false); }} className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${selectedItemId === item.id ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-gray-100 hover:border-blue-200 shadow-sm'}`}>
                    <span className={`mr-2 ${selectedItemId === item.id ? 'text-blue-100' : 'text-blue-500'}`}><FileIcon /></span>
                    <span className="flex-1 text-xs font-bold truncate">{item.title}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>

      <div className="resizer-h bg-gray-100 no-print" onMouseDown={() => { isResizingLeft.current = true; document.body.style.cursor = 'col-resize'; }} />

      {/* Main Content: Viewer (Center) */}
      <main className="flex-1 flex flex-col bg-white overflow-hidden shadow-inner">
        <header className="p-4 border-b border-gray-100 flex items-center justify-between no-print bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <span className="bg-gray-800 text-white px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter">Reader v1.2</span>
            <h2 className="text-xs font-bold text-gray-500 truncate max-w-[200px]">
              {currentItem ? categories.find(c => c.id === currentItem.categoryId)?.name : '선택된 문서 없음'}
            </h2>
          </div>
          <div className="flex items-center gap-1.5">
            {currentItem && (
              <>
                {!isEditingContent ? (
                  <>
                    {currentItem.mimeType !== 'application/pdf' && (
                      <button onClick={startEditing} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><EditIcon /> 수정</button>
                    )}
                    <button onClick={() => setModal({ isOpen: true, type: 'move_item', title: '자료 이동', message: '이동할 대상 카테고리를 선택하세요.', data: { itemId: currentItem.id } })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-all"><MoveIcon /> 이동</button>
                    <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-all"><PrintIcon /> PDF로 저장</button>
                    <button onClick={() => setModal({ isOpen: true, type: 'delete_item', title: '자료 삭제', message: '이 자료를 영구적으로 제거할까요?', data: { itemId: currentItem.id } })} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"><TrashIcon /> 삭제</button>
                  </>
                ) : (
                  <>
                    <button onClick={saveEditedContent} className="px-5 py-1.5 text-xs font-black text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-all">저장하기</button>
                    <button onClick={() => setIsEditingContent(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-all">취소</button>
                  </>
                )}
              </>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10 bg-gray-50/30">
          {currentItem ? (
            <article className="max-w-4xl mx-auto bg-white shadow-2xl border border-gray-100 rounded-3xl min-h-full flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="p-8 lg:p-12 border-b border-gray-50 bg-gradient-to-r from-white to-gray-50/50">
                {isEditingContent ? (
                  <input 
                    type="text" 
                    value={editTitleBuffer} 
                    onChange={(e) => setEditTitleBuffer(e.target.value)} 
                    className="text-4xl font-black text-gray-900 w-full border-b-4 border-blue-600 focus:outline-none bg-transparent py-2"
                  />
                ) : (
                  <h1 className="text-4xl font-black text-gray-900 leading-tight tracking-tighter">{currentItem.title}</h1>
                )}
                <div className="flex items-center text-[11px] text-gray-400 gap-4 mt-6 font-bold">
                  <span className="flex items-center gap-1"><FolderIcon /> {categories.find(c => c.id === currentItem.categoryId)?.name}</span>
                  <span>등록일: {new Date(currentItem.createdAt).toLocaleString()}</span>
                  {currentItem.fileName && <span className="text-blue-500">원본: {currentItem.fileName}</span>}
                </div>
              </div>
              
              <div className="flex-1 p-8 lg:p-12">
                {currentItem.mimeType === 'application/pdf' && currentItem.fileData ? (
                  <div className="w-full h-[70vh] rounded-2xl border border-gray-200 overflow-hidden bg-gray-100 shadow-inner">
                    <embed src={currentItem.fileData} type="application/pdf" className="w-full h-full" />
                  </div>
                ) : (
                  isEditingContent ? (
                    <textarea 
                      value={editContentBuffer} 
                      onChange={(e) => setEditContentBuffer(e.target.value)}
                      className="w-full h-[55vh] text-lg text-gray-800 leading-relaxed font-medium focus:outline-none bg-gray-50/50 p-6 rounded-2xl border border-gray-100 resize-none shadow-inner"
                    />
                  ) : (
                    <div className="prose prose-blue max-w-none text-lg text-gray-800 leading-relaxed whitespace-pre-wrap font-medium font-serif">
                      {currentItem.content}
                    </div>
                  )
                )}
              </div>
            </article>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-200 space-y-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center"><FileIcon /></div>
              <p className="text-xl font-black tracking-tight text-gray-300">문서를 선택하여 읽어보세요</p>
            </div>
          )}
        </div>
      </main>

      <div className="resizer-h bg-gray-100 no-print" onMouseDown={() => { isResizingRight.current = true; document.body.style.cursor = 'col-resize'; }} />

      {/* Category Sidebar (Right) */}
      <div style={{ width: `${rightWidth}px` }} className="flex-shrink-0 flex flex-col border-l border-gray-200 bg-white no-print shadow-2xl z-20">
        <header className="p-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-30">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-gray-800 tracking-tight">서재 분류</h1>
            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full text-gray-400 font-bold">{categories.length} Folders</span>
          </div>
          <button onClick={() => setModal({ isOpen: true, type: 'add_category', title: '최상위 분류 추가', data: { parentId: null } })} className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm" title="최상위 폴더 추가"><PlusIcon /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
          {categories.filter(c => c.parentId === null).sort((a, b) => a.order - b.order).map(cat => <CategoryNode key={cat.id} category={cat} depth={0} />)}
          {categories.length === 0 && (
            <div className="text-center py-20 text-gray-300 italic text-sm">분류가 하나도 없습니다.</div>
          )}
        </div>
        <footer className="p-4 border-t border-gray-50 bg-gray-50/50">
          <p className="text-[10px] text-gray-400 font-medium text-center italic">시스템 데이터는 로컬 스토리지에 자동 저장됩니다.</p>
        </footer>
      </div>

      {/* Custom Modals */}
      <CustomModal state={modal} onClose={() => setModal({ ...modal, isOpen: false })} categories={categories} onConfirm={(payload) => {
        if (modal.type === 'add_category') addCategory(modal.data.parentId, payload);
        else if (modal.type === 'edit_category') updateCategory(modal.data.id, payload);
        else if (modal.type === 'delete_category') deleteCategoryRecursive(modal.data.id);
        else if (modal.type === 'move_item') moveItem(modal.data.itemId, payload);
        else if (modal.type === 'delete_item') deleteItem(modal.data.itemId);
        else setModal({ ...modal, isOpen: false });
      }} />
    </div>
  );
};

export default App;
