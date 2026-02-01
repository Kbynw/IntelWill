
import React, { useState, useEffect } from 'react';
import { ModalState } from '../types';

interface Props {
  state: ModalState;
  onClose: () => void;
  onConfirm: (payload?: any) => void;
  categories?: any[];
}

export const CustomModal: React.FC<Props> = ({ state, onClose, onConfirm, categories }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    if (state.isOpen) {
      setInputValue(state.data?.currentName || '');
      setSelectedId(categories && categories.length > 0 ? categories[0].id : '');
    }
  }, [state, categories]);

  if (!state.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h3 className="text-lg font-bold text-gray-800">{state.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="px-6 py-6">
          {state.message && <p className="text-gray-600 mb-4 whitespace-pre-wrap">{state.message}</p>}

          {(state.type === 'add_category' || state.type === 'edit_category') && (
            <input
              type="text"
              autoFocus
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              placeholder="이름을 입력하세요"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onConfirm(inputValue)}
            />
          )}

          {state.type === 'move_item' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">이동할 카테고리 선택</label>
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {categories?.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            취소
          </button>
          <button
            onClick={() => {
              if (state.type === 'move_item') onConfirm(selectedId);
              else if (state.type === 'add_category' || state.type === 'edit_category') onConfirm(inputValue);
              else onConfirm();
            }}
            className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
